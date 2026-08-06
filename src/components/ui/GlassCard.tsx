// ============================================================
// 毛玻璃卡片 — 暖色 · 教师节书卷气
// ============================================================

import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** 是否启用悬浮上浮效果 */
  hover?: boolean;
  /** 内边距大小 */
  padding?: 'sm' | 'md' | 'lg';
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function GlassCard({
  children,
  hover = true,
  padding = 'md',
  className,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass rounded-2xl',
        paddingMap[padding],
        hover && 'hover:bg-white/88 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5',
        'transition-all duration-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
