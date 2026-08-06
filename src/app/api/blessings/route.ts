// ============================================================
// GET  /api/blessings — 获取已审核祝福列表（分页）
// POST /api/blessings — 提交新祝福
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import type { Blessing, CreateBlessingPayload, PaginatedResponse } from '@/types';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const teacherId = searchParams.get('teacher_id');
  const sort = searchParams.get('sort') || 'time'; // 'time' | 'likes'
  const offset = (page - 1) * pageSize;

  // 排序字段映射
  const sortField = sort === 'likes' ? 'likes' : 'created_at';

  try {
    // GET 接口为公开读，使用 anon client（不依赖 Cookie/Session）
    const supabase = createAnonClient();

    let query = supabase
      .from('blessings')
      .select('*, teacher:teachers(*)', { count: 'exact' })
      .eq('status', 'approved')
      .order(sortField, { ascending: false })
      .range(offset, offset + pageSize - 1);

    // 按教师筛选
    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }

    const { data, error, count } = await query;

    if (error) {
      // PGRST103: 请求范围超出数据总量（如请求第3页但只有40条数据）
      // 这不是真的错误，返回空列表即可
      if (error.code === 'PGRST103') {
        return NextResponse.json({
          data: [],
          count: 0,
          page,
          pageSize,
        });
      }
      console.error('[API] 获取祝福列表失败:', JSON.stringify(error));
      return NextResponse.json(
        { error: '获取祝福列表失败', detail: error.message, code: error.code },
        { status: 500 }
      );
    }

    const response: PaginatedResponse<Blessing> = {
      data: (data as Blessing[]) || [],
      count: count || 0,
      page,
      pageSize,
    };

    const res = NextResponse.json(response);
    res.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
    return res;
  } catch (err) {
    console.error('[API] 获取祝福列表异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // CSRF 验证（如果未设置 csrf_token Cookie 则跳过）
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const body: CreateBlessingPayload & { turnstile_token?: string } = await request.json();

    // 基础校验
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ error: '祝福内容不能为空' }, { status: 400 });
    }
    if (body.content.length > 500) {
      return NextResponse.json({ error: '祝福内容不能超过500字' }, { status: 400 });
    }

    // 获取客户端 IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const supabase = createAnonClient();

    // 速率限制：每10分钟最多3条
    const { data: remaining, error: rateError } = await supabase.rpc('check_rate_limit', {
      client_ip: ip,
      action_name: 'submit_blessing',
      max_requests: 3,
      window_minutes: 10,
    });

    if (!rateError && remaining !== null && remaining <= 0) {
      return NextResponse.json({ error: '发送太频繁，请10分钟后再试' }, { status: 429 });
    }

    // Turnstile 验证（如果配置了密钥）
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret && body.turnstile_token) {
      const turnstileRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: turnstileSecret,
            response: body.turnstile_token,
          }),
        }
      );
      const turnstileData = await turnstileRes.json();
      if (!turnstileData.success) {
        return NextResponse.json({ error: '人机验证失败，请刷新重试' }, { status: 400 });
      }
    }

    // 插入祝福（不使用 .select()，避免 RLS SELECT 冲突）
    const { error } = await supabase.from('blessings').insert([
      {
        teacher_id: body.teacher_id || null,
        nickname: body.nickname || null,
        class: body.class || null,
        content: body.content.trim(),
        is_anonymous: body.is_anonymous || false,
      },
    ]);

    if (error) {
      console.error('[API] 提交祝福失败:', error);
      return NextResponse.json({ error: '提交失败，请稍后再试' }, { status: 500 });
    }

    // 写入速率限制记录
    await supabase.from('rate_limits').insert([{ ip, action: 'submit_blessing' }]);

    return NextResponse.json(
      { success: true, message: '祝福提交成功，等待审核后展示' },
      { status: 201 }
    );
  } catch (err) {
    console.error('[API] 提交祝福异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
