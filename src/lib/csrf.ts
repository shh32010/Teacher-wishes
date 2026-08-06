// ============================================================
// CSRF 防护工具 — Double Submit Cookie 模式
// ============================================================
// 原理：
//   1. GET /api/csrf 生成随机 token，设置为 httpOnly=false 的 Cookie
//      并在响应体中返回
//   2. 前端从响应体拿到 token，在后续 POST/PATCH 请求头中携带
//      X-CSRF-Token
//   3. 服务端比对 Cookie 与 Header 中的 token 是否一致
//   4. 攻击者无法读取跨域 Cookie，因此无法伪造 Header
//
// 向后兼容：如果请求不携带 csrf_token Cookie，跳过验证（开发模式）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/** Cookie 名称 */
const CSRF_COOKIE_NAME = 'csrf_token';

/** Token 有效期（秒） */
const CSRF_MAX_AGE = 60 * 60; // 1小时

/** HTTP 请求头名称 */
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * 生成 CSRF Token
 * 使用 crypto.randomBytes 生成 32 字节随机数，转为 hex 字符串（64 字符）
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 在 NextResponse 上设置 CSRF Cookie
 * - httpOnly=false：前端 JS 需要读取此 cookie
 * - sameSite=lax：允许同站请求携带，阻止跨站 POST
 * - secure：生产环境仅 HTTPS
 */
export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CSRF_MAX_AGE,
  });
}

/**
 * 验证 CSRF Token
 * 比较请求头 X-CSRF-Token 与 csrf_token Cookie 的值
 *
 * 如果请求未携带 csrf_token Cookie，则跳过验证（向后兼容，方便本地开发）
 *
 * @returns true 表示验证通过
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME);

  // 生产环境：Cookie 缺失 → 拒绝（防止攻击者不携带 Cookie 绕过 CSRF）
  // 开发环境：向后兼容，跳过验证
  if (!csrfCookie) {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    return true;
  }

  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  // Cookie 存在但 Header 缺失或值不匹配 → 拒绝
  if (!headerToken || csrfCookie.value !== headerToken) {
    return false;
  }

  return true;
}

/**
 * 创建一个 403 响应，提示 CSRF 验证失败
 */
export function csrfErrorResponse(): NextResponse {
  return NextResponse.json({ error: 'CSRF 验证失败，请刷新页面后重试' }, { status: 403 });
}
