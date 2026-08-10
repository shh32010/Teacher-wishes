// ============================================================
// Next.js 中间件 — Supabase Auth + admin_token 双重鉴权
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Web Crypto HMAC-SHA256 验签 — 验证 admin_token cookie 的签名 */
async function verifyAdminToken(tokenStr: string, secret: string): Promise<boolean> {
  const dotIndex = tokenStr.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === tokenStr.length - 1) return false;
  const randomPart = tokenStr.slice(0, dotIndex);
  const signature = tokenStr.slice(dotIndex + 1);

  // 将 hex 签名转为 Uint8Array
  const sigBytes = new Uint8Array(signature.length / 2);
  for (let i = 0; i < signature.length; i += 2) {
    sigBytes[i / 2] = parseInt(signature.substring(i, i + 2), 16);
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(randomPart));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 仅拦截管理后台路径和 admin API（排除登录页面和登录 API）
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (!isAdminPath || pathname.startsWith('/admin/login') || pathname === '/api/admin/login') {
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

  // 方式1：Supabase Auth session 验证
  const adminEmail = process.env.ADMIN_EMAIL;
  if (user?.email && (!adminEmail || user.email === adminEmail)) {
    return response;
  }

  // 方式2：admin_token HMAC 签名验证（后备方案，无需 Supabase Auth）
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword) {
    const adminToken = request.cookies.get('admin_token')?.value;
    if (adminToken) {
      const valid = await verifyAdminToken(adminToken, adminPassword);
      if (valid) {
        return response;
      }
    }
  }

  // 两种方式都未通过 → 重定向到登录页
  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
