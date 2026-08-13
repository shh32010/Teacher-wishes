-- ============================================================
-- 009_rate_limit_cleanup.sql
-- 权限收口：cleanup_rate_limits + blessing_likes + increment_likes 显式最小化
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- ============================================================
-- 修复 1：cleanup_rate_limits 不应暴露给匿名用户
-- SECURITY DEFINER 会直接删除 rate_limits 历史记录
-- 仅允许 service_role（Vercel Cron）执行
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;

-- ============================================================
-- 修复 2：blessing_likes 不应允许匿名直接 INSERT
-- 点赞唯一入口是 API → service_role → increment_likes() RPC
-- SECURITY DEFINER 函数内部 INSERT 绕过 RLS，无需公开策略
-- ============================================================
DROP POLICY IF EXISTS "任何人都可以插入点赞记录" ON public.blessing_likes;
REVOKE INSERT ON TABLE public.blessing_likes FROM anon, authenticated;

-- ============================================================
-- 修复 3：increment_likes 显式最小权限（防止未来默认权限误改）
-- ============================================================
REVOKE ALL ON FUNCTION public.increment_likes(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_likes(UUID, TEXT) TO service_role;

-- ============================================================
-- 最终权限矩阵：
--   anon:          SELECT approved blessings / SELECT teachers / INSERT blessings
--   anon:          EXECUTE check_rate_limit（原子限流，内部 INSERT 由 SECURITY DEFINER 完成）
--   anon:          ❌ cleanup_rate_limits / increment_likes / blessing_likes / rate_limits
--   service_role:  全部（管理后台 + Cron + 点赞 RPC）
-- ============================================================
