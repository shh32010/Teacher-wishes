// ============================================================
// GET /api/gifts — 公开礼物列表
// anon client 受 RLS 限制，仅返回 is_active=true 的礼物
// ============================================================

import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import type { Gift } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[API] 礼物查询失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    const res = NextResponse.json({ gifts: (data as Gift[]) || [] });
    res.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
    return res;
  } catch (err) {
    console.error('[API] 礼物查询异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
