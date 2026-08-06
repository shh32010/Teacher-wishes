// ============================================================
// BlessingCard 组件测试
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BlessingCard from '@/components/blessing/BlessingCard';
import type { Blessing } from '@/types';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock framer-motion 以减少测试噪音
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, transition, whileHover, whileTap, ...rest } = props;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { whileHover, whileTap, ...rest } = props;
      return <button {...rest}>{children as React.ReactNode}</button>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <p {...props}>{children as React.ReactNode}</p>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock localStorage
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

/** 创建测试用 Blessing 数据 */
function createMockBlessing(overrides: Partial<Blessing> = {}): Blessing {
  return {
    id: 'blessing-001',
    user_id: null,
    teacher_id: null,
    nickname: '小明',
    class: '高一(3)班',
    content: '王老师辛苦了，感谢您的教导！',
    likes: 5,
    is_featured: false,
    is_anonymous: false,
    status: 'approved',
    created_at: '2026-08-06T10:00:00Z',
    teacher: null,
    ...overrides,
  };
}

describe('BlessingCard', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('应该渲染祝福内容', () => {
    const blessing = createMockBlessing();
    render(<BlessingCard blessing={blessing} />);
    expect(screen.getByText('王老师辛苦了，感谢您的教导！')).toBeInTheDocument();
  });

  it('应该显示发送者昵称', () => {
    const blessing = createMockBlessing();
    render(<BlessingCard blessing={blessing} />);
    expect(screen.getByText('小明')).toBeInTheDocument();
  });

  it('匿名祝福应显示"匿名同学"', () => {
    const blessing = createMockBlessing({ is_anonymous: true });
    render(<BlessingCard blessing={blessing} />);
    expect(screen.getByText('匿名同学')).toBeInTheDocument();
  });

  it('应该显示班级信息', () => {
    const blessing = createMockBlessing({ class: '高二(1)班' });
    render(<BlessingCard blessing={blessing} />);
    expect(screen.getByText('高二(1)班')).toBeInTheDocument();
  });

  it('应该显示点赞数', () => {
    const blessing = createMockBlessing({ likes: 42 });
    render(<BlessingCard blessing={blessing} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('应该显示关联的教师名', () => {
    const blessing = createMockBlessing({
      teacher: {
        id: 't1',
        name: '王老师',
        department: '语文组',
        avatar_url: null,
        description: null,
        created_at: '2026-01-01',
      },
    });
    render(<BlessingCard blessing={blessing} />);
    expect(screen.getByText('王老师老师 →')).toBeInTheDocument();
  });

  it('有关联教师且有头像时应显示头像图片', () => {
    const blessing = createMockBlessing({
      teacher: {
        id: 't1',
        name: '王老师',
        department: '语文组',
        avatar_url: 'https://example.com/avatar.jpg',
        description: null,
        created_at: '2026-01-01',
      },
    });
    render(<BlessingCard blessing={blessing} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('点击教师标签应跳转到教师主页', () => {
    const blessing = createMockBlessing({
      teacher: {
        id: 't1',
        name: '王老师',
        department: '语文组',
        avatar_url: null,
        description: null,
        created_at: '2026-01-01',
      },
    });
    render(<BlessingCard blessing={blessing} />);
    const teacherBtn = screen.getByText('王老师老师 →');
    fireEvent.click(teacherBtn);
    expect(mockPush).toHaveBeenCalledWith('/teacher/t1');
  });

  it('没有教师关联时不显示教师标签', () => {
    const blessing = createMockBlessing({ teacher: null });
    render(<BlessingCard blessing={blessing} />);
    expect(screen.queryByText(/老师$/)).not.toBeInTheDocument();
  });

  it('点赞按钮应可点击', () => {
    const onLike = vi.fn();
    const blessing = createMockBlessing();
    render(<BlessingCard blessing={blessing} onLike={onLike} />);

    const likeButton = screen.getByRole('button');
    fireEvent.click(likeButton);

    expect(onLike).toHaveBeenCalledWith('blessing-001');
  });

  it('点赞后按钮应变为 disabled', () => {
    const blessing = createMockBlessing();
    render(<BlessingCard blessing={blessing} />);

    const likeButton = screen.getByRole('button');
    fireEvent.click(likeButton);

    expect(likeButton).toBeDisabled();
  });

  it('点赞后数字应 +1（乐观更新）', () => {
    const blessing = createMockBlessing({ likes: 10 });
    render(<BlessingCard blessing={blessing} />);

    expect(screen.getByText('10')).toBeInTheDocument();

    const likeButton = screen.getByRole('button');
    fireEvent.click(likeButton);

    expect(screen.getByText('11')).toBeInTheDocument();
  });

  it('应该将已点赞的 ID 保存到 localStorage', () => {
    const blessing = createMockBlessing();
    render(<BlessingCard blessing={blessing} onLike={vi.fn()} />);

    const likeButton = screen.getByRole('button');
    fireEvent.click(likeButton);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'liked_blessings',
      expect.stringContaining('blessing-001')
    );
  });

  it('昵称首字母应显示在头像位置', () => {
    const blessing = createMockBlessing({ nickname: '张三' });
    render(<BlessingCard blessing={blessing} />);
    // 头像应显示昵称的第一个字
    expect(screen.getByText('张')).toBeInTheDocument();
  });

  it('匿名且无昵称时头像显示"匿"', () => {
    const blessing = createMockBlessing({ is_anonymous: true, nickname: null });
    render(<BlessingCard blessing={blessing} />);
    expect(screen.getByText('匿')).toBeInTheDocument();
  });
});
