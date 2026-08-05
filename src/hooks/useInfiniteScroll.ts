// ============================================================
// 无限滚动 Hook — IntersectionObserver 监听底部触发加载
// ============================================================

'use client';

import { useEffect, useRef, useCallback } from 'react';

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

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: `0px 0px ${threshold}px 0px`,
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [handleObserver, threshold]);

  return { sentinelRef };
}
