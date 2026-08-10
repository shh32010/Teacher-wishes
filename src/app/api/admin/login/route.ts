// ============================================================
// POST /api/admin/login — 管理后台登录
// 验证密码后设置加密 Cookie（24小时有效）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHmac } from 'crypto';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';
import { createAnonClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // CSRF 验证
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  // 管理密码必须通过环境变量配置（无默认值，防止弱密码）
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    console.error('[Admin] ADMIN_PASSWORD 环境变量未设置，拒绝登录');
    return NextResponse.json({ error: '服务未配置，请联系管理员' }, { status: 500 });
  }

  try {
    // 速率限制：每 IP 每分钟最多 5 次登录尝试
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const supabase = createAnonClient();
    const { data: remaining, error: rateError } = await supabase.rpc('check_rate_limit', {
      client_ip: ip,
      action_name: 'admin_login',
      max_requests: 5,
      window_minutes: 1,
    });

    if (rateError || remaining === null) {
      console.error('[Admin] 登录速率限制检查异常:', rateError);
      return NextResponse.json({ error: '系统繁忙，请稍后重试' }, { status: 503 });
    }
    if (remaining <= 0) {
      return NextResponse.json({ error: '登录尝试过多，请1分钟后再试' }, { status: 429 });
    }

    const { password } = await request.json();

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    // 生成 HMAC 签名 token（可被中间件验证，无需服务端存储）
    const randomPart = randomBytes(16).toString('hex');
    const signature = createHmac('sha256', ADMIN_PASSWORD).update(randomPart).digest('hex');
    const token = `${randomPart}.${signature}`;

    // 设置管理会话 Cookie（24小时有效）
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24小时
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[Admin] 登录异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
