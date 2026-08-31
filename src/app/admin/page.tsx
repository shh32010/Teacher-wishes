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

const TemplateManager = dynamic(() => import('@/components/admin/TemplateManager'), {
  ssr: false,
});

const GiftManager = dynamic(() => import('@/components/admin/GiftManager'), {
  ssr: false,
});

const AICenter = dynamic(() => import('@/components/admin/AICenter'), {
  ssr: false,
});

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);
  return res.json();
};

type AdminTab = 'blessings' | 'templates' | 'gifts' | 'ai' | 'teachers';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>('blessings');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  // v2 自动上墙：无待审核流程，直接浏览全部祝福（治理：精选/删除）
  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/blessings?page=${page}&pageSize=50`,
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
      const res = await fetch('/api/admin/blessings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({ ids: Array.from(selectedIds), updates }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || '操作失败，请刷新后重试');
        return;
      }
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
                祝福治理
              </button>
              <button
                onClick={() => setTab('templates')}
                className={`rounded-lg px-3 py-1 text-sm transition-colors ${
                  tab === 'templates' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                祝福语库
              </button>
              <button
                onClick={() => setTab('gifts')}
                className={`rounded-lg px-3 py-1 text-sm transition-colors ${
                  tab === 'gifts' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                礼物管理
              </button>
              <button
                onClick={() => setTab('ai')}
                className={`rounded-lg px-3 py-1 text-sm transition-colors ${
                  tab === 'ai' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                AI 中心
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
              // 同时清除 Supabase session 和 admin_token Cookie
              await createClient().auth.signOut();
              await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
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
        ) : tab === 'templates' ? (
          <TemplateManager />
        ) : tab === 'gifts' ? (
          <GiftManager />
        ) : tab === 'ai' ? (
          <AICenter />
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

            {/* 工具栏（v2 自动上墙：仅治理操作——精选/删除） */}
            <div className="mb-6 flex flex-wrap items-center justify-end gap-4">
              {selectedIds.size > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // 已全选精选 → 取消精选；否则 → 设为精选
                      const allFeatured = blessings
                        .filter((b) => selectedIds.has(b.id))
                        .every((b) => b.is_featured);
                      handleBatchUpdate({ is_featured: !allFeatured });
                    }}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm text-ink hover:bg-accent-light"
                  >
                    ⭐ 精选
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`确定删除选中的 ${selectedIds.size} 条祝福？此操作不可恢复。`))
                        return;
                      try {
                        const csrfToken = await getCsrfToken();
                        const res = await fetch('/api/admin/blessings', {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                          },
                          body: JSON.stringify({ ids: Array.from(selectedIds) }),
                        });
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({}));
                          alert(err.error || '删除失败');
                          return;
                        }
                        setSelectedIds(new Set());
                        mutate();
                      } catch {
                        alert('操作失败');
                      }
                    }}
                    className="rounded-lg bg-red-500/15 px-3 py-1.5 text-sm text-danger hover:bg-red-500/25"
                  >
                    🗑️ 删除 ({selectedIds.size})
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
                      <th className="p-4">点赞</th>
                      <th className="p-4">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blessings.map((blessing) => (
                      <tr
                        key={blessing.id}
                        className={`border-b border-ink/5 transition-colors ${
                          blessing.is_featured
                            ? 'bg-amber-400/10 hover:bg-amber-400/15'
                            : 'hover:bg-ink/5'
                        }`}
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
                        <td className="max-w-xs p-4 text-ink truncate">
                          {blessing.is_featured && (
                            <span className="mr-1" title="已精选">
                              ⭐
                            </span>
                          )}
                          {blessing.content}
                        </td>
                        <td className="p-4 text-ink-light whitespace-nowrap">
                          {blessing.teacher?.name || '全体'}
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

            {/* 分页 — 当前页附近窗口 + 首尾页 */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-1">
                <button
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    setSelectedIds(new Set());
                  }}
                  disabled={page <= 1}
                  className="rounded-lg px-2 py-1.5 text-sm glass text-ink-muted hover:text-ink disabled:opacity-30"
                >
                  ←
                </button>
                {(() => {
                  // 窗口化：1 ... p-2 p-1 p p+1 p+2 ... N
                  const nums: (number | '…')[] = [];
                  const winStart = Math.max(1, page - 2);
                  const winEnd = Math.min(totalPages, page + 2);
                  if (winStart > 1) {
                    nums.push(1);
                    if (winStart > 2) nums.push('…');
                  }
                  for (let n = winStart; n <= winEnd; n++) nums.push(n);
                  if (winEnd < totalPages) {
                    if (winEnd < totalPages - 1) nums.push('…');
                    nums.push(totalPages);
                  }
                  return nums.map((n, i) =>
                    n === '…' ? (
                      <span key={`e${i}`} className="px-1 text-ink-muted">
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => {
                          setPage(n);
                          setSelectedIds(new Set());
                        }}
                        className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                          page === n
                            ? 'bg-primary text-white'
                            : 'glass text-ink-muted hover:text-ink'
                        }`}
                      >
                        {n}
                      </button>
                    )
                  );
                })()}
                <button
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    setSelectedIds(new Set());
                  }}
                  disabled={page >= totalPages}
                  className="rounded-lg px-2 py-1.5 text-sm glass text-ink-muted hover:text-ink disabled:opacity-30"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
