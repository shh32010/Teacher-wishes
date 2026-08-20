// ============================================================
// 敏感词过滤工具 — 支持中英文
// ============================================================

import { Filter } from 'bad-words';

// 创建过滤器实例（处理英文）
const filter = new Filter();

// 中文敏感词列表（分类整理）
const CHINESE_PROFANITY = [
  // ========== 脏话/辱骂 ==========
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
  '贱逼',
  '骚逼',
  '臭逼',
  '烂逼',
  '蠢货',
  '废物',
  '白痴',
  '弱智',
  '智障',
  '神经病',
  '疯子',
  '变态',
  '畜生',
  '畜牲',
  '禽兽',
  '人渣',
  '垃圾',
  '败类',
  '狗东西',
  '狗娘养',
  '王八',
  '龟儿子',
  '兔崽子',
  '婊子',
  '妓女',
  '荡妇',
  '骚货',
  '贱婢',

  // ========== 涉黄词汇 ==========
  '做爱',
  '性交',
  '口交',
  '肛交',
  '自慰',
  '手淫',
  '阴茎',
  '阴道',
  '乳房',
  '屁股',
  '裸体',
  '色情',
  '淫荡',
  '淫秽',
  '骚逼',
  '浪逼',
  '荡妇',
  '嫖娼',
  '卖淫',
  '妓院',
  '鸡巴',
  '屌',
  '逼',

  // ========== 涉暴词汇 ==========
  '杀了你',
  '弄死你',
  '砍死你',
  '打死你',
  '自杀',
  '上吊',
  '跳楼',
  '割腕',
  '喝药',
  '炸弹',
  '爆炸',
  '恐怖',
  '袭击',

  // ========== 歧视性词汇 ==========
  '支那',
  '贱民',
  '黑鬼',
  '白猪',
  '三八',
  '娘炮',
  '死gay',
  '基佬',
  '变态',

  // ========== 政治敏感 ==========
  // 根据实际需求补充，以下为示例
  '习近平',
  '毛泽东',
  '共产党',
  '国民党',
  '六四',
  '天安门',
  '法轮功',
  '藏独',
  '疆独',
  '台独',
  // 注意：以上仅为示例，实际使用时应根据业务场景调整

  // ========== 毒品相关 ==========
  '冰毒',
  '大麻',
  '海洛因',
  '摇头丸',
  'K粉',
  '吸毒',
  '贩毒',
  '戒毒',

  // ========== 赌博相关 ==========
  '赌博',
  '赌钱',
  '老虎机',
  '六合彩',
  '地下钱庄',

  // ========== 其他违规 ==========
  '代开发票',
  '办证',
  '代孕',
  '枪支',
  '贩卖',
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
