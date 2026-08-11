// ============================================================
// GET   /api/admin/blessings — 管理后台获取所有祝福
// PATCH /api/admin/blessings — 批量审核/置顶/精选祝福
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { AdminUpdateBlessing } from '@/types';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status'); // pending | approved | rejected
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;

  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('blessings')
      .select('*, teacher:teachers(*)', { count: 'exact' })
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

    return NextResponse.json({ data, count, page, pageSize });
  } catch (err) {
    console.error('[Admin API] 查询异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  // CSRF 验证（如果未设置 csrf_token Cookie 则跳过）
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
