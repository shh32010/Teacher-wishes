// ============================================================
// 祝福语库组件 — 双视图：
//   「全部祝福」1353 条祝福记录（分页浏览）
//   「词库句子」150 句词库管理（新增/CSV 导入/备注/状态点击切换）
// ============================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import type { Blessing, BlessingTemplate, EmotionCategory } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { getCsrfToken } from '@/lib/csrf-client';

const CATEGORIES: EmotionCategory[] = ['感恩', '祝愿', '青春', '温暖', '文艺', '趣味', '未分类'];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);
  return res.json();
};

/** 请求管理端写接口的统一封装（携带 CSRF） */
async function adminWrite(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body: unknown
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const csrfToken = await getCsrfToken();
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || `操作失败 (${res.status})` };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: '网络错误，请重试' };
  }
}

export default function TemplateManager() {
  const [subTab, setSubTab] = useState<'blessings' | 'templates'>('blessings');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [blessingPage, setBlessingPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── 全部祝福视图（1353 条记录分页） ───
  const {
    data: blessingsData,
    error: blessingsError,
    isLoading: blessingsLoading,
  } = useSWR(`/api/admin/blessings?page=${blessingPage}&pageSize=50`, fetcher);
  const blessings: Blessing[] = blessingsData?.data || [];
  const blessingTotalPages = Math.ceil((blessingsData?.count || 0) / 50);

  // ─── 新增表单状态 ───
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<EmotionCategory>('感恩');
  const [newTags, setNewTags] = useState('');
  const [saving, setSaving] = useState(false);

  // ─── 备注内联编辑状态 ───
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [remarkDraft, setRemarkDraft] = useState('');

  const categoryParam = category ? `&category=${encodeURIComponent(category)}` : '';
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
  // 分页展示（50/页，150 条约 3 页，含停用句）
  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/templates?page=${page}&pageSize=50${categoryParam}${searchParam}`,
    fetcher
  );

  const templates: BlessingTemplate[] = data?.data || [];
  const totalPages = Math.ceil((data?.count || 0) / 50);

  // 翻页/筛选/搜索变化时清空选择（避免表头全选态与实际选中集不一致的混乱）
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, category, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const batchUpdate = async (updates: Record<string, unknown>) => {
    if (selectedIds.size === 0) return;
    const result = await adminWrite('/api/admin/templates', 'PATCH', {
      ids: Array.from(selectedIds),
      updates,
    });
    if (!result.ok) {
      alert(result.error);
      return;
    }
    setSelectedIds(new Set());
    mutate();
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条祝福语？已被学生使用的将自动改为停用。`)) {
      return;
    }
    const result = await adminWrite('/api/admin/templates', 'DELETE', {
      ids: Array.from(selectedIds),
    });
    if (!result.ok) {
      alert(result.error);
      return;
    }
    const d = result.data as { deleted: number; deactivated?: number };
    alert(`删除 ${d.deleted ?? 0} 条` + (d.deactivated ? `，${d.deactivated} 条已改为停用` : ''));
    setSelectedIds(new Set());
    mutate();
  };

  const handleCreate = async () => {
    if (newContent.trim().length < 5) {
      alert('祝福语至少 5 个字');
      return;
    }
    setSaving(true);
    const result = await adminWrite('/api/admin/templates', 'POST', {
      content: newContent.trim(),
      category: newCategory,
      tags: newTags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10),
    });
    setSaving(false);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    setNewContent('');
    setNewTags('');
    mutate();
  };

  const handleImportClick = () => {
    setImportResult(null);
    fileRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;

    const text = await file.text();
    setImportResult('导入中...');
    const result = await adminWrite('/api/admin/templates/import', 'POST', { csv: text });
    if (!result.ok) {
      setImportResult(`❌ ${result.error}`);
      return;
    }
    const d = result.data as {
      imported: number;
      skippedInvalid: number;
      skippedDuplicate: number;
    };
    setImportResult(
      `✅ 导入 ${d.imported} 条，跳过重复 ${d.skippedDuplicate} 条，无效 ${d.skippedInvalid} 条`
    );
    mutate();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">祝福语库</h2>
        <div className="flex gap-1 rounded-lg bg-ink/5 p-0.5">
          <button
            onClick={() => setSubTab('blessings')}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              subTab === 'blessings' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            全部祝福
          </button>
          <button
            onClick={() => setSubTab('templates')}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              subTab === 'templates' ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink'
            }`}
          >
            词库句子
          </button>
        </div>
      </div>

      {subTab === 'templates' ? (
        <>
          {/* 新增表单 */}
          <div className="glass-card mb-6 space-y-3 p-4">
            <p className="text-sm font-bold text-ink">新增祝福语</p>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="输入祝福语内容（5~200 字）"
              rows={2}
              className="input-glass w-full resize-none"
            />
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as EmotionCategory)}
                className="input-glass-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="标签（逗号分隔，可选）"
                className="input-glass-sm flex-1 min-w-40"
              />
              <button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-light disabled:opacity-50"
              >
                {saving ? '保存中...' : '➕ 保存'}
              </button>
              <button
                onClick={handleImportClick}
                className="rounded-lg bg-accent px-4 py-1.5 text-sm text-ink hover:bg-accent-light"
              >
                📥 CSV 导入
              </button>
            </div>
            {importResult && <p className="text-sm text-ink-light">{importResult}</p>}
          </div>

          {/* 工具栏 */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setCategory('');
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  category === '' ? 'bg-primary text-white' : 'glass text-ink-muted hover:text-ink'
                }`}
              >
                全部
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c === category ? '' : c);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    category === c ? 'bg-primary text-white' : 'glass text-ink-muted hover:text-ink'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearch(searchInput.trim());
                    setPage(1);
                  }
                }}
                placeholder="搜索祝福语..."
                className="input-glass-sm w-48"
              />
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={() => batchUpdate({ is_active: true })}
                    className="rounded-lg bg-success px-3 py-1.5 text-sm text-white hover:bg-success-dark"
                  >
                    启用 ({selectedIds.size})
                  </button>
                  <button
                    onClick={() => batchUpdate({ is_active: false })}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm text-ink hover:bg-accent-light"
                  >
                    停用
                  </button>
                  <button
                    onClick={batchDelete}
                    className="rounded-lg bg-red-500/15 px-3 py-1.5 text-sm text-danger hover:bg-red-500/25"
                  >
                    删除
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 表格 */}
          {isLoading ? (
            <div className="py-20 text-center text-ink-muted">加载中...</div>
          ) : error ? (
            <div className="py-20 text-center text-red-500">加载失败</div>
          ) : templates.length === 0 ? (
            <div className="py-20 text-center text-ink-muted">
              暂无数据 — 可新增或通过 CSV 批量导入
            </div>
          ) : (
            <div className="glass overflow-hidden rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink/10 text-ink-muted">
                  <tr>
                    <th className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === templates.length && templates.length > 0}
                        onChange={() =>
                          setSelectedIds(
                            selectedIds.size === templates.length
                              ? new Set()
                              : new Set(templates.map((t) => t.id))
                          )
                        }
                        className="rounded"
                      />
                    </th>
                    <th className="p-4">祝福语</th>
                    <th className="p-4">分类</th>
                    <th className="p-4">备注</th>
                    <th className="p-4">使用次数</th>
                    <th className="p-4">状态（点击切换）</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-ink/5 hover:bg-ink/5 transition-colors"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="max-w-sm p-4 text-ink truncate">{t.content}</td>
                      <td className="p-4 text-ink-light whitespace-nowrap">{t.category}</td>
                      {/* 备注内联编辑：点击 → 输入 → 失焦/回车保存 */}
                      <td
                        className="p-4"
                        onClick={() => {
                          setEditingRemarkId(t.id);
                          setRemarkDraft(t.remark || '');
                        }}
                      >
                        {editingRemarkId === t.id ? (
                          <input
                            autoFocus
                            value={remarkDraft}
                            onChange={(e) => setRemarkDraft(e.target.value)}
                            maxLength={100}
                            onBlur={async () => {
                              const result = await adminWrite('/api/admin/templates', 'PATCH', {
                                ids: [t.id],
                                updates: { remark: remarkDraft },
                              });
                              setEditingRemarkId(null);
                              if (!result.ok) alert(result.error);
                              else mutate();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            placeholder="输入备注..."
                            className="input-glass-sm w-full min-w-32"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="cursor-text text-xs text-ink-light">
                            {t.remark || '— 点击添加 —'}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-ink-muted">{t.usage_count}</td>
                      {/* 状态徽章直接点击切换 */}
                      <td className="p-4">
                        <button
                          onClick={async () => {
                            const result = await adminWrite('/api/admin/templates', 'PATCH', {
                              ids: [t.id],
                              updates: { is_active: !t.is_active },
                            });
                            if (!result.ok) alert(result.error);
                            else mutate();
                          }}
                          className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                            t.is_active
                              ? 'bg-green-500/15 text-green-600 hover:bg-green-500/25'
                              : 'bg-gray-500/15 text-gray-500 hover:bg-gray-500/25'
                          }`}
                          title={t.is_active ? '点击停用' : '点击启用'}
                        >
                          {t.is_active ? '启用' : '停用'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg px-3 py-1.5 text-sm glass text-ink-muted disabled:opacity-30"
              >
                ← 上一页
              </button>
              <span className="text-sm text-ink-muted">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg px-3 py-1.5 text-sm glass text-ink-muted disabled:opacity-30"
              >
                下一页 →
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportFile}
          />
        </>
      ) : (
        <>
          {/* 全部祝福视图：1353 条祝福记录分页浏览 */}
          {blessingsLoading ? (
            <div className="py-20 text-center text-ink-muted">加载中...</div>
          ) : blessingsError ? (
            <div className="py-20 text-center text-red-500">加载失败</div>
          ) : blessings.length === 0 ? (
            <div className="py-20 text-center text-ink-muted">暂无祝福</div>
          ) : (
            <div className="glass overflow-hidden rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink/10 text-ink-muted">
                  <tr>
                    <th className="p-4">情绪</th>
                    <th className="p-4">祝福内容</th>
                    <th className="p-4">礼物</th>
                    <th className="p-4">发送者</th>
                    <th className="p-4">点赞</th>
                    <th className="p-4">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {blessings.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-ink/5 hover:bg-ink/5 transition-colors"
                    >
                      <td className="p-4 whitespace-nowrap">
                        {b.emotion ? (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                            {b.emotion}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="max-w-sm p-4 text-ink truncate">{b.content}</td>
                      <td className="p-4 text-ink-light whitespace-nowrap">
                        {b.gift ? `${b.gift.icon} ${b.gift.name}` : '-'}
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

          {/* 分页 */}
          {blessingTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setBlessingPage((p) => Math.max(1, p - 1))}
                disabled={blessingPage <= 1}
                className="rounded-lg px-3 py-1.5 text-sm glass text-ink-muted disabled:opacity-30"
              >
                ← 上一页
              </button>
              <span className="text-sm text-ink-muted">
                {blessingPage} / {blessingTotalPages}（共 {blessingsData?.count ?? 0} 条）
              </span>
              <button
                onClick={() => setBlessingPage((p) => Math.min(blessingTotalPages, p + 1))}
                disabled={blessingPage >= blessingTotalPages}
                className="rounded-lg px-3 py-1.5 text-sm glass text-ink-muted disabled:opacity-30"
              >
                下一页 →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
