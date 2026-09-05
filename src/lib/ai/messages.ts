// ============================================================
// 送礼仪式文案矩阵 — 6 情绪 × 礼物（配置 9 种，活动可选 6 种：
// 鲜花/星星/咖啡/苹果/小树/千纸鹤；书本/粉笔/信件已停用但保留映射，
// 重新启用时无需改码）
// 确定性静态矩阵（零成本、零延迟），POST 提交时按组合取快照写入
// ai_message 字段；后续可由 AI 生成版本覆盖（M5 P2）
// ============================================================

import type { EmotionCategory } from '@/types';

const GIFT_WORDS: Record<string, string[]> = {
  rose: ['这束花', '花开', '花香'],
  star: ['这颗星', '星光', '星辉'],
  book: ['这本书', '书页', '书香'],
  chalk: ['这支粉笔', '板书', '粉笔灰'],
  coffee: ['这杯咖啡', '热气', '醇香'],
  letter: ['这封信', '信笺', '字迹'],
  apple: ['这颗苹果', '清甜', '果香'],
  sapling: ['这棵小树', '新芽', '绿荫'],
  crane: ['这只千纸鹤', '纸鹤', '折痕'],
};

/** 情绪 → 文案句式 */
const EMOTION_PHRASES: Record<EmotionCategory, (words: string[]) => string> = {
  感恩: (w) => `${w[0]}，送给每一位辛勤耕耘的老师。谢谢您，让成长有了方向。`,
  祝愿: (w) => `${w[0]}，愿您桃李芬芳，岁月温柔，所有的付出都有回响。`,
  青春: (w) => `${w[0]}，纪念那些年在课堂里的青春。蝉鸣会散，师恩不忘。`,
  温暖: (w) => `${w[0]}，愿这份温暖，能陪您度过忙碌的每一天。`,
  文艺: (w) => `${w[0]}，愿${w[1]}落进春风里，把我们的敬意，悄悄讲给您听。`,
  趣味: (w) => `${w[0]}，全班最想对您说：您讲课时，连${w[1]}都在发光！`,
  未分类: (w) => `${w[0]}，献给每一位老师。愿这份心意，被温柔以待。`,
};

/**
 * 按情绪 + 礼物生成仪式文案
 * 未知组合降级为通用文案
 */
export function getGiftMessage(emotion: EmotionCategory | null, giftId: string): string {
  const words = GIFT_WORDS[giftId];
  const phrase = emotion && EMOTION_PHRASES[emotion];
  if (words && phrase) {
    return phrase(words);
  }
  if (words) {
    return `${words[0]}，献给每一位老师。愿这份心意，被温柔以待。`;
  }
  return '一份心意，献给每一位老师。愿这份心意，被温柔以待。';
}
