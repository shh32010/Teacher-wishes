// ============================================================
// POST /api/blessings/[id]/like — 为祝福点赞（RPC 原子递增）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
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
