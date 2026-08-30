// ============================================================
// GET /api/blessings/grouped?sort=time|likes — 祝福同句聚合（UX-1）
// 词库时代大量祝福内容重复，按 content 分组展示；
// 数据量级（approved ≤ 数千条，内容短）全量取回 JS 聚合，无需分页
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import { groupBlessings } from '@/lib/group-blessings';
import type { Blessing } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sort = request.nextUrl.searchParams.get('sort') === 'likes' ? 'likes' : 'time';

  try {
    const supabase = createAnonClient();

    // anon RLS 自动只返回 approved；按时间倒序取全量（聚合的「最新」语义依赖此顺序）
    const { data, error } = await supabase
      .from('blessings')
      .select('*, teacher:teachers(*), gift:gifts(*)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(3000);

    if (error) {
      console.error('[API] 聚合查询失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    const blessings = (data as Blessing[]) || [];
    const groups = groupBlessings(blessings, sort);

    const res = NextResponse.json({
      groups,
      total_blessings: blessings.length,
      total_groups: groups.length,
      sort,
    });
    res.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
    return res;
  } catch (err) {
    console.error('[API] 聚合异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
