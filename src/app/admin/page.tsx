// ============================================================
// 管理后台 — v2 信息架构（5 个一级模块）
//   📊 活动概览（只读） / 💌 祝福管理（记录+语库） / 🎁 礼物管理
//   🤖 AI 中心 / ⚙️ 活动设置
// ============================================================

'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { Blessing, AdminUpdateBlessing } from '@/types';
import type { AdminBlessingGroup } from '@/app/api/admin/blessings/route';
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
  // 按句聚合 / 逐条明细 视图切换（默认按句，同句多人不重复刷屏）
  const [groupedView, setGroupedView] = useState(true);
  const [groupPage, setGroupPage] = useState(1);
  const [expandedContent, setExpandedContent] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/blessings?page=${page}&pageSize=50`,
    fetcher
  );
  const totalPages = Math.ceil((data?.count || 0) / 50);
  const blessings: Blessing[] = data?.data || [];

  // 按句聚合数据（view=grouped）
  const { data: groupData, mutate: mutateGroups } = useSWR(
    groupedView ? `/api/admin/blessings?view=grouped&page=${groupPage}&pageSize=50` : null,
    fetcher
  );
  const groupTotalPages = Math.ceil((groupData?.total || 0) / 50);

  // ─── 祝福管理统计条（概览 KPI + 隐藏计数） ───
  const { data: overview } = useSWR('/api/admin/overview', fetcher);
  const { data: hiddenData } = useSWR(
    '/api/admin/blessings?status=hidden&page=1&pageSize=1',
    fetcher
  );

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

  /** 软删除：隐藏祝福（墙/芯河不可见，后台可恢复） */
  const handleHide = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `确定隐藏选中的 ${selectedIds.size} 条祝福？\n\n墙/芯河将不再显示，可在祝福记录中恢复。`
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
      mutateGroups();
    } catch {
      alert('操作失败');
    }
  };

  /** 通用组操作：对一组 id 批量更新（精选/隐藏/恢复），随后全量刷新 */
  const operateIds = async (ids: string[], updates: AdminUpdateBlessing, label: string) => {
    if (ids.length === 0) return;
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/admin/blessings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({ ids, updates }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || `${label}失败`);
        return false;
      }
      mutate();
      mutateGroups();
      return true;
    } catch {
      alert(`${label}失败`);
      return false;
    }
  };

  /** 整句隐藏（组内全部软删除） */
  const hideGroup = async (content: string, ids: string[], count: number) => {
    if (!confirm(`隐藏整句（${count} 条）？\n\n墙/芯河不再显示这句，可在聚合视图内展开逐条恢复。`))
      return;
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/admin/blessings', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || '隐藏失败');
        return;
      }
      setExpandedContent((cur) => (cur === content ? null : cur));
      mutate();
      mutateGroups();
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
                {/* 统计条 */}
                {overview?.kpis && (
                  <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
                    {[
                      {
                        label: '💌 祝福总数',
                        value: overview.kpis.total_blessings,
                        color: 'text-accent',
                      },
                      {
                        label: '🎁 礼物送出',
                        value: overview.kpis.total_gifts,
                        color: 'text-primary',
                      },
                      {
                        label: '⭐ 精选',
                        value: overview.kpis.featured_count,
                        color: 'text-amber-500',
                      },
                      {
                        label: '🙈 已隐藏',
                        value: hiddenData?.count ?? 0,
                        color: 'text-ink-muted',
                      },
                      {
                        label: '❤️ 总赞',
                        value: overview.kpis.total_likes,
                        color: 'text-secondary',
                      },
                    ].map((k) => (
                      <div key={k.label} className="glass-card p-3 text-center">
                        <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{k.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 视图切换：按句聚合（默认）/ 逐条明细 */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-ink-muted">
                    {groupedView
                      ? `共 ${groupData?.total ?? 0} 句祝福（同句合并，展开查看每位同学）`
                      : `共 ${data?.count ?? 0} 条记录（逐条）`}
                  </p>
                  <div className="flex gap-1 rounded-lg bg-ink/5 p-0.5">
                    <button
                      onClick={() => {
                        setGroupedView(true);
                        setExpandedContent(null);
                      }}
                      className={`rounded-md px-3 py-1 text-xs transition-colors ${
                        groupedView ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      🗂️ 按句
                    </button>
                    <button
                      onClick={() => setGroupedView(false)}
                      className={`rounded-md px-3 py-1 text-xs transition-colors ${
                        !groupedView ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      📋 逐条
                    </button>
                  </div>
                </div>

                {groupedView ? (
                  /* ── 按句聚合表：每句一行，展开看成员明细与治理 ── */
                  (() => {
                    const groups = (groupData?.groups || []) as AdminBlessingGroup[];
                    return (
                      <>
                        <div className="glass overflow-hidden rounded-2xl">
                          <table className="w-full text-left text-sm">
                            <thead className="border-b border-ink/10 text-ink-muted">
                              <tr>
                                <th className="p-3" />
                                <th className="p-3">情绪</th>
                                <th className="p-3">祝福内容</th>
                                <th className="p-3 whitespace-nowrap">送出</th>
                                <th className="p-3 whitespace-nowrap">赞</th>
                                <th className="p-3">状态</th>
                                <th className="p-3">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groups.length === 0 && (
                                <tr>
                                  <td colSpan={7} className="p-8 text-center text-ink-muted">
                                    暂无祝福记录
                                  </td>
                                </tr>
                              )}
                              {groups.map((g) => {
                                const expanded = expandedContent === g.content;
                                const memberIds = g.members.map((m) => m.id);
                                return (
                                  <Fragment key={g.content}>
                                    <tr
                                      className={`cursor-pointer border-b border-ink/5 transition-colors hover:bg-ink/5 ${
                                        g.all_hidden ? 'opacity-50' : ''
                                      }`}
                                      onClick={() =>
                                        setExpandedContent(expanded ? null : g.content)
                                      }
                                    >
                                      <td className="p-3 text-ink-muted">{expanded ? '▾' : '▸'}</td>
                                      <td className="p-3 whitespace-nowrap">
                                        {g.emotion ? (
                                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                                            {g.emotion}
                                          </span>
                                        ) : (
                                          '-'
                                        )}
                                      </td>
                                      <td className="max-w-md p-3 text-ink truncate">
                                        {g.is_featured && (
                                          <span className="mr-1" title="已精选">
                                            ⭐
                                          </span>
                                        )}
                                        {g.content}
                                      </td>
                                      <td className="p-3 text-ink-muted whitespace-nowrap">
                                        {g.count} 次
                                      </td>
                                      <td className="p-3 text-ink-muted">{g.total_likes}</td>
                                      <td className="p-3 text-xs whitespace-nowrap">
                                        {g.all_hidden ? (
                                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-danger">
                                            🙈 已整句隐藏
                                          </span>
                                        ) : (
                                          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-green-600">
                                            正常
                                          </span>
                                        )}
                                      </td>
                                      <td
                                        className="p-3 whitespace-nowrap"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {!g.all_hidden && (
                                          <>
                                            <button
                                              onClick={() =>
                                                operateIds(
                                                  memberIds,
                                                  { is_featured: !g.is_featured },
                                                  '精选'
                                                )
                                              }
                                              className="rounded-lg bg-accent px-2.5 py-1 text-xs text-ink hover:bg-accent-light"
                                              title={
                                                g.is_featured ? '取消精选' : '设为精选（整句）'
                                              }
                                            >
                                              {g.is_featured ? '⭐ 已精选' : '⭐ 精选'}
                                            </button>
                                            <button
                                              onClick={() =>
                                                hideGroup(g.content, memberIds, g.count)
                                              }
                                              className="ml-1 rounded-lg bg-red-500/15 px-2.5 py-1 text-xs text-danger hover:bg-red-500/25"
                                            >
                                              🙈 隐藏整句
                                            </button>
                                          </>
                                        )}
                                        {g.all_hidden && (
                                          <button
                                            onClick={() =>
                                              operateIds(
                                                memberIds,
                                                { status: 'approved' },
                                                '恢复整句'
                                              )
                                            }
                                            className="rounded-lg bg-green-500/15 px-2.5 py-1 text-xs text-green-600 hover:bg-green-500/25"
                                          >
                                            ↻ 恢复整句
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                    {/* 展开：该句每位同学明细 + 单条治理 */}
                                    {expanded && (
                                      <tr className="border-b border-ink/5 bg-ink/[0.03]">
                                        <td colSpan={7} className="p-3 pl-10">
                                          {g.members.length === 0 ? (
                                            <p className="py-2 text-xs text-ink-muted">
                                              无成员记录
                                            </p>
                                          ) : (
                                            <table className="w-full text-left text-xs text-ink-muted">
                                              <thead>
                                                <tr className="border-b border-ink/5">
                                                  <th className="py-1.5 pr-3">发送者</th>
                                                  <th className="py-1.5 pr-3">赞</th>
                                                  <th className="py-1.5 pr-3">状态</th>
                                                  <th className="py-1.5 pr-3">时间</th>
                                                  <th className="py-1.5" />
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {g.members.map((m) => (
                                                  <tr
                                                    key={m.id}
                                                    className="border-b border-ink/5 last:border-0"
                                                  >
                                                    <td className="py-1.5 pr-3 text-ink">
                                                      {m.is_anonymous ? '匿名' : m.nickname || '-'}
                                                    </td>
                                                    <td className="py-1.5 pr-3">{m.likes}</td>
                                                    <td className="py-1.5 pr-3">
                                                      {m.status === 'hidden' ? (
                                                        <span className="text-danger">已隐藏</span>
                                                      ) : (
                                                        <span className="text-green-600">正常</span>
                                                      )}
                                                    </td>
                                                    <td className="py-1.5 pr-3">
                                                      {formatDateTime(m.created_at)}
                                                    </td>
                                                    <td className="py-1.5 text-right">
                                                      {m.status === 'hidden' ? (
                                                        <button
                                                          onClick={() =>
                                                            operateIds(
                                                              [m.id],
                                                              { status: 'approved' },
                                                              '恢复'
                                                            )
                                                          }
                                                          className="rounded bg-green-500/10 px-2 py-0.5 text-green-600 hover:bg-green-500/20"
                                                        >
                                                          恢复
                                                        </button>
                                                      ) : (
                                                        <button
                                                          onClick={() =>
                                                            operateIds(
                                                              [m.id],
                                                              { status: 'hidden' },
                                                              '隐藏'
                                                            )
                                                          }
                                                          className="rounded bg-red-500/10 px-2 py-0.5 text-danger hover:bg-red-500/20"
                                                        >
                                                          隐藏
                                                        </button>
                                                      )}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          )}
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {/* 聚合分页 */}
                        {groupTotalPages > 1 && (
                          <div className="mt-4 flex items-center justify-center gap-2">
                            <button
                              onClick={() => setGroupPage((p) => Math.max(1, p - 1))}
                              disabled={groupPage <= 1}
                              className="rounded-lg glass px-3 py-1.5 text-sm text-ink-muted hover:text-ink disabled:opacity-30"
                            >
                              ◀ 上一页
                            </button>
                            <span className="text-sm text-ink-muted">
                              {groupPage} / {groupTotalPages}
                            </span>
                            <button
                              onClick={() => setGroupPage((p) => Math.min(groupTotalPages, p + 1))}
                              disabled={groupPage >= groupTotalPages}
                              className="rounded-lg glass px-3 py-1.5 text-sm text-ink-muted hover:text-ink disabled:opacity-30"
                            >
                              下一页 ▶
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  /* ── 逐条明细（原视图） ── */
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
                                <td className="p-4 text-ink-muted">
                                  {formatDateTime(b.created_at)}
                                </td>
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
                    <p className="text-danger">状态：已隐藏（墙/芯河不可见）</p>
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
