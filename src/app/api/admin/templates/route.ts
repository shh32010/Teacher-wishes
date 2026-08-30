// ============================================================
// GET    /api/admin/templates — 词库列表（分页 + 分类筛选 + 搜索）
// POST   /api/admin/templates — 新增单条
// PATCH  /api/admin/templates — 批量更新（分类/启停/排序）
// DELETE /api/admin/templates — 批量删除（被引用仅停用）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { EmotionCategory } from '@/types';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';
import { requireAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

/** 合法词库分类（与迁移种子数据一致） */
const VALID_CATEGORIES: EmotionCategory[] = ['感恩', '祝愿', '青春', '温暖', '文艺', '趣味'];

/** UUID 格式校验（与 admin/blessings 一致） */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 校验祝福语内容：trim + 长度 5~200 + 敏感词过滤 */
async function validateTemplateContent(content: string): Promise<string | null> {
  const trimmed = content.trim();
  if (trimmed.length < 5 || trimmed.length > 200) {
    return '祝福语长度需在 5~200 字之间';
  }
  const { containsProfanity } = await import('@/lib/profanity');
  if (containsProfanity(trimmed)) {
    return '祝福语包含敏感词，请修改';
  }
  return null;
}

export async function GET(request: NextRequest) {
  // 纵深防御：中间件之外的二次验签
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));
  const offset = (page - 1) * pageSize;

  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('blessing_templates')
      .select('*', { count: 'exact' })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (category && VALID_CATEGORIES.includes(category as EmotionCategory)) {
      query = query.eq('category', category);
    }
    if (search) {
      const trimmed = search.trim().slice(0, 50);
      if (trimmed) {
        query = query.ilike('content', `%${trimmed}%`);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Admin API] 词库查询失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data, count, page, pageSize });
  } catch (err) {
    console.error('[Admin API] 词库查询异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const body: { content?: string; category?: string; tags?: string[] } = await request.json();

    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const category = typeof body.category === 'string' ? body.category : '感恩';
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      : [];

    // 输入校验
    const contentError = await validateTemplateContent(content);
    if (contentError) {
      return NextResponse.json({ error: contentError }, { status: 400 });
    }
    if (!VALID_CATEGORIES.includes(category as EmotionCategory)) {
      return NextResponse.json({ error: '非法分类' }, { status: 400 });
    }
    if (tags.length > 10 || tags.some((t) => t.length > 10)) {
      return NextResponse.json({ error: '标签最多 10 个，每个不超过 10 字' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 重复检测（同内容不允许重复入库）
    const { data: existing } = await supabase
      .from('blessing_templates')
      .select('id')
      .eq('content', content)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: '该祝福语已存在' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('blessing_templates')
      .insert({ content, category, tags })
      .select()
      .single();

    if (error) {
      console.error('[Admin API] 词库新增失败:', error);
      return NextResponse.json({ error: '新增失败' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[Admin API] 词库新增异常:', err);
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
    const body: {
      ids?: string[];
      updates?: { category?: string; is_active?: boolean; sort_order?: number };
    } = await request.json();

    if (!body.ids || body.ids.length === 0 || body.ids.length > 100) {
      return NextResponse.json({ error: '请指定 1~100 个模板ID' }, { status: 400 });
    }
    if (!body.ids.every((id: string) => UUID_RE.test(id))) {
      return NextResponse.json({ error: '非法模板ID' }, { status: 400 });
    }
    if (!body.updates || typeof body.updates !== 'object') {
      return NextResponse.json({ error: '缺少更新字段' }, { status: 400 });
    }

    // 字段白名单过滤 — 防止修改 content/tags 等任意列
    const allowedUpdates: Record<string, unknown> = {};
    if (body.updates.category !== undefined) {
      if (VALID_CATEGORIES.includes(body.updates.category as EmotionCategory)) {
        allowedUpdates.category = body.updates.category;
      } else {
        return NextResponse.json({ error: '非法分类' }, { status: 400 });
      }
    }
    if (typeof body.updates.is_active === 'boolean') {
      allowedUpdates.is_active = body.updates.is_active;
    }
    if (typeof body.updates.sort_order === 'number' && Number.isInteger(body.updates.sort_order)) {
      allowedUpdates.sort_order = body.updates.sort_order;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: '没有有效的更新字段' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('blessing_templates')
      .update({ ...allowedUpdates, updated_at: new Date().toISOString() })
      .in('id', body.ids)
      .select('id, category, is_active, sort_order');

    if (error) {
      console.error('[Admin API] 词库更新失败:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[Admin API] 词库更新异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const body: { ids?: string[] } = await request.json();

    if (!body.ids || body.ids.length === 0 || body.ids.length > 100) {
      return NextResponse.json({ error: '请指定 1~100 个模板ID' }, { status: 400 });
    }
    if (!body.ids.every((id: string) => UUID_RE.test(id))) {
      return NextResponse.json({ error: '非法模板ID' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 被祝福引用的模板禁止物理删除 → 降级为停用（保留历史祝福的引用完整性）
    const { data: refs, error: refError } = await supabase
      .from('blessings')
      .select('template_id')
      .in('template_id', body.ids);

    if (refError) {
      console.error('[Admin API] 引用查询失败:', refError);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    const referenced = new Set((refs || []).map((r) => r.template_id));
    const deletable = body.ids.filter((id) => !referenced.has(id));
    const deactivable = body.ids.filter((id) => referenced.has(id));

    let deleted = 0;
    let deactivated = 0;

    if (deletable.length > 0) {
      const { error } = await supabase.from('blessing_templates').delete().in('id', deletable);
      if (error) {
        console.error('[Admin API] 词库删除失败:', error);
        return NextResponse.json({ error: '删除失败' }, { status: 500 });
      }
      deleted = deletable.length;
    }

    if (deactivable.length > 0) {
      const { error } = await supabase
        .from('blessing_templates')
        .update({ is_active: false })
        .in('id', deactivable);
      if (error) {
        console.error('[Admin API] 词库停用失败:', error);
        return NextResponse.json({ error: '删除失败' }, { status: 500 });
      }
      deactivated = deactivable.length;
    }

    return NextResponse.json({
      deleted,
      deactivated,
      message:
        deactivated > 0 ? `${deactivated} 条已被学生使用，已改为停用（不可物理删除）` : undefined,
    });
  } catch (err) {
    console.error('[Admin API] 词库删除异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
