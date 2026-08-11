// ============================================================
// 管理后台 — 审核/置顶/精选祝福 + 数据统计
// 暖色主题 — 功能区域保持清晰可读
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import type { Blessing, BlessingStats, AdminUpdateBlessing } from '@/types';
import { formatDateTime } from '@/lib/utils';
import NavHeader from '@/components/ui/NavHeader';
import { getCsrfToken } from '@/lib/csrf-client';

const TeacherManager = dynamic(() => import('@/components/admin/TeacherManager'), {
  ssr: false,
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type FilterStatus = 'pending' | 'approved' | 'rejected' | 'all';
type AdminTab = 'blessings' | 'teachers';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>('blessings');
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const statusParam = filter === 'all' ? '' : `&status=${filter}`;
  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/blessings?page=${page}&pageSize=50${statusParam}`,
    fetcher
  );
  const totalPages = Math.ceil((data?.count || 0) / 50);

  const { data: stats } = useSWR<BlessingStats>('/api/blessings/stats', fetcher);

  const blessings: Blessing[] = data?.data || [];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === blessings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(blessings.map((b) => b.id)));
    }
  };

  const handleBatchUpdate = async (updates: AdminUpdateBlessing) => {
    if (selectedIds.size === 0) return;
    try {
      const csrfToken = await getCsrfToken();
      await fetch('/api/admin/blessings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({ ids: Array.from(selectedIds), updates }),
      });
      setSelectedIds(new Set());
      mutate();
    } catch {
      alert('操作失败');
    }
  };

  return (
    <main className="min-h-screen">
      {/* 顶部导航 */}
      <NavHeader
        maxWidth="max-w-6xl"
        left={
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-ink">⚙️ 管理后台</h1>
            <a href="/" className="text-sm text-ink-muted hover:text-ink">
              返回首页 →
            </a>
            <div className="ml-4 flex gap-1">
              <button
                onClick={() => setTab('blessings')}
                className={`rounded-lg px-3 py-1 text-sm transition-colors ${
                  tab === 'blessings' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                祝福管理
              </button>
              <button
                onClick={() => setTab('teachers')}
                className={`rounded-lg px-3 py-1 text-sm transition-colors ${
                  tab === 'teachers' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                教师管理
              </button>
            </div>
          </div>
        }
        right={
          <button
            onClick={async () => {
              await createClient().auth.signOut();
              router.push('/admin/login');
            }}
            className="text-sm text-ink-muted hover:text-danger transition-colors"
          >
            退出登录
          </button>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {tab === 'teachers' ? (
          <TeacherManager />
        ) : (
          <>
            {/* 统计看板 */}
            {stats && (
              <div className="mb-8 grid grid-cols-3 gap-4">
                <div className="glass-card text-center">
                  <p className="text-3xl font-bold text-accent">{stats.total_blessings}</p>
                  <p className="text-sm text-ink-muted">总祝福数</p>
                </div>
                <div className="glass-card text-center">
                  <p className="text-3xl font-bold text-primary">{stats.total_participants}</p>
                  <p className="text-sm text-ink-muted">参与人数</p>
                </div>
                <div className="glass-card text-center">
                  <p className="text-3xl font-bold text-secondary">{stats.total_likes}</p>
                  <p className="text-sm text-ink-muted">点赞总数</p>
                </div>
              </div>
            )}

            {/* 工具栏 */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2">
                {[
                  {
                    value: 'pending' as FilterStatus,
                    label: '待审核',
                    count: stats?.pending_count,
                  },
                  {
                    value: 'approved' as FilterStatus,
                    label: '已通过',
                    count: stats?.approved_count,
                  },
                  {
                    value: 'rejected' as FilterStatus,
                    label: '已拒绝',
                    count: stats?.rejected_count,
                  },
                  { value: 'all' as FilterStatus, label: '全部', count: stats?.total_count },
                ].map(({ value, label, count }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setFilter(value);
                      setSelectedIds(new Set());
                      setPage(1);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      filter === value
                        ? 'bg-primary text-white'
                        : 'glass text-ink-muted hover:text-ink'
                    }`}
                  >
                    {label}
                    {count !== undefined && (
                      <span
                        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                          filter === value ? 'bg-white/20' : 'bg-ink/10'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {selectedIds.size > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBatchUpdate({ status: 'approved' })}
                    className="rounded-lg bg-success px-3 py-1.5 text-sm text-white hover:bg-success-dark"
                  >
                    ✅ 通过 ({selectedIds.size})
                  </button>
                  <button
                    onClick={() => handleBatchUpdate({ status: 'rejected' })}
                    className="rounded-lg bg-danger px-3 py-1.5 text-sm text-white hover:bg-danger-light"
                  >
                    ❌ 拒绝
                  </button>
                  <button
                    onClick={() => handleBatchUpdate({ is_featured: true })}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm text-ink hover:bg-accent-light"
                  >
                    ⭐ 精选
                  </button>
                </div>
              )}
            </div>

            {/* 表格 */}
            {isLoading ? (
              <div className="py-20 text-center text-ink-muted">加载中...</div>
            ) : error ? (
              <div className="py-20 text-center text-red-500">加载失败</div>
            ) : blessings.length === 0 ? (
              <div className="py-20 text-center text-ink-muted">暂无数据</div>
            ) : (
              <div className="glass overflow-hidden rounded-2xl">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-ink/10 text-ink-muted">
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
                      <th className="p-4">祝福对象</th>
                      <th className="p-4">状态</th>
                      <th className="p-4">点赞</th>
                      <th className="p-4">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blessings.map((blessing) => (
                      <tr
                        key={blessing.id}
                        className="border-b border-ink/5 hover:bg-ink/5 transition-colors"
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(blessing.id)}
                            onChange={() => toggleSelect(blessing.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="p-4 text-ink">
                          {blessing.is_anonymous ? '匿名' : blessing.nickname || '-'}
                        </td>
                        <td className="max-w-xs p-4 text-ink truncate">{blessing.content}</td>
                        <td className="p-4 text-ink-light whitespace-nowrap">
                          {blessing.teacher?.name || '全体'}
                        </td>
                        <td className="p-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              blessing.status === 'approved'
                                ? 'bg-green-500/15 text-green-600'
                                : blessing.status === 'rejected'
                                  ? 'bg-red-500/15 text-red-600'
                                  : 'bg-yellow-500/15 text-yellow-600'
                            }`}
                          >
                            {blessing.status === 'approved'
                              ? '已通过'
                              : blessing.status === 'rejected'
                                ? '已拒绝'
                                : '待审核'}
                          </span>
                        </td>
                        <td className="p-4 text-ink-muted">{blessing.likes}</td>
                        <td className="p-4 text-ink-muted">
                          {formatDateTime(blessing.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg px-3 py-1.5 text-sm glass text-ink-muted hover:text-ink disabled:opacity-30"
                >
                  ← 上一页
                </button>
                <span className="text-sm text-ink-muted">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg px-3 py-1.5 text-sm glass text-ink-muted hover:text-ink disabled:opacity-30"
                >
                  下一页 →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
