// ============================================================
// GET /api/csrf — 获取 CSRF Token
// 生成随机 token，同时设置为 Cookie 并在响应体中返回
// 前端在提交写操作前先调用此接口获取 token
// ============================================================

import { NextResponse } from 'next/server';
import { generateCsrfToken, setCsrfCookie } from '@/lib/csrf';

export async function GET() {
  const token = generateCsrfToken();
  const response = NextResponse.json({ token });
  // 每次生成的 token 都不同，禁止任何缓存
  response.headers.set('Cache-Control', 'no-store');
  setCsrfCookie(response, token);
  return response;
}
