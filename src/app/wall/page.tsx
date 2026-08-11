// ============================================================
// 祝福墙页面 — 无限滚动 + Supabase Realtime 实时订阅
// 暖色主题
// ============================================================

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { createRealtimeClient } from '@/lib/supabase/client';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Blessing, PaginatedResponse } from '@/types';
import BlessingCard from '@/components/blessing/BlessingCard';
import NavHeader from '@/components/ui/NavHeader';
import { getCsrfToken } from '@/lib/csrf-client';

const BlessingForm = dynamic(() => import('@/components/blessing/BlessingForm'), {
  ssr: false,
});
const ConfettiTrigger = dynamic(() => import('@/components/blessing/ConfettiTrigger'), {
  ssr: false,
});

const PAGE_SIZE = 20;
const MAX_ITEMS = 60; // 移动端上限，每卡片含 motion 动画，超过60易爆内存
type SortMode = 'time' | 'likes';

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>('time');

  const getKey = useCallback(
    (pageIndex: number, prevPage: PaginatedResponse<Blessing> | null) => {
      // 超过页数上限直接终止
      if (pageIndex * PAGE_SIZE >= MAX_ITEMS) return null;
      if (prevPage && (!prevPage.data || prevPage.data.length === 0)) return null;
      return `/api/blessings?page=${pageIndex + 1}&pageSize=${PAGE_SIZE}&sort=${sortBy}`;
    },
    [sortBy]
  );

  const { data: teacherData } = useSWR('/api/teachers', fetcher);
  const teachers: { id: string; name: string; avatar_url?: string | null }[] =
    teacherData?.teachers || [];

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
    refreshInterval: 5 * 60 * 1000,
    errorRetryCount: 3,
    onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
      if (err.message?.includes('请求失败')) return;
      if (retryCount >= 3) return;
      setTimeout(() => revalidate({ retryCount }), 2000 * Math.pow(2, retryCount));
    },
  });

  const blessings = useMemo(() => {
    if (!pages) return [];
    // 按 ID 去重（Realtime mutate 可能导致同一祝福出现在多页中）
    const seen = new Set<string>();
    return pages
      .flatMap((p) => p.data)
      .filter((b) => {
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });
  }, [pages]);

  const loadedCount = blessings.length;
  const lastPage = pages?.filter(Boolean).at(-1);
  const hasMore =
    loadedCount < MAX_ITEMS && (lastPage ? (lastPage.data?.length ?? 0) === PAGE_SIZE : true);
  const totalCount = pages?.[0]?.count || 0;

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setSize(size + 1);
  }, [hasMore, size, setSize]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore: loadMore,
  });

  useEffect(() => {
    setSize(1);
  }, [sortBy, setSize]);

  useEffect(() => {
    const supabase = createRealtimeClient();
    let timer: ReturnType<typeof setTimeout>;

    const channel = supabase
      .channel('blessings-wall')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'blessings', filter: 'status=eq.approved' },
        () => {
          // 防抖 3 秒，避免短时间内大量新祝福产生请求风暴
          clearTimeout(timer);
          timer = setTimeout(() => mutate(), 3000);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('🔌 Realtime 已连接');
      });

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [mutate]);

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
        setShowSuccess(true);
        setTimeout(() => setShowConfetti(false), 3500);
        setTimeout(() => setShowSuccess(false), 8000);
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

  const handleLike = useCallback(async (id: string): Promise<boolean> => {
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/blessings/${id}/like`, {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
      // 409 表示已点过赞，返回 false 让组件回滚乐观更新
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-ink-muted">加载祝福中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-danger">加载失败，请刷新重试</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-28 overflow-x-hidden">
      {showConfetti && <ConfettiTrigger />}

      {/* 提交成功提示 — 手动关闭（8s 后自动消失作为兜底） */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed left-1/2 top-20 z-50 -translate-x-1/2"
        >
          <div className="glass rounded-2xl px-8 py-5 text-center shadow-lg">
            <p className="text-lg font-bold text-[var(--color-primary)]">✨ 祝福已送达！</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              已进入审核队列，审核通过后会出现在祝福墙
            </p>
            <button
              onClick={() => setShowSuccess(false)}
              className="mt-3 rounded-xl bg-[var(--color-primary)] px-6 py-1.5 text-sm text-white transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              知道了
            </button>
          </div>
        </motion.div>
      )}

      {/* 顶部导航 */}
      <NavHeader
        left={
          <a
            href="/"
            className="whitespace-nowrap text-lg font-bold text-ink md:text-lg"
            aria-label="返回首页 教师节祝福墙"
          >
            🌟 教师节祝福墙
          </a>
        }
        center={
          /* 排序切换 — 移动端水平紧凑，桌面端保持原样 */
          <div
            className="flex shrink-0 rounded-lg bg-ink/5 p-0.5"
            role="radiogroup"
            aria-label="排序方式"
          >
            <button
              onClick={() => setSortBy('time')}
              role="radio"
              aria-checked={sortBy === 'time'}
              className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[13px] transition-all md:px-3 md:text-xs ${
                sortBy === 'time' ? 'bg-primary/15 text-primary' : 'text-ink-muted hover:text-ink'
              }`}
            >
              🕐 最新
            </button>
            <button
              onClick={() => setSortBy('likes')}
              role="radio"
              aria-checked={sortBy === 'likes'}
              className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[13px] transition-all md:px-3 md:text-xs ${
                sortBy === 'likes' ? 'bg-primary/15 text-primary' : 'text-ink-muted hover:text-ink'
              }`}
            >
              🔥 最热
            </button>
          </div>
        }
        right={<span className="text-xs text-ink-muted">共 {totalCount} 条</span>}
      />

      {/* 祝福卡片列表 */}
      <div className="mx-auto mt-8 max-w-3xl px-4">
        {blessings.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-ink-muted">还没有祝福，快来写下第一条吧 ✨</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {blessings.map((blessing, index) => (
                <BlessingCard
                  key={blessing.id}
                  blessing={blessing}
                  index={index}
                  onLike={handleLike}
                />
              ))}
            </div>

            <div ref={sentinelRef} className="py-8 text-center">
              {hasMore ? (
                <span className="text-sm text-ink-muted">加载更多...</span>
              ) : (
                <span className="text-sm text-ink-muted">— 已经到底了 —</span>
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

      {/* 底部浮动按钮 — safe-area 适配，移动端紧凑 */}
      <button
        onClick={() => setShowForm(true)}
        className="btn-primary fixed bottom-[calc(20px+env(safe-area-inset-bottom,0px))] right-4 z-40 animate-breathe shadow-lg shadow-primary/20 text-sm px-4 py-2.5 md:text-lg md:px-6 md:py-3"
      >
        ✨ 送出祝福
      </button>
    </main>
  );
}
