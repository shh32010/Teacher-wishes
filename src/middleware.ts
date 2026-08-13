// ============================================================
// Next.js 中间件 — Supabase Auth + admin_token 双重鉴权
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** 将 hex 字符串转为 Uint8Array */
function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes as Uint8Array<ArrayBuffer>;
}

/** Web Crypto HMAC-SHA256 验签 */
async function verifyHmac(payload: string, signatureHex: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  return crypto.subtle.verify('HMAC', key, hexToBytes(signatureHex), encoder.encode(payload));
}

/**
 * 验证 admin_token Cookie
 * 格式: randomPart.expiryTimestamp.signature
 * payload = randomPart.expiryTimestamp，HMAC 签名覆盖整个 payload
 */
async function verifyAdminToken(tokenStr: string, secret: string): Promise<boolean> {
  try {
    const parts = tokenStr.split('.');
    if (parts.length !== 3) return false; // 必须为三部分

    const [randomPart, expiryStr, signature] = parts;
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() > expiry) return false;

    const payload = `${randomPart}.${expiryStr}`;
    return await verifyHmac(payload, signature, secret);
  } catch {
    // 畸形 token（奇数 hex、超长等）导致 500，转为拒绝
    return false;
  }
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
  // fail-closed：ADMIN_EMAIL 未配置时任何 session 都不放行
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user?.email === adminEmail) {
    return response;
  }

  // 方式2：admin_token HMAC 签名验证（后备方案，无需 Supabase Auth）
  // 生产环境强制要求 ADMIN_TOKEN_SECRET，开发环境可回退到 ADMIN_PASSWORD
  const tokenSecret =
    process.env.ADMIN_TOKEN_SECRET ||
    (process.env.NODE_ENV !== 'production' ? process.env.ADMIN_PASSWORD : null);

  if (tokenSecret) {
    const adminToken = request.cookies.get('admin_token')?.value;
    if (adminToken) {
      const valid = await verifyAdminToken(adminToken, tokenSecret);
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
