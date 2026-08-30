// ============================================================
// GET /api/templates — 公开词库查询（分页 + 分类筛选）
// anon client 受 RLS 限制，仅返回 is_active=true 的祝福语
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import type { BlessingTemplate, EmotionCategory, PaginatedResponse } from '@/types';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES: EmotionCategory[] = ['感恩', '祝愿', '青春', '温暖', '文艺', '趣味'];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const category = searchParams.get('category');
  const offset = (page - 1) * pageSize;

  try {
    const supabase = createAnonClient();

    let query = supabase
      .from('blessing_templates')
      .select('id, content, category, tags, sort_order', { count: 'exact' })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (category && VALID_CATEGORIES.includes(category as EmotionCategory)) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query;

    if (error) {
      // PGRST103：分页超出范围 → 返回空列表（与 /api/blessings 一致）
      if (error.code === 'PGRST103') {
        return NextResponse.json({ data: [], count: 0, page, pageSize });
      }
      console.error('[API] 词库查询失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    const response: PaginatedResponse<BlessingTemplate> = {
      data: (data as BlessingTemplate[]) || [],
      count: count || 0,
      page,
      pageSize,
    };

    const res = NextResponse.json(response);
    res.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
    return res;
  } catch (err) {
    console.error('[API] 词库查询异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
