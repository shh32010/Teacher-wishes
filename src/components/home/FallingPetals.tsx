// ============================================================
// 飘落花瓣/银杏 — 教师节温暖氛围
// 纯 CSS 动画实现，无外部依赖，GPU 友好
// Desktop: 20 个 / Mobile: 10 个（性能优化）
// ============================================================

'use client';

import { useEffect, useState, useMemo } from 'react';

/** 飘落物类型（3 种季节元素 + 8 种数字礼物） */
type PetalType =
  | 'sakura'
  | 'ginkgo'
  | 'maple'
  | 'rose'
  | 'star'
  | 'book'
  | 'chalk'
  | 'coffee'
  | 'letter'
  | 'apple'
  | 'sapling';

interface Petal {
  id: number;
  type: PetalType;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  drift: number;
}

/** 每种类型的 emoji */
const PETAL_EMOJI: Record<PetalType, string> = {
  sakura: '🌸',
  ginkgo: '🍂',
  maple: '🍁',
  rose: '🌹',
  star: '🌟',
  book: '📚',
  chalk: '✏️',
  coffee: '☕',
  letter: '💌',
  apple: '🍎',
  sapling: '🌱',
};

/** 根据屏幕宽度决定花瓣数量 */
function getPetalCount(): number {
  if (typeof window === 'undefined') return 24;
  return window.innerWidth < 768 ? 12 : 24;
}

/** 生成随机飘落物（仅使用 transform 动画，无 top/left 动画） */
function generatePetals(count: number): Petal[] {
  // 季节元素与礼物混合飘落：3 花瓣 + 8 礼物 = 11 种均匀循环
  const types: PetalType[] = [
    'sakura',
    'rose',
    'ginkgo',
    'star',
    'maple',
    'book',
    'chalk',
    'coffee',
    'letter',
    'apple',
    'sapling',
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    type: types[i % types.length],
    left: Math.random() * 100,
    delay: Math.random() * 15,
    duration: 8 + Math.random() * 12,
    size: 14 + Math.random() * 14,
    rotation: Math.random() * 360,
    drift: -60 + Math.random() * 120,
  }));
}

export default function FallingPetals() {
  const [mounted, setMounted] = useState(false);
  const petals = useMemo(() => generatePetals(getPetalCount()), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {petals.map((petal) => (
        <span
          key={petal.id}
          className="absolute animate-ginkgo-fall select-none"
          style={{
            left: `${petal.left}%`,
            top: '-5%',
            fontSize: `${petal.size}px`,
            lineHeight: 1,
            animationDelay: `${petal.delay}s`,
            animationDuration: `${petal.duration}s`,
            opacity: 0,
          }}
        >
          {PETAL_EMOJI[petal.type]}
        </span>
      ))}
    </div>
  );
}
