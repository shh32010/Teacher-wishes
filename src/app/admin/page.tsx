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
import type { BlessingStats, AdminUpdateBlessing } from '@/types';
import type { BlessingGroup } from '@/lib/group-blessings';
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
  const [selectedContents, setSelectedContents] = useState<Set<string>>(new Set());

  // v2 句级治理：同句聚合列表（每句一行，学生数量列）
  const { data, error, isLoading, mutate } = useSWR('/api/blessings/grouped?sort=time', fetcher);

  const { data: stats } = useSWR<BlessingStats>('/api/blessings/stats', fetcher);

  const groups: BlessingGroup[] = data?.groups || [];

  const toggleSelect = (content: string) => {
    setSelectedContents((prev) => {
      const next = new Set(prev);
      if (next.has(content)) next.delete(content);
      else next.add(content);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedContents.size === groups.length) {
      setSelectedContents(new Set());
    } else {
      setSelectedContents(new Set(groups.map((g) => g.content)));
    }
  };

  /** 句级精选：对选中句的代表条批量 PATCH（组内单条精选即点亮全句） */
  const handleBatchUpdate = async (updates: AdminUpdateBlessing) => {
    if (selectedContents.size === 0) return;
    const representativeIds = groups
      .filter((g) => selectedContents.has(g.content))
      .map((g) => g.representative_id);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/admin/blessings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({ ids: representativeIds, updates }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || '操作失败，请刷新后重试');
        return;
      }
      setSelectedContents(new Set());
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

            {/* 工具栏（v2 句级治理：精选/删除） */}
            <div className="mb-6 flex flex-wrap items-center justify-end gap-4">
              {selectedContents.size > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // 已全选精选 → 取消精选；否则 → 设为精选
                      const allFeatured = groups
                        .filter((g) => selectedContents.has(g.content))
                        .every((g) => g.is_featured);
                      handleBatchUpdate({ is_featured: !allFeatured });
                    }}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm text-ink hover:bg-accent-light"
                  >
                    ⭐ 精选
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        !confirm(
                          `确定删除选中的 ${selectedContents.size} 句祝福（含所有送出记录）？此操作不可恢复。`
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
                          body: JSON.stringify({ contents: Array.from(selectedContents) }),
                        });
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({}));
                          alert(err.error || '删除失败');
                          return;
                        }
                        setSelectedContents(new Set());
                        mutate();
                      } catch {
                        alert('操作失败');
                      }
                    }}
                    className="rounded-lg bg-red-500/15 px-3 py-1.5 text-sm text-danger hover:bg-red-500/25"
                  >
                    🗑️ 删除 ({selectedContents.size})
                  </button>
                </div>
              )}
            </div>

            {/* 句级聚合表格 */}
            {isLoading ? (
              <div className="py-20 text-center text-ink-muted">加载中...</div>
            ) : error ? (
              <div className="py-20 text-center text-red-500">加载失败</div>
            ) : groups.length === 0 ? (
              <div className="py-20 text-center text-ink-muted">暂无数据</div>
            ) : (
              <div className="glass overflow-hidden rounded-2xl">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-ink/10 text-ink-muted">
                    <tr>
                      <th className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedContents.size === groups.length && groups.length > 0}
                          onChange={toggleAll}
                          className="rounded"
                        />
                      </th>
                      <th className="p-4">情绪</th>
                      <th className="p-4">祝福内容</th>
                      <th className="p-4">学生数量</th>
                      <th className="p-4">总赞</th>
                      <th className="p-4">最新送出</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <tr
                        key={group.content}
                        className={`border-b border-ink/5 transition-colors ${
                          group.is_featured
                            ? 'bg-amber-400/10 hover:bg-amber-400/15'
                            : 'hover:bg-ink/5'
                        }`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedContents.has(group.content)}
                            onChange={() => toggleSelect(group.content)}
                            className="rounded"
                          />
                        </td>
                        <td className="p-4 text-ink whitespace-nowrap">
                          {group.emotion ? (
                            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                              {group.emotion}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="max-w-xs p-4 text-ink truncate">
                          {group.is_featured && (
                            <span className="mr-1" title="已精选">
                              ⭐
                            </span>
                          )}
                          {group.content}
                        </td>
                        <td className="p-4 text-ink-muted whitespace-nowrap">
                          {group.count} 位同学
                        </td>
                        <td className="p-4 text-ink-muted">{group.total_likes}</td>
                        <td className="p-4 text-ink-muted">
                          {formatDateTime(group.latest_created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
