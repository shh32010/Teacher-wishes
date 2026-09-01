// ============================================================
// 祝福墙页面 — v2.0 同句聚合展示 + Supabase Realtime 实时刷新
// 暖色主题
// ============================================================

'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { createRealtimeClient } from '@/lib/supabase/client';
import GroupedBlessingCard from '@/components/blessing/GroupedBlessingCard';
import NavHeader from '@/components/ui/NavHeader';
import { getCsrfToken } from '@/lib/csrf-client';
import type { BlessingGroup } from '@/lib/group-blessings';

type SortMode = 'time' | 'likes';

interface GroupedResponse {
  groups: BlessingGroup[];
  total_blessings: number;
  total_groups: number;
  sort: SortMode;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `请求失败 (${res.status})`);
  }
  return res.json();
};

export default function WallPage() {
  const [sortBy, setSortBy] = useState<SortMode>('time');

  const { data, error, isLoading, mutate } = useSWR<GroupedResponse>(
    `/api/blessings/grouped?sort=${sortBy}`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 60 * 1000, // Realtime 失效时的轮询兜底（1 分钟）
      errorRetryCount: 3,
    }
  );

  const groups: BlessingGroup[] = data?.groups || [];

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
      .on(
        'postgres_changes',
        // 管理员审核通过（pending→approved）时即时上墙
        { event: 'UPDATE', schema: 'public', table: 'blessings', filter: 'status=eq.approved' },
        () => {
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
        right={
          <a href="/gift" className="btn-primary hidden px-4 py-1.5 text-sm sm:block">
            🎁 送出祝福
          </a>
        }
      />

      {/* 排序切换 */}
      <div className="mx-auto mt-4 flex max-w-3xl items-center justify-between px-4">
        <span className="text-xs text-ink-muted">
          共 {data?.total_groups ?? 0} 句祝福 · {data?.total_blessings ?? 0} 位同学送出
        </span>
        <div className="flex rounded-lg bg-ink/5 p-0.5" role="radiogroup" aria-label="排序方式">
          <button
            onClick={() => setSortBy('time')}
            role="radio"
            aria-checked={sortBy === 'time'}
            className={`whitespace-nowrap rounded-md px-3 py-1 text-xs transition-all ${
              sortBy === 'time' ? 'bg-primary/15 text-primary' : 'text-ink-muted hover:text-ink'
            }`}
          >
            🕐 最新
          </button>
          <button
            onClick={() => setSortBy('likes')}
            role="radio"
            aria-checked={sortBy === 'likes'}
            className={`whitespace-nowrap rounded-md px-3 py-1 text-xs transition-all ${
              sortBy === 'likes' ? 'bg-primary/15 text-primary' : 'text-ink-muted hover:text-ink'
            }`}
          >
            🔥 最热
          </button>
        </div>
      </div>

      {/* 聚合祝福卡片列表 */}
      <div className="mx-auto mt-4 max-w-3xl px-4">
        {groups.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-ink-muted">还没有祝福，快来送出第一份礼物吧 🎁</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {groups.map((group, index) => (
              <GroupedBlessingCard
                key={group.content}
                group={group}
                index={index}
                onLike={handleLike}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部浮动按钮 — v2.0：跳转送礼流程（safe-area 适配，移动端紧凑） */}
      <a
        href="/gift"
        className="btn-primary fixed bottom-[calc(20px+env(safe-area-inset-bottom,0px))] right-4 z-40 animate-breathe shadow-lg shadow-primary/20 text-sm px-4 py-2.5 md:text-lg md:px-6 md:py-3"
      >
        🎁 送出祝福
      </a>
    </main>
  );
}
