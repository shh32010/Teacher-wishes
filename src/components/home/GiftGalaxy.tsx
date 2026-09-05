// ============================================================
// 礼物星河（v2.0）— 教师天体外圈 + 祝福星星环绕
// 聚合模型：每颗星星 = 一句祝福（同句多人送出合并为一颗，大小按送出人数）
// 弹窗展示该句的礼物数量分布（🌹×8 🌟×5）与总赞
// 产品原则 1：不比较老师 — 教师弹窗不展示收到祝福数量
// ============================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { BlessingGroup } from '@/lib/group-blessings';
import type { Teacher } from '@/types';

interface Star {
  id: string;
  x: number;
  y: number;
  size: number;
  type: 'blessing' | 'teacher';
  group?: BlessingGroup;
  teacher?: Teacher;
}

/**
 * 用斐波那契螺旋生成均匀分布的 2D 坐标（避开中心光核区域）
 */
function generatePositions(count: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1 || 1);
    const radius = 0.14 + t * 0.72;
    const angle = i * phi;
    const x = 50 + radius * 50 * Math.cos(angle);
    const y = 50 + radius * 50 * Math.sin(angle);
    points.push({ x: Math.max(3, Math.min(97, x)), y: Math.max(3, Math.min(94, y)) });
  }

  return points;
}

/** 格式化日期 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * 基于字符串 ID 生成稳定的伪随机数 (0-1)
 * 替代 render 中的 Math.random()，避免 hydration 不稳定和动画不可预测
 */
function stableRandom(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 1000) / 1000;
}

export default function GiftGalaxy() {
  const [stars, setStars] = useState<Star[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);

  useEffect(() => {
    // 视觉上限：防止大量祝福导致 DOM/Motion 元素过多
    // 聚合模型：每句祝福一颗星（同句合并），当前词库 126 句 → 天然有界
    const MAX_VISUAL_STARS = 120;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    Promise.all([
      fetch('/api/blessings/grouped?sort=likes').then((r) => r.json()),
      fetch('/api/teachers').then((r) => r.json()),
    ])
      .then(([groupedRes, teachersRes]) => {
        const groups: BlessingGroup[] = (groupedRes.groups || []).slice(0, MAX_VISUAL_STARS);
        const teachers: Teacher[] = teachersRes.teachers || [];

        const total = teachers.length + groups.length;
        const positions = generatePositions(total);

        const allStars: Star[] = [];

        // 教师天体 — 最外圈（教师展示，不参与数量对比）
        teachers.forEach((teacher, i) => {
          const posIdx = groups.length + i;
          allStars.push({
            id: `teacher-${teacher.id}`,
            x: positions[posIdx]?.x ?? 50,
            y: positions[posIdx]?.y ?? 50,
            size: 26,
            type: 'teacher',
            teacher,
          });
        });

        // 祝福星星 — 每句一颗，送出人数越多越大越亮
        groups.forEach((group, i) => {
          const baseSize = 3.5 + (group.count > 10 ? 2.5 : group.count > 5 ? 1.5 : 0);
          allStars.push({
            id: `blessing-${group.representative_id}`,
            x: positions[i]?.x ?? 50,
            y: positions[i]?.y ?? 50,
            size: group.is_featured ? baseSize + 3 : baseSize,
            type: 'blessing',
            group,
          });
        });

        setStars(allStars);
        showTimer = setTimeout(() => setVisible(true), 500);
      })
      .catch((err) => {
        // 星河数据加载失败 → 静默降级（首页其他区块不受影响）
        console.error('[GiftGalaxy] 数据加载失败:', err);
      });

    return () => {
      if (showTimer) clearTimeout(showTimer);
    };
  }, []);

  // 键盘事件
  const handleStarKeyDown = useCallback((e: React.KeyboardEvent, star: Star) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedStar(star);
    }
  }, []);

  // 焦点 trap
  useEffect(() => {
    if (!selectedStar) return;

    const modalEl = document.querySelector('[data-modal="galaxy-detail"]');
    if (!modalEl) return;

    const focusableSelector = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

    const getFocusableElements = (): HTMLElement[] => {
      const elements = modalEl.querySelectorAll<HTMLElement>(focusableSelector);
      return Array.from(elements).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
      );
    };

    const timer = setTimeout(() => {
      const closeBtn = modalEl.querySelector<HTMLElement>('button[aria-label="关闭详情"]');
      if (closeBtn) closeBtn.focus();
      else {
        const firstEl = getFocusableElements()[0];
        firstEl?.focus();
      }
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedStar(null);
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = getFocusableElements();
      if (focusables.length === 0) return;

      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === firstEl || !modalEl.contains(activeEl)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (activeEl === lastEl || !modalEl.contains(activeEl)) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedStar]);

  if (stars.length === 0) {
    return null;
  }

  return (
    <>
      {/* ==================== 星河层 ==================== */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {stars.map((star) => {
          if (star.type === 'teacher') {
            return (
              <div key={star.id} className="pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.5 }}
                  transition={{ delay: 0.5 + stableRandom(star.id) * 0.5, duration: 0.8 }}
                  className="group absolute cursor-pointer"
                  style={{ left: `${star.x}%`, top: `${star.y}%` }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${star.teacher!.name}，点击查看详情`}
                  onKeyDown={(e) => handleStarKeyDown(e, star)}
                  onMouseEnter={() => setHovered(star.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelectedStar(star)}
                >
                  {/* 教师天体 — 暖金光晕 + 头像 */}
                  <div
                    className="relative flex items-center justify-center overflow-hidden rounded-full"
                    style={{
                      width: star.size,
                      height: star.size,
                      marginLeft: -star.size / 2,
                      marginTop: -star.size / 2,
                      background:
                        'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 55%, transparent) 0%, color-mix(in srgb, var(--color-accent-gold) 30%, transparent) 50%, transparent 70%)',
                      boxShadow: `0 0 ${star.size}px color-mix(in srgb, var(--color-primary) 50%, transparent), 0 0 ${star.size * 2}px color-mix(in srgb, var(--color-accent-gold) 18%, transparent)`,
                    }}
                  >
                    {star.teacher!.avatar_url ? (
                      <Image
                        src={star.teacher!.avatar_url}
                        alt={star.teacher!.name}
                        fill
                        sizes="28px"
                        className="object-cover"
                      />
                    ) : (
                      <span
                        className="text-xs font-bold text-ink drop-shadow-lg"
                        aria-hidden="true"
                      >
                        {star.teacher!.name[0]}
                      </span>
                    )}
                  </div>

                  {/* 悬浮气泡 */}
                  <AnimatePresence>
                    {hovered === star.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-full left-1/2 z-20 mb-3 -translate-x-1/2"
                      >
                        <div className="glass whitespace-nowrap rounded-xl px-4 py-3 text-center">
                          <p className="text-sm font-bold text-ink">{star.teacher!.name}</p>
                          {star.teacher!.department && (
                            <p className="text-xs text-ink-muted">{star.teacher!.department}</p>
                          )}
                          <p className="mt-1 text-xs text-accent">点击查看详情</p>
                        </div>
                        <div className="mx-auto h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-ink/10" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          }

          // 祝福星星（每句一颗，三层辉光，送出人数越多越大）
          const group = star.group!;
          return (
            <div key={star.id} className="pointer-events-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: visible ? 1 : 0 }}
                transition={{ delay: stableRandom(star.id) * 2, duration: 0.8 }}
                className="group absolute cursor-pointer"
                style={{ left: `${star.x}%`, top: `${star.y}%` }}
                role="button"
                tabIndex={0}
                aria-label={`祝福：${group.content.slice(0, 20)}...（${group.count} 位同学送出）`}
                onKeyDown={(e) => handleStarKeyDown(e, star)}
                onMouseEnter={() => setHovered(star.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelectedStar(star)}
              >
                <div
                  className="animate-star-twinkle rounded-full"
                  style={{
                    width: star.size * 2.5,
                    height: star.size * 2.5,
                    marginLeft: -star.size * 1.25,
                    marginTop: -star.size * 1.25,
                    background:
                      'radial-gradient(circle, color-mix(in srgb, var(--color-accent-gold) 95%, transparent) 0%, color-mix(in srgb, var(--color-accent-gold) 55%, transparent) 35%, color-mix(in srgb, var(--color-primary) 15%, transparent) 65%, transparent 75%)',
                    boxShadow: `0 0 ${star.size * 4}px color-mix(in srgb, var(--color-accent-gold) 60%, transparent), 0 0 ${star.size * 8}px color-mix(in srgb, var(--color-accent-gold) 25%, transparent), 0 0 ${star.size * 14}px color-mix(in srgb, var(--color-accent-gold) 10%, transparent)`,
                  }}
                />

                <AnimatePresence>
                  {hovered === star.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2"
                    >
                      <div className="glass max-w-[220px] whitespace-nowrap rounded-xl px-4 py-3 text-center">
                        <p className="truncate text-xs text-ink">
                          {group.content.slice(0, 30)}
                          {group.content.length > 30 ? '...' : ''}
                        </p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {group.count} 位同学送出 · ❤️ {group.total_likes}
                        </p>
                        <p className="text-xs text-accent">点击查看详情</p>
                      </div>
                      <div className="mx-auto h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-ink/10" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* ==================== 详情弹窗 ==================== */}
      <AnimatePresence>
        {selectedStar && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedStar(null)}
            />

            {/* 弹窗卡片 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-label={
                selectedStar.type === 'teacher' ? `${selectedStar.teacher!.name}的详情` : '祝福详情'
              }
              data-modal="galaxy-detail"
              onClick={() => setSelectedStar(null)}
            >
              <div
                className="glass relative w-full max-w-md rounded-2xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 关闭按钮 */}
                <button
                  onClick={() => setSelectedStar(null)}
                  aria-label="关闭详情"
                  className="absolute right-4 top-4 rounded-full p-1.5 text-ink-muted hover:text-ink transition-colors"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {selectedStar.type === 'teacher' && selectedStar.teacher && (
                  <div className="text-center">
                    {/* 教师头像（v2.0：不展示收到的祝福数量，避免教师间比较） */}
                    <div
                      className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary/15"
                      style={{
                        boxShadow:
                          '0 0 32px color-mix(in srgb, var(--color-primary) 40%, transparent), 0 0 64px color-mix(in srgb, var(--color-accent-gold) 15%, transparent)',
                      }}
                    >
                      {selectedStar.teacher!.avatar_url ? (
                        <Image
                          src={selectedStar.teacher!.avatar_url}
                          alt={selectedStar.teacher!.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-primary" aria-hidden="true">
                          {selectedStar.teacher!.name[0]}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-ink">{selectedStar.teacher!.name}</h2>
                    {selectedStar.teacher!.department && (
                      <p className="mt-1 text-sm text-ink-light">
                        {selectedStar.teacher!.department}
                      </p>
                    )}
                    {selectedStar.teacher!.description && (
                      <p className="mt-3 text-sm leading-relaxed text-ink">
                        {selectedStar.teacher!.description}
                      </p>
                    )}
                  </div>
                )}

                {selectedStar.type === 'blessing' && selectedStar.group && (
                  <div className="text-center">
                    {/* 祝福内容 */}
                    <p className="mt-2 text-base leading-relaxed text-ink">
                      {selectedStar.group.content}
                    </p>

                    {/* 情绪标签 */}
                    {selectedStar.group.emotion && (
                      <span className="mt-3 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                        {selectedStar.group.emotion}
                      </span>
                    )}

                    {/* 礼物数量分布（核心展示：该句收到的各类礼物统计） */}
                    <div className="mt-4 rounded-xl bg-ink/5 px-4 py-3">
                      <p className="mb-2 text-xs font-medium text-ink-light">
                        {selectedStar.group.count} 位同学送出，礼物构成：
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {selectedStar.group.gift_counts.length > 0 ? (
                          selectedStar.group.gift_counts.map((g, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent"
                            >
                              {g.icon}
                              {g.name} ×{g.count}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-ink-muted">暂无礼物记录</span>
                        )}
                      </div>
                    </div>

                    {/* 元信息（始终显示点赞数） */}
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs text-ink-muted">
                      <span>❤️ {selectedStar.group.total_likes} 赞</span>
                      <span>最新 {formatDate(selectedStar.group.latest_created_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
