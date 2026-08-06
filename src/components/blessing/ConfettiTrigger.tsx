// ============================================================
// 彩带庆祝特效 — Canvas Confetti 触发器 · 暖色
// ============================================================

'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiTriggerProps {
  duration?: number;
}

export default function ConfettiTrigger({ duration = 2500 }: ConfettiTriggerProps) {
  useEffect(() => {
    const end = Date.now() + duration;
    const colors = ['#D97706', '#F59E0B', '#FBBF24', '#FDE68A', '#EC4899'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 80,
        origin: { x: 0, y: 0.6 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 80,
        origin: { x: 1, y: 0.6 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, [duration]);

  return null;
}
