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

// ─────────────────────────────────────────────────────────────
// 天体/星星「发布」布局 — 禁区避让自由散布
// 禁区来源：Edge headless 实测首页文案/按钮/图标矩形（1440×900 与 390×844）
// 坐标系：视口百分比（x/y = 左/上，w/h = 宽/高），已含视觉留白
// ─────────────────────────────────────────────────────────────

interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 首页文案/按钮/图标禁区（百分比矩形） */
const LAYOUT_ZONES: { wide: Zone[]; narrow: Zone[] } = {
  // 桌面（≥768px）
  wide: [
    { x: 42, y: 15, w: 17, h: 12 }, // 语录「一支粉笔…/三尺讲台…」
    { x: 31, y: 26, w: 39, h: 17 }, // 主标题 + 副标题
    { x: 41, y: 45.5, w: 19, h: 7 }, // 星河引导文案
    { x: 35.5, y: 50.5, w: 30, h: 21.5 }, // 数据看板 3 卡
    { x: 41.5, y: 71.5, w: 18, h: 14 }, // CTA 按钮 + 「先看看祝福墙」
    { x: 92, y: 0.5, w: 8, h: 6.5 }, // 主题切换（右上）
    { x: 0.5, y: 82, w: 10.5, h: 18 }, // 活动二维码（左下）
    { x: 93.5, y: 94.5, w: 6.5, h: 5.5 }, // 管理后台（右下）
  ],
  // 移动端（<768px）
  narrow: [
    { x: 20, y: 15, w: 60, h: 13 }, // 语录两行
    { x: 5, y: 27.5, w: 90, h: 15.5 }, // 标题 + 副标题
    { x: 18, y: 45.5, w: 64, h: 6 }, // 星河引导
    { x: 9, y: 50.5, w: 82, h: 22 }, // 数据看板
    { x: 27, y: 71, w: 46, h: 13.5 }, // CTA + 链接
    { x: 84, y: 0.5, w: 16, h: 5.5 }, // 主题切换（右上）
    { x: 79, y: 93.5, w: 21, h: 6.5 }, // 管理后台（右下）
  ],
};

/** 点是否落入任一禁区（可附加边距） */
function inZone(x: number, y: number, zones: Zone[], pad = 0): boolean {
  return zones.some(
    (z) => x > z.x - pad && x < z.x + z.w + pad && y > z.y - pad && y < z.y + z.h + pad
  );
}

/**
 * 在可视区自由散布 count 个点，拒绝采样避开禁区（Math.random 真随机，
 * 视觉均匀自然——固定 LCG 序列在二维线性相关会排成斜带）
 * @param opts.margin 点到禁区的最小距离（百分比）
 * @param opts.gap 已放点之间的最小间距（百分比）
 * @param opts.zones 禁区集合（当前视口档位）
 */
function scatterPositions(
  count: number,
  opts: { margin: number; gap: number; zones: Zone[] }
): { x: number; y: number }[] {
  const { margin, gap, zones } = opts;
  const points: { x: number; y: number }[] = [];
  const maxTries = Math.max(800, count * 120); // 拒绝采样兜底上限
  for (let i = 0; i < maxTries && points.length < count; i++) {
    const x = 2 + Math.random() * 96;
    const y = 1.5 + Math.random() * 97;
    if (inZone(x, y, zones, margin)) continue; // 落入禁区 → 弃点重投
    if (gap > 0 && points.some((p) => Math.hypot(p.x - x, p.y - y) < gap)) continue; // 离已放点太近
    points.push({ x, y });
  }
  return points;
}

/**
 * 模块级位置池（一次性真随机生成后缓存）：
 * 同屏多次刷新/新增祝福时，已有天体与星星保持原位不跳，
 * 新祝福星按顺序取池中下一个空位。不同设备/刷新产生不同自然布局。
 */
const POOL_CACHE: Record<
  'wide' | 'narrow',
  { teacher?: { x: number; y: number }[]; star?: { x: number; y: number }[] }
> = {
  wide: {},
  narrow: {},
};

function getPositionPool(
  key: 'wide' | 'narrow',
  kind: 'teacher' | 'star'
): { x: number; y: number }[] {
  const cache = POOL_CACHE[key];
  if (!cache[kind]) {
    const zones = key === 'wide' ? LAYOUT_ZONES.wide : LAYOUT_ZONES.narrow;
    cache[kind] =
      kind === 'teacher'
        ? scatterPositions(41, { margin: 3, gap: 6.8, zones })
        : scatterPositions(900, { margin: 1.3, gap: 0, zones });
  }
  return cache[kind]!;
}

/**
 * 气泡结构：箭头与内容块分离定位——
 * - 箭头固定在星点正上/正下（translateX(-50%) 恒对准天体中心）
 * - 内容块水平居中于星点，靠视口边缘时用 marginLeft clamp 向内收，
 *   保证不溢出（箭头不动，只内容平移，箭头始终指向星）
 */
const BUBBLE_OFFSET = {
  teacher: { arrow: 13, content: 25 }, // 26px 天体半径 13
  star: { arrow: 8, content: 20 }, // 祝福星半径 4~11px
};

/** 内容块 ref：首次挂载时按星点 x 计算 clamp 平移（防止左右溢出） */
function clampBubble(el: HTMLDivElement | null, starX: number) {
  if (!el || el.dataset.clamped) return;
  el.dataset.clamped = '1';
  const w = el.offsetWidth;
  const c = (starX / 100) * window.innerWidth;
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, c - w / 2));
  el.style.marginLeft = `${left - (c - w / 2)}px`;
}

/** 箭头三角的 border 方向（below=气泡在星上方，尖朝下指星） */
function arrowBorder(below: boolean): string {
  return below
    ? 'border-x-[5px] border-t-[7px] border-x-transparent border-t-ink/10'
    : 'border-x-[5px] border-b-[7px] border-x-transparent border-b-ink/10';
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

/** 教师天体缓慢漂移参数（按 id 确定性派生：幅度 14~30px、周期 12~22s、错相位） */
function drift(id: string): { x: number; y: number; dur: number; phase: number } {
  const r = stableRandom(id);
  const amp = 14 + r * 16;
  return { x: amp, y: amp * 0.6, dur: 12 + r * 10, phase: r * 12 };
}

export default function GiftGalaxy() {
  const [stars, setStars] = useState<Star[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);

  // 拉取星河数据（教师天体 + 祝福星星）并生成星表
  const loadGalaxy = useCallback(async (firstLoad = false) => {
    // 词库 165 句天然有界 → 不择优：所有被送出的句子都亮星
    // （上限 500 仅为防未来词库大幅扩大的页面性能失控，日常不触发）
    const MAX_VISUAL_STARS = 500;
    try {
      const [groupedRes, teachersRes] = await Promise.all([
        fetch('/api/blessings/grouped?sort=likes').then((r) => r.json()),
        fetch('/api/teachers').then((r) => r.json()),
      ]);
      const groups: BlessingGroup[] = (groupedRes.groups || []).slice(0, MAX_VISUAL_STARS);
      const teachers: Teacher[] = teachersRes.teachers || [];

      const allStars: Star[] = [];

      // 布局档位：禁区随视口；位置取自模块级真随机池（会话内稳定）
      const poolKey = window.innerWidth < 768 ? 'narrow' : 'wide';

      // 教师天体 — 真随机自然散布（大边距防贴文案、天体间保持间距，
      // 池缓存：刷新/新增祝福时教师位置不跳）
      const teacherPos = getPositionPool(poolKey, 'teacher');
      teachers.forEach((teacher, i) => {
        allStars.push({
          id: `teacher-${teacher.id}`,
          x: teacherPos[i]?.x ?? 50,
          y: teacherPos[i]?.y ?? 50,
          size: 26,
          type: 'teacher',
          teacher,
        });
      });

      // 祝福星星 — 真随机散布（小边距；每句一颗，送出越多越大越亮）
      const starPool = getPositionPool(poolKey, 'star');
      const blessingPos = starPool.slice(0, groups.length);
      groups.forEach((group, i) => {
        const baseSize = 3.5 + (group.count > 10 ? 2.5 : group.count > 5 ? 1.5 : 0);
        allStars.push({
          id: `blessing-${group.representative_id}`,
          x: blessingPos[i]?.x ?? 50,
          y: blessingPos[i]?.y ?? 50,
          size: group.is_featured ? baseSize + 3 : baseSize,
          type: 'blessing',
          group,
        });
      });

      setStars(allStars);
      if (firstLoad) {
        // 首次挂载：延迟点亮入场动画
        setTimeout(() => setVisible(true), 500);
      }
      // 刷新时：已 visible，新祝福星会以初始态淡入（同 key 星不重播动画）
    } catch (err) {
      // 星河数据加载失败 → 静默降级（首页其他区块不受影响）
      console.error('[GiftGalaxy] 数据加载失败:', err);
    }
  }, []);

  useEffect(() => {
    // 首次加载 + 保持新鲜：
    // - 切回页面（focus/visibilitychange）立即刷新——送出祝福后回首页可见新星
    // - 60 秒轮询兜底（与 wall 一致性模型一致：API 为真相，轮询为兜底）
    void loadGalaxy(true);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void loadGalaxy();
    };
    const onFocus = () => void loadGalaxy();
    const timer = setInterval(() => void loadGalaxy(), 60_000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadGalaxy]);

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
                {/* 教师天体为纯展示（点击无详情弹窗），悬停仅显示姓名 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.5 }}
                  transition={{ delay: 0.5 + stableRandom(star.id) * 0.5, duration: 0.8 }}
                  className="group absolute"
                  style={{ left: `${star.x}%`, top: `${star.y}%` }}
                >
                  {/* 缓慢漂移层：悬停事件挂在漂移层上，光标跟随移动中的星体 */}
                  <motion.div
                    animate={{
                      x: [0, drift(star.id).x, 0],
                      y: [0, drift(star.id).y, 0],
                    }}
                    transition={{
                      duration: drift(star.id).dur,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: -drift(star.id).phase,
                    }}
                    onMouseEnter={() => setHovered(star.id)}
                    onMouseLeave={() => setHovered(null)}
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
                  </motion.div>

                  {/* 悬浮气泡 — 箭头恒指星点，内容块防溢出 */}
                  <AnimatePresence>
                    {hovered === star.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-none absolute z-30"
                      >
                        {(() => {
                          const below = star.y >= 15; // 星在中下 → 气泡在上方
                          const off = BUBBLE_OFFSET.teacher;
                          return (
                            <>
                              {/* 内容块（玻璃卡）：星正上方，水平居中并按边缘 clamp */}
                              <div
                                ref={(el) => clampBubble(el, star.x)}
                                className="glass absolute whitespace-nowrap rounded-xl px-4 py-3 text-center"
                                style={{
                                  left: 0,
                                  ...(below ? { bottom: off.content } : { top: off.content }),
                                  transform: 'translateX(-50%)',
                                }}
                              >
                                <p className="text-sm font-bold text-ink">{star.teacher!.name}</p>
                                {star.teacher!.department && (
                                  <p className="text-xs text-ink-muted">
                                    {star.teacher!.department}
                                  </p>
                                )}
                              </div>
                              {/* 箭头：固定星点正上/正下，不随内容平移 */}
                              <div
                                className={`absolute left-1/2 h-0 w-0 -translate-x-1/2 ${arrowBorder(below)}`}
                                style={below ? { bottom: off.arrow } : { top: off.arrow }}
                              />
                            </>
                          );
                        })()}
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
                      className="pointer-events-none absolute z-30"
                    >
                      {(() => {
                        const below = star.y >= 15;
                        const off = BUBBLE_OFFSET.star;
                        return (
                          <>
                            {/* 内容块：星上方，水平居中并按边缘 clamp */}
                            <div
                              ref={(el) => clampBubble(el, star.x)}
                              className="glass absolute max-w-[220px] whitespace-nowrap rounded-xl px-4 py-3 text-center"
                              style={{
                                left: 0,
                                ...(below ? { bottom: off.content } : { top: off.content }),
                                transform: 'translateX(-50%)',
                              }}
                            >
                              <p className="truncate text-xs text-ink">
                                {group.content.slice(0, 30)}
                                {group.content.length > 30 ? '...' : ''}
                              </p>
                              <p className="mt-1 text-xs text-ink-muted">
                                {group.count} 位同学送出 · ❤️ {group.total_likes}
                              </p>
                              <p className="text-xs text-accent">点击查看详情</p>
                            </div>
                            {/* 箭头：固定星点正上/正下 */}
                            <div
                              className={`absolute left-1/2 h-0 w-0 -translate-x-1/2 ${arrowBorder(below)}`}
                              style={below ? { bottom: off.arrow } : { top: off.arrow }}
                            />
                          </>
                        );
                      })()}
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
              aria-label="祝福详情"
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

                {/* v2.0：教师天体无详情弹窗（纯展示，悬停显名）；
                    弹窗仅祝福星使用 */}
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
