// ============================================================
// GET /api/ai/insights — 全校情绪洞察（AI-5）
// 情绪分布 + 礼物分布 + 参与规模（全部基于 approved 公开数据）
// 附带最新一条 AI 总结文案（closing 记录）
// ============================================================

import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import type { Blessing, Gift } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAnonClient();

    // approved 祝福（anon RLS 自动过滤）+ 启用礼物
    const [
      { data: blessings, error: bError },
      { data: gifts, error: gError },
      { data: summaryRows },
    ] = await Promise.all([
      supabase
        .from('blessings')
        .select('id, emotion, gift_id, nickname, class')
        .eq('status', 'approved'),
      supabase.from('gifts').select('id, name, icon'),
      supabase
        .from('ai_generations')
        .select('output')
        .eq('type', 'closing')
        .eq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    if (bError || gError) {
      console.error('[API] 洞察聚合失败:', bError || gError);
      return NextResponse.json({ error: '聚合失败' }, { status: 500 });
    }

    const giftMap = new Map((gifts as Gift[]).map((g) => [g.id, g]));
    const emotionCounts = new Map<string, number>();
    const giftCounts = new Map<string, { name: string; icon: string; count: number }>();

    for (const b of (blessings as Blessing[]) || []) {
      if (b.emotion) {
        emotionCounts.set(b.emotion, (emotionCounts.get(b.emotion) || 0) + 1);
      }
      if (b.gift_id && giftMap.has(b.gift_id)) {
        const g = giftMap.get(b.gift_id)!;
        const entry = giftCounts.get(g.id) || { name: g.name, icon: g.icon, count: 0 };
        entry.count++;
        giftCounts.set(g.id, entry);
      }
    }

    const total = (blessings as Blessing[])?.length || 0;

    const res = NextResponse.json({
      total_blessings: total,
      total_participants: new Set(
        (blessings as Blessing[]).map((b) => `${b.nickname || ''}-${b.class || ''}`)
      ).size,
      emotions: Array.from(emotionCounts.entries())
        .map(([emotion, count]) => ({ emotion, count }))
        .sort((a, b) => b.count - a.count),
      gifts: Array.from(giftCounts.values()).sort((a, b) => b.count - a.count),
      summary: (summaryRows?.[0]?.output as { summary?: string } | null)?.summary || null,
    });
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res;
  } catch (err) {
    console.error('[API] 洞察聚合异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
