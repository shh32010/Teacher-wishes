// ============================================================
// Next.js 中间件 — admin_token HMAC 唯一鉴权
// 认证链: POST /api/admin/login → admin_token → middleware → requireAdmin → admin API
// ============================================================

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
    // 畸形 token（奇数 hex、超长等）转为拒绝
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

  // 唯一认证路径：admin_token HMAC 验签
  // 生产环境强制要求 ADMIN_TOKEN_SECRET（fail-closed），开发环境可回退到 ADMIN_PASSWORD
  const tokenSecret =
    process.env.ADMIN_TOKEN_SECRET ||
    (process.env.NODE_ENV !== 'production' ? process.env.ADMIN_PASSWORD : null);

  if (!tokenSecret) {
    console.error('[Middleware] ADMIN_TOKEN_SECRET 未配置，拒绝访问');
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const adminToken = request.cookies.get('admin_token')?.value;
  if (adminToken && (await verifyAdminToken(adminToken, tokenSecret))) {
    return NextResponse.next();
  }

  // 验签失败 → 重定向到登录页
  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
