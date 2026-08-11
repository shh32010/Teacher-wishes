// ============================================================
// 玻璃态顶部导航栏 — 所有子页面复用
// 移动端 56-60px 单行紧凑布局，桌面端保持原样
// ============================================================

'use client';

import type { ReactNode } from 'react';
import ThemeToggle from '@/components/ui/ThemeToggle';

interface NavHeaderProps {
  /** 左侧内容（通常是品牌/标题） */
  left: ReactNode;
  /** 中间内容（排序Tab等，移动端 flex-1，桌面端归入右侧） */
  center?: ReactNode;
  /** 右侧内容（按钮/操作） */
  right?: ReactNode;
  /** 额外 className（加到 header 外层） */
  className?: string;
  /** 内容区最大宽度，默认 max-w-5xl */
  maxWidth?: string;
}

export default function NavHeader({
  left,
  center,
  right,
  className = '',
  maxWidth = 'max-w-5xl',
}: NavHeaderProps) {
  return (
    <header
      className={`glass sticky top-0 z-30 border-b border-ink/10 backdrop-blur-xl ${className}`}
    >
      {/* 桌面端：保持原有 justify-between 左右布局，center 归入右侧 */}
      <div className={`mx-auto hidden items-center justify-between px-4 py-4 md:flex ${maxWidth}`}>
        <div>{left}</div>
        <div className="flex items-center gap-3">
          {center}
          {right}
          <ThemeToggle />
        </div>
      </div>

      {/* 移动端：三段式 flex，Logo + Tabs + Actions 单行 */}
      <div className={`flex items-center gap-2 px-3 py-2 md:hidden ${maxWidth} mx-auto`}>
        {/* Logo — 强制单行不换行 */}
        <div className="shrink-0 whitespace-nowrap text-[16px] font-bold">{left}</div>

        {/* Tabs — flex-1 居中 */}
        {center && <div className="flex flex-1 items-center justify-center">{center}</div>}

        {/* Actions + Theme */}
        <div className="flex shrink-0 items-center gap-1.5">
          {right}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
