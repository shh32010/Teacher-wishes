// ============================================================
// GET /api/admin/overview — 活动概览聚合（一次请求返回全部 Dashboard 数据）
// 单次全量读取 + 服务端聚合，替代前端 3 个请求（stats/insights/grouped）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchAllPages } from '@/lib/supabase/fetch-all';
import { requireAdmin } from '@/lib/auth/admin';
import type { Blessing, Gift } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    const [blessingsResult, giftsResult, summaryResult, tagRowsResult] = await Promise.all([
      fetchAllPages<Blessing>((from, to) =>
        supabase
          .from('blessings')
          .select('id, content, emotion, gift_id, nickname, class, template_id, likes, is_featured')
          .eq('status', 'approved')
          .range(from, to)
      ),
      supabase.from('gifts').select('id, name, icon'),
      supabase
        .from('ai_generations')
        .select('output')
        .eq('type', 'closing')
        .eq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(1),
      // 高频词数据源：v2 祝福引用的模板 tags
      fetchAllPages((from, to) =>
        supabase
          .from('blessings')
          .select('template: blessing_templates(tags)')
          .eq('status', 'approved')
          .not('template_id', 'is', null)
          .range(from, to)
      ),
    ]);

    if (blessingsResult.error || giftsResult.error) {
      console.error('[Admin API] 概览聚合失败:', blessingsResult.error || giftsResult.error);
      return NextResponse.json({ error: '聚合失败' }, { status: 500 });
    }

    const blessings = (blessingsResult.rows as Blessing[]) || [];
    const gifts = (giftsResult.data as Gift[]) || [];

    const giftMap = new Map(gifts.map((g) => [g.id, g]));
    const emotionCounts = new Map<string, number>();
    const giftCounts = new Map<string, { name: string; icon: string; count: number }>();
    const contentCounts = new Map<string, number>();
    const contentGiftCounts = new Map<string, number>();
    const participants = new Set<string>();
    let totalLikes = 0;

    for (const b of blessings) {
      totalLikes += b.likes;
      participants.add(`${b.nickname || ''}-${b.class || ''}`);
      if (b.emotion) emotionCounts.set(b.emotion, (emotionCounts.get(b.emotion) || 0) + 1);
      if (b.gift_id && giftMap.has(b.gift_id)) {
        const g = giftMap.get(b.gift_id)!;
        const entry = giftCounts.get(g.id) || { name: g.name, icon: g.icon, count: 0 };
        entry.count++;
        giftCounts.set(g.id, entry);
      }
      contentCounts.set(b.content, (contentCounts.get(b.content) || 0) + 1);
      if (b.gift_id) {
        contentGiftCounts.set(b.content, (contentGiftCounts.get(b.content) || 0) + 1);
      }
    }

    // 高频词：模板 tags 词频统计（top 8）
    const wordCounts = new Map<string, number>();
    for (const row of (tagRowsResult.rows as unknown as {
      template: { tags: string[] } | null;
    }[]) || []) {
      for (const tag of row.template?.tags || []) {
        wordCounts.set(tag, (wordCounts.get(tag) || 0) + 1);
      }
    }
    const topKeywords = Array.from(wordCounts.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topBlessings = Array.from(contentCounts.entries())
      .map(([content, count]) => ({ content, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      kpis: {
        total_blessings: blessings.length,
        total_gifts: Array.from(giftCounts.values()).reduce((s, g) => s + g.count, 0),
        total_participants: participants.size,
        total_likes: totalLikes,
      },
      emotions: Array.from(emotionCounts.entries())
        .map(([emotion, count]) => ({ emotion, count }))
        .sort((a, b) => b.count - a.count),
      gifts: Array.from(giftCounts.values()).sort((a, b) => b.count - a.count),
      top_blessings: topBlessings,
      top_keywords: topKeywords,
      summary: (summaryResult.data?.[0]?.output as { summary?: string } | null)?.summary || null,
    });
  } catch (err) {
    console.error('[Admin API] 概览异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
