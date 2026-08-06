// ============================================================
// Supabase 浏览器客户端（单例模式）
// 仅在客户端组件（'use client'）中使用
// ============================================================

import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;
let realtimeClient: SupabaseClient | null = null;

/** SSR Cookie 管理客户端（用于 Auth 操作） */
export function createClient() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return browserClient;
}

/** Realtime / 纯 WebSocket 客户端（不依赖 Cookie，适用于订阅推送） */
export function createRealtimeClient() {
  if (realtimeClient) return realtimeClient;
  realtimeClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return realtimeClient;
}
