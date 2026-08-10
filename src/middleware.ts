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
 * 支持两种格式：
 *   - 旧格式: randomPart.signature (无过期标记，向后兼容)
 *   - 新格式: randomPart.expiryTimestamp.signature (含过期时间)
 */
async function verifyAdminToken(tokenStr: string, secret: string): Promise<boolean> {
  const lastDot = tokenStr.lastIndexOf('.');
  if (lastDot === -1 || lastDot === tokenStr.length - 1) return false;

  const payload = tokenStr.slice(0, lastDot);
  const signature = tokenStr.slice(lastDot + 1);

  // 检测新格式：payload 中包含过期时间戳 (randomPart.expiryTimestamp)
  const firstDot = payload.indexOf('.');
  if (firstDot !== -1) {
    const expiry = parseInt(payload.slice(firstDot + 1), 10);
    // 过期时间戳无效或已过期 → 拒绝
    if (isNaN(expiry) || Date.now() > expiry) return false;
  }
  // 旧格式无过期标记，依赖 Cookie maxAge 控制生命周期

  return verifyHmac(payload, signature, secret);
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
  // 按优先级尝试：ADMIN_TOKEN_SECRET → ADMIN_PASSWORD（过渡期兼容旧 token）
  const tokenSecrets = [process.env.ADMIN_TOKEN_SECRET, process.env.ADMIN_PASSWORD].filter(
    (s): s is string => !!s
  );

  if (tokenSecrets.length > 0) {
    const adminToken = request.cookies.get('admin_token')?.value;
    if (adminToken) {
      for (const secret of tokenSecrets) {
        if (await verifyAdminToken(adminToken, secret)) {
          return response;
        }
      }
    }
  }

  // 两种方式都未通过 → 重定向到登录页
  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
