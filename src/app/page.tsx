// ============================================================
// 首页 — 故事式沉浸体验
// 时间线：星空 → 语录淡入 → 标题放大 → 按钮出现
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// tsParticles 星空背景（懒加载，不阻塞首屏）
const StarBackground = dynamic(() => import('@/components/home/StarBackground'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 -z-10 bg-night" />,
});

/** 首页展示的语录 */
const QUOTES = ['教育不是灌满一桶水，而是点燃一把火。', '一支粉笔，两袖清风，三尺讲台，四季晴雨。'];

/** 动画阶段 */
type Stage = 'stars' | 'quote1' | 'quote2' | 'title' | 'button';

export default function HomePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('stars');

  useEffect(() => {
    const timeline: { stage: Stage; delay: number }[] = [
      { stage: 'quote1', delay: 2000 },
      { stage: 'quote2', delay: 4000 },
      { stage: 'title', delay: 6000 },
      { stage: 'button', delay: 8000 },
    ];

    const timers = timeline.map(({ stage: s, delay }) => setTimeout(() => setStage(s), delay));

    return () => timers.forEach(clearTimeout);
  }, []);

  const isActive = (s: Stage): boolean => {
    const order: Stage[] = ['stars', 'quote1', 'quote2', 'title', 'button'];
    return order.indexOf(stage) >= order.indexOf(s);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* 星空背景 */}
      <StarBackground count={120} />

      {/* 内容层 */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        <AnimatePresence>
          {/* 第一句语录 */}
          {isActive('quote1') && (
            <motion.p
              key="quote1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="max-w-md text-lg italic text-slate-400"
            >
              &ldquo;{QUOTES[0]}&rdquo;
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {/* 第二句语录 */}
          {isActive('quote2') && (
            <motion.p
              key="quote2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="max-w-md text-lg italic text-slate-400"
            >
              &ldquo;{QUOTES[1]}&rdquo;
            </motion.p>
          )}
        </AnimatePresence>

        {/* 主标题 */}
        <AnimatePresence>
          {isActive('title') && (
            <motion.div
              key="title"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, type: 'spring', stiffness: 100 }}
            >
              <h1 className="text-gradient text-glow text-5xl font-extrabold md:text-7xl">
                教师节快乐
              </h1>
              <p className="mt-3 text-lg text-slate-400">致敬每一位引路人</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 进入按钮 */}
        <AnimatePresence>
          {isActive('button') && (
            <motion.button
              key="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
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

      {/* 底部入口 */}
      <AnimatePresence>
        {isActive('button') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="fixed bottom-8 z-10 flex gap-4 text-xs text-slate-600"
          >
            <button
              onClick={() => router.push('/admin')}
              className="hover:text-slate-400 transition-colors"
            >
              管理后台
            </button>
            <button
              onClick={() => router.push('/display')}
              className="hover:text-slate-400 transition-colors"
            >
              大屏模式
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
