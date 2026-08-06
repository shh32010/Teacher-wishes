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

    // 区分错误类型：PGRST116 = 单行查询无结果（404），其他 = 服务端错误（500）
    if (teacherResult.error) {
      if (teacherResult.error.code === 'PGRST116') {
        return NextResponse.json({ error: '教师不存在' }, { status: 404 });
      }
      console.error('[API] 教师查询失败:', teacherResult.error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    const response = NextResponse.json({
      teacher: teacherResult.data,
      blessings: blessingsResult.data || [],
      count: blessingsResult.count || 0,
      page,
      pageSize,
    });
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response;
  } catch (err) {
    console.error('[API] 获取教师信息异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
