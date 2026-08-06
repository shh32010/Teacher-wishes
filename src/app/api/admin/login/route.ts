// ============================================================
// POST /api/admin/login — 管理后台登录
// 验证密码后设置加密 Cookie（24小时有效）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';

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
    const { password } = await request.json();

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    // 生成加密随机 token（64 字符 hex，不可预测/伪造）
    const token = randomBytes(32).toString('hex');

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
