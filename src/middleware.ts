// ============================================================
// Next.js 中间件 — 管理后台鉴权
// ============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 管理后台路径需要验证管理员身份
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // 从 Cookie 中检查管理会话（简化方案：检查自定义 cookie）
    const adminToken = request.cookies.get('admin_token')?.value;

    // 实际项目中应从环境变量或 Supabase Auth 验证
    if (!adminToken) {
      // 重定向到管理登录页或首页
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
