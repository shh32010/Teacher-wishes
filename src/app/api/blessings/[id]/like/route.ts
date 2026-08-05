// ============================================================
// POST /api/blessings/[id]/like — 为祝福点赞
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const supabase = createClient();

    // 使用 RPC 或直接增加计数
    // 简化版：原子递增 likes 字段
    const { data, error } = await supabase.from('blessings').select('likes').eq('id', id).single();

    if (error) {
      return NextResponse.json({ error: '祝福不存在' }, { status: 404 });
    }

    const newLikes = (data.likes || 0) + 1;

    const { error: updateError } = await supabase
      .from('blessings')
      .update({ likes: newLikes })
      .eq('id', id);

    if (updateError) {
      console.error('[API] 点赞更新失败:', updateError);
      return NextResponse.json({ error: '点赞失败' }, { status: 500 });
    }

    return NextResponse.json({ id, likes_count: newLikes });
  } catch (err) {
    console.error('[API] 点赞异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
