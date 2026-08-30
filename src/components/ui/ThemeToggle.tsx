// ============================================================
// 主题切换按钮 — 三态循环：☀️ 日间 → 🌙 夜间 → 🖥 自动
// ============================================================

'use client';

import { useTheme } from '@/hooks/useTheme';

const ICONS: Record<string, string> = {
  light: '☀️',
  dark: '🌙',
  auto: '🖥',
};

const LABELS: Record<string, string> = {
  light: '日间',
  dark: '夜间',
  auto: '自动',
};

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--color-primary-soft)] px-2 py-1 text-xs font-medium text-[var(--color-primary)] transition-all hover:bg-[var(--color-primary)] hover:text-white active:scale-95 sm:px-3 sm:py-2 sm:text-sm sm:rounded-xl sm:gap-1.5"
      aria-label={`当前：${LABELS[theme]}模式，点击切换`}
      title={`${LABELS[theme]}模式 — 点击切换`}
    >
      <span className="text-base leading-none">{ICONS[theme]}</span>
      <span className="hidden sm:inline">{LABELS[theme]}</span>
    </button>
  );
}
