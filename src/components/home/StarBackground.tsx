// ============================================================
// 黄昏暖色粒子背景 — tsParticles v4
// 暖色调：金色、杏色、淡粉，模拟黄昏天空中的微光
// ============================================================

'use client';

import { useMemo } from 'react';
import Particles from '@tsparticles/react';
import { type ISourceOptions } from '@tsparticles/engine';

/** 黄昏暖色粒子配置 */
const WARM_PARTICLE_CONFIG: ISourceOptions = {
  fullScreen: {
    enable: true,
    zIndex: 0,
  },
  fpsLimit: 60,
  particles: {
    number: {
      value: 100,
      density: { enable: true },
    },
    color: {
      value: ['#FFE4C4', '#FFDAB9', '#FFECD2', '#FFF0DB', '#FDE68A'],
    },
    shape: {
      type: 'circle',
    },
    opacity: {
      value: { min: 0.15, max: 0.45 },
      animation: {
        enable: true,
        speed: 0.3,
        sync: false,
      },
    },
    size: {
      value: { min: 0.5, max: 2.5 },
    },
    move: {
      enable: true,
      speed: { min: 0.03, max: 0.2 },
      direction: 'none',
      random: true,
    },
  },
  detectRetina: true,
};

interface StarBackgroundProps {
  count?: number;
}

export default function StarBackground({ count = 100 }: StarBackgroundProps) {
  const options = useMemo<ISourceOptions>(() => {
    const opts = structuredClone(WARM_PARTICLE_CONFIG);
    const particles = opts.particles as Record<string, unknown>;
    (particles.number as Record<string, unknown>).value = count;
    return opts;
  }, [count]);

  return <Particles id="warm-particle-bg" options={options} />;
}
