-- ============================================================
-- 007_review_fixes.sql
-- 全量代码审查修复：RLS 审核绕过 + rate_limits 锁定攻击
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- ============================================================
-- 修复 1：删除 blessings UPDATE 策略（审核绕过）
-- 旧策略 USING (auth.uid() = user_id) 无列限制：
-- 攻击者注册账号 → 插入祝福(user_id=自己) → UPDATE 任意列
-- → status='approved' 绕过审核 + is_featured 伪造精选 + likes 刷赞
-- 项目没有任何"用户修改自己祝福"的功能需求，直接删除
-- ============================================================
DROP POLICY IF EXISTS "用户只能修改自己的祝福" ON blessings;

-- ============================================================
-- 修复 2：删除 rate_limits 对 anon 的 INSERT 策略（锁定攻击）
-- 旧策略 WITH CHECK (true) 允许任何人写任意 (ip, action) 记录：
-- 攻击者可对校园 NAT 出口 IP 批量写入 submit_blessing 记录
-- → 全体学生被 429 锁死；且表可被无限灌数据
-- check_rate_limit 是 SECURITY DEFINER（owner=postgres），
-- 函数内部 INSERT 本来就绕过 RLS，不需要此策略
-- ============================================================
DROP POLICY IF EXISTS "anon 可插入限流记录" ON rate_limits;
