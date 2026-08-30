// ============================================================
// GET /api/ai/recommend?mood=温暖 — AI 智能祝福推荐（AI-1）
// 实现策略：纯数据库 tags 语义匹配（无 LLM 调用，零成本零延迟，
// AI 服务不可用也不影响核心链路）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import type { BlessingTemplate, EmotionCategory } from '@/types';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES: EmotionCategory[] = ['感恩', '祝愿', '青春', '温暖', '文艺', '趣味'];

/** 情绪 → 语义关键词映射（tags overlap 查询用） */
const MOOD_KEYWORDS: Record<string, string[]> = {
  感恩: ['谢谢', '感恩', '感谢', '教诲', '陪伴'],
  祝愿: ['祝福', '幸福', '健康', '顺利', '桃李'],
  青春: ['青春', '回忆', '毕业', '校园', '课堂'],
  温暖: ['温暖', '温柔', '陪伴', '安心', '光'],
  文艺: ['诗意', '春风', '星空', '岁月', '远方'],
  趣味: ['轻松', '幽默', '可爱', '有趣', '魔法'],
};

export async function GET(request: NextRequest) {
  const mood = request.nextUrl.searchParams.get('mood') || '';

  try {
    const supabase = createAnonClient();

    // 1. tags 语义匹配：按关键词重叠度选出一批候选
    let recommendations: BlessingTemplate[] = [];
    if (VALID_CATEGORIES.includes(mood as EmotionCategory)) {
      const keywords = MOOD_KEYWORDS[mood] || [];

      const { data: matched, error: matchError } = await supabase
        .from('blessing_templates')
        .select('*')
        .overlaps('tags', keywords)
        .limit(20);

      if (matchError) {
        console.error('[API] 推荐匹配失败:', matchError);
      } else if (matched && matched.length > 0) {
        // 打乱候选顺序，避免每次推荐完全相同
        recommendations = matched.sort(() => Math.random() - 0.5);
      }
    }

    // 2. 匹配不足 3 条时，从对应分类（或全库）随机补齐
    if (recommendations.length < 3) {
      const missing = 3 - recommendations.length;
      let fillerQuery = supabase.from('blessing_templates').select('*');

      if (VALID_CATEGORIES.includes(mood as EmotionCategory)) {
        fillerQuery = fillerQuery.eq('category', mood);
      }

      const { data: filler } = await fillerQuery.limit(30);

      const pickedIds = new Set(recommendations.map((t) => t.id));
      const candidates = ((filler as BlessingTemplate[]) || []).filter((t) => !pickedIds.has(t.id));
      const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, missing);
      recommendations = [...recommendations, ...shuffled];
    }

    recommendations = recommendations.slice(0, 3);

    const res = NextResponse.json({ mood, recommendations });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    console.error('[API] 推荐异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
