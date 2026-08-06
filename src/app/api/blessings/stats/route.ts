// ============================================================
// GET /api/blessings/stats — 获取统计数据
// ============================================================

import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import type { BlessingStats } from '@/types';

export async function GET() {
  try {
    const supabase = createAnonClient();

    // 并行查询：祝福总数 + 点赞总和
    const [countResult, likesResult] = await Promise.all([
      supabase
        .from('blessings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase.from('blessings').select('likes').eq('status', 'approved'),
    ]);

    // 应用层求和（数据量小时可行，大数据量时建议改用 DB SUM 聚合）
    const total_likes = (likesResult.data ?? []).reduce((sum, item) => sum + (item.likes || 0), 0);

    const stats: BlessingStats = {
      total_blessings: countResult.count || 0,
      total_participants: countResult.count || 0, // 当前参与者 = 祝福总数（未做去重）
      total_likes,
    };

    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');
    return response;
  } catch (err) {
    console.error('[API] 获取统计数据异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
