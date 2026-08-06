// ============================================================
// 首页数据看板 — 总祝福 / 参与人数 / 点赞总数
// 暖色主题
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CountUp from './CountUp';
import type { BlessingStats } from '@/types';

interface StatsPanelProps {
  visible: boolean;
}

export default function StatsPanel({ visible }: StatsPanelProps) {
  const [stats, setStats] = useState<BlessingStats | null>(null);
  const [animStart, setAnimStart] = useState(false);

  useEffect(() => {
    if (!visible) return;

    fetch('/api/blessings/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setTimeout(() => setAnimStart(true), 200);
      })
      .catch(() => {});
  }, [visible]);

  if (!stats) return null;

  const items = [
    { label: '总祝福', value: stats.total_blessings, emoji: '💌', color: 'text-accent' },
    { label: '参与人数', value: stats.total_participants, emoji: '👥', color: 'text-primary' },
    { label: '点赞总数', value: stats.total_likes, emoji: '❤️', color: 'text-secondary' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="flex gap-4 md:gap-8"
    >
      {items.map((item) => (
        <div key={item.label} className="glass-card flex flex-col items-center gap-2 min-w-[100px]">
          <span className="text-2xl">{item.emoji}</span>
          <span className={`text-2xl font-bold md:text-3xl ${item.color}`}>
            <CountUp end={item.value} start={animStart} />
          </span>
          <span className="text-xs text-ink-muted">{item.label}</span>
        </div>
      ))}
    </motion.div>
  );
}
