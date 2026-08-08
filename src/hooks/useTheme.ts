// ============================================================
// 主题切换 Hook — localStorage 持久化 + 系统偏好检测
// 三种模式：light | dark | auto（跟随系统）
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'teacher-wishes-theme';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'auto';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  return 'auto';
}

function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  // 初始化
  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    setResolved(getResolvedTheme(stored));
  }, []);

  // 监听系统偏好变化（仅在 auto 模式下）
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'auto') {
        setResolved(mq.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // 应用 data-theme 属性到 <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    setResolved(getResolvedTheme(t));
  }, []);

  const toggle = useCallback(() => {
    const next: Record<Theme, Theme> = { light: 'dark', dark: 'auto', auto: 'light' };
    setTheme(next[theme]);
  }, [theme, setTheme]);

  return { theme, resolved, setTheme, toggle };
}
