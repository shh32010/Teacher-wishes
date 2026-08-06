// ============================================================
// 飘落花瓣/银杏 — 教师节温暖氛围
// 纯 CSS 动画实现，无外部依赖，GPU 友好
// ============================================================

'use client';

import { useEffect, useState, useMemo } from 'react';

/** 飘落物类型 */
type PetalType = 'sakura' | 'ginkgo' | 'maple';

interface Petal {
  id: number;
  type: PetalType;
  left: number; // 水平位置 %
  delay: number; // 动画延迟 s
  duration: number; // 动画持续时间 s
  size: number; // 大小 px
  rotation: number; // 初始旋转 deg
  drift: number; // 水平漂移 px
}

/** 每种类型的 emoji */
const PETAL_EMOJI: Record<PetalType, string> = {
  sakura: '🌸',
  ginkgo: '🍂',
  maple: '🍁',
};

/** 生成随机飘落物 */
function generatePetals(count: number): Petal[] {
  const types: PetalType[] = ['sakura', 'ginkgo', 'maple'];
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
  const petals = useMemo(() => generatePetals(30), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
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
            filter: 'blur(0.5px)',
          }}
        >
          {PETAL_EMOJI[petal.type]}
        </span>
      ))}
    </div>
  );
}
