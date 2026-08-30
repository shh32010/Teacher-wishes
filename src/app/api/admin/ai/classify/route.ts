// ============================================================
// POST /api/admin/ai/classify — 批量 AI 分类（AI-2）
// 对未打标签（tags 为空）的词库祝福语批量生成分类与标签
// 无 AI key 时降级为关键词规则分类（ruleClassify），核心功能不受影响
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';
import { requireAdmin } from '@/lib/auth/admin';
import { chat, parseJsonLoose, isNotConfigured } from '@/lib/ai/provider';
import {
  buildClassifyPrompt,
  ruleClassify,
  VALID_CATEGORIES,
  type ClassifyResult,
} from '@/lib/ai/prompts';
import type { EmotionCategory } from '@/types';

export const dynamic = 'force-dynamic';

const BATCH_SIZE = 50; // 每批最多 50 条，控制单次 LLM 输出长度

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const supabase = createAdminClient();

    // 取未打标签的模板（tags 为空数组）
    const { data: templates, error: queryError } = await supabase
      .from('blessing_templates')
      .select('id, content')
      .eq('tags', '{}')
      .limit(BATCH_SIZE);

    if (queryError) {
      console.error('[AI] 词库查询失败:', queryError);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }
    if (!templates || templates.length === 0) {
      return NextResponse.json({ classified: 0, mode: 'ai', message: '没有待分类的祝福语' });
    }

    const contents = templates.map((t) => t.content);
    let results: { index: number; category: string; tags: string[] }[] = [];
    let mode: 'ai' | 'rule' = 'ai';
    let model = 'rule-fallback';

    try {
      // 优先 LLM 批量分类
      const aiRes = await chat([
        { role: 'system', content: '你是教师节祝福语分类助手，只输出 JSON。' },
        { role: 'user', content: buildClassifyPrompt(contents) },
      ]);
      const parsed = parseJsonLoose<ClassifyResult>(aiRes.content);
      results = parsed.results || [];
      model = aiRes.model;
    } catch (err) {
      // 未配置 / 调用失败 → 关键词规则降级
      if (!isNotConfigured(err)) {
        console.error('[AI] 分类调用失败，降级规则分类:', err);
      }
      mode = 'rule';
      results = contents.map((content, index) => {
        const r = ruleClassify(content);
        return { index, category: r.category, tags: r.tags };
      });
    }

    // 逐条更新（分类合法才写，非法回退默认）
    let classified = 0;
    for (const item of results) {
      const template = templates[item.index];
      if (!template) continue;
      const category = VALID_CATEGORIES.includes(item.category as EmotionCategory)
        ? item.category
        : '祝愿';
      const tags = Array.isArray(item.tags)
        ? item.tags
            .filter((t) => typeof t === 'string' && t.length > 0 && t.length <= 10)
            .slice(0, 3)
        : [];

      const { error: updateError } = await supabase
        .from('blessing_templates')
        .update({ category, tags, updated_at: new Date().toISOString() })
        .eq('id', template.id);

      if (!updateError) classified++;
    }

    // 审计记录
    await supabase.from('ai_generations').insert({
      type: 'classify',
      input: { template_ids: templates.map((t) => t.id) },
      output: { classified, mode, results },
      model,
      status: 'done',
    });

    return NextResponse.json({
      classified,
      mode,
      message:
        mode === 'ai'
          ? `AI 分类完成 ${classified} 条`
          : `规则分类完成 ${classified} 条（未配置 AI key）`,
    });
  } catch (err) {
    console.error('[AI] 分类异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
