// ============================================================
// Supabase 浏览器客户端
// 仅在客户端组件（'use client'）中使用
// ============================================================

import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/** SSR Cookie 管理客户端（用于 Auth 操作） */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Realtime / 纯 WebSocket 客户端（不依赖 Cookie，适用于订阅推送） */
export function createRealtimeClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
