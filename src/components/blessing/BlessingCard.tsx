// ============================================================
// 祝福卡片 — 单条祝福展示
// ============================================================

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { cn, formatDate } from '@/lib/utils';
import type { Blessing } from '@/types';

interface BlessingCardProps {
  blessing: Blessing;
  /** 入场动画延迟索引（用于 stagger 效果） */
  index?: number;
  /** 点赞回调 */
  onLike?: (id: string) => void;
}

export default function BlessingCard({ blessing, index = 0, onLike }: BlessingCardProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(blessing.likes);

  const handleLike = () => {
    if (liked) return; // 已点赞则跳过
    setLiked(true);
    setLikesCount((prev) => prev + 1);
    onLike?.(blessing.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: 'easeOut',
      }}
    >
      <GlassCard className="flex flex-col gap-3">
        {/* 头部：发送者信息 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary-light">
              {(blessing.nickname || '匿')[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {blessing.is_anonymous ? '匿名同学' : blessing.nickname || '匿名同学'}
              </p>
              {blessing.class && <p className="text-xs text-slate-400">{blessing.class}</p>}
            </div>
          </div>
          <span className="text-xs text-slate-500">{formatDate(blessing.created_at)}</span>
        </div>

        {/* 祝福内容 */}
        <p className="text-sm leading-relaxed text-slate-200">{blessing.content}</p>

        {/* 底部：教师标签 + 点赞 */}
        <div className="flex items-center justify-between pt-1">
          {blessing.teacher && (
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent-light">
              ❤️ {blessing.teacher.name}老师
            </span>
          )}
          <button
            onClick={handleLike}
            disabled={liked}
            className={cn(
              'ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all duration-200',
              liked
                ? 'bg-pink-500/20 text-pink-400 cursor-default'
                : 'glass hover:bg-white/15 text-slate-400 hover:text-pink-400'
            )}
          >
            <span className={cn(liked && 'animate-pulse')}>{liked ? '❤️' : '🤍'}</span>
            <span>{likesCount}</span>
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
