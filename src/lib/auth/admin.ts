// ============================================================
// 管理 API 纵深防御 — 每个 /api/admin/* 路由内二次验签
// 中间件是第一道防线，这里是第二道（防 matcher 配置漂移）
// ============================================================

import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

/**
 * 验证请求的 admin_token Cookie（HMAC-SHA256 无状态签名）
 * 格式: randomPart.expiryTimestamp.signature
 * 与 middleware 使用同一密钥来源：生产强制 ADMIN_TOKEN_SECRET（fail-closed），开发可回退
 * @returns true = 通过
 */
export function verifyAdminCookie(request: NextRequest): boolean {
  const tokenSecret =
    process.env.ADMIN_TOKEN_SECRET ||
    (process.env.NODE_ENV !== 'production' ? process.env.ADMIN_PASSWORD : null);
  // fail-closed：密钥未配置一律拒绝
  if (!tokenSecret) return false;

  const tokenStr = request.cookies.get('admin_token')?.value;
  if (!tokenStr) return false;

  try {
    const parts = tokenStr.split('.');
    if (parts.length !== 3) return false;

    const [randomPart, expiryStr, signatureHex] = parts;
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() > expiry) return false;

    const payload = `${randomPart}.${expiryStr}`;
    const expected = createHmac('sha256', tokenSecret).update(payload).digest('hex');
    const a = Buffer.from(signatureHex);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** 在管理 API 内二次确认管理员身份，未通过返回 false（调用方返回 401） */
export function requireAdmin(request: NextRequest): boolean {
  return verifyAdminCookie(request);
}
