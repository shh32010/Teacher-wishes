// ============================================================
// 敏感词过滤工具 — 支持中英文
// ============================================================

import { Filter } from 'bad-words';

// 创建过滤器实例（处理英文）
const filter = new Filter();

// 中文敏感词列表（常见脏话）
const CHINESE_PROFANITY = [
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
  '煞笔',
  '沙比',
  '傻比',
  '操蛋',
  '你妈的',
  '草泥马',
  '尼玛',
  '麻痹',
  '妈逼',
  '狗逼',
  '贱人',
  '贱货',
];

// 将中文敏感词添加到过滤器
filter.addWords(...CHINESE_PROFANITY);

/**
 * 检查文本是否包含敏感词（英文用 bad-words，中文用 includes）
 * @param text 待检查文本
 * @returns true = 包含敏感词
 */
export function containsProfanity(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  // 英文敏感词检测（bad-words 库）
  if (filter.isProfane(text)) return true;

  // 中文敏感词检测（直接匹配）
  const lowerText = text.toLowerCase();
  return CHINESE_PROFANITY.some((word) => lowerText.includes(word));
}

/**
 * 过滤文本中的敏感词（替换为 *）
 * @param text 待过滤文本
 * @returns 过滤后的文本
 */
export function filterProfanity(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // 先用 bad-words 处理英文
  let filtered = filter.clean(text);

  // 再处理中文
  CHINESE_PROFANITY.forEach((word) => {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });

  return filtered;
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
