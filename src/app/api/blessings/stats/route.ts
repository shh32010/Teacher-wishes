// ============================================================
// GET /api/blessings/stats — 获取统计数据
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { BlessingStats } from '@/types';

export async function GET() {
  try {
    const supabase = createClient();

    // 并行查询统计信息
    const [countResult, participantsResult, likesResult] = await Promise.all([
      supabase
        .from('blessings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase
        .from('blessings')
        .select('nickname', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase.from('blessings').select('likes').eq('status', 'approved'),
    ]);

    const total_likes = likesResult.data?.reduce((sum, item) => sum + (item.likes || 0), 0) || 0;

    const stats: BlessingStats = {
      total_blessings: countResult.count || 0,
      total_participants: participantsResult.count || 0,
      total_likes,
    };

    const response = NextResponse.json(stats);
    // 缓存10秒（CDN 边缘缓存 + 浏览器缓存）
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');
    return response;
  } catch (err) {
    console.error('[API] 获取统计数据异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
