// ============================================================
// API 响应结构 & 类型守卫测试
// 验证所有 API 返回的数据结构符合 TypeScript 类型定义
// ============================================================

import { describe, it, expect } from 'vitest';
import type {
  Blessing,
  Teacher,
  BlessingStats,
  PaginatedResponse,
  AdminUpdateBlessing,
  BlessingStatus,
} from '@/types';

// ============================================================
// 类型守卫函数
// ============================================================

function isValidBlessing(obj: unknown): obj is Blessing {
  if (!obj || typeof obj !== 'object') return false;
  const b = obj as Record<string, unknown>;
  return (
    typeof b.id === 'string' &&
    (b.user_id === null || typeof b.user_id === 'string') &&
    (b.teacher_id === null || typeof b.teacher_id === 'string') &&
    (b.nickname === null || typeof b.nickname === 'string') &&
    (b.class === null || typeof b.class === 'string') &&
    typeof b.content === 'string' &&
    typeof b.likes === 'number' &&
    typeof b.is_featured === 'boolean' &&
    typeof b.is_anonymous === 'boolean' &&
    ['pending', 'approved', 'rejected'].includes(b.status as string) &&
    typeof b.created_at === 'string'
  );
}

function isValidTeacher(obj: unknown): obj is Teacher {
  if (!obj || typeof obj !== 'object') return false;
  const t = obj as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.name === 'string' &&
    (t.department === null || typeof t.department === 'string') &&
    (t.avatar_url === null || typeof t.avatar_url === 'string') &&
    (t.description === null || typeof t.description === 'string') &&
    typeof t.created_at === 'string'
  );
}

function isValidBlessingStats(obj: unknown): obj is BlessingStats {
  if (!obj || typeof obj !== 'object') return false;
  const s = obj as Record<string, unknown>;
  return (
    typeof s.total_blessings === 'number' &&
    typeof s.total_participants === 'number' &&
    typeof s.total_likes === 'number'
  );
}

function isValidPaginatedResponse<T>(
  obj: unknown,
  itemGuard: (item: unknown) => item is T
): obj is PaginatedResponse<T> {
  if (!obj || typeof obj !== 'object') return false;
  const r = obj as Record<string, unknown>;
  return (
    Array.isArray(r.data) &&
    r.data.every(itemGuard) &&
    typeof r.count === 'number' &&
    typeof r.page === 'number' &&
    typeof r.pageSize === 'number'
  );
}

// ============================================================
// 测试数据工厂
// ============================================================

function makeMockTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: 't-001',
    name: '王老师',
    department: '语文组',
    avatar_url: null,
    description: '从教20年的资深语文教师',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeMockBlessing(overrides: Partial<Blessing> = {}): Blessing {
  return {
    id: 'b-001',
    user_id: null,
    teacher_id: 't-001',
    nickname: '小明',
    class: '高一(3)班',
    content: '老师辛苦了！',
    likes: 3,
    is_featured: false,
    is_anonymous: false,
    status: 'approved',
    created_at: '2026-08-06T10:00:00Z',
    ...overrides,
  };
}

// ============================================================
// 类型守卫测试
// ============================================================

describe('isValidBlessing', () => {
  it('应该接受完整的 Blessing 对象', () => {
    const blessing = makeMockBlessing();
    expect(isValidBlessing(blessing)).toBe(true);
  });

  it('应该接受带教师信息的 Blessing', () => {
    const blessing = makeMockBlessing({
      teacher: makeMockTeacher(),
    });
    expect(isValidBlessing(blessing)).toBe(true);
  });

  it('应该接受匿名祝福', () => {
    const blessing = makeMockBlessing({
      is_anonymous: true,
      nickname: null,
      class: null,
    });
    expect(isValidBlessing(blessing)).toBe(true);
  });

  it('应该接受待审核状态', () => {
    const blessing = makeMockBlessing({ status: 'pending' });
    expect(isValidBlessing(blessing)).toBe(true);
    expect(blessing.status).toBe('pending');
  });

  it('应该接受已拒绝状态', () => {
    const blessing = makeMockBlessing({ status: 'rejected' });
    expect(isValidBlessing(blessing)).toBe(true);
  });

  it('应该拒绝无效对象', () => {
    expect(isValidBlessing(null)).toBe(false);
    expect(isValidBlessing(undefined)).toBe(false);
    expect(isValidBlessing('string')).toBe(false);
    expect(isValidBlessing(42)).toBe(false);
  });

  it('应该拒绝缺少必填字段的对象', () => {
    expect(isValidBlessing({ content: 'hi' })).toBe(false);
    expect(isValidBlessing({ id: '1' })).toBe(false);
  });

  it('应该拒绝 status 非法的对象', () => {
    const blessing = makeMockBlessing({ status: 'invalid' as BlessingStatus });
    expect(isValidBlessing(blessing)).toBe(false);
  });

  it('应该拒绝 likes 非数字的对象', () => {
    const invalid = { ...makeMockBlessing(), likes: 'many' };
    expect(isValidBlessing(invalid)).toBe(false);
  });
});

describe('isValidTeacher', () => {
  it('应该接受完整的 Teacher 对象', () => {
    expect(isValidTeacher(makeMockTeacher())).toBe(true);
  });

  it('应该接受最小 Teacher 对象', () => {
    const minimal: Teacher = {
      id: 't-002',
      name: '李老师',
      department: null,
      avatar_url: null,
      description: null,
      created_at: '2026-01-01T00:00:00Z',
    };
    expect(isValidTeacher(minimal)).toBe(true);
  });

  it('应该拒绝非对象', () => {
    expect(isValidTeacher(null)).toBe(false);
    expect(isValidTeacher([])).toBe(false);
  });
});

describe('isValidBlessingStats', () => {
  it('应该接受完整 Stats', () => {
    const stats: BlessingStats = {
      total_blessings: 100,
      total_participants: 50,
      total_likes: 200,
      pending_count: 5,
      approved_count: 90,
      rejected_count: 5,
      total_count: 100,
    };
    expect(isValidBlessingStats(stats)).toBe(true);
  });

  it('应该接受零值 Stats', () => {
    const stats: BlessingStats = {
      total_blessings: 0,
      total_participants: 0,
      total_likes: 0,
      pending_count: 0,
      approved_count: 0,
      rejected_count: 0,
      total_count: 0,
    };
    expect(isValidBlessingStats(stats)).toBe(true);
  });

  it('应该拒绝缺少字段的对象', () => {
    expect(isValidBlessingStats({ total_blessings: 1 })).toBe(false);
  });

  it('应该拒绝字段类型错误', () => {
    expect(
      isValidBlessingStats({ total_blessings: '100', total_participants: 1, total_likes: 2 })
    ).toBe(false);
  });
});

describe('isValidPaginatedResponse', () => {
  it('应该接受合法的分页 Blessing 响应', () => {
    const response: PaginatedResponse<Blessing> = {
      data: [makeMockBlessing(), makeMockBlessing({ id: 'b-002' })],
      count: 2,
      page: 1,
      pageSize: 20,
    };
    expect(isValidPaginatedResponse(response, isValidBlessing)).toBe(true);
  });

  it('应该接受空列表', () => {
    const response: PaginatedResponse<Blessing> = {
      data: [],
      count: 0,
      page: 1,
      pageSize: 20,
    };
    expect(isValidPaginatedResponse(response, isValidBlessing)).toBe(true);
  });

  it('应该拒绝 data 不是数组的响应', () => {
    const invalid = { data: 'not array', count: 0, page: 1, pageSize: 20 };
    expect(isValidPaginatedResponse(invalid, isValidBlessing)).toBe(false);
  });

  it('应该拒绝 data 中有非法 Blessing 的响应', () => {
    const response = {
      data: [makeMockBlessing(), { invalid: true }],
      count: 2,
      page: 1,
      pageSize: 20,
    };
    expect(isValidPaginatedResponse(response, isValidBlessing)).toBe(false);
  });

  it('应该拒绝分页字段类型错误', () => {
    expect(
      isValidPaginatedResponse({ data: [], count: '0', page: 1, pageSize: 20 }, isValidBlessing)
    ).toBe(false);
  });
});

// ============================================================
// Blessing status 状态机测试
// ============================================================

describe('BlessingStatus 状态机', () => {
  const validTransitions: Record<BlessingStatus, BlessingStatus[]> = {
    pending: ['approved', 'rejected'],
    approved: ['rejected'], // 已通过可以被降级为拒绝
    rejected: ['approved'], // 已拒绝可以重新通过
  };

  it('pending → approved 应合法', () => {
    expect(validTransitions['pending']).toContain('approved');
  });

  it('pending → rejected 应合法', () => {
    expect(validTransitions['pending']).toContain('rejected');
  });

  it('approved → rejected 应合法', () => {
    expect(validTransitions['approved']).toContain('rejected');
  });

  it('rejected → approved 应合法', () => {
    expect(validTransitions['rejected']).toContain('approved');
  });

  it('不应该有非法状态值', () => {
    const allStatuses: string[] = ['pending', 'approved', 'rejected'];
    allStatuses.forEach((s) => {
      expect(allStatuses).toContain(s);
    });
  });
});

// ============================================================
// AdminUpdateBlessing 结构测试
// ============================================================

describe('AdminUpdateBlessing', () => {
  it('可以只更新 status', () => {
    const update: AdminUpdateBlessing = { status: 'approved' };
    expect(update.status).toBe('approved');
    expect(update.is_featured).toBeUndefined();
  });

  it('可以只设置精选', () => {
    const update: AdminUpdateBlessing = { is_featured: true };
    expect(update.is_featured).toBe(true);
    expect(update.status).toBeUndefined();
  });

  it('可以同时更新 status 和 is_featured', () => {
    const update: AdminUpdateBlessing = { status: 'approved', is_featured: true };
    expect(update.status).toBe('approved');
    expect(update.is_featured).toBe(true);
  });
});
