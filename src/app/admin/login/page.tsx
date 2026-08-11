// ============================================================
// 管理后台登录页 — 密码认证 + admin_token Cookie
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCsrfToken } from '@/lib/csrf-client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('请输入密码');
      return;
    }

    setLoading(true);
    try {
      const csrf = await getCsrfToken();
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '登录失败');
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('网络错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="glass-card w-full max-w-sm">
        <h2 className="mb-6 text-center text-xl font-bold text-ink">管理员登录</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="管理员密码"
            autoComplete="current-password"
            className="input-glass"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </main>
  );
}
