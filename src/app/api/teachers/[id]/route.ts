// ============================================================
// GET /api/teachers/[id] — 获取教师信息及收到的祝福
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;

  try {
    const supabase = createClient();

    // 并行查询教师信息和祝福
    const [teacherResult, blessingsResult] = await Promise.all([
      supabase.from('teachers').select('*').eq('id', id).single(),
      supabase
        .from('blessings')
        .select('*', { count: 'exact' })
        .eq('teacher_id', id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1),
    ]);

    if (teacherResult.error) {
      return NextResponse.json({ error: '教师不存在' }, { status: 404 });
    }

    return NextResponse.json({
      teacher: teacherResult.data,
      blessings: blessingsResult.data || [],
      count: blessingsResult.count || 0,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('[API] 获取教师信息异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
