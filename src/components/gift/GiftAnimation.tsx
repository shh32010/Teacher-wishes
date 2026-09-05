// ============================================================
// Step 5 沉浸式礼物动画 — 全屏呈现（3.8s）
// 时间轴：礼物入场(0~1.6s) → 祝福文字(1.8s) → 光点飞入星河(2.6s) → 完成(3.8s)
// 尊重 prefers-reduced-motion（800ms 直接收尾）；动画失败不影响提交状态
// ============================================================

'use client';

import { useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import type { Gift, GiftAnimation as GiftAnimationType } from '@/types';

interface GiftAnimationProps {
  gift: Gift;
  content: string;
  onComplete: () => void;
}

/** 8 种礼物动画变体（按 gifts.animation 分派） */
const ICON_VARIANTS: Record<GiftAnimationType, Variants> = {
  bloom: {
    initial: { scale: 0.2, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      rotate: [0, 8, 0],
      transition: { duration: 1.6, ease: 'easeOut' },
    },
  },
  twinkle: {
    initial: { scale: 0.6, opacity: 0 },
    animate: {
      scale: [0.6, 1.1, 0.95, 1.05, 1],
      opacity: [0, 1, 0.6, 1, 1],
      transition: { duration: 1.6, times: [0, 0.3, 0.5, 0.7, 1] },
    },
  },
  page: {
    initial: { scaleX: 0.05, opacity: 0 },
    animate: {
      scaleX: 1,
      opacity: 1,
      transition: { duration: 1.2, ease: 'easeInOut' },
    },
  },
  write: {
    initial: { x: 0, opacity: 0 },
    animate: {
      opacity: 1,
      x: [-8, 8, -5, 5, 0],
      transition: { duration: 1.4, times: [0, 0.3, 0.55, 0.8, 1] },
    },
  },
  steam: {
    initial: { y: 40, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: { duration: 1.5, ease: 'easeOut' },
    },
  },
  envelope: {
    initial: { scaleY: 0.15, opacity: 0 },
    animate: {
      scaleY: 1,
      opacity: 1,
      transition: { duration: 1.1, ease: 'easeOut' },
    },
  },
  bounce: {
    initial: { y: 0, opacity: 0 },
    animate: {
      opacity: 1,
      y: [0, -36, 0, -18, 0],
      transition: { duration: 1.6, times: [0, 0.3, 0.6, 0.8, 1], ease: 'easeInOut' },
    },
  },
  grow: {
    initial: { scale: 0, y: 24, opacity: 0 },
    animate: {
      scale: 1,
      y: 0,
      opacity: 1,
      transition: { duration: 1.6, ease: 'easeOut' },
    },
  },
  fly: {
    // 千纸鹤：轻盈滑翔入场（上下起伏 + 轻微侧倾）
    initial: { y: 60, opacity: 0, rotate: -14 },
    animate: {
      y: [60, -16, 6, -8, 0],
      rotate: [-14, 6, -4, 3, 0],
      opacity: 1,
      transition: { duration: 1.8, times: [0, 0.35, 0.6, 0.8, 1], ease: 'easeInOut' },
    },
  },
};

/** 飞入星河的 8 个光点（相对右上方向的偏移） */
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  dx: 40 + (i % 4) * 70 - Math.round(i / 4) * 50,
  dy: -80 - (i % 3) * 60,
  delay: 2.6 + i * 0.08,
}));

export default function GiftAnimation({ gift, content, onComplete }: GiftAnimationProps) {
  const variants = ICON_VARIANTS[gift.animation] || ICON_VARIANTS.bloom;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 800 : 3800;
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative flex flex-col items-center px-6 text-center">
        {/* 礼物主体（按类型动画） */}
        <motion.p
          variants={variants}
          initial="initial"
          animate="animate"
          className="text-7xl"
          aria-label={gift.name}
        >
          {gift.icon}
        </motion.p>

        {/* 祝福文字（1.8s 渐显） */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.5 }}
          className="mt-6 max-w-md"
        >
          <p className="text-lg text-white">&ldquo;{content}&rdquo;</p>
          <p className="mt-3 text-sm text-white/70">愿这份心意，被温柔以待。</p>
        </motion.div>

        {/* 光点飞向右上角（星河入口） */}
        {PARTICLES.map((p) => (
          <motion.span
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.2 }}
            transition={{ delay: p.delay, duration: 1.0, ease: 'easeIn' }}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-amber-300"
          />
        ))}
      </div>
    </div>
  );
}
