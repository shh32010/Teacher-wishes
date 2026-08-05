// ============================================================
// 毛玻璃卡片 — Apple + Glassmorphism 风格
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
        hover && 'hover:bg-white/[0.12] hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30',
        'transition-all duration-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
