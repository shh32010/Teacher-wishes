// ============================================================
// 祝福墙页面 — Masonry 瀑布流 + Supabase Realtime 实时订阅
// ============================================================

'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { createRealtimeClient } from '@/lib/supabase/client';
import type { Blessing, PaginatedResponse } from '@/types';
import BlessingCard from '@/components/blessing/BlessingCard';

// 懒加载：祝福提交表单（弹窗组件）
const BlessingForm = dynamic(() => import('@/components/blessing/BlessingForm'), {
  ssr: false,
});

// 懒加载：彩带特效
const ConfettiTrigger = dynamic(() => import('@/components/blessing/ConfettiTrigger'), {
  ssr: false,
});

/** API 数据获取器 */
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WallPage() {
  const [showForm, setShowForm] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取祝福列表（SWR 作为初始加载 + 长间隔兜底）
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Blessing>>(
    '/api/blessings?pageSize=30',
    fetcher,
    { refreshInterval: 5 * 60 * 1000 } // 5分钟兜底轮询
  );

  // Supabase Realtime 订阅
  useEffect(() => {
    const supabase = createRealtimeClient();

    const channel = supabase
      .channel('blessings-wall')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'blessings',
          filter: 'status=eq.approved',
        },
        () => {
          // 新审核通过的祝福 → 重新拉取列表
          mutate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'blessings',
        },
        () => {
          // 状态变更（如 pending→approved）→ 重新拉取列表
          mutate();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🔌 Realtime 已连接');
        }
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

        // 触发彩带
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);

        // 立即刷新列表（提交后管理员审核通过时 Realtime 会再次推送）
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
      // 静默失败，乐观更新已在前端完成
    }
  }, []);

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night">
        <div className="text-red-400">加载失败，请刷新页面重试</div>
      </div>
    );
  }

  const blessings = data?.data || [];

  return (
    <main className="min-h-screen bg-night pb-20">
      {/* 彩带特效 */}
      {showConfetti && <ConfettiTrigger />}

      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-30 border-b border-white/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <a href="/" className="text-lg font-bold text-white">
            🌟 教师节祝福墙
          </a>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            ✏️ 写祝福
          </button>
        </div>
      </header>

      {/* 祝福卡片列表 */}
      <div className="mx-auto mt-8 max-w-3xl px-4">
        {blessings.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-slate-500">还没有祝福，快来写下第一条吧 ✨</p>
          </div>
        ) : (
          <div className="columns-1 gap-6 space-y-6 md:columns-2">
            {blessings.map((blessing, index) => (
              <div key={blessing.id} className="break-inside-avoid">
                <BlessingCard blessing={blessing} index={index} onLike={handleLike} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 祝福提交弹窗 */}
      <BlessingForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </main>
  );
}
