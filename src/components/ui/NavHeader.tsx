// ============================================================
// 玻璃态顶部导航栏 — 所有子页面复用
// 暖色毛玻璃效果，sticky 定位，底部暖色分隔线
// ============================================================

import type { ReactNode } from 'react';

interface NavHeaderProps {
  /** 左侧内容（通常是品牌/标题） */
  left: ReactNode;
  /** 右侧内容（按钮/排序/操作） */
  right?: ReactNode;
  /** 额外 className（加到 header 外层） */
  className?: string;
  /** 内容区最大宽度，默认 max-w-5xl */
  maxWidth?: string;
}

export default function NavHeader({
  left,
  right,
  className = '',
  maxWidth = 'max-w-5xl',
}: NavHeaderProps) {
  return (
    <header
      className={`glass sticky top-0 z-30 border-b border-ink/10 backdrop-blur-xl ${className}`}
    >
      <div className={`mx-auto flex ${maxWidth} items-center justify-between px-4 py-4`}>
        {left}
        {right && <div className="flex items-center gap-3">{right}</div>}
      </div>
    </header>
  );
}
