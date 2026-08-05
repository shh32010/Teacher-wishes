// ============================================================
// 大屏展示模式 — 全屏自动轮播 + Realtime 即时插入
// ============================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { createRealtimeClient } from '@/lib/supabase/client';
import type { Blessing, PaginatedResponse } from '@/types';

const QRCode = dynamic(() => import('@/components/ui/QRCode'), { ssr: false });

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const DISPLAY_INTERVAL = 6; // 每条停留秒数
const MOUSE_HIDE_DELAY = 3000; // 鼠标不动多久后隐藏

export default function DisplayPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, mutate } = useSWR<PaginatedResponse<Blessing>>(
    '/api/blessings?pageSize=50',
    fetcher,
    { refreshInterval: 10 * 60 * 1000 }
  );

  const blessings: Blessing[] = data?.data || [];

  // Realtime 即时插入
  useEffect(() => {
    const supabase = createRealtimeClient();
    const channel = supabase
      .channel('display-wall')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'blessings', filter: 'status=eq.approved' },
        () => mutate()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('🔌 大屏 Realtime 已连接');
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  // 自动轮播
  useEffect(() => {
    if (blessings.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % blessings.length);
    }, DISPLAY_INTERVAL * 1000);
    return () => clearInterval(timer);
  }, [blessings.length]);

  // 键盘控制
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen();
        setIsFullscreen(false);
      }
      if (e.key === 'ArrowRight') setCurrentIndex((p) => (p + 1) % blessings.length);
      if (e.key === 'ArrowLeft')
        setCurrentIndex((p) => (p - 1 + blessings.length) % blessings.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [blessings.length]);

  // 鼠标自动隐藏
  useEffect(() => {
    const onMove = () => {
      setCursorHidden(false);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      cursorTimer.current = setTimeout(() => setCursorHidden(true), MOUSE_HIDE_DELAY);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const current = blessings[currentIndex];
  const submitUrl = typeof window !== 'undefined' ? `${window.location.origin}/wall` : '/wall';

  if (blessings.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night">
        <p className="text-2xl text-slate-500">等待祝福中...</p>
      </div>
    );
  }

  return (
    <main
      ref={containerRef}
      className={`relative flex min-h-screen flex-col items-center justify-center bg-night overflow-hidden transition-opacity duration-500 ${cursorHidden ? 'cursor-none' : ''}`}
    >
      {/* 二维码 */}
      {!isFullscreen && (
        <div className="absolute left-8 top-8 z-10 glass rounded-xl p-5 text-center">
          <p className="mb-3 text-sm text-slate-400">📱 扫码送祝福</p>
          <QRCode value={`${submitUrl}?from=display`} size={120} />
          <p className="mt-2 text-xs text-slate-600">{submitUrl}</p>
        </div>
      )}

      {/* 全屏按钮 */}
      {!isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute right-8 top-8 z-10 glass rounded-xl p-3 text-slate-400 hover:text-white transition-colors"
          title="全屏 (Esc 退出)"
        >
          ⛶
        </button>
      )}

      {/* 祝福内容 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current?.id}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="max-w-3xl px-8 text-center"
        >
          <p className="mb-8 text-xl text-slate-400">
            {current?.is_anonymous ? '匿名同学' : current?.nickname || '匿名同学'}
            {current?.class && <span className="ml-2 text-slate-500">· {current.class}</span>}
          </p>
          <p className="text-4xl font-bold leading-relaxed text-white md:text-5xl">
            {current?.content}
          </p>
          {current?.teacher && (
            <p className="mt-8 text-2xl text-accent-light">❤️ 送给 {current.teacher.name}老师</p>
          )}
          <p className="mt-6 text-lg text-slate-500">❤️ {current?.likes || 0} 次点赞</p>
        </motion.div>
      </AnimatePresence>

      {/* 进度条 + 计数 */}
      <div className="absolute bottom-8 flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          {blessings.map((b, i) => (
            <div
              key={b.id}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-slate-600'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-slate-600">
          {currentIndex + 1} / {blessings.length} · ← → 切换 · Esc 退出
        </span>
      </div>
    </main>
  );
}
