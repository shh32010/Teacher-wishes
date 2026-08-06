// ============================================================
// 祝福星河 — 每条祝福对应一颗星星，悬浮预览、点击跳转
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { Blessing } from '@/types';

/** 每颗星的坐标 + 祝福数据 */
interface Star {
  id: string;
  x: number; // 百分比 0-100
  y: number;
  size: number; // 像素
  blessing: Blessing;
}

/**
 * 用斐波那契球面分布生成均匀的 2D 坐标
 * 避免星星重叠，呈现自然的夜空分布
 */
function generatePositions(count: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // 黄金角度

  for (let i = 0; i < count; i++) {
    // 螺旋半径从边缘到中心
    const t = i / (count - 1 || 1);
    const radius = 0.15 + t * 0.7; // 15%-85% 半径
    const angle = i * phi;

    // 转换为笛卡尔坐标，映射到屏幕百分比
    const x = 50 + radius * 50 * Math.cos(angle);
    const y = 50 + radius * 50 * Math.sin(angle);

    points.push({ x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(90, y)) });
  }

  return points;
}

export default function BlessingGalaxy() {
  const router = useRouter();
  const [stars, setStars] = useState<Star[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch('/api/blessings?pageSize=50')
      .then((res) => res.json())
      .then(({ data }: { data: Blessing[] }) => {
        const positions = generatePositions(data.length);
        setStars(
          data.map((blessing, i) => ({
            id: blessing.id,
            x: positions[i].x,
            y: positions[i].y,
            size: 2.5 + (blessing.likes > 10 ? 2 : blessing.likes > 5 ? 1.5 : 0),
            blessing,
          }))
        );
        // 数据到位后渐显
        setTimeout(() => setVisible(true), 500);
      })
      .catch(() => {});
  }, []);

  if (stars.length === 0) return null;

  return (
    <div className="absolute inset-0 z-5 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div key={star.id} className="pointer-events-auto">
          {/* 星星 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: visible ? 1 : 0 }}
            transition={{ delay: Math.random() * 2, duration: 0.8 }}
            className="absolute cursor-pointer group"
            style={{ left: `${star.x}%`, top: `${star.y}%` }}
            onMouseEnter={() => setHovered(star.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => router.push('/wall')}
          >
            {/* 星点 */}
            <div
              className="rounded-full animate-star-twinkle"
              style={{
                width: star.size * 2,
                height: star.size * 2,
                marginLeft: -star.size,
                marginTop: -star.size,
                background: `radial-gradient(circle, rgba(255,233,166,0.9) 0%, rgba(245,158,11,0.4) 50%, transparent 70%)`,
                boxShadow: `0 0 ${star.size * 3}px rgba(245,158,11,0.5)`,
              }}
            />

            {/* 悬浮气泡 */}
            <AnimatePresence>
              {hovered === star.id && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-20"
                >
                  <div className="glass rounded-xl px-4 py-3 text-center whitespace-nowrap max-w-[200px]">
                    <p className="text-xs text-slate-300 truncate">
                      {star.blessing.content.slice(0, 30)}
                      {star.blessing.content.length > 30 ? '...' : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      — {star.blessing.is_anonymous ? '匿名' : star.blessing.nickname || '同学'}
                    </p>
                    <p className="text-xs text-pink-400">❤️ {star.blessing.likes}</p>
                  </div>
                  {/* 小三角 */}
                  <div className="mx-auto w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/10" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      ))}
    </div>
  );
}
