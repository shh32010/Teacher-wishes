// ============================================================
// 祝福同句聚合（UX-1）— 词库时代大量重复祝福，按内容分组展示
// 纯函数：输入 approved 祝福列表，输出聚合组
// ============================================================

import type { Blessing } from '@/types';

/** 聚合后的祝福组 */
export interface BlessingGroup {
  /** 祝福原文（组 key） */
  content: string;
  /** 送出该句的人数 */
  count: number;
  /** 组内点赞总数 */
  total_likes: number;
  /** 组内礼物 icons（去重，按首次出现顺序） */
  gift_icons: string[];
  /** 情绪标签（取组内最新一条） */
  emotion: string | null;
  /** 点赞代表条（组内最新一条的 id，点赞按钮指向它） */
  representative_id: string;
  /** 组内是否有精选 */
  is_featured: boolean;
  /** 最新一位送出的昵称/班级（匿名时不带班级） */
  latest_nickname: string | null;
  latest_class: string | null;
  /** 最新一条送出时间（排序用） */
  latest_created_at: string;
}

/**
 * 按 content 分组聚合祝福
 * @param blessings 已审核祝福（已按时间倒序）
 * @param sort 排序：time → 按最新送出时间；likes → 按组内总赞
 */
export function groupBlessings(
  blessings: Blessing[],
  sort: 'time' | 'likes' = 'time'
): BlessingGroup[] {
  const groupMap = new Map<string, BlessingGroup>();

  // 数据已按 created_at 倒序 → 第一条即最新
  for (const b of blessings) {
    const existing = groupMap.get(b.content);
    if (existing) {
      existing.count += 1;
      existing.total_likes += b.likes;
      if (b.gift && !existing.gift_icons.includes(b.gift.icon)) {
        existing.gift_icons.push(b.gift.icon);
      }
      if (b.is_featured) existing.is_featured = true;
    } else {
      groupMap.set(b.content, {
        content: b.content,
        count: 1,
        total_likes: b.likes,
        gift_icons: b.gift ? [b.gift.icon] : [],
        emotion: b.emotion ?? null,
        representative_id: b.id,
        is_featured: b.is_featured,
        latest_nickname: b.is_anonymous ? null : (b.nickname ?? null),
        latest_class: b.is_anonymous ? null : (b.class ?? null),
        latest_created_at: b.created_at,
      });
    }
  }

  const groups = Array.from(groupMap.values());

  if (sort === 'likes') {
    groups.sort((a, b) => b.total_likes - a.total_likes);
  } else {
    groups.sort((a, b) => (a.latest_created_at < b.latest_created_at ? 1 : -1));
  }

  return groups;
}
