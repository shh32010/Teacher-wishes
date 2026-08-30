// ============================================================
// 客户端 IP 提取 — 统一所有 API 的 IP 来源
// 优先 Vercel 可信头，避免直接信任客户端可伪造的 x-forwarded-for
// ============================================================

import type { NextRequest } from 'next/server';

/**
 * 从请求中提取客户端真实 IP
 * - Vercel 部署：x-vercel-forwarded-for 是平台写入的可信头
 * - 其他代理：x-forwarded-for / x-real-ip（仅作 fallback）
 * - 无法判断时返回 'unknown'，绝不回退 127.0.0.1
 *   （避免代理头缺失时所有用户共享一个限流桶导致集体 429）
 */
export function getClientIp(request: NextRequest): string {
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.split(',')[0].trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}
