// ============================================================
// GET   /api/admin/gifts — 礼物列表（含停用，管理端全量视图）
// PATCH /api/admin/gifts — 批量更新（文案/开关/排序）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';
import { requireAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

/** 允许运营修改的字段白名单（animation 为受控列，禁止修改） */
const UPDATABLE_FIELDS = ['name', 'icon', 'description', 'is_active', 'sort_order'] as const;

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[Admin API] 礼物查询失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ gifts: data });
  } catch (err) {
    console.error('[Admin API] 礼物查询异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const body: { ids?: string[]; updates?: Record<string, unknown> } = await request.json();

    if (!body.ids || body.ids.length === 0 || body.ids.length > 20) {
      return NextResponse.json({ error: '请指定 1~20 个礼物ID' }, { status: 400 });
    }
    if (!body.updates || typeof body.updates !== 'object') {
      return NextResponse.json({ error: '缺少更新字段' }, { status: 400 });
    }

    // 字段白名单过滤 — 防止修改 id/animation/usage_count 等受控列
    const allowedUpdates: Record<string, unknown> = {};
    for (const field of UPDATABLE_FIELDS) {
      const value = body.updates[field];
      if (value === undefined) continue;
      if (field === 'name' || field === 'icon' || field === 'description') {
        if (typeof value !== 'string' || value.length > 50) {
          return NextResponse.json({ error: `字段 ${field} 非法` }, { status: 400 });
        }
        allowedUpdates[field] = value;
      } else if (field === 'is_active') {
        if (typeof value !== 'boolean') {
          return NextResponse.json({ error: 'is_active 必须为布尔值' }, { status: 400 });
        }
        allowedUpdates[field] = value;
      } else if (field === 'sort_order') {
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          return NextResponse.json({ error: 'sort_order 必须为整数' }, { status: 400 });
        }
        allowedUpdates[field] = value;
      }
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: '没有有效的更新字段' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('gifts')
      .update(allowedUpdates)
      .in('id', body.ids)
      .select('id, name, icon, description, is_active, sort_order');

    if (error) {
      console.error('[Admin API] 礼物更新失败:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[Admin API] 礼物更新异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
