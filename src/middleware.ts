// ============================================================
// Next.js 中间件 — 管理后台鉴权
// ============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 管理后台路径需要验证管理员身份
  // 排除登录页本身和 API 路由，避免无限重定向
  if (
    pathname.startsWith('/admin') &&
    !pathname.startsWith('/admin/login') &&
    !pathname.startsWith('/admin/api')
  ) {
    // 从 Cookie 中检查管理会话（简化方案：检查自定义 cookie）
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
