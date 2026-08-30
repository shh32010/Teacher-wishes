// ============================================================
// GiftFlow 状态机单元测试（审查 P2-7 补盲区）
// 覆盖：成功路径 / 失败重试 / restart 清理 / 推荐降级
// ============================================================

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GiftFlow from '@/components/gift/GiftFlow';
import type { BlessingTemplate, Gift } from '@/types';

// ─── matchMedia mock：prefers-reduced-motion=true → 礼物动画 800ms 完成 ───
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// ─── localStorage mock ───
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ─── 测试数据 ───
const TEMPLATES: BlessingTemplate[] = [
  {
    id: 'tmpl-1',
    content: '感谢您的谆谆教诲，让成长的路上充满方向。',
    category: '感恩',
    tags: ['谢谢'],
    sort_order: 1,
    is_active: true,
    usage_count: 0,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'tmpl-2',
    content: '愿您桃李满天下，岁月皆欢喜。',
    category: '祝愿',
    tags: ['祝福'],
    sort_order: 2,
    is_active: true,
    usage_count: 0,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
];

const GIFTS: Gift[] = [
  {
    id: 'rose',
    name: '鲜花',
    icon: '🌹',
    description: '感谢老师的辛勤付出',
    animation: 'bloom',
    sort_order: 1,
    is_active: true,
    usage_count: 0,
    created_at: '2026-08-01T00:00:00Z',
  },
];

/** 配置 fetch mock（postFail：POST 提交失败；recommendFail：推荐失败） */
function mockFetch(opts: { postFail?: boolean; recommendFail?: boolean } = {}) {
  const json = (body: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    );

  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = input.toString();
    if (url.includes('/api/ai/recommend')) {
      return opts.recommendFail ? json({ error: 'x' }, 500) : json({ recommendations: TEMPLATES });
    }
    if (url.includes('/api/templates')) {
      return json({ data: TEMPLATES, count: 2, page: 1, pageSize: 20 });
    }
    if (url.includes('/api/gifts')) {
      return json({ gifts: GIFTS });
    }
    if (url.includes('/api/csrf')) {
      return json({ token: 'test-csrf' });
    }
    if (url.includes('/api/blessings')) {
      return opts.postFail
        ? json({ error: '发送太频繁，请10分钟后再试' }, 429)
        : json({ success: true }, 201);
    }
    return json({ error: 'not found' }, 404);
  }) as unknown as typeof fetch;
}

/** 走完 情绪 → 祝福 → 礼物 三步（用于聚焦 confirm 之后的行为） */
async function goToConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /❤️ 感恩/ }));
  await waitFor(() => expect(screen.getByText('✨ AI 为你挑了 3 句')).toBeInTheDocument());
  // 同一条祝福语同时出现在推荐区和浏览区，取 DOM 顺序第一个（推荐区）
  await user.click(screen.getAllByRole('button', { name: /感谢您的谆谆教诲/ })[0]);
  await waitFor(() => expect(screen.getByText('再送上一份礼物吧')).toBeInTheDocument());
  await user.click(screen.getByRole('button', { name: /🌹 鲜花/ }));
  await waitFor(() => expect(screen.getByText('准备好了吗？')).toBeInTheDocument());
}

describe('GiftFlow 状态机', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockFetch();
  });

  it('完整成功路径：选择 → 送出 → 动画 → 成功页', async () => {
    const user = userEvent.setup();
    render(<GiftFlow />);

    await goToConfirm(user);

    await user.type(screen.getByPlaceholderText('昵称（选填，如：浩浩）'), '浩浩');
    await user.click(screen.getByRole('button', { name: '送出🌹 鲜花' }));

    // reduced-motion 下动画 800ms → 成功页
    await waitFor(() => expect(screen.getByText('您的心意已经送达 ✨')).toBeInTheDocument(), {
      timeout: 5000,
    });

    // 昵称已持久化（localStorage 记忆）
    expect(localStorageMock.setItem).toHaveBeenCalledWith('blessing_nickname', '浩浩');
  });

  it('提交失败（429）→ 留在确认步并显示错误，可重试', async () => {
    mockFetch({ postFail: true });
    const user = userEvent.setup();
    render(<GiftFlow />);

    await goToConfirm(user);
    await user.click(screen.getByRole('button', { name: '送出🌹 鲜花' }));

    await waitFor(() => expect(screen.getByText('发送太频繁，请10分钟后再试')).toBeInTheDocument());
    // 仍在确认步
    expect(screen.getByText('准备好了吗？')).toBeInTheDocument();
  });

  it('成功页「再送一份」→ 回到情绪步且选择全部清空', { timeout: 15000 }, async () => {
    const user = userEvent.setup();
    render(<GiftFlow />);

    await goToConfirm(user);
    await user.click(screen.getByRole('button', { name: '送出🌹 鲜花' }));
    await waitFor(() => expect(screen.getByText('您的心意已经送达 ✨')).toBeInTheDocument(), {
      timeout: 5000,
    });

    // 「再送一份」有 3 秒冷却，等待按钮启用后再点击
    const restartBtn = screen.getByRole('button', { name: /再送一份/ });
    await waitFor(() => expect(restartBtn).toBeEnabled(), { timeout: 5000 });
    await user.click(restartBtn);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /❤️ 感恩/ })).toBeInTheDocument()
    );
    expect(screen.getByText('今天想送出怎样的心意？')).toBeInTheDocument();
  });

  it('AI 推荐失败 → 降级提示可见，分类浏览仍可用', async () => {
    mockFetch({ recommendFail: true });
    const user = userEvent.setup();
    render(<GiftFlow />);

    await user.click(screen.getByRole('button', { name: /❤️ 感恩/ }));

    await waitFor(() =>
      expect(screen.getByText('推荐暂时不可用，请在下方浏览全部祝福语')).toBeInTheDocument()
    );
    // 浏览区有词库数据，可继续选择（核心链路不受 AI 影响）
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '感谢您的谆谆教诲，让成长的路上充满方向。' })
      ).toBeInTheDocument()
    );
  });
});
