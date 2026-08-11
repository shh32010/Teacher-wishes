// ============================================================
// 首页 — 教师节温暖沉浸体验
// 时间线：黄昏粒子 → 花瓣飘落 → 语录淡入 → 标题 → 星河 → 按钮
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';

// tsParticles 黄昏暖色背景（懒加载）
const StarBackground = dynamic(() => import('@/components/home/StarBackground'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 -z-10 bg-warm" />,
});

// 飘落花瓣/银杏（纯 CSS，无依赖）
const FallingPetals = dynamic(() => import('@/components/home/FallingPetals'), {
  ssr: false,
});

const StatsPanel = dynamic(() => import('@/components/home/StatsPanel'), {
  ssr: false,
  loading: () => <div className="h-[140px]" aria-hidden="true" />,
});

const BlessingGalaxy = dynamic(() => import('@/components/home/BlessingGalaxy'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 -z-5" aria-hidden="true" />,
});

/** 首页语录 — 教师节主题 */
const QUOTES = ['一支粉笔，两袖清风。', '三尺讲台，四季耕耘。'];

type Stage = 'particles' | 'quote1' | 'quote2' | 'title' | 'galaxyHint' | 'button';

export default function HomePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('particles');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    // 移动端加速 40%，让 CTA 更快出现
    const scale = isMobile ? 0.5 : 0.75;
    const timeline: { stage: Stage; delay: number }[] = [
      { stage: 'quote1', delay: 600 * scale },
      { stage: 'quote2', delay: 1500 * scale },
      { stage: 'title', delay: 2500 * scale },
      { stage: 'galaxyHint', delay: 3500 * scale },
      { stage: 'button', delay: 4500 * scale },
    ];

    const timers = timeline.map(({ stage: s, delay }) => setTimeout(() => setStage(s), delay));
    return () => timers.forEach(clearTimeout);
  }, [isMobile]);

  const isActive = (s: Stage): boolean => {
    const order: Stage[] = ['particles', 'quote1', 'quote2', 'title', 'galaxyHint', 'button'];
    return order.indexOf(stage) >= order.indexOf(s);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* 黄昏暖色粒子背景 */}
      <StarBackground count={80} />

      {/* 飘落花瓣/银杏 */}
      {isActive('quote1') && <FallingPetals />}

      {/* 祝福星河层（标题后显示） */}
      {isActive('title') && <BlessingGalaxy />}

      {/* 内容层 */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
        <AnimatePresence>
          {isActive('quote1') && (
            <motion.p
              key="quote1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="max-w-md text-lg italic text-ink-light font-wenkai"
            >
              {QUOTES[0]}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isActive('quote2') && (
            <motion.p
              key="quote2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="max-w-md text-lg italic text-ink-light font-wenkai"
            >
              {QUOTES[1]}
            </motion.p>
          )}
        </AnimatePresence>

        {/* 主标题 */}
        <AnimatePresence>
          {isActive('title') && (
            <motion.div
              key="title"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, type: 'spring', stiffness: 80 }}
            >
              <h1 className="text-gradient text-glow text-5xl font-extrabold md:text-7xl">
                🌸 教师节快乐
              </h1>
              <p className="mt-3 text-lg text-ink-light">谢谢您，照亮了我们的未来</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 星河引导文案 */}
        <AnimatePresence>
          {isActive('galaxyHint') && (
            <motion.div
              key="galaxyHint"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <p className="text-base leading-relaxed text-ink">
                <span
                  className="mx-1 inline-block h-3.5 w-3.5 rounded-full align-middle"
                  style={{
                    background:
                      'radial-gradient(circle, var(--color-primary) 0%, var(--color-accent-gold) 50%, transparent 70%)',
                    boxShadow: '0 0 8px var(--color-primary-soft)',
                    opacity: 0.85,
                  }}
                />
                金色星辉是老师，暖光点点是祝福
                <span
                  className="mx-1 inline-block h-2.5 w-2.5 animate-star-twinkle rounded-full align-middle"
                  style={{
                    background:
                      'radial-gradient(circle, var(--color-accent-gold) 0%, var(--color-primary) 50%, transparent 70%)',
                    boxShadow: '0 0 6px var(--color-primary-soft)',
                    opacity: 0.9,
                  }}
                />
              </p>
              <p className="text-sm text-ink-muted">轻触任意光点，听听他们的故事</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 数据看板 */}
        <StatsPanel visible={isActive('button')} />

        {/* 进入按钮 */}
        <AnimatePresence>
          {isActive('button') && (
            <motion.button
              key="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/wall')}
              className="btn-primary animate-breathe mt-4 text-lg"
            >
              ✨ 进入祝福墙
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* 主题切换 — 固定在右上角，始终可见 */}
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* 底部入口 */}
      <AnimatePresence>
        {isActive('button') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="fixed bottom-8 z-10 flex gap-4 text-xs text-ink-muted"
          >
            <button
              onClick={() => router.push('/admin')}
              className="hover:text-ink-light transition-colors"
              aria-label="进入管理后台"
            >
              管理后台
            </button>
            <button
              onClick={() => router.push('/display')}
              className="hover:text-ink-light transition-colors"
              aria-label="进入大屏展示模式"
            >
              大屏模式
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
