-- ============================================================
-- 修复 events 表 RLS — Supabase Advisors 安全警告
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- 启用 RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 公开读取策略（活动信息可公开）
CREATE POLICY "任何人都可以读取活动信息" ON events
  FOR SELECT
  USING (true);

-- 仅 service_role 可写入（管理后台操作）
-- 默认无策略 = 禁止匿名/认证用户写入

-- 验证
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
