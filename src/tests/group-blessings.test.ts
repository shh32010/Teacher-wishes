// ============================================================
// 祝福同句聚合单元测试（UX-1）
// ============================================================

import { describe, it, expect } from 'vitest';
import { groupBlessings } from '@/lib/group-blessings';
import type { Blessing } from '@/types';

function makeBlessing(overrides: Partial<Blessing>): Blessing {
  return {
    id: 'b-001',
    user_id: null,
    teacher_id: null,
    nickname: '小明',
    class: '高一(3)班',
    content: '感谢老师',
    likes: 1,
    is_featured: false,
    is_anonymous: false,
    status: 'approved',
    created_at: '2026-08-29T10:00:00Z',
    template_id: 't-001',
    gift_id: 'rose',
    emotion: '感恩',
    ai_message: null,
    teacher: null,
    gift: {
      id: 'rose',
      name: '鲜花',
      icon: '🌹',
      description: null,
      animation: 'bloom',
      sort_order: 1,
      is_active: true,
      usage_count: 0,
      created_at: '2026-08-01T00:00:00Z',
    },
    ...overrides,
  };
}

describe('groupBlessings', () => {
  it('相同内容合并为一组，count 与 total_likes 正确累加', () => {
    const blessings = [
      makeBlessing({ id: 'a1', content: '同一句', likes: 3, created_at: '2026-08-29T12:00:00Z' }),
      makeBlessing({ id: 'a2', content: '同一句', likes: 2, created_at: '2026-08-29T11:00:00Z' }),
      makeBlessing({ id: 'b1', content: '另一句', likes: 5, created_at: '2026-08-29T10:00:00Z' }),
    ];
    const groups = groupBlessings(blessings);
    expect(groups).toHaveLength(2);
    const same = groups.find((g) => g.content === '同一句')!;
    expect(same.count).toBe(2);
    expect(same.total_likes).toBe(5);
    // representative 是组内最新一条（12:00 那条）
    expect(same.representative_id).toBe('a1');
  });

  it('组内礼物数量正确累计且保持首次出现顺序', () => {
    const rose = {
      id: 'rose',
      name: '鲜花',
      icon: '🌹',
      description: null,
      animation: 'bloom' as const,
      sort_order: 1,
      is_active: true,
      usage_count: 0,
      created_at: 'x',
    };
    const star = { ...rose, id: 'star', name: '星星', icon: '🌟', animation: 'twinkle' as const };
    const blessings = [
      makeBlessing({ id: 'a1', content: '同一句', gift_id: 'rose', gift: rose }),
      makeBlessing({ id: 'a2', content: '同一句', gift_id: 'star', gift: star }),
      makeBlessing({ id: 'a3', content: '同一句', gift_id: 'rose', gift: rose }),
    ];
    const groups = groupBlessings(blessings);
    expect(groups[0].gift_counts).toEqual([
      { icon: '🌹', name: '鲜花', count: 2 },
      { icon: '🌟', name: '星星', count: 1 },
    ]);
  });

  it('匿名祝福不暴露昵称与班级', () => {
    const blessings = [
      makeBlessing({
        id: 'a1',
        content: '同一句',
        is_anonymous: true,
        nickname: '小红',
        class: '高二(1)班',
      }),
    ];
    const groups = groupBlessings(blessings);
    expect(groups[0].latest_nickname).toBeNull();
    expect(groups[0].latest_class).toBeNull();
  });

  it('无礼物的祝福聚合时 gift_counts 为空数组', () => {
    const blessings = [
      makeBlessing({
        id: 'a1',
        content: '往年的一句话',
        teacher_id: 't1',
        gift_id: null,
        gift: undefined,
        emotion: null,
        template_id: null,
      }),
    ];
    const groups = groupBlessings(blessings);
    expect(groups[0].gift_counts).toEqual([]);
  });

  it('likes 排序按组内总赞降序', () => {
    const blessings = [
      makeBlessing({ id: 'a1', content: '甲', likes: 1 }),
      makeBlessing({ id: 'a2', content: '甲', likes: 1 }),
      makeBlessing({ id: 'b1', content: '乙', likes: 5 }),
    ];
    const groups = groupBlessings(blessings, 'likes');
    expect(groups.map((g) => g.content)).toEqual(['乙', '甲']);
  });

  it('time 排序按组内最新送出时间降序', () => {
    const blessings = [
      makeBlessing({ id: 'a1', content: '甲', created_at: '2026-08-29T10:00:00Z' }),
      makeBlessing({ id: 'b1', content: '乙', created_at: '2026-08-29T12:00:00Z' }),
    ];
    const groups = groupBlessings(blessings, 'time');
    expect(groups.map((g) => g.content)).toEqual(['乙', '甲']);
  });

  it('精选组置顶（无论 time/likes 排序）', () => {
    const blessings = [
      makeBlessing({ id: 'a1', content: '普通句', created_at: '2026-08-29T12:00:00Z', likes: 99 }),
      makeBlessing({
        id: 'b1',
        content: '精选句',
        created_at: '2026-08-29T10:00:00Z',
        likes: 1,
        is_featured: true,
      }),
    ];
    const byTime = groupBlessings(blessings, 'time');
    expect(byTime[0].content).toBe('精选句');
    const byLikes = groupBlessings(blessings, 'likes');
    expect(byLikes[0].content).toBe('精选句');
  });
});
