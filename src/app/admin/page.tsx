// ============================================================
// 管理后台 — v2 信息架构（5 个一级模块）
//   📊 活动概览（只读） / 💌 祝福管理（记录+语库） / 🎁 礼物管理
//   🤖 AI 中心 / ⚙️ 活动设置
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { Blessing, AdminUpdateBlessing } from '@/types';
import { formatDateTime } from '@/lib/utils';
import NavHeader from '@/components/ui/NavHeader';
import { getCsrfToken } from '@/lib/csrf-client';

const TemplateManager = dynamic(() => import('@/components/admin/TemplateManager'), {
  ssr: false,
});
const GiftManager = dynamic(() => import('@/components/admin/GiftManager'), { ssr: false });
const AICenter = dynamic(() => import('@/components/admin/AICenter'), { ssr: false });
const OverviewPanel = dynamic(() => import('@/components/admin/OverviewPanel'), { ssr: false });
const SettingsPanel = dynamic(() => import('@/components/admin/SettingsPanel'), { ssr: false });

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);
  return res.json();
};

type AdminTab = 'overview' | 'blessings' | 'gifts' | 'ai' | 'settings';
type BlessingSubTab = 'records' | 'templates';

const TABS: { key: AdminTab; label: string }[] = [
  { key: 'overview', label: '📊 活动概览' },
  { key: 'blessings', label: '💌 祝福管理' },
  { key: 'gifts', label: '🎁 礼物管理' },
  { key: 'ai', label: '🤖 AI 中心' },
  { key: 'settings', label: '⚙️ 活动设置' },
];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [blessingSubTab, setBlessingSubTab] = useState<BlessingSubTab>('records');

  // ─── 祝福记录视图状态 ───
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [detailBlessing, setDetailBlessing] = useState<Blessing | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/blessings?page=${page}&pageSize=50`,
    fetcher
  );
  const totalPages = Math.ceil((data?.count || 0) / 50);
  const blessings: Blessing[] = data?.data || [];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  /** 软删除：隐藏祝福（墙/星河不可见，后台可恢复） */
  const handleHide = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `确定隐藏选中的 ${selectedIds.size} 条祝福？\n\n墙/星河将不再显示，可在祝福记录中恢复。`
      )
    )
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
        alert(err.error || '隐藏失败');
        return;
      }
      setSelectedIds(new Set());
      mutate();
    } catch {
      alert('操作失败');
    }
  };

  /** 恢复：hidden → approved 重新上墙 */
  const handleRestore = async (id: string) => {
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/admin/blessings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({ ids: [id], updates: { status: 'approved' } }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || '恢复失败');
        return;
      }
      setDetailBlessing(null);
      mutate();
    } catch {
      alert('操作失败');
    }
  };

  return (
    <main className="min-h-screen">
      <NavHeader
        maxWidth="max-w-6xl"
        left={
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-ink">⚙️ 管理后台</h1>
            <a href="/" className="text-sm text-ink-muted hover:text-ink">
              返回首页 →
            </a>
            <div className="ml-4 flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-lg px-3 py-1 text-sm transition-colors ${
                    tab === t.key ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        }
        right={
          <button
            onClick={async () => {
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
        {tab === 'overview' && <OverviewPanel />}
        {tab === 'gifts' && <GiftManager />}
        {tab === 'ai' && <AICenter />}
        {tab === 'settings' && <SettingsPanel />}

        {tab === 'blessings' && (
          <>
            {/* 子 tab：祝福记录 / 祝福语库 */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">💌 祝福管理</h2>
              <div className="flex gap-1 rounded-lg bg-ink/5 p-0.5">
                <button
                  onClick={() => setBlessingSubTab('records')}
                  className={`rounded-md px-3 py-1 text-sm transition-colors ${
                    blessingSubTab === 'records'
                      ? 'bg-primary text-white'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  祝福记录
                </button>
                <button
                  onClick={() => setBlessingSubTab('templates')}
                  className={`rounded-md px-3 py-1 text-sm transition-colors ${
                    blessingSubTab === 'templates'
                      ? 'bg-primary text-white'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  祝福语库
                </button>
              </div>
            </div>

            {blessingSubTab === 'templates' ? (
              <TemplateManager />
            ) : (
              <>
                {/* 治理操作（勾选后出现） */}
                <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                  {selectedIds.size > 0 && (
                    <>
                      <button
                        onClick={() => {
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
                        onClick={handleHide}
                        className="rounded-lg bg-red-500/15 px-3 py-1.5 text-sm text-danger hover:bg-red-500/25"
                      >
                        🙈 隐藏 ({selectedIds.size} 条)
                      </button>
                    </>
                  )}
                </div>

                {/* 祝福记录表格（单条，点击行看详情） */}
                {isLoading ? (
                  <div className="py-20 text-center text-ink-muted">加载中...</div>
                ) : error ? (
                  <div className="py-20 text-center text-red-500">加载失败</div>
                ) : blessings.length === 0 ? (
                  <div className="py-20 text-center text-ink-muted">暂无祝福记录</div>
                ) : (
                  <div className="glass overflow-hidden rounded-2xl">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-ink/10 text-ink-muted">
                        <tr>
                          <th className="p-4">
                            <input
                              type="checkbox"
                              checked={
                                selectedIds.size === blessings.length && blessings.length > 0
                              }
                              onChange={() =>
                                setSelectedIds(
                                  selectedIds.size === blessings.length
                                    ? new Set()
                                    : new Set(blessings.map((b) => b.id))
                                )
                              }
                              className="rounded"
                            />
                          </th>
                          <th className="p-4">情绪</th>
                          <th className="p-4">祝福内容</th>
                          <th className="p-4">送出次数</th>
                          <th className="p-4">发送者</th>
                          <th className="p-4">点赞</th>
                          <th className="p-4">时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blessings.map((b) => (
                          <tr
                            key={b.id}
                            className={`cursor-pointer border-b border-ink/5 transition-colors hover:bg-ink/5 ${
                              b.status === 'hidden' ? 'opacity-50' : ''
                            }`}
                            onClick={() => setDetailBlessing(b)}
                          >
                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(b.id)}
                                onChange={() => toggleSelect(b.id)}
                                className="rounded"
                              />
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              {b.emotion ? (
                                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                                  {b.emotion}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="max-w-sm p-4 text-ink truncate">
                              {b.is_featured && (
                                <span className="mr-1" title="已精选">
                                  ⭐
                                </span>
                              )}
                              {b.content}
                            </td>
                            <td className="p-4 text-ink-muted whitespace-nowrap">
                              {b.sentence_count ?? 1} 次
                            </td>
                            <td className="p-4 text-ink-light whitespace-nowrap">
                              {b.is_anonymous ? '匿名' : b.nickname || '-'}
                            </td>
                            <td className="p-4 text-ink-muted">{b.likes}</td>
                            <td className="p-4 text-ink-muted">{formatDateTime(b.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 分页（10 页一组） */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-1">
                    {(() => {
                      const groupSize = 10;
                      const groupStart = Math.floor((page - 1) / groupSize) * groupSize;
                      const nums: number[] = [];
                      for (
                        let n = groupStart + 1;
                        n <= Math.min(groupStart + groupSize, totalPages);
                        n++
                      )
                        nums.push(n);
                      return (
                        <>
                          <button
                            onClick={() => setPage(groupStart)}
                            disabled={groupStart <= 0}
                            className="rounded-lg px-2 py-1.5 text-sm glass text-ink-muted hover:text-ink disabled:opacity-30"
                          >
                            ◀
                          </button>
                          {nums.map((n) => (
                            <button
                              key={n}
                              onClick={() => setPage(n)}
                              className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                                page === n
                                  ? 'bg-primary text-white'
                                  : 'glass text-ink-muted hover:text-ink'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                          <button
                            onClick={() => setPage(Math.min(totalPages, groupStart + 11))}
                            disabled={groupStart + groupSize >= totalPages}
                            className="rounded-lg px-2 py-1.5 text-sm glass text-ink-muted hover:text-ink disabled:opacity-30"
                          >
                            ▶
                          </button>
                        </>
                      );
                    })()}
                  </div>
                )}
                {totalPages > 1 && (
                  <p className="mt-2 text-center text-xs text-ink-muted">
                    共 {data?.count ?? 0} 条祝福记录
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* 祝福详情弹窗 */}
      <AnimatePresence>
        {detailBlessing && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setDetailBlessing(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-label="祝福详情"
              onClick={() => setDetailBlessing(null)}
            >
              <div
                className="glass relative w-full max-w-md rounded-2xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setDetailBlessing(null)}
                  aria-label="关闭详情"
                  className="absolute right-4 top-4 rounded-full p-1.5 text-ink-muted hover:text-ink transition-colors"
                >
                  ✕
                </button>
                <p className="mt-2 text-base leading-relaxed text-ink">{detailBlessing.content}</p>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {detailBlessing.emotion && (
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                      {detailBlessing.emotion}
                    </span>
                  )}
                  {detailBlessing.gift && (
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                      {detailBlessing.gift.icon} {detailBlessing.gift.name}
                    </span>
                  )}
                </div>

                {detailBlessing.ai_message && (
                  <p className="mt-3 rounded-xl bg-ink/5 px-4 py-3 text-xs leading-relaxed text-ink-light">
                    {detailBlessing.ai_message}
                  </p>
                )}

                <div className="mt-4 space-y-1 text-center text-xs text-ink-muted">
                  <p>
                    发送者：
                    {detailBlessing.is_anonymous ? '匿名' : detailBlessing.nickname || '匿名'}
                    {detailBlessing.class ? ` · ${detailBlessing.class}` : ''}
                  </p>
                  <p>提交时间：{formatDateTime(detailBlessing.created_at)}</p>
                  <p>❤️ {detailBlessing.likes} 赞</p>
                  {detailBlessing.status === 'hidden' && (
                    <p className="text-danger">状态：已隐藏（墙/星河不可见）</p>
                  )}
                </div>

                {detailBlessing.status === 'hidden' && (
                  <button
                    onClick={() => handleRestore(detailBlessing.id)}
                    className="btn-primary mt-4 w-full"
                  >
                    ♻️ 恢复上墙
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
