// ============================================================
// E2E 测试 Mock 数据 & 工具函数
// ============================================================

import type { Page, Route } from '@playwright/test';
import type { Blessing, Teacher, BlessingStats, PaginatedResponse } from '@/types';

// ──── Mock 教师数据 ────

export const MOCK_TEACHERS: Teacher[] = [
  {
    id: 't1',
    name: '张老师',
    department: '语文教研组',
    avatar_url: null,
    description: '从教30年，桃李满天下',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 't2',
    name: '李老师',
    department: '数学教研组',
    avatar_url: null,
    description: '让每个学生爱上数学',
    created_at: '2025-01-01T00:00:00Z',
  },
];

// ──── Mock 祝福数据 ────

export const MOCK_BLESSINGS: Blessing[] = [
  {
    id: 'b1',
    user_id: null,
    teacher_id: 't1',
    nickname: '小明',
    class: '高一(3)班',
    content: '张老师，感谢您三年来的谆谆教诲！',
    likes: 12,
    is_featured: true,
    is_anonymous: false,
    status: 'approved',
    created_at: '2025-09-10T08:00:00Z',
    teacher: MOCK_TEACHERS[0],
  },
  {
    id: 'b2',
    user_id: null,
    teacher_id: 't2',
    nickname: '小红',
    class: '高二(1)班',
    content: '李老师教数学教得太好了，让我从讨厌数学变成了热爱数学！',
    likes: 8,
    is_featured: false,
    is_anonymous: false,
    status: 'approved',
    created_at: '2025-09-10T08:10:00Z',
    teacher: MOCK_TEACHERS[1],
  },
  {
    id: 'b3',
    user_id: null,
    teacher_id: null,
    nickname: '匿名',
    class: null,
    content: '祝所有老师教师节快乐！你们辛苦了！',
    likes: 20,
    is_featured: false,
    is_anonymous: true,
    status: 'approved',
    created_at: '2025-09-10T07:30:00Z',
    teacher: null,
  },
];

// ──── Mock 待审核祝福 ────

export const MOCK_PENDING_BLESSINGS: Blessing[] = [
  {
    id: 'p1',
    user_id: null,
    teacher_id: 't1',
    nickname: '小李',
    class: '高三(2)班',
    content: '张老师太棒了！',
    likes: 0,
    is_featured: false,
    is_anonymous: false,
    status: 'pending',
    created_at: '2025-09-10T09:00:00Z',
    teacher: MOCK_TEACHERS[0],
  },
  {
    id: 'p2',
    user_id: null,
    teacher_id: null,
    nickname: '小王',
    class: null,
    content: '谢谢所有老师的辛勤付出',
    likes: 0,
    is_featured: false,
    is_anonymous: false,
    status: 'pending',
    created_at: '2025-09-10T09:05:00Z',
    teacher: null,
  },
];

// ──── Mock 统计 ────

export const MOCK_STATS: BlessingStats = {
  total_blessings: 128,
  total_participants: 86,
  total_likes: 256,
};

// ──── 分页响应构建器 ────

export function buildPaginatedResponse(
  data: Blessing[],
  page = 1,
  pageSize = 20
): PaginatedResponse<Blessing> {
  return {
    data,
    count: data.length,
    page,
    pageSize,
  };
}

// ──── Mock 注册函数 ────

/**
 * 为页面注册所有 API Mock 路由
 * 拦截所有 /api/* 请求并返回模拟数据
 */
export async function registerAllApiMocks(page: Page): Promise<void> {
  // CSRF Token
  await page.route('/api/csrf', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'mock-csrf-token-e2e-test' }),
      headers: {
        'Set-Cookie': 'csrf_token=mock-csrf-token-e2e-test; Path=/; SameSite=Lax',
      },
    });
  });

  // 教师列表
  await page.route('/api/teachers', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ teachers: MOCK_TEACHERS }),
    });
  });

  // 获取祝福列表（分页）
  await page.route('/api/blessings*', async (route: Route) => {
    const url = new URL(route.request().url());
    const pageNum = parseInt(url.searchParams.get('page') || '1', 10);
    const teacherId = url.searchParams.get('teacher_id');

    let data = MOCK_BLESSINGS;
    if (teacherId) {
      data = MOCK_BLESSINGS.filter((b) => b.teacher_id === teacherId);
    }
    // 第2页返回空数据
    if (pageNum > 1) {
      data = [];
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildPaginatedResponse(data, pageNum)),
    });
  });

  // 统计
  await page.route('/api/blessings/stats', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_STATS),
    });
  });

  // 提交祝福
  await page.route('/api/blessings', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '祝福提交成功，等待审核后展示' }),
      });
    } else {
      // 交给上面匹配 /api/blessings* 的 handler（POST 会先命中这个精确路由）
      await route.fallback();
    }
  });

  // 点赞
  await page.route('/api/blessings/*/like', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // 管理后台祝福列表
  await page.route('/api/admin/blessings*', async (route: Route) => {
    const url = new URL(route.request().url());
    const status = url.searchParams.get('status');

    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'p1', status: 'approved', is_featured: false }]),
      });
      return;
    }

    let data = [...MOCK_BLESSINGS, ...MOCK_PENDING_BLESSINGS];
    if (status && status !== 'all') {
      data = data.filter((b) => b.status === status);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildPaginatedResponse(data)),
    });
  });

  // 教师详情（SSR 页面的 API）
  await page.route(/\/api\/teachers\/[^/]+$/, async (route: Route) => {
    const url = new URL(route.request().url());
    const id = url.pathname.split('/').pop();
    const teacher = MOCK_TEACHERS.find((t) => t.id === id);

    if (!teacher) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: '教师未找到' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(teacher),
    });
  });

  // admin login API
  await page.route('/api/admin/login', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * 模拟管理后台登录状态
 * 通过设置 localStorage 绕过 Supabase Auth
 */
export async function mockAdminLogin(page: Page): Promise<void> {
  await page.evaluate(() => {
    // 模拟 Supabase Auth 的 localStorage 结构
    const supabaseKey = Object.keys(localStorage).find((k) => k.startsWith('sb-'));
    const key = supabaseKey || 'sb-ldykmebzzvszuxpuxqkt-auth-token';
    localStorage.setItem(
      key,
      JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000,
        user: {
          id: 'mock-admin-id',
          email: 'admin@teacher.com',
          user_metadata: {},
        },
      })
    );
  });
}

/**
 * 禁用页面所有动画/过渡效果
 * 避免 Playwright 因 animate-breathe 等动画而永远等不到"稳定"状态
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}
