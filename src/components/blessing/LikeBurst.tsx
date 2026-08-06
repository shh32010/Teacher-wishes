// ============================================================
// 点赞爱心爆发特效 — 点击时飞出 5 个彩色小心心
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Heart {
  id: number;
  x: number;
  y: number;
  emoji: string;
  size: number;
  rotation: number;
}

/** 生成随机飞行爱心 */
function generateHearts(count: number): Heart[] {
  const emojis = ['❤️', '💛', '🧡', '💖', '✨', '🌟'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 80,
    y: -(30 + Math.random() * 50),
    emoji: emojis[i % emojis.length],
    size: 12 + Math.random() * 10,
    rotation: (Math.random() - 0.5) * 60,
  }));
}

interface LikeBurstProps {
  active: boolean;
  onComplete?: () => void;
}

export default function LikeBurst({ active, onComplete }: LikeBurstProps) {
  const [hearts] = useState<Heart[]>(() => generateHearts(6));

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => onComplete?.(), 800);
    return () => clearTimeout(timer);
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          {hearts.map((heart) => (
            <motion.span
              key={heart.id}
              initial={{ opacity: 1, scale: 0, x: 0, y: 0, rotate: 0 }}
              animate={{
                opacity: [1, 1, 0],
                scale: [0, 1.3, 0.8],
                x: heart.x,
                y: heart.y,
                rotate: heart.rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="absolute"
              style={{ fontSize: `${heart.size}px` }}
            >
              {heart.emoji}
            </motion.span>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
