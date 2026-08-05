// ============================================================
// 大屏展示模式 — 全屏自动轮播祝福
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import type { Blessing, PaginatedResponse } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/** 每条祝福展示时长（秒） */
const DISPLAY_INTERVAL = 6;

export default function DisplayPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data } = useSWR<PaginatedResponse<Blessing>>('/api/blessings?pageSize=50', fetcher, {
    refreshInterval: 10000,
  });

  const blessings: Blessing[] = data?.data || [];

  // 自动轮播
  useEffect(() => {
    if (blessings.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % blessings.length);
    }, DISPLAY_INTERVAL * 1000);

    return () => clearInterval(timer);
  }, [blessings.length]);

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // ESC 退出全屏
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'F') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const currentBlessing = blessings[currentIndex];

  if (blessings.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night">
        <p className="text-2xl text-slate-500">等待祝福中...</p>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-night overflow-hidden">
      {/* 二维码区域（左下角） */}
      <div className="absolute left-8 top-8 glass rounded-xl p-4">
        <p className="mb-2 text-sm text-slate-400">扫码送祝福</p>
        <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-white/10 text-3xl">
          📱
        </div>
      </div>

      {/* 全屏按钮（右上角） */}
      <button
        onClick={toggleFullscreen}
        className="absolute right-8 top-8 glass rounded-xl p-3 text-slate-400 hover:text-white transition-colors"
        title={isFullscreen ? '退出全屏 (Esc)' : '全屏展示'}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>

      {/* 祝福内容 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBlessing?.id}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="max-w-3xl px-8 text-center"
        >
          {/* 发送者 */}
          <p className="mb-8 text-xl text-slate-400">
            {currentBlessing?.is_anonymous ? '匿名同学' : currentBlessing?.nickname || '匿名同学'}
            {currentBlessing?.class && (
              <span className="ml-2 text-slate-500">· {currentBlessing.class}</span>
            )}
          </p>

          {/* 祝福内容 */}
          <p className="text-4xl font-bold leading-relaxed text-white md:text-5xl">
            {currentBlessing?.content}
          </p>

          {/* 教师 */}
          {currentBlessing?.teacher && (
            <p className="mt-8 text-2xl text-accent-light">
              ❤️ 送给 {currentBlessing.teacher.name}老师
            </p>
          )}

          {/* 点赞数 */}
          <p className="mt-6 text-lg text-slate-500">❤️ {currentBlessing?.likes || 0} 次点赞</p>
        </motion.div>
      </AnimatePresence>

      {/* 进度指示器（底部） */}
      <div className="absolute bottom-8 flex gap-2">
        {blessings.map((b, i) => (
          <div
            key={b.id}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === currentIndex ? 'w-8 bg-primary' : 'w-2 bg-slate-600'
            }`}
          />
        ))}
      </div>
    </main>
  );
}
