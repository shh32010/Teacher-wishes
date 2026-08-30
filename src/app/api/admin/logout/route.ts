// ============================================================
// POST /api/admin/logout — 退出登录
// 清除 admin_token Cookie（httpOnly 无法从前端删除）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 纵深防御：与其它管理 API 一致，防止未授权登出（logout CSRF）
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  // 覆盖 admin_token 为过期值，让中间件验签失败
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
