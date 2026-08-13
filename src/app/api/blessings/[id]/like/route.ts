// ============================================================
// POST /api/blessings/[id]/like — 点赞（IP 唯一约束 + 原子递增）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';
import { getClientIp } from '@/lib/client-ip';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // CSRF 验证
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  const { id } = params;

  try {
    const anonSupabase = createAnonClient();
    const adminSupabase = createAdminClient(); // increment_likes 仅允许 service_role 调用
    const clientIp = getClientIp(request);

    // 速率限制：每 IP 每分钟最多 20 次点赞（原子化：check+insert 在同一事务）
    const { data: remaining, error: rateError } = await anonSupabase.rpc('check_rate_limit', {
      client_ip: clientIp,
      action_name: 'like_blessing',
      max_requests: 20,
      window_minutes: 1,
    });

    // fail-closed：RPC 异常时拒绝请求
    if (rateError || remaining === null) {
      console.error('[API] 点赞速率限制检查异常:', rateError);
      return NextResponse.json({ error: '系统繁忙，请稍后重试' }, { status: 503 });
    }
    if (remaining <= 0) {
      return NextResponse.json({ error: '点赞太频繁，请稍后再试' }, { status: 429 });
    }

    // 调用 RPC：尝试插入点赞记录 + 递增计数（使用 admin client，anon 已被撤销执行权限）
    const { data, error } = await adminSupabase.rpc('increment_likes', {
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
