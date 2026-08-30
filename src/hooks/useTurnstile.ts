// ============================================================
// useTurnstile — Cloudflare Turnstile 人机验证 Hook
// 从旧 BlessingForm 迁移而来，保留其两个关键坑位的修复：
// 1. 保存 widget id — 重复 render 会抛 "already rendered"，
//    导致二次提交拿不到 token
// 2. 容器卸载时 remove widget — AnimatePresence 卸载 DOM 后
//    旧 id 变为悬空引用，reset 旧 id 拿不到 token
// ============================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

/**
 * Turnstile 集成 Hook
 * @param active 当前步骤是否展示验证组件（false 时销毁 widget，避免悬空引用）
 * @returns containerRef 挂载容器、getToken 获取验证 token
 */
export function useTurnstile(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const widgetIdRef = useRef<string | null>(null);
  const pendingResolveRef = useRef<((token: string) => void) | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  // 一次性加载 Turnstile 脚本
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || scriptLoadedRef.current || typeof window === 'undefined') return;

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);
    scriptLoadedRef.current = true;
  }, []);

  // active 时渲染 widget；inactive 时销毁 widget
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || typeof window === 'undefined' || !window.turnstile) return;

    const resolvePending = (token: string) => {
      if (pendingResolveRef.current) {
        pendingResolveRef.current(token);
        pendingResolveRef.current = null;
      }
    };

    if (active && containerRef.current && !widgetIdRef.current) {
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => resolvePending(token),
          'error-callback': () => resolvePending(''),
          'expired-callback': () => resolvePending(''),
        });
      } catch {
        // render 失败 → 视为无 token（服务端按未配置逻辑处理）
      }
    }

    if (!active && widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        /* 已销毁则忽略 */
      }
      widgetIdRef.current = null;
    }
  }, [active, scriptReady]);

  /** 获取验证 token：已有 widget 则 reset 触发回调，否则返回空串；
   *  15 秒兜底超时（用户未完成挑战/回调永不触发时防止提交按钮永久挂起） */
  const getToken = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (pendingResolveRef.current) {
          pendingResolveRef.current = null;
          resolve('');
        }
      }, 15000);

      const done = (token: string) => {
        clearTimeout(timeout);
        resolve(token);
      };

      if (!TURNSTILE_SITE_KEY || typeof window === 'undefined' || !window.turnstile) {
        done('');
        return;
      }
      if (!widgetIdRef.current) {
        done('');
        return;
      }
      pendingResolveRef.current = done;
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        pendingResolveRef.current = null;
        done('');
      }
    });
  }, []);

  return { containerRef, getToken, enabled: TURNSTILE_SITE_KEY.length > 0 };
}
