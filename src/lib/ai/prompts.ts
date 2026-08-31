// ============================================================
// AI 提示词 + 规则降级（无 key 时全部 AI 功能仍有可用输出）
// 原则：AI 只做分类/打分/总结，绝不生成学生最终看到的祝福语
// ============================================================

import type { EmotionCategory } from '@/types';

export const VALID_CATEGORIES: EmotionCategory[] = ['感恩', '祝愿', '青春', '温暖', '文艺', '趣味'];

/** ─── 批量分类提示词（给未打标签的词库祝福语） ─── */
export function buildClassifyPrompt(contents: string[]): string {
  return [
    '你是教师节祝福语的分类助手。请为下列祝福语逐一分类并打标签。',
    '分类只能从以下 6 类中选择：感恩、祝愿、青春、温暖、文艺、趣味。',
    '标签为 2~3 个中文词，如「谢谢」「陪伴」「成长」。',
    '只输出 JSON，格式：{"results":[{"index":0,"category":"感恩","tags":["谢谢","教诲"]}]}',
    '祝福语列表：',
    contents.map((c, i) => `${i}. ${c}`).join('\n'),
  ].join('\n');
}

export interface ClassifyResult {
  results: { index: number; category: string; tags: string[] }[];
}

/** ─── 金句打分提示词 ─── */
export function buildQuoteScorePrompt(contents: string[]): string {
  return [
    '你是教师节祝福语的评审。请为下列祝福语打分（0~100），选出最温暖、最能代表全体学生心声的一句。',
    '评判标准：真诚、温暖、普适（不针对特定老师）、语言优美。',
    '只输出 JSON，格式：{"scores":[{"index":0,"score":85,"reason":"真诚温暖"}]}',
    '祝福语列表：',
    contents.map((c, i) => `${i}. ${c}`).join('\n'),
  ].join('\n');
}

export interface QuoteScoreResult {
  scores: { index: number; score: number; reason: string }[];
}

/** ─── 活动总结提示词 ─── */
export function buildSummaryPrompt(stats: {
  total_blessings: number;
  total_participants: number;
  gift_counts: { name: string; icon: string; count: number }[];
  emotion_counts: { emotion: string; count: number }[];
}): string {
  const giftText = stats.gift_counts.map((g) => `${g.name}${g.count}份`).join('、');
  const emotionText = stats.emotion_counts.map((e) => `${e.emotion}${e.count}条`).join('、');
  return [
    '你是教师节活动的文案策划。请根据以下数据写一段 120 字左右的教师节活动总结，',
    '温暖、诗意、不浮夸，以「这一年校园里的感谢」为视角，避免对任何老师做个体比较。',
    `数据：${stats.total_participants} 位同学送出 ${stats.total_blessings} 份祝福；礼物构成：${giftText || '暂无'}；情绪构成：${emotionText || '暂无'}。`,
    '必须自然提及礼物构成（如「最多的礼物是鲜花」），这是活动的核心要素。',
    '只输出总结正文，不要标题和解释。',
  ].join('\n');
}

/** ─── 规则降级：关键词分类（无 AI key 时使用） ─── */
const KEYWORD_RULES: { category: EmotionCategory; keywords: string[] }[] = [
  { category: '感恩', keywords: ['谢谢', '感恩', '感谢', '教诲', '辛苦'] },
  { category: '祝愿', keywords: ['愿', '祝福', '幸福', '健康', '快乐'] },
  { category: '青春', keywords: ['青春', '毕业', '校园', '回忆', '时光'] },
  { category: '温暖', keywords: ['温暖', '温柔', '陪伴', '微笑', '灯'] },
  { category: '文艺', keywords: ['粉笔', '桃李', '春风', '岁月', '星辰'] },
  { category: '趣味', keywords: ['可爱', '有趣', '魔法', '口头禅', '超级英雄'] },
];

/** 规则分类：返回分类 + 简单标签（无 AI 时仍可完成词库导入） */
export function ruleClassify(content: string): { category: EmotionCategory; tags: string[] } {
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((k) => content.includes(k))) {
      const hitTags = rule.keywords.filter((k) => content.includes(k)).slice(0, 2);
      return { category: rule.category, tags: hitTags.length > 0 ? hitTags : ['心意'] };
    }
  }
  return { category: '祝愿', tags: ['心意'] };
}
