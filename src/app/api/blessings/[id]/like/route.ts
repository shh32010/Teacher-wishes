// ============================================================
// POST /api/blessings/[id]/like — 点赞（IP 唯一约束 + 原子递增）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';

/** 从请求中提取客户端真实 IP */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  // 本地开发回退
  return '127.0.0.1';
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // CSRF 验证
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  const { id } = params;

  try {
    const supabase = createAnonClient();
    const clientIp = getClientIp(request);

    // 调用 RPC：尝试插入点赞记录 + 递增计数
    const { data, error } = await supabase.rpc('increment_likes', {
      blessing_id: id,
      client_ip: clientIp,
    });

    if (error) {
      console.error('[API] 点赞 RPC 失败:', error);
      return NextResponse.json({ error: '点赞失败' }, { status: 500 });
    }

    // RPC 返回 -1 表示已点过赞（unique_violation）
    if (data === -1) {
      return NextResponse.json({ error: '你已经点过赞了' }, { status: 409 });
    }

    return NextResponse.json({ id, likes_count: data });
  } catch (err) {
    console.error('[API] 点赞异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
