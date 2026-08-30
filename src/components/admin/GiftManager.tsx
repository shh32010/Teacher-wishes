// ============================================================
// 礼物管理组件 — 开关/排序/文案管理 · 暖色主题
// ============================================================

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { Gift } from '@/types';
import { getCsrfToken } from '@/lib/csrf-client';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);
  return res.json();
};

/** 请求管理端写接口的统一封装（携带 CSRF） */
async function adminWrite(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const csrfToken = await getCsrfToken();
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || `操作失败 (${res.status})` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: '网络错误，请重试' };
  }
}

export default function GiftManager() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/gifts', fetcher);
  const [savingId, setSavingId] = useState<string | null>(null);

  const gifts: Gift[] = data?.gifts || [];

  const toggleActive = async (gift: Gift) => {
    setSavingId(gift.id);
    const result = await adminWrite('/api/admin/gifts', {
      ids: [gift.id],
      updates: { is_active: !gift.is_active },
    });
    setSavingId(null);
    if (!result.ok) alert(result.error);
    else mutate();
  };

  /** 排序：与相邻礼物交换 sort_order（加锁防连点并发；第二步失败回滚提示） */
  const moveSort = async (gift: Gift, direction: 'up' | 'down') => {
    if (savingId) return; // 排序操作互斥锁，防连点并发请求
    const sorted = [...gifts].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((g) => g.id === gift.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || targetIdx < 0 || targetIdx >= sorted.length) return;

    const target = sorted[targetIdx];
    setSavingId(gift.id);
    // 逐个交换 sort_order（批量 PATCH 的 updates 对所有 id 相同，无法表达交换语义）
    const result = await adminWrite('/api/admin/gifts', {
      ids: [gift.id],
      updates: { sort_order: target.sort_order },
    });
    if (!result.ok) {
      setSavingId(null);
      alert(result.error);
      return;
    }
    const result2 = await adminWrite('/api/admin/gifts', {
      ids: [target.id],
      updates: { sort_order: gift.sort_order },
    });
    setSavingId(null);
    if (!result2.ok) {
      // 第二步失败 → 两礼物 sort_order 可能已相同，拉取服务端真实顺序回滚展示
      alert(`${result2.error}（排序可能未完成，已刷新）`);
    }
    mutate();
  };

  if (isLoading) return <div className="py-20 text-center text-ink-muted">加载中...</div>;
  if (error) return <div className="py-20 text-center text-red-500">加载失败</div>;

  const activeCount = gifts.filter((g) => g.is_active).length;

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-ink">礼物管理</h2>
      <p className="mb-6 text-sm text-ink-muted">
        当前启用 {activeCount}/{gifts.length} 种礼物 — 学生送礼时仅展示启用的礼物
      </p>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-ink-muted">
            <tr>
              <th className="p-4">排序</th>
              <th className="p-4">礼物</th>
              <th className="p-4">含义</th>
              <th className="p-4">动画</th>
              <th className="p-4">送出次数</th>
              <th className="p-4">状态</th>
            </tr>
          </thead>
          <tbody>
            {[...gifts]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((gift, idx, sorted) => (
                <tr
                  key={gift.id}
                  className="border-b border-ink/5 hover:bg-ink/5 transition-colors"
                >
                  <td className="p-4 whitespace-nowrap">
                    <button
                      onClick={() => moveSort(gift, 'up')}
                      disabled={idx === 0 || savingId === gift.id}
                      className="mr-1 rounded px-1.5 text-ink-muted hover:bg-ink/10 disabled:opacity-30"
                      title="上移"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveSort(gift, 'down')}
                      disabled={idx === sorted.length - 1 || savingId === gift.id}
                      className="rounded px-1.5 text-ink-muted hover:bg-ink/10 disabled:opacity-30"
                      title="下移"
                    >
                      ↓
                    </button>
                  </td>
                  <td className="p-4 whitespace-nowrap text-ink">
                    <span className="mr-2 text-xl">{gift.icon}</span>
                    {gift.name}
                  </td>
                  <td className="max-w-xs p-4 text-ink-light truncate">
                    {gift.description || '-'}
                  </td>
                  <td className="p-4 text-ink-muted">{gift.animation}</td>
                  <td className="p-4 text-ink-muted">{gift.usage_count}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleActive(gift)}
                      disabled={savingId === gift.id}
                      className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                        gift.is_active ? 'bg-success' : 'bg-ink/20'
                      }`}
                      title={gift.is_active ? '点击停用' : '点击启用'}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                          gift.is_active ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
