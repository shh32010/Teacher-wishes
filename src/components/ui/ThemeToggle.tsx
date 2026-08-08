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
  light: '日间模式',
  dark: '夜间模式',
  auto: '跟随系统',
};

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="glass rounded-full p-2 text-sm transition-all hover:scale-110 active:scale-95"
      aria-label={`当前：${LABELS[theme]}，点击切换`}
      title={`${LABELS[theme]} — 点击切换`}
    >
      {ICONS[theme]}
    </button>
  );
}
