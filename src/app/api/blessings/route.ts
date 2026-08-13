// ============================================================
// GET  /api/blessings — 获取已审核祝福列表（分页）
// POST /api/blessings — 提交新祝福
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import type { Blessing, CreateBlessingPayload, PaginatedResponse } from '@/types';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';
import { getClientIp } from '@/lib/client-ip';

export const dynamic = 'force-dynamic';

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
  // CSRF 验证（所有环境统一要求 Cookie + Header）
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const body: CreateBlessingPayload & { turnstile_token?: string } = await request.json();

    // 基础校验：先 trim 再做空值 + 长度检查，防止纯空格绕过
    const trimmedContent = (body.content || '').trim();
    if (trimmedContent.length === 0) {
      return NextResponse.json({ error: '祝福内容不能为空' }, { status: 400 });
    }
    if (trimmedContent.length > 500) {
      return NextResponse.json({ error: '祝福内容不能超过500字' }, { status: 400 });
    }

    // 昵称/班级服务端校验（前端 maxLength 可被绕过）
    const trimmedNickname = (body.nickname || '').trim();
    const trimmedClass = (body.class || '').trim();
    if (trimmedNickname.length > 20) {
      return NextResponse.json({ error: '昵称不能超过20字' }, { status: 400 });
    }
    if (trimmedClass.length > 30) {
      return NextResponse.json({ error: '班级不能超过30字' }, { status: 400 });
    }

    // 获取客户端 IP（Vercel 可信头优先，未知时 'unknown' 防共享限流桶）
    const ip = getClientIp(request);

    const supabase = createAnonClient();

    // 速率限制：每10分钟最多10条（原子化：check+insert 在同一事务中，无 TOCTOU 窗口）
    const { data: remaining, error: rateError } = await supabase.rpc('check_rate_limit', {
      client_ip: ip,
      action_name: 'submit_blessing',
      max_requests: 10,
      window_minutes: 10,
    });

    // fail-closed：RPC 异常时拒绝请求，防止攻击者通过制造 RPC 故障绕过限流
    if (rateError || remaining === null) {
      console.error('[API] 速率限制检查异常:', rateError);
      return NextResponse.json({ error: '系统繁忙，请稍后重试' }, { status: 503 });
    }
    if (remaining <= 0) {
      return NextResponse.json({ error: '发送太频繁，请10分钟后再试' }, { status: 429 });
    }

    // Turnstile 验证：
    // - 配置了 TURNSTILE_SECRET_KEY → 生产环境强制验证（缺失 token 拒绝）
    // - 未配置 → 回退到 IP 限流保护（不会阻断正常提交）
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret && process.env.NODE_ENV === 'production') {
      if (!body.turnstile_token) {
        console.error('[API] 生产环境已配置 Turnstile 但缺少 token');
        return NextResponse.json({ error: '人机验证失败，请刷新重试' }, { status: 400 });
      }
    }
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
        nickname: trimmedNickname || null,
        class: trimmedClass || null,
        content: trimmedContent,
        is_anonymous: body.is_anonymous || false,
      },
    ]);

    if (error) {
      console.error('[API] 提交祝福失败:', error);
      return NextResponse.json({ error: '提交失败，请稍后再试' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message: '祝福提交成功，等待审核后展示' },
      { status: 201 }
    );
  } catch (err) {
    console.error('[API] 提交祝福异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
