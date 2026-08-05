// ============================================================
// 星空背景 — 使用 tsParticles v4 渲染夜空星星
// 必须在客户端渲染，通过 next/dynamic 懒加载
// ============================================================

'use client';

import { useMemo } from 'react';
import Particles from '@tsparticles/react';
import { type ISourceOptions } from '@tsparticles/engine';

/** 星空粒子配置 */
const STAR_CONFIG: ISourceOptions = {
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
      value: ['#ffffff', '#ffe9a6', '#b3e0ff'],
    },
    shape: {
      type: 'circle',
    },
    opacity: {
      value: { min: 0.1, max: 0.5 },
      animation: {
        enable: true,
        speed: 0.5,
        sync: false,
      },
    },
    size: {
      value: { min: 0.5, max: 2.5 },
    },
    move: {
      enable: true,
      speed: { min: 0.05, max: 0.3 },
      direction: 'none',
      random: true,
    },
  },
  detectRetina: true,
};

interface StarBackgroundProps {
  /** 粒子数量（默认100） */
  count?: number;
}

export default function StarBackground({ count = 100 }: StarBackgroundProps) {
  const options = useMemo<ISourceOptions>(() => {
    const opts = structuredClone(STAR_CONFIG);
    const particles = opts.particles as Record<string, unknown>;
    (particles.number as Record<string, unknown>).value = count;
    return opts;
  }, [count]);

  return <Particles id="star-background" options={options} />;
}
