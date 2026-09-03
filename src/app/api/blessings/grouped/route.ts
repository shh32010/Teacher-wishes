// ============================================================
// GET /api/blessings/grouped?sort=time|likes — 祝福同句聚合（UX-1）
// 词库时代大量祝福内容重复，按 content 分组展示；
// 数据量级（approved ≤ 数千条，内容短）全量取回 JS 聚合，无需分页
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import { fetchAllPages } from '@/lib/supabase/fetch-all';
import { groupBlessings } from '@/lib/group-blessings';
import type { Blessing } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sort = request.nextUrl.searchParams.get('sort') === 'likes' ? 'likes' : 'time';

  try {
    const supabase = createAnonClient();

    // 快照时间戳：分页前锁定数据边界，防活动期间并发写入导致
    // offset 分页漂移漏读/重读（快照之后的新插入进入下一次刷新）
    const { data: latestRow } = await supabase
      .from('blessings')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);
    const snapshot = (latestRow?.[0] as { created_at?: string } | undefined)?.created_at;

    // anon RLS 自动只返回 approved；按时间倒序取全量（聚合的「最新」语义依赖此顺序）
    // 明确字段：不再返回 teacher 关联（v2 叙事统一献给全体老师）
    // 经 fetchAllPages 循环分页，绕过 PostgREST 单次 1000 行上限
    const { rows: allRows, error: queryError } = await fetchAllPages<Blessing>((from, to) =>
      supabase
        .from('blessings')
        .select(
          `id, content, nickname, class, is_anonymous, likes, is_featured,
             created_at, emotion, template_id, gift_id,
             gift:gifts(id, name, icon)`
        )
        .eq('status', 'approved')
        .lte('created_at', snapshot ?? new Date().toISOString())
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    if (queryError) {
      console.error('[API] 聚合查询失败:', queryError);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 字段化 select 不含 user_id/teacher_id 等 DB 内部列；teacher 关联为 many-to-one
    // 运行时返回对象（supabase-js 类型推断保守为数组），聚合逻辑按对象读取
    const blessings = (allRows as unknown as Blessing[]) || [];
    const groups = groupBlessings(blessings, sort);

    const res = NextResponse.json({
      groups,
      total_blessings: blessings.length,
      total_groups: groups.length,
      sort,
    });
    // 实时性优先：聚合查询本身轻量，禁用共享缓存——
    // 否则 Cloudflare 边缘缓存会在 Realtime 刷新时返回旧响应
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    console.error('[API] 聚合异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
