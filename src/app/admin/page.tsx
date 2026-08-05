// ============================================================
// 管理后台 — 审核/置顶/精选祝福 + 数据统计
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import type { Blessing, BlessingStats, AdminUpdateBlessing } from '@/types';
import { formatDateTime } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type FilterStatus = 'pending' | 'approved' | 'rejected' | 'all';

export default function AdminPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 获取祝福列表
  const statusParam = filter === 'all' ? '' : `&status=${filter}`;
  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/blessings?pageSize=50${statusParam}`,
    fetcher
  );

  // 获取统计数据
  const { data: stats } = useSWR<BlessingStats>('/api/blessings/stats', fetcher);

  const blessings: Blessing[] = data?.data || [];

  // 切换选中
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 全选
  const toggleAll = () => {
    if (selectedIds.size === blessings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(blessings.map((b) => b.id)));
    }
  };

  // 批量操作
  const handleBatchUpdate = async (updates: AdminUpdateBlessing) => {
    if (selectedIds.size === 0) return;
    try {
      await fetch('/api/admin/blessings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), updates }),
      });
      setSelectedIds(new Set());
      mutate();
    } catch {
      alert('操作失败');
    }
  };

  // 加载状态
  if (statusParam === '') return null; // 避免 SSR 水合不一致

  return (
    <main className="min-h-screen bg-night">
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-30 border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white">⚙️ 管理后台</h1>
            <a href="/" className="text-sm text-slate-400 hover:text-white">
              返回首页 →
            </a>
          </div>
          <button
            onClick={async () => {
              await createClient().auth.signOut();
              router.push('/admin/login');
            }}
            className="text-sm text-slate-500 hover:text-red-400 transition-colors"
          >
            退出登录
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* 统计看板 */}
        {stats && (
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="glass-card text-center">
              <p className="text-3xl font-bold text-accent">{stats.total_blessings}</p>
              <p className="text-sm text-slate-400">总祝福数</p>
            </div>
            <div className="glass-card text-center">
              <p className="text-3xl font-bold text-primary-light">{stats.total_participants}</p>
              <p className="text-sm text-slate-400">参与人数</p>
            </div>
            <div className="glass-card text-center">
              <p className="text-3xl font-bold text-secondary">{stats.total_likes}</p>
              <p className="text-sm text-slate-400">点赞总数</p>
            </div>
          </div>
        )}

        {/* 工具栏 */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* 筛选 */}
          <div className="flex gap-2">
            {(
              [
                { value: 'pending', label: '待审核' },
                { value: 'approved', label: '已通过' },
                { value: 'rejected', label: '已拒绝' },
                { value: 'all', label: '全部' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  setFilter(value);
                  setSelectedIds(new Set());
                }}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  filter === value
                    ? 'bg-primary text-white'
                    : 'glass text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 批量操作 */}
          {selectedIds.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => handleBatchUpdate({ status: 'approved' })}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-500"
              >
                ✅ 通过 ({selectedIds.size})
              </button>
              <button
                onClick={() => handleBatchUpdate({ status: 'rejected' })}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500"
              >
                ❌ 拒绝
              </button>
              <button
                onClick={() => handleBatchUpdate({ is_featured: true })}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm text-black hover:bg-accent-light"
              >
                ⭐ 精选
              </button>
            </div>
          )}
        </div>

        {/* 表格 */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">加载中...</div>
        ) : error ? (
          <div className="py-20 text-center text-red-400">加载失败</div>
        ) : blessings.length === 0 ? (
          <div className="py-20 text-center text-slate-500">暂无数据</div>
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-slate-400">
                <tr>
                  <th className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === blessings.length && blessings.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="p-4">发送者</th>
                  <th className="p-4">祝福内容</th>
                  <th className="p-4">状态</th>
                  <th className="p-4">点赞</th>
                  <th className="p-4">时间</th>
                </tr>
              </thead>
              <tbody>
                {blessings.map((blessing) => (
                  <tr
                    key={blessing.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(blessing.id)}
                        onChange={() => toggleSelect(blessing.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-4 text-white">
                      {blessing.is_anonymous ? '匿名' : blessing.nickname || '-'}
                    </td>
                    <td className="max-w-xs p-4 text-slate-300 truncate">{blessing.content}</td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          blessing.status === 'approved'
                            ? 'bg-green-500/20 text-green-400'
                            : blessing.status === 'rejected'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {blessing.status === 'approved'
                          ? '已通过'
                          : blessing.status === 'rejected'
                            ? '已拒绝'
                            : '待审核'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{blessing.likes}</td>
                    <td className="p-4 text-slate-500">{formatDateTime(blessing.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
