// ============================================================
// GET /api/teachers — 教师列表
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: teachers, error } = await supabase.from('teachers').select('*').order('name');

    if (error) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ teachers });
  } catch (err) {
    console.error('[API] 获取教师列表异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
