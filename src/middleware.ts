// ============================================================
// Next.js 中间件 — Supabase Auth 管理后台鉴权
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 仅拦截管理后台路径
  if (
    !pathname.startsWith('/admin') ||
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/admin/api')
  ) {
    return NextResponse.next();
  }

  // 创建 Supabase 客户端验证 Session
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 检查是否为管理员（匹配 ADMIN_EMAIL 环境变量）
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!user?.email || (adminEmail && user.email !== adminEmail)) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // 非 admin 用户重定向
  if (adminEmail && user.email !== adminEmail) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
