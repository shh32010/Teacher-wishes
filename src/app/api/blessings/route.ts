// ============================================================
// GET  /api/blessings — 获取已审核祝福列表（分页）
// POST /api/blessings — 提交新祝福
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Blessing, CreateBlessingPayload, PaginatedResponse } from '@/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const teacherId = searchParams.get('teacher_id');
  const offset = (page - 1) * pageSize;

  try {
    const supabase = createClient();

    let query = supabase
      .from('blessings')
      .select('*, teacher:teachers(*)', { count: 'exact' })
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // 按教师筛选
    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[API] 获取祝福列表失败:', error);
      return NextResponse.json({ error: '获取祝福列表失败' }, { status: 500 });
    }

    const response: PaginatedResponse<Blessing> = {
      data: (data as Blessing[]) || [],
      count: count || 0,
      page,
      pageSize,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[API] 获取祝福列表异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateBlessingPayload = await request.json();

    // 基础校验
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ error: '祝福内容不能为空' }, { status: 400 });
    }
    if (body.content.length > 500) {
      return NextResponse.json({ error: '祝福内容不能超过500字' }, { status: 400 });
    }

    // TODO: 敏感词过滤
    // TODO: 速率限制（IP 每10分钟最多3条）
    // TODO: Turnstile/hCaptcha 验证

    const supabase = createClient();

    const { data, error } = await supabase
      .from('blessings')
      .insert([
        {
          teacher_id: body.teacher_id || null,
          nickname: body.nickname || null,
          class: body.class || null,
          content: body.content.trim(),
          is_anonymous: body.is_anonymous || false,
        },
      ])
      .select('id, content, created_at')
      .single();

    if (error) {
      console.error('[API] 提交祝福失败:', error);
      return NextResponse.json({ error: '提交失败，请稍后再试' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[API] 提交祝福异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
