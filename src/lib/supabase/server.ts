// ============================================================
// Supabase 服务端客户端
// 在 Route Handler / Server Component / Server Action 中使用
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Next.js 会对 Route Handler 内的 fetch 做 Data Cache（Vercel 上跨部署存活）。
 * 生产实测：固定 URL 的 Supabase GET 查询被缓存 27+ 小时，读到旧数据
 * （快照查询稳定返回 09-02 的 max，导致最新祝福被边界排除）。
 * 全局包装 fetch 加 cache:'no-store'，所有 Supabase 查询绕过 Data Cache。
 * （grouped 路由另有 URL 时变参数双保险）
 */
function noStoreFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, cache: 'no-store' });
}

/** 所有服务端 Supabase 客户端共用的全局配置（fetch 不缓存） */
const globalNoStore = { global: { fetch: noStoreFetch } };

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...globalNoStore,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

/**
 * 创建具有 Service Role 权限的 Supabase 客户端
 * 仅在服务端管理操作中使用，可绕过 RLS
 */
export function createAdminClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      ...globalNoStore,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

/**
 * 创建匿名 Supabase 客户端（不依赖 Cookie/Session）
 * 用于不需要用户认证的 API 操作（如公开提交、查询等）
 * 使用 anon key + 受 RLS 策略约束
 */
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    globalNoStore
  );
}
