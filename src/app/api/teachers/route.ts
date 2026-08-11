// ============================================================
// GET /api/teachers — 教师列表
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: teachers, error } = await supabase
      .from('teachers')
      .select('id, name, department, avatar_url')
      .order('name');

    if (error) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    const response = NextResponse.json({ teachers });
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (err) {
    console.error('[API] 获取教师列表异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
