// ============================================================
// 聚合祝福卡片（UX-1）— 同一句祝福多人送出时合并展示
// 点赞指向组内最新一条（代表条），展示组内总赞数
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import LikeBurst from '@/components/blessing/LikeBurst';
import { cn, formatDate } from '@/lib/utils';
import type { BlessingGroup } from '@/lib/group-blessings';

interface GroupedBlessingCardProps {
  group: BlessingGroup;
  index?: number;
  /** 点赞回调（对代表条），返回 true 表示服务端确认 */
  onLike?: (representativeId: string) => Promise<boolean>;
}

/** 首字符安全截取（emoji 代理对不乱码） */
function firstChar(text: string | null): string {
  if (!text) return '匿';
  return Array.from(text)[0] || '匿';
}

export default function GroupedBlessingCard({
  group,
  index = 0,
  onLike,
}: GroupedBlessingCardProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(group.total_likes);
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    // 复用单条点赞的 localStorage 去重（key 为代表条 id）
    try {
      const raw = localStorage.getItem('liked_blessings');
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (ids.includes(group.representative_id)) {
        setLiked(true);
      }
    } catch {
      /* 忽略损坏的存储 */
    }
  }, [group.representative_id]);

  const handleLike = async () => {
    if (liked) return;

    // 乐观更新
    setLiked(true);
    setLikesCount((prev) => prev + 1);
    setShowBurst(true);
    try {
      const raw = localStorage.getItem('liked_blessings');
      const ids: string[] = raw ? JSON.parse(raw) : [];
      ids.push(group.representative_id);
      localStorage.setItem('liked_blessings', JSON.stringify(ids));
    } catch {
      /* 存储不可用时仅依赖服务端约束 */
    }

    const confirmed = onLike ? await onLike(group.representative_id) : true;
    if (!confirmed) {
      setLiked(false);
      setLikesCount((prev) => prev - 1);
      setShowBurst(false);
      try {
        const raw = localStorage.getItem('liked_blessings');
        const ids: string[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem(
          'liked_blessings',
          JSON.stringify(ids.filter((id) => id !== group.representative_id))
        );
      } catch {
        /* 忽略 */
      }
    }
  };

  // 仅首批卡片做入场动画（与 BlessingCard 相同的性能克制）
  const animateEntrance = index < 30;

  return (
    <motion.div
      initial={animateEntrance ? { opacity: 0, y: 30 } : false}
      animate={animateEntrance ? { opacity: 1, y: 0 } : undefined}
      transition={
        animateEntrance
          ? { duration: 0.5, delay: Math.min(index % 30, 15) * 0.08, ease: 'easeOut' }
          : undefined
      }
    >
      <GlassCard
        className={`relative flex flex-col gap-2 p-4 md:p-6 ${
          group.is_featured ? 'ring-2 ring-amber-400/40' : ''
        }`}
      >
        {group.is_featured && (
          <div className="absolute -right-1 -top-1 z-10 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-900 shadow-md">
            ⭐ 精选
          </div>
        )}

        {/* 第一层：送出人数 + 时间 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {firstChar(group.latest_nickname)}
            </div>
            <p className="truncate text-[13px] font-medium text-ink">
              {group.count} 位同学送出了这句祝福
            </p>
          </div>
          <span className="shrink-0 text-[11px] text-ink-muted">
            {formatDate(group.latest_created_at)}
          </span>
        </div>

        {/* 第二层：祝福正文 + 情绪标签 */}
        <div>
          {group.emotion && (
            <span className="mb-1.5 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
              {group.emotion}
            </span>
          )}
          <p className="text-[15px] leading-snug text-ink break-words md:text-base">
            &ldquo;{group.content}&rdquo;
          </p>
        </div>

        {/* 第三层：礼物数量分布 + 点赞（不显示任何老师名字，v2 叙事统一献给全体老师） */}
        <div className="flex items-center justify-between">
          {group.gift_counts.length > 0 ? (
            <span
              className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-0.5 text-xs text-accent"
              title={group.gift_counts.map((g) => `${g.icon}${g.name}×${g.count}`).join(' ')}
            >
              {group.gift_counts.slice(0, 4).map((g, i) => (
                <span key={i}>
                  {g.icon}×{g.count}
                </span>
              ))}
              <span className="ml-1">献给全体老师</span>
            </span>
          ) : (
            <span className="rounded-full bg-accent/10 px-3 py-0.5 text-xs text-accent">
              献给全体老师
            </span>
          )}

          <span className="relative">
            <LikeBurst active={showBurst} onComplete={() => setShowBurst(false)} />
            <button
              onClick={handleLike}
              disabled={liked}
              aria-label={liked ? `已点赞，共${likesCount}赞` : `喜欢这句话，当前${likesCount}赞`}
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
