// ============================================================
// GET   /api/admin/settings — 活动设置全量
// PATCH /api/admin/settings — 批量更新（key 白名单 + 值校验）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';
import { requireAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

/** 可修改的运营配置 key 白名单（部署级配置一律不在此列） */
const SETTING_KEYS = [
  'activity_name',
  'activity_status',
  'start_at',
  'end_at',
  'allow_anonymous',
  'show_class',
  'allow_likes',
];

/** 各 key 的取值校验 */
function validateValue(key: string, value: string): string | null {
  if (value.length > 100) return '值过长（≤100 字）';
  switch (key) {
    case 'activity_name':
      return value.trim().length > 0 && value.trim().length <= 40 ? null : '活动名称 1~40 字';
    case 'activity_status':
      return ['open', 'closed'].includes(value) ? null : '状态只能为 open/closed';
    case 'start_at':
    case 'end_at':
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ? null : '时间格式错误';
    case 'allow_anonymous':
    case 'show_class':
    case 'allow_likes':
      return ['true', 'false'].includes(value) ? null : '开关只能为 true/false';
    default:
      return '非法配置项';
  }
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('activity_settings')
      .select('key, value, updated_at')
      .order('key');

    if (error) {
      console.error('[Admin API] 设置查询失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 转为 { key: value } 对象便于前端使用
    const settings: Record<string, string> = {};
    for (const row of data || []) {
      settings[row.key] = row.value;
    }
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('[Admin API] 设置查询异常:', err);
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
    const body: { updates?: Record<string, string> } = await request.json();
    if (!body.updates || typeof body.updates !== 'object') {
      return NextResponse.json({ error: '缺少更新内容' }, { status: 400 });
    }

    // 白名单 + 值校验
    const rows: { key: string; value: string }[] = [];
    for (const [key, value] of Object.entries(body.updates)) {
      if (!SETTING_KEYS.includes(key)) continue; // 静默忽略非白名单 key
      if (typeof value !== 'string') continue;
      const error = validateValue(key, value);
      if (error) {
        return NextResponse.json({ error: `${key}: ${error}` }, { status: 400 });
      }
      rows.push({ key, value });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: '没有有效的更新项' }, { status: 400 });
    }

    // 时间窗口校验：开始时间必须早于结束时间
    const merged: Record<string, string> = {};
    for (const r of rows) merged[r.key] = r.value;
    const mergedStart = merged.start_at;
    const mergedEnd = merged.end_at;
    if (
      mergedStart &&
      mergedEnd &&
      new Date(mergedStart).getTime() >= new Date(mergedEnd).getTime()
    ) {
      return NextResponse.json({ error: '开始时间必须早于结束时间' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('activity_settings').upsert(rows);

    if (error) {
      console.error('[Admin API] 设置更新失败:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: rows.length });
  } catch (err) {
    console.error('[Admin API] 设置更新异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
