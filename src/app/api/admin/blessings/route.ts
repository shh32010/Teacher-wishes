// ============================================================
// GET   /api/admin/blessings — 管理后台获取所有祝福
// PATCH /api/admin/blessings — 批量审核/置顶/精选祝福
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { AdminUpdateBlessing } from '@/types';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';
import { requireAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 纵深防御：中间件之外的二次验签
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status'); // pending | approved | rejected
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;

  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('blessings')
      // v2 显式字段：不再返回 teacher 关联（教师体系已退出后台）
      .select(
        `id, content, nickname, class, is_anonymous, likes, is_featured,
         status, emotion, template_id, gift_id, created_at,
         gift:gifts(id, name, icon)`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Admin API] 查询失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // sentence_count 由数据库侧聚合（RPC GROUP BY），避免全表扫描到应用层；
    // 统计结果仅去重句数量级（≤ 数百行），一次 RPC 轻量返回
    const { data: statsRows, error: statsError } = await supabase.rpc('get_sentence_stats');

    if (statsError) {
      console.error('[Admin API] 句计数 RPC 失败:', statsError);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    const contentCounts = new Map<string, number>();
    for (const row of (statsRows as { content: string; sentence_count: number }[]) || []) {
      contentCounts.set(row.content, Number(row.sentence_count));
    }
    const dataWithCount = ((data as Record<string, unknown>[]) || []).map((b) => ({
      ...b,
      sentence_count: contentCounts.get(String(b.content)) || 1,
    }));

    return NextResponse.json({ data: dataWithCount, count, page, pageSize });
  } catch (err) {
    console.error('[Admin API] 查询异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // 纵深防御：中间件之外的二次验签
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  // CSRF 验证（所有环境统一要求 Cookie + Header）
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const body: { ids?: string[]; contents?: string[] } = await request.json();

    const supabase = createAdminClient();

    // v2 句级治理：按 content 删除该句全部祝福（治理列表为同句聚合）
    if (body.contents && body.contents.length > 0) {
      if (
        body.contents.length > 50 ||
        body.contents.some((c: string) => typeof c !== 'string' || c.length > 200)
      ) {
        return NextResponse.json({ error: '非法删除内容' }, { status: 400 });
      }
      const { data, error } = await supabase
        .from('blessings')
        .delete()
        .in('content', body.contents)
        .select('id');
      if (error) {
        console.error('[Admin API] 按内容删除失败:', error);
        return NextResponse.json({ error: '删除失败' }, { status: 500 });
      }
      return NextResponse.json({ deleted: data?.length || 0 });
    }

    if (!body.ids || body.ids.length === 0 || body.ids.length > 100) {
      return NextResponse.json({ error: '请指定 1~100 个祝福ID' }, { status: 400 });
    }

    // ID 必须是合法 UUID
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!body.ids.every((id: string) => UUID_RE.test(id))) {
      return NextResponse.json({ error: '非法祝福ID' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('blessings')
      .delete()
      .in('id', body.ids)
      .select('id');

    if (error) {
      console.error('[Admin API] 删除失败:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ deleted: data?.length || 0 });
  } catch (err) {
    console.error('[Admin API] 删除异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  // 纵深防御：中间件之外的二次验签
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  // CSRF 验证（所有环境统一要求 Cookie + Header）
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const body: { ids: string[]; updates: AdminUpdateBlessing } = await request.json();

    if (!body.ids || body.ids.length === 0) {
      return NextResponse.json({ error: '请指定要更新的祝福ID' }, { status: 400 });
    }

    // 字段白名单过滤 — 防止攻击者通过 updates 修改任意列（content、likes、user_id 等）
    const allowedUpdates: Record<string, unknown> = {};
    if (body.updates.status !== undefined) {
      // 仅允许有效的审核状态值
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (validStatuses.includes(body.updates.status)) {
        allowedUpdates.status = body.updates.status;
      }
    }
    if (typeof body.updates.is_featured === 'boolean') {
      allowedUpdates.is_featured = body.updates.is_featured;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: '没有有效的更新字段' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('blessings')
      .update(allowedUpdates)
      .in('id', body.ids)
      .select('id, status, is_featured');

    if (error) {
      console.error('[Admin API] 更新失败:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[Admin API] 更新异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
