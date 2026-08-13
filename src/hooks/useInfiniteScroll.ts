// ============================================================
// 无限滚动 Hook — IntersectionObserver 监听底部触发加载
// ============================================================

'use client';

import { useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions {
  /** 是否有更多数据 */
  hasMore: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 加载下一页回调 */
  onLoadMore: () => void;
  /** 触发距离（距离底部多少 px 时触发），默认 200 */
  threshold?: number;
}

export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 200,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 用 ref 保存最新状态，observer 只创建一次，
  // 避免 callback 重建导致 observer 重新 attach 后立即重复触发
  const stateRef = useRef({ hasMore, isLoading, onLoadMore });
  stateRef.current = { hasMore, isLoading, onLoadMore };

  // 冷却时间，防止同一次滚动连续触发
  const cooldownRef = useRef(0);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const { hasMore, isLoading, onLoadMore } = stateRef.current;

        if (!entry.isIntersecting || !hasMore || isLoading) return;

        // 500ms 冷却，等数据渲染完再允许下一次触发
        const now = Date.now();
        if (now - cooldownRef.current < 500) return;
        cooldownRef.current = now;

        onLoadMore();
      },
      { rootMargin: `0px 0px ${threshold}px 0px` }
    );

    observer.observe(node);
    return () => observer.disconnect();
    // 依赖 hasMore/isLoading：初始 isLoading 时哨兵未渲染，
    // 加载完成后需要重新 attach；loadMore 已稳定（无 size 依赖），不会死循环
  }, [threshold, hasMore, isLoading]);

  return { sentinelRef };
}
