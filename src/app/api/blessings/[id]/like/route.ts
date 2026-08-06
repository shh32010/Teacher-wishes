// ============================================================
// POST /api/blessings/[id]/like — 为祝福点赞（RPC 原子递增）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // CSRF 验证（如果未设置 csrf_token Cookie 则跳过）
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  const { id } = params;

  try {
    const supabase = createAnonClient();

    // 调用 Postgres RPC 函数（SECURITY DEFINER，绕过 RLS）
    const { data, error } = await supabase.rpc('increment_likes', {
      blessing_id: id,
    });

    if (error) {
      console.error('[API] 点赞失败:', error);
      return NextResponse.json({ error: '点赞失败' }, { status: 500 });
    }

    return NextResponse.json({ id, likes_count: data });
  } catch (err) {
    console.error('[API] 点赞异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
