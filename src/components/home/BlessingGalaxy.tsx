// ============================================================
// 祝福星河 — 每条祝福 = 小星星，每位教师 = 大天体
// 斐波那契螺旋分布 + 悬浮预览气泡 + 点击弹窗详情
// 键盘可访问 + 焦点 trap
// 暖色主题：金色星辉 = 老师，暖光 = 祝福
// ============================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Blessing, Teacher } from '@/types';

interface Star {
  id: string;
  x: number;
  y: number;
  size: number;
  type: 'blessing' | 'teacher';
  blessing?: Blessing;
  teacher?: Teacher;
}

/**
 * 用斐波那契螺旋生成均匀分布的 2D 坐标
 */
function generatePositions(count: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1 || 1);
    const radius = 0.12 + t * 0.72;
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

export default function BlessingGalaxy() {
  const router = useRouter();
  const [stars, setStars] = useState<Star[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/blessings?pageSize=50').then((r) => r.json()),
      fetch('/api/teachers').then((r) => r.json()),
    ])
      .then(([blessingsRes, teachersRes]) => {
        const blessings: Blessing[] = blessingsRes.data || [];
        const teachers: Teacher[] = teachersRes.teachers || [];

        const total = teachers.length + blessings.length;
        const positions = generatePositions(total);

        const allStars: Star[] = [];

        // 教师星体 — 外圈显眼位置
        teachers.forEach((teacher, i) => {
          const posIdx = blessings.length + i;
          allStars.push({
            id: `teacher-${teacher.id}`,
            x: positions[posIdx]?.x ?? 50,
            y: positions[posIdx]?.y ?? 50,
            size: 28,
            type: 'teacher',
            teacher,
          });
        });

        // 祝福星星 — 内圈到中圈
        blessings.forEach((blessing, i) => {
          allStars.push({
            id: `blessing-${blessing.id}`,
            x: positions[i]?.x ?? 50,
            y: positions[i]?.y ?? 50,
            size: 2.5 + (blessing.likes > 10 ? 2 : blessing.likes > 5 ? 1.5 : 0),
            type: 'blessing',
            blessing,
          });
        });

        setStars(allStars);
        setTimeout(() => setVisible(true), 500);
      })
      .catch(() => {});
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
      <div className="pointer-events-none absolute inset-0 z-5 overflow-hidden">
        {stars.map((star) => {
          if (star.type === 'teacher') {
            return (
              <div key={star.id} className="pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.5 }}
                  transition={{ delay: 0.5 + Math.random() * 0.5, duration: 0.8 }}
                  className="group absolute cursor-pointer"
                  style={{ left: `${star.x}%`, top: `${star.y}%` }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${star.teacher!.name}老师，点击查看详情`}
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
                          <p className="text-sm font-bold text-ink">{star.teacher!.name}老师</p>
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

          // 祝福星星
          return (
            <div key={star.id} className="pointer-events-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: visible ? 1 : 0 }}
                transition={{ delay: Math.random() * 2, duration: 0.8 }}
                className="group absolute cursor-pointer"
                style={{ left: `${star.x}%`, top: `${star.y}%` }}
                role="button"
                tabIndex={0}
                aria-label={
                  star.blessing
                    ? `来自${star.blessing.is_anonymous ? '匿名' : star.blessing.nickname || '同学'}的祝福：${star.blessing.content.slice(0, 20)}...`
                    : '祝福星星'
                }
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
                  {hovered === star.id && star.blessing && (
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2"
                    >
                      <div className="glass max-w-[200px] whitespace-nowrap rounded-xl px-4 py-3 text-center">
                        <p className="truncate text-xs text-ink">
                          {star.blessing.content.slice(0, 30)}
                          {star.blessing.content.length > 30 ? '...' : ''}
                        </p>
                        <p className="mt-1 text-xs text-ink-muted">
                          — {star.blessing.is_anonymous ? '匿名' : star.blessing.nickname || '同学'}
                        </p>
                        <p className="text-xs text-like">❤️ {star.blessing.likes}</p>
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
                selectedStar.type === 'teacher'
                  ? `${selectedStar.teacher!.name}老师的详情`
                  : '祝福详情'
              }
              data-modal="galaxy-detail"
              onClick={() => setSelectedStar(null)}
            >
              <div
                className="glass w-full max-w-md rounded-2xl p-6"
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

                {selectedStar.type === 'teacher' &&
                  selectedStar.teacher &&
                  (() => {
                    const teacherBlessings = stars
                      .filter(
                        (s) =>
                          s.type === 'blessing' &&
                          s.blessing?.teacher_id === selectedStar.teacher!.id
                      )
                      .slice(0, 5);

                    return (
                      <div className="text-center">
                        {/* 教师头像 */}
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

                        <h2 className="text-xl font-bold text-ink">
                          {selectedStar.teacher!.name}老师
                        </h2>
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

                        {/* 关联祝福列表 */}
                        {teacherBlessings.length > 0 && (
                          <div className="mt-5 border-t border-ink/10 pt-4">
                            <p className="mb-3 text-xs font-medium text-ink-light">
                              💬 收到的祝福（{teacherBlessings.length}条）
                            </p>
                            <div className="max-h-48 space-y-2 overflow-y-auto pr-1 text-left">
                              {teacherBlessings.map((bs) => (
                                <div key={bs.id} className="rounded-xl bg-ink/5 px-3 py-2.5">
                                  <p className="text-sm leading-relaxed text-ink">
                                    {bs.blessing!.content}
                                  </p>
                                  <p className="mt-1 text-xs text-ink-light">
                                    —{' '}
                                    {bs.blessing!.is_anonymous
                                      ? '匿名'
                                      : bs.blessing!.nickname || '同学'}
                                    {bs.blessing!.class && <span> · {bs.blessing!.class}</span>}
                                    <span className="ml-2 text-like">❤️ {bs.blessing!.likes}</span>
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => router.push(`/teacher/${selectedStar.teacher!.id}`)}
                          className="btn-primary mt-5 inline-block"
                        >
                          📖 查看老师主页
                        </button>
                      </div>
                    );
                  })()}

                {selectedStar.type === 'blessing' && selectedStar.blessing && (
                  <div className="text-center">
                    {/* 发送者头像 */}
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                      <span className="text-lg font-bold text-primary" aria-hidden="true">
                        {(selectedStar.blessing.nickname || '匿')[0]}
                      </span>
                    </div>

                    <p className="text-sm text-ink-light">
                      {selectedStar.blessing.is_anonymous
                        ? '匿名同学'
                        : selectedStar.blessing.nickname || '匿名同学'}
                      {selectedStar.blessing.class && <span> · {selectedStar.blessing.class}</span>}
                    </p>

                    {/* 祝福内容 */}
                    <p className="mt-4 text-base leading-relaxed text-ink">
                      {selectedStar.blessing.content}
                    </p>

                    {/* 元信息 */}
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs text-ink-muted">
                      <span>❤️ {selectedStar.blessing.likes} 赞</span>
                      <span>{formatDate(selectedStar.blessing.created_at)}</span>
                    </div>

                    {/* 关联教师 */}
                    {selectedStar.blessing.teacher && (
                      <button
                        onClick={() =>
                          router.push(`/teacher/${selectedStar.blessing!.teacher!.id}`)
                        }
                        className="mt-4 flex items-center gap-1.5 mx-auto rounded-full bg-accent/10 px-4 py-1.5 text-xs text-accent hover:bg-accent/20 transition-colors"
                      >
                        {selectedStar.blessing.teacher.avatar_url ? (
                          <span className="relative inline-block h-5 w-5 overflow-hidden rounded-full">
                            <Image
                              src={selectedStar.blessing.teacher.avatar_url}
                              alt={selectedStar.blessing.teacher.name}
                              fill
                              sizes="20px"
                              className="object-cover"
                            />
                          </span>
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-xs">
                            {selectedStar.blessing.teacher.name[0]}
                          </span>
                        )}
                        {selectedStar.blessing.teacher.name}老师 →
                      </button>
                    )}
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
