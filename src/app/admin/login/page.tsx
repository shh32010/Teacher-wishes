// ============================================================
// 管理后台登录页 — Supabase Auth · 暖色主题
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCsrfToken } from '@/lib/csrf-client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(
          authError.message === 'Invalid login credentials' ? '邮箱或密码错误' : authError.message
        );
        return;
      }

      // 同时设 admin_token Cookie 作为备选鉴权方案
      try {
        const csrf = await getCsrfToken();
        await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
          },
          body: JSON.stringify({ password }),
        });
      } catch {
        /* admin_token 非必需，Supabase Auth 已通过 */
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
        <h2 className="mb-6 text-center text-xl font-bold text-ink">🔐 管理员登录</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="管理员邮箱"
            autoComplete="email"
            className="input-glass"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            autoComplete="current-password"
            className="input-glass"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <p className="mt-4 text-xs text-ink-muted text-center">使用 Supabase Auth 管理员账号登录</p>
      </div>
    </main>
  );
}
