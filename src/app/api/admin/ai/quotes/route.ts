// ============================================================
// POST  /api/admin/ai/quotes — 生成今日金句候选（AI 打分，AI-4）
// PATCH /api/admin/ai/quotes — 管理员确认金句（写入 quote_of_day）
// 无 AI key 时降级：按点赞数排序取前 5
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';
import { requireAdmin } from '@/lib/auth/admin';
import { chat, parseJsonLoose, isNotConfigured } from '@/lib/ai/provider';
import { buildQuoteScorePrompt, type QuoteScoreResult } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

/** 候选池：最新 50 条已审核祝福，按内容去重 */
const CANDIDATE_LIMIT = 50;

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const supabase = createAdminClient();

    const { data: blessings, error: queryError } = await supabase
      .from('blessings')
      .select('id, content, likes')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(CANDIDATE_LIMIT);

    if (queryError) {
      console.error('[AI] 金句候选查询失败:', queryError);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }
    if (!blessings || blessings.length === 0) {
      return NextResponse.json({ candidates: [], message: '暂无已审核祝福' });
    }

    // 内容去重（同一条词库祝福可能被多人选择）
    const seen = new Set<string>();
    const unique = blessings.filter((b) => {
      if (seen.has(b.content)) return false;
      seen.add(b.content);
      return true;
    });

    const contents = unique.map((b) => b.content);
    let scores: { index: number; score: number; reason: string }[] = [];
    let mode: 'ai' | 'rule' = 'ai';
    let model = 'rule-fallback';

    try {
      const aiRes = await chat([
        { role: 'system', content: '你是教师节祝福语评审，只输出 JSON。' },
        { role: 'user', content: buildQuoteScorePrompt(contents) },
      ]);
      const parsed = parseJsonLoose<QuoteScoreResult>(aiRes.content);
      scores = parsed.scores || [];
      model = aiRes.model;
    } catch (err) {
      if (!isNotConfigured(err)) {
        console.error('[AI] 金句打分失败，降级点赞排序:', err);
      }
      // 降级：按点赞数排序，取前 5
      mode = 'rule';
      scores = unique
        .map((b, index) => ({ index, score: b.likes * 10, reason: '按点赞数排序' }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    }

    // 取 top5 候选（LLM 返回的 index 可能越界/非整数，逐条保护）
    const topCandidates = [...scores]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => {
        const idx = Number(s.index);
        const b = Number.isInteger(idx) && idx >= 0 && idx < unique.length ? unique[idx] : null;
        if (!b) return null;
        return { blessing_id: b.id, content: b.content, score: s.score, reason: s.reason };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    // 审计记录
    await supabase.from('ai_generations').insert({
      type: 'quote_score',
      input: { blessing_ids: unique.map((b) => b.id) },
      output: { candidates: topCandidates, mode },
      model,
      status: 'done',
    });

    return NextResponse.json({
      candidates: topCandidates,
      mode,
      message: mode === 'ai' ? 'AI 打分完成' : '规则排序完成（未配置 AI key）',
    });
  } catch (err) {
    console.error('[AI] 金句生成异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/** 管理员确认金句：写入 quote_of_day，首页展示最新一条 */
export async function PATCH(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const body: { blessing_id?: string; content?: string } = await request.json();

    const blessingId =
      typeof body.blessing_id === 'string' && body.blessing_id.length > 0 ? body.blessing_id : null;
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!blessingId && !content) {
      return NextResponse.json({ error: '缺少金句内容' }, { status: 400 });
    }
    if (content.length > 200) {
      return NextResponse.json({ error: '金句过长' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 有 blessing_id 时以数据库原文为准（防止调用方伪造 content 绕过审核内容）
    let finalContent = content;
    if (blessingId) {
      const { data: blessing } = await supabase
        .from('blessings')
        .select('content')
        .eq('id', blessingId)
        .single();
      if (!blessing) {
        return NextResponse.json({ error: '金句对应的祝福不存在' }, { status: 400 });
      }
      finalContent = blessing.content;
    }

    // 金句将公开展示，与祝福提交口径一致过敏感词
    const { containsProfanity } = await import('@/lib/profanity');
    if (containsProfanity(finalContent)) {
      return NextResponse.json({ error: '金句包含敏感词，请更换' }, { status: 400 });
    }

    const { error } = await supabase.from('ai_generations').insert({
      type: 'quote_of_day',
      input: { blessing_id: blessingId },
      output: { content: finalContent, confirmed_at: new Date().toISOString() },
      model: 'admin-confirmed',
      status: 'done',
    });

    if (error) {
      console.error('[AI] 金句确认失败:', error);
      return NextResponse.json({ error: '确认失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '金句已上线展示' });
  } catch (err) {
    console.error('[AI] 金句确认异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
