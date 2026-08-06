import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlassCard from '@/components/ui/GlassCard';

describe('GlassCard', () => {
  it('应该渲染子元素', () => {
    render(<GlassCard>测试内容</GlassCard>);
    expect(screen.getByText('测试内容')).toBeInTheDocument();
  });

  it('应该包含 glass 样式类', () => {
    const { container } = render(<GlassCard>内容</GlassCard>);
    expect(container.firstChild).toHaveClass('glass');
    expect(container.firstChild).toHaveClass('rounded-2xl');
  });

  it('默认启用 hover 效果', () => {
    const { container } = render(<GlassCard>内容</GlassCard>);
    expect(container.firstChild).toHaveClass('hover:bg-white/88');
  });

  it('可以禁用 hover 效果', () => {
    const { container } = render(<GlassCard hover={false}>内容</GlassCard>);
    expect(container.firstChild).not.toHaveClass('hover:bg-white/88');
  });

  it('支持自定义 className', () => {
    const { container } = render(<GlassCard className="custom">内容</GlassCard>);
    expect(container.firstChild).toHaveClass('custom');
  });
});
