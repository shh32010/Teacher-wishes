// ============================================================
// GET /api/blessings/stats — 获取统计数据
// ============================================================

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { BlessingStats } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // service_role 绕过 RLS，才能查到 pending/rejected 数量
    const supabase = createAdminClient();

    // 并行查询：各状态计数 + 点赞总和 + 上墙内容（算 distinct 句数）
    const [approvedRes, pendingRes, rejectedRes, likesRes, contentsRes] = await Promise.all([
      supabase
        .from('blessings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase
        .from('blessings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('blessings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'rejected'),
      supabase.from('blessings').select('likes').eq('status', 'approved'),
      supabase.from('blessings').select('content').eq('status', 'approved'),
    ]);

    const approvedCount = approvedRes.count || 0;
    const pendingCount = pendingRes.count || 0;
    const rejectedCount = rejectedRes.count || 0;
    const total_likes = (likesRes.data ?? []).reduce((sum, item) => sum + (item.likes || 0), 0);
    // 上墙句数（同句多人送出合并为一颗星星/一张墙卡 → 芯河星星数）
    const total_groups = new Set(
      ((contentsRes.data ?? []) as { content?: string }[]).map((r) => r.content)
    ).size;

    const stats = {
      total_blessings: approvedCount,
      total_participants: approvedCount,
      total_groups,
      total_likes,
      pending_count: pendingCount,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
      total_count: approvedCount + pendingCount + rejectedCount,
    } satisfies BlessingStats;

    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');
    return response;
  } catch (err) {
    console.error('[API] 获取统计数据异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
