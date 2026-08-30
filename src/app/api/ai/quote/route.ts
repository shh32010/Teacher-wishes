// ============================================================
// GET /api/ai/quote — 今日金句（管理员确认后展示，AI-4）
// 读取最新一条已确认金句；无金句时返回 null（前端隐藏区块）
// ============================================================

import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from('ai_generations')
      .select('output, created_at')
      .eq('type', 'quote_of_day')
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[API] 金句查询失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ quote: null });
    }

    const quote = (data[0].output as { content?: string } | null)?.content || null;

    const res = NextResponse.json({ quote, created_at: data[0].created_at });
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res;
  } catch (err) {
    console.error('[API] 金句查询异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
