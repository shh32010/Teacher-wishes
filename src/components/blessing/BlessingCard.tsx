// ============================================================
// 祝福卡片 — 单条祝福展示（含点赞 + localStorage 防重复）
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import GlassCard from '@/components/ui/GlassCard';
import { cn, formatDate } from '@/lib/utils';
import type { Blessing } from '@/types';

/** 从 localStorage 读取已点赞的祝福 ID 集合 */
function getLikedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('liked_blessings');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/** 将祝福 ID 写入 localStorage 已点赞集合 */
function saveLikedId(id: string) {
  const ids = getLikedIds();
  ids.add(id);
  localStorage.setItem('liked_blessings', JSON.stringify(Array.from(ids)));
}

interface BlessingCardProps {
  blessing: Blessing;
  /** 入场动画延迟索引（用于 stagger 效果） */
  index?: number;
  /** 点赞回调 */
  onLike?: (id: string) => void;
}

export default function BlessingCard({ blessing, index = 0, onLike }: BlessingCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(blessing.likes);

  // 初始化时从 localStorage 读取点赞状态
  useEffect(() => {
    const likedIds = getLikedIds();
    if (likedIds.has(blessing.id)) {
      setLiked(true);
    }
  }, [blessing.id]);

  const handleLike = () => {
    if (liked) return;
    // 乐观更新
    setLiked(true);
    setLikesCount((prev) => prev + 1);
    saveLikedId(blessing.id);
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
          <span className="text-xs text-slate-400">{formatDate(blessing.created_at)}</span>
        </div>

        {/* 祝福内容 */}
        <p className="text-sm leading-relaxed text-slate-200">{blessing.content}</p>

        {/* 底部：教师标签 + 点赞 */}
        <div className="flex items-center justify-between pt-1">
          {blessing.teacher ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/teacher/${blessing.teacher!.id}`);
              }}
              className="flex items-center gap-1.5 rounded-full bg-accent/10 pl-0.5 pr-3 py-0.5 text-xs text-accent-light hover:bg-accent/20 transition-colors cursor-pointer"
              aria-label={`查看${blessing.teacher.name}老师的详情页`}
            >
              {blessing.teacher.avatar_url ? (
                <span className="relative inline-block h-5 w-5 overflow-hidden rounded-full ring-1 ring-accent/30">
                  <Image
                    src={blessing.teacher.avatar_url}
                    alt={blessing.teacher.name}
                    fill
                    sizes="20px"
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-xs">
                  {blessing.teacher.name[0]}
                </span>
              )}
              {blessing.teacher.name}老师 →
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={handleLike}
            disabled={liked}
            aria-label={liked ? `已点赞，共${likesCount}赞` : `点赞，当前${likesCount}赞`}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all duration-200',
              liked
                ? 'bg-pink-500/20 text-pink-400 cursor-default'
                : 'glass hover:bg-white/15 text-slate-400 hover:text-pink-400'
            )}
          >
            <span className={cn(liked && 'animate-pulse')} aria-hidden="true">
              {liked ? '❤️' : '🤍'}
            </span>
            <span>{likesCount}</span>
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
