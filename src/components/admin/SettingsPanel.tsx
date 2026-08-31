// ============================================================
// 活动设置 — 甲方运营配置（名称/状态/时间/参与开关）
// 部署级配置（密钥/连接）一律不在此出现
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { getCsrfToken } from '@/lib/csrf-client';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);
  return res.json();
};

export default function SettingsPanel() {
  const { data, mutate } = useSWR('/api/admin/settings', fetcher);
  const settings: Record<string, string> = data?.settings || {};

  const [name, setName] = useState('');
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [showClass, setShowClass] = useState(true);
  const [allowLikes, setAllowLikes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 数据加载后回填表单
  useEffect(() => {
    if (!data) return;
    setName(settings.activity_name || '');
    setStatus(settings.activity_status === 'closed' ? 'closed' : 'open');
    // datetime-local 需要 YYYY-MM-DDTHH:mm 格式（去掉时区后缀）
    setStartAt((settings.start_at || '').slice(0, 16));
    setEndAt((settings.end_at || '').slice(0, 16));
    setAllowAnonymous(settings.allow_anonymous !== 'false');
    setShowClass(settings.show_class !== 'false');
    setAllowLikes(settings.allow_likes !== 'false');
  }, [
    data,
    settings.activity_name,
    settings.activity_status,
    settings.start_at,
    settings.end_at,
    settings.allow_anonymous,
    settings.show_class,
    settings.allow_likes,
  ]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({
          updates: {
            activity_name: name,
            activity_status: status,
            start_at: startAt ? `${startAt}:00+08:00` : settings.start_at,
            end_at: endAt ? `${endAt}:00+08:00` : settings.end_at,
            allow_anonymous: String(allowAnonymous),
            show_class: String(showClass),
            allow_likes: String(allowLikes),
          },
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(`❌ ${result.error || '保存失败'}`);
        return;
      }
      setMessage('✅ 已保存，立即生效');
      mutate();
    } catch {
      setMessage('❌ 网络错误，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <h2 className="text-lg font-bold text-ink">⚙️ 活动设置</h2>

      <div className="glass-card space-y-4 p-5">
        {/* 活动名称 */}
        <div>
          <label className="mb-1 block text-sm text-ink-light">活动名称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="input-glass w-full"
          />
        </div>

        {/* 活动状态 */}
        <div>
          <label className="mb-1 block text-sm text-ink-light">活动状态</label>
          <div className="flex gap-2">
            <button
              onClick={() => setStatus('open')}
              className={`rounded-lg px-4 py-1.5 text-sm ${
                status === 'open' ? 'bg-success text-white' : 'glass text-ink-muted'
              }`}
            >
              🟢 进行中（可提交）
            </button>
            <button
              onClick={() => setStatus('closed')}
              className={`rounded-lg px-4 py-1.5 text-sm ${
                status === 'closed' ? 'bg-danger text-white' : 'glass text-ink-muted'
              }`}
            >
              🔴 已结束（拒绝提交）
            </button>
          </div>
        </div>

        {/* 活动时间 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-ink-light">开始时间</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="input-glass w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink-light">结束时间</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="input-glass w-full"
            />
          </div>
        </div>

        {/* 参与开关 */}
        <div className="space-y-2 border-t border-ink/10 pt-3">
          {[
            { label: '允许匿名送出', value: allowAnonymous, set: setAllowAnonymous },
            { label: '显示班级', value: showClass, set: setShowClass },
            { label: '允许点赞', value: allowLikes, set: setAllowLikes },
          ].map((item) => (
            <label
              key={item.label}
              className="flex cursor-pointer items-center justify-between text-sm text-ink"
            >
              {item.label}
              <input
                type="checkbox"
                checked={item.value}
                onChange={(e) => item.set(e.target.checked)}
                className="rounded"
              />
            </label>
          ))}
        </div>

        {message && <p className="text-sm text-ink-light">{message}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>

      <p className="text-xs text-ink-muted">
        ⚠️ 关闭活动后学生端将无法提交新祝福；已送出的祝福与历史数据不受影响。
      </p>
    </div>
  );
}
