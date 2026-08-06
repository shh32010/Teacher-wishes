// ============================================================
// POST /api/admin/login — 管理后台登录
// 简化版：验证密码后设置 Cookie
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';

/** 管理密码（生产环境应从环境变量读取） */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';

export async function POST(request: NextRequest) {
  // CSRF 验证（如果未设置 csrf_token Cookie 则跳过）
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const { password } = await request.json();

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    // 设置管理会话 Cookie（24小时有效）
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24小时
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
