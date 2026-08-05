// ============================================================
// 管理后台登录页 — 简单密码验证
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 简化方案：前端设置 cookie（生产环境应使用 Supabase Auth）
    if (!password) {
      setError('请输入管理密码');
      return;
    }

    // 调用 API 验证密码
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        setError('密码错误');
      }
    } catch {
      setError('网络错误，请稍后再试');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-night">
      <div className="glass-card w-full max-w-sm">
        <h2 className="mb-6 text-center text-xl font-bold text-white">🔐 管理员登录</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入管理密码"
            className="w-full rounded-xl glass border-white/10 bg-transparent px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-primary/50"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-primary w-full">
            登录
          </button>
        </form>
      </div>
    </main>
  );
}
