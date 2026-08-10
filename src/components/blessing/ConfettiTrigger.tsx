// ============================================================
// 彩带庆祝特效 — Canvas Confetti 双重效果 · 教师节暖色
// 阶段1：中央爆发 → 阶段2：金色花瓣缓慢飘落
// 尊重 prefers-reduced-motion：减弱动画偏好时跳过
// ============================================================

'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiTriggerProps {
  duration?: number;
}

export default function ConfettiTrigger({ duration = 4000 }: ConfettiTriggerProps) {
  useEffect(() => {
    // 尊重用户的减弱动画偏好
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    // 爆发色：暖金 + 花瓣粉
    const burstColors = ['#D97706', '#F59E0B', '#FBBF24', '#FDE68A', '#EC4899'];
    // 飘落色：仅暖金/温暖大地色，无粉橙（教师节氛围，非庆典）
    const fallColors = ['#D97706', '#E8A317', '#C9825B', '#FBBF24', '#FDE68A'];

    let rafId: number | undefined;
    const timeoutIds: number[] = [];

    // 阶段1：中央大爆发（一次性）— 保留原效果
    const burst = () => {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: burstColors,
        startVelocity: 30,
        ticks: 120,
      });
      const t1 = window.setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { x: 0.5, y: 0.4 },
          colors: burstColors,
          startVelocity: 20,
          ticks: 100,
        });
      }, 200);
      timeoutIds.push(t1);
    };

    // 阶段2：金色花瓣缓慢飘落 — 替代原左右彩带喷射
    // 从顶部随机位置缓慢下落，模拟花瓣/银杏飘落，与首页 FallingPetals 呼应
    const end = Date.now() + duration;
    const frame = () => {
      // 每次 1 粒，从顶部随机水平位置飘落
      confetti({
        particleCount: 1,
        angle: 90, // 垂直向下
        spread: 60, // 小幅水平扩散
        origin: { x: Math.random(), y: -0.1 },
        colors: fallColors,
        startVelocity: 8, // 缓慢下落（原 15）
        ticks: 300, // 更长生命周期（原默认 200）
        gravity: 0.3, // 低重力，轻盈飘落
        scalar: 1.2, // 稍大粒子
        drift: 1.5, // 水平漂移，模拟微风
        shapes: ['circle'], // 圆形粒子，像花瓣
      });

      if (Date.now() < end) {
        rafId = requestAnimationFrame(frame);
      }
    };

    burst();
    // 飘落在爆发后 600ms 开始（原 500ms）
    const t2 = window.setTimeout(() => frame(), 600);
    timeoutIds.push(t2);

    return () => {
      timeoutIds.forEach((id) => window.clearTimeout(id));
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [duration]);

  return null;
}
