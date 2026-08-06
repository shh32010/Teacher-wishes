// ============================================================
// 祝福墙页面 — 无限滚动 + Supabase Realtime 实时订阅
// ============================================================

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { createRealtimeClient } from '@/lib/supabase/client';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Blessing, PaginatedResponse } from '@/types';
import BlessingCard from '@/components/blessing/BlessingCard';
import { getCsrfToken } from '@/lib/csrf-client';

const BlessingForm = dynamic(() => import('@/components/blessing/BlessingForm'), {
  ssr: false,
});
const ConfettiTrigger = dynamic(() => import('@/components/blessing/ConfettiTrigger'), {
  ssr: false,
});

const PAGE_SIZE = 20;
type SortMode = 'time' | 'likes';

/** SWR fetcher：检查 HTTP 状态码，非 2xx 抛出错误 */
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `请求失败 (${res.status})`);
  }
  return res.json();
};

export default function WallPage() {
  const [showForm, setShowForm] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>('time');

  /** SWR 分页 key 生成器（依赖 sortBy，切换排序时 key 变化 → 自动重新拉取） */
  const getKey = useCallback(
    (pageIndex: number, prevPage: PaginatedResponse<Blessing> | null) => {
      if (prevPage && (!prevPage.data || prevPage.data.length === 0)) return null;
      return `/api/blessings?page=${pageIndex + 1}&pageSize=${PAGE_SIZE}&sort=${sortBy}`;
    },
    [sortBy]
  );

  // 获取教师列表（用于表单下拉）
  const { data: teacherData } = useSWR('/api/teachers', fetcher);
  const teachers: { id: string; name: string; avatar_url?: string | null }[] =
    teacherData?.teachers || [];

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
    revalidateOnFocus: false,
    refreshInterval: 5 * 60 * 1000, // 5分钟兜底
    errorRetryCount: 3, // 最多重试 3 次，避免无限循环
    onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
      // 4xx 错误不重试
      if (err.message?.includes('请求失败')) return;
      if (retryCount >= 3) return;
      // 指数退避重试
      setTimeout(() => revalidate({ retryCount }), 2000 * Math.pow(2, retryCount));
    },
  });

  // 展平所有页
  const blessings = useMemo(() => {
    if (!pages) return [];
    return pages.flatMap((p) => p.data);
  }, [pages]);

  // 防御性：pages 某项可能为 undefined（SWR 并行请求时），过滤掉
  const lastPage = pages?.filter(Boolean).at(-1);
  const hasMore = lastPage ? (lastPage.data?.length ?? 0) === PAGE_SIZE : true;
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

  // 切换排序时重置到第一页
  useEffect(() => {
    setSize(1);
  }, [sortBy, setSize]);

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
    async (formData: {
      nickname: string;
      class_: string;
      content: string;
      teacherId: string;
      turnstileToken?: string;
      csrfToken?: string;
    }) => {
      setIsSubmitting(true);
      try {
        const csrfToken = formData.csrfToken || (await getCsrfToken());
        const res = await fetch('/api/blessings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          },
          body: JSON.stringify({
            nickname: formData.nickname,
            class: formData.class_,
            content: formData.content,
            teacher_id: formData.teacherId || undefined,
            turnstile_token: formData.turnstileToken || undefined,
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
      const csrfToken = await getCsrfToken();
      await fetch(`/api/blessings/${id}/like`, {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
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
          <a href="/" className="text-lg font-bold text-white" aria-label="返回首页 教师节祝福墙">
            🌟 教师节祝福墙
          </a>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">共 {totalCount} 条</span>

            {/* 排序切换 */}
            <div
              className="flex rounded-lg bg-white/5 p-0.5"
              role="radiogroup"
              aria-label="排序方式"
            >
              <button
                onClick={() => setSortBy('time')}
                role="radio"
                aria-checked={sortBy === 'time'}
                className={`rounded-md px-3 py-1 text-xs transition-all ${
                  sortBy === 'time'
                    ? 'bg-primary/20 text-primary'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🕐 最新
              </button>
              <button
                onClick={() => setSortBy('likes')}
                role="radio"
                aria-checked={sortBy === 'likes'}
                className={`rounded-md px-3 py-1 text-xs transition-all ${
                  sortBy === 'likes'
                    ? 'bg-primary/20 text-primary'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔥 最热
              </button>
            </div>

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
            <p className="text-slate-400">还没有祝福，快来写下第一条吧 ✨</p>
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
                <span className="text-sm text-slate-400">加载更多...</span>
              ) : (
                <span className="text-sm text-slate-400">— 已经到底了 —</span>
              )}
            </div>
          </>
        )}
      </div>

      <BlessingForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        teachers={teachers}
        isSubmitting={isSubmitting}
      />

      {/* 底部浮动按钮 */}
      <button
        onClick={() => setShowForm(true)}
        className="btn-primary fixed bottom-6 right-6 z-40 animate-breathe shadow-lg shadow-primary/30 text-lg px-6 py-3"
      >
        ✨ 送出祝福
      </button>
    </main>
  );
}
