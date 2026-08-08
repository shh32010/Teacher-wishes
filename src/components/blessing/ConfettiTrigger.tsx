// ============================================================
// 彩带庆祝特效 — Canvas Confetti 双重效果 · 暖色
// 阶段1：爆发（中央炸开）→ 阶段2：持续飘落
// ============================================================

'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiTriggerProps {
  duration?: number;
}

export default function ConfettiTrigger({ duration = 3000 }: ConfettiTriggerProps) {
  useEffect(() => {
    const colors = ['#D97706', '#F59E0B', '#FBBF24', '#FDE68A', '#EC4899', '#F97316'];

    // 阶段1：中央大爆发（一次性）
    const burst = () => {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors,
        startVelocity: 30,
        ticks: 120,
      });
      // 第二波稍小的爆发
      setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { x: 0.5, y: 0.4 },
          colors,
          startVelocity: 20,
          ticks: 100,
        });
      }, 200);
    };

    // 阶段2：持续飘落
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 80,
        origin: { x: 0, y: 0.6 },
        colors,
        startVelocity: 15,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 80,
        origin: { x: 1, y: 0.6 },
        colors,
        startVelocity: 15,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    burst();
    // 持续飘落在爆发后 500ms 开始
    setTimeout(() => frame(), 500);
  }, [duration]);

  return null;
}
