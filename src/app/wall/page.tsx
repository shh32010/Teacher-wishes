// ============================================================
// 祝福墙页面 — 无限滚动 + Supabase Realtime 实时订阅
// ============================================================

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import dynamic from 'next/dynamic';
import { createRealtimeClient } from '@/lib/supabase/client';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Blessing, PaginatedResponse } from '@/types';
import BlessingCard from '@/components/blessing/BlessingCard';

const BlessingForm = dynamic(() => import('@/components/blessing/BlessingForm'), {
  ssr: false,
});
const ConfettiTrigger = dynamic(() => import('@/components/blessing/ConfettiTrigger'), {
  ssr: false,
});

const PAGE_SIZE = 20;
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/** SWR 分页 key 生成器 */
const getKey = (pageIndex: number, prevPage: PaginatedResponse<Blessing> | null) => {
  if (prevPage && prevPage.data.length === 0) return null; // 到末尾了
  return `/api/blessings?page=${pageIndex + 1}&pageSize=${PAGE_SIZE}`;
};

export default function WallPage() {
  const [showForm, setShowForm] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 无限滚动数据
  const {
    data: pages,
    error,
    isLoading,
    size,
    setSize,
    mutate,
  } = useSWRInfinite<PaginatedResponse<Blessing>>(getKey, fetcher, {
    revalidateFirstPage: false,
    refreshInterval: 5 * 60 * 1000, // 5分钟兜底
  });

  // 展平所有页
  const blessings = useMemo(() => {
    if (!pages) return [];
    return pages.flatMap((p) => p.data);
  }, [pages]);

  const hasMore = pages ? pages[pages.length - 1]?.data.length === PAGE_SIZE : true;
  const totalCount = pages?.[0]?.count || 0;

  // 加载更多
  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setSize(size + 1);
  }, [hasMore, size, setSize]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore: loadMore,
  });

  // Supabase Realtime 订阅
  useEffect(() => {
    const supabase = createRealtimeClient();

    const channel = supabase
      .channel('blessings-wall')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'blessings', filter: 'status=eq.approved' },
        () => mutate()
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'blessings' }, () =>
        mutate()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('🔌 Realtime 已连接');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  // 提交祝福
  const handleSubmit = useCallback(
    async (formData: { nickname: string; class_: string; content: string; teacherId: string }) => {
      setIsSubmitting(true);
      try {
        const res = await fetch('/api/blessings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nickname: formData.nickname,
            class: formData.class_,
            content: formData.content,
            teacher_id: formData.teacherId || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || '提交失败');
          return;
        }
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        await mutate();
        setShowForm(false);
      } catch {
        alert('网络错误，请稍后再试');
      } finally {
        setIsSubmitting(false);
      }
    },
    [mutate]
  );

  // 点赞
  const handleLike = useCallback(async (id: string) => {
    try {
      await fetch(`/api/blessings/${id}/like`, { method: 'POST' });
    } catch {
      /* 乐观更新已在组件中完成 */
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night">
        <div className="text-slate-400">加载祝福中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night">
        <div className="text-red-400">加载失败，请刷新重试</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-night pb-20">
      {showConfetti && <ConfettiTrigger />}

      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-30 border-b border-white/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <a href="/" className="text-lg font-bold text-white">
            🌟 教师节祝福墙
          </a>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">共 {totalCount} 条</span>
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
              ✏️ 写祝福
            </button>
          </div>
        </div>
      </header>

      {/* 祝福卡片列表 */}
      <div className="mx-auto mt-8 max-w-3xl px-4">
        {blessings.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-slate-500">还没有祝福，快来写下第一条吧 ✨</p>
          </div>
        ) : (
          <>
            <div className="columns-1 gap-6 space-y-6 md:columns-2">
              {blessings.map((blessing, index) => (
                <div key={blessing.id} className="break-inside-avoid">
                  <BlessingCard blessing={blessing} index={index} onLike={handleLike} />
                </div>
              ))}
            </div>

            {/* 加载更多指示器 */}
            <div ref={sentinelRef} className="py-8 text-center">
              {hasMore ? (
                <span className="text-sm text-slate-600">加载更多...</span>
              ) : (
                <span className="text-sm text-slate-600">— 已经到底了 —</span>
              )}
            </div>
          </>
        )}
      </div>

      <BlessingForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </main>
  );
}
