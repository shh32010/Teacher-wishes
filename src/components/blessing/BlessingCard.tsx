// ============================================================
// 祝福卡片 — 单条祝福展示（含点赞 + localStorage 防重复）
// 暖色主题 — 白色玻璃态卡片 + 暖棕文字
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import GlassCard from '@/components/ui/GlassCard';
import LikeBurst from '@/components/blessing/LikeBurst';
import { cn, formatDate } from '@/lib/utils';
import type { Blessing } from '@/types';

function getLikedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('liked_blessings');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveLikedId(id: string) {
  const ids = getLikedIds();
  ids.add(id);
  localStorage.setItem('liked_blessings', JSON.stringify(Array.from(ids)));
}

interface BlessingCardProps {
  blessing: Blessing;
  index?: number;
  /** 点赞回调，返回 true 表示服务端确认，false 表示被拒绝（需回滚） */
  onLike?: (id: string) => Promise<boolean>;
}

export default function BlessingCard({ blessing, index = 0, onLike }: BlessingCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(blessing.likes);
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    const likedIds = getLikedIds();
    if (likedIds.has(blessing.id)) {
      setLiked(true);
    }
  }, [blessing.id]);

  const handleLike = async () => {
    if (liked) return;

    // 乐观更新
    setLiked(true);
    setLikesCount((prev) => prev + 1);
    setShowBurst(true);
    saveLikedId(blessing.id);

    // 等待服务端确认
    const confirmed = onLike ? await onLike(blessing.id) : true;

    if (!confirmed) {
      // 服务端拒绝 → 回滚乐观更新
      setLiked(false);
      setLikesCount((prev) => prev - 1);
      setShowBurst(false);
    }
  };

  return (
    <motion.div
      layout
      layoutId={`blessing-${blessing.id}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: 'easeOut',
        layout: { duration: 0.4, ease: 'easeInOut' },
      }}
    >
      <GlassCard className="flex flex-col gap-2 p-4 md:p-6">
        {/* 第一层：身份 — 头像 + 姓名/班级 + 日期 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {(blessing.nickname || '匿')[0]}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink">
                {blessing.is_anonymous ? '匿名同学' : blessing.nickname || '匿名同学'}
              </p>
              {blessing.class && <p className="text-[11px] text-ink-muted">{blessing.class}</p>}
            </div>
          </div>
          <span className="shrink-0 text-[11px] text-ink-muted">
            {formatDate(blessing.created_at)}
          </span>
        </div>

        {/* 第二层：祝福正文 */}
        <p className="text-[13px] leading-snug text-ink">{blessing.content}</p>

        {/* 第三层：老师标签 + 点赞 */}
        <div className="flex items-center justify-between">
          {blessing.teacher ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/teacher/${blessing.teacher!.id}`);
              }}
              className="flex items-center gap-1.5 rounded-full bg-accent/10 pl-0.5 pr-3 py-0.5 text-xs text-accent hover:bg-accent/20 transition-colors cursor-pointer"
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
          <span className="relative">
            <LikeBurst active={showBurst} onComplete={() => setShowBurst(false)} />
            <button
              onClick={handleLike}
              disabled={liked}
              aria-label={liked ? `已点赞，共${likesCount}赞` : `点赞，当前${likesCount}赞`}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all duration-200',
                liked
                  ? 'bg-like/15 text-like cursor-default'
                  : 'text-ink-muted hover:text-like hover:bg-like/5'
              )}
            >
              <span className={cn(liked && 'animate-pulse')} aria-hidden="true">
                {liked ? '❤️' : '🤍'}
              </span>
              <span>{likesCount}</span>
            </button>
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
}
