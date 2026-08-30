// ============================================================
// 数字滚动动画 — 从 0 递增到目标值
// ============================================================

'use client';

import { useEffect, useState } from 'react';

interface CountUpProps {
  /** 目标数值 */
  end: number;
  /** 动画时长（毫秒），默认 1500 */
  duration?: number;
  /** 是否启动动画 */
  start: boolean;
}

export default function CountUp({ end, duration = 1500, start }: CountUpProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) {
      setCount(0);
      return;
    }

    let animationId: number;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo 缓动：先快后慢，有冲刺感
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(eased * end));

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [end, duration, start]);

  return <>{count.toLocaleString()}</>;
}
