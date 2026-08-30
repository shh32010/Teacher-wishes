// ============================================================
// POST /api/admin/ai/summary — 生成活动收官总结（AI-6）
// 聚合全站数据 → LLM 生成 120 字总结 → 写入 closing 记录
// 无 AI key 时降级为模板文案（数据填空）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';
import { requireAdmin } from '@/lib/auth/admin';
import { chat, isNotConfigured } from '@/lib/ai/provider';
import { buildSummaryPrompt } from '@/lib/ai/prompts';
import type { Blessing, Gift } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const supabase = createAdminClient();

    // 聚合统计（服务端一次性取回，数据量可控）
    const [{ data: blessings, error: bError }, { data: gifts, error: gError }] = await Promise.all([
      supabase
        .from('blessings')
        .select('id, content, emotion, gift_id, nickname, class, is_anonymous')
        .eq('status', 'approved'),
      supabase.from('gifts').select('id, name, icon'),
    ]);

    if (bError || gError) {
      console.error('[AI] 总结聚合失败:', bError || gError);
      return NextResponse.json({ error: '聚合失败' }, { status: 500 });
    }

    const giftMap = new Map((gifts as Gift[]).map((g) => [g.id, g]));
    const giftCounts = new Map<string, { name: string; icon: string; count: number }>();
    const emotionCounts = new Map<string, number>();

    for (const b of (blessings as Blessing[]) || []) {
      if (b.gift_id && giftMap.has(b.gift_id)) {
        const g = giftMap.get(b.gift_id)!;
        const entry = giftCounts.get(g.id) || { name: g.name, icon: g.icon, count: 0 };
        entry.count++;
        giftCounts.set(g.id, entry);
      }
      if (b.emotion) {
        emotionCounts.set(b.emotion, (emotionCounts.get(b.emotion) || 0) + 1);
      }
    }

    const stats = {
      total_blessings: (blessings as Blessing[])?.length || 0,
      total_participants: new Set((blessings as Blessing[]).map((b) => `${b.nickname}-${b.class}`))
        .size,
      gift_counts: Array.from(giftCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      emotion_counts: Array.from(emotionCounts.entries())
        .map(([emotion, count]) => ({ emotion, count }))
        .sort((a, b) => b.count - a.count),
    };

    let summary: string;
    let model = 'rule-fallback';

    try {
      const aiRes = await chat([
        { role: 'system', content: '你是教师节活动文案策划，只输出正文。' },
        { role: 'user', content: buildSummaryPrompt(stats) },
      ]);
      summary = aiRes.content.trim();
      model = aiRes.model;
    } catch (err) {
      if (!isNotConfigured(err)) {
        console.error('[AI] 总结生成失败，降级模板文案:', err);
      }
      const topGift = stats.gift_counts[0];
      summary =
        `${stats.total_participants} 位同学，送出了 ${stats.total_blessings} 份心意。` +
        (topGift ? `最多的礼物是${topGift.icon}${topGift.name}（${topGift.count}份）。` : '') +
        '这一年的校园里，「谢谢」是出现最多的一句话。祝全体老师教师节快乐。';
    }

    // 审计记录
    await supabase.from('ai_generations').insert({
      type: 'closing',
      input: stats,
      output: { summary },
      model,
      status: 'done',
    });

    return NextResponse.json({ summary, stats });
  } catch (err) {
    console.error('[AI] 总结异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
