// ============================================================
// 敏感词过滤工具 — 支持中英文
// ============================================================

import { Filter } from 'bad-words';

// 创建过滤器实例
const filter = new Filter();

// 中文敏感词列表（常见脏话+政治敏感词）
// 注意：生产环境应使用更完整的词库，或接入第三方 API
const CHINESE_PROFANITY = [
  // 脏话
  '操你',
  '你妈',
  '他妈',
  '妈的',
  '狗日',
  '傻逼',
  '牛逼',
  '卧槽',
  '我靠',
  '他妈的',
  '去死',
  '混蛋',
  '王八蛋',
  // 政治敏感（示例，实际应根据需求补充）
  // 'xxx', 'yyy',
];

// 将中文敏感词添加到过滤器
filter.addWords(...CHINESE_PROFANITY);

/**
 * 检查文本是否包含敏感词
 * @param text 待检查文本
 * @returns true = 包含敏感词
 */
export function containsProfanity(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return filter.isProfane(text);
}

/**
 * 过滤文本中的敏感词（替换为 *）
 * @param text 待过滤文本
 * @returns 过滤后的文本
 */
export function filterProfanity(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return filter.clean(text);
}

/**
 * 检查并返回敏感词信息
 * @param text 待检查文本
 * @returns { hasProfanity: boolean, filtered: string }
 */
export function checkProfanity(text: string): {
  hasProfanity: boolean;
  filtered: string;
} {
  const hasProfanity = containsProfanity(text);
  const filtered = filterProfanity(text);
  return { hasProfanity, filtered };
}
