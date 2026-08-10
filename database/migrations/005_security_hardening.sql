-- ============================================================
-- 005_security_hardening.sql
-- P1 安全加固：限流原子化 + RLS 启用 + 点赞 RPC 权限收紧
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- ============================================================
-- 修复 1：rate_limits 表启用 RLS
-- 之前未启用 RLS，anon 用户可通过 API 直接读写该表，
-- 可读取所有 IP 的限流记录（隐私泄露）或写入垃圾数据瘫痪限流
-- ============================================================
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- 仅允许 anon 插入（用于 API 写入限流记录），禁止读取/删除
CREATE POLICY "anon 可插入限流记录" ON rate_limits
  FOR INSERT
  WITH CHECK (true);

-- SELECT / UPDATE / DELETE 不给策略 = 默认拒绝（anon 无法读取/修改/删除）

-- ============================================================
-- 修复 2+4：check_rate_limit 原子化 + 概率性自清理
-- 旧版：SELECT COUNT 后由应用层 INSERT，存在 TOCTOU 竞态
-- 新版：在同一事务中原子完成 INSERT + COUNT + 概率清理
-- ============================================================
CREATE OR REPLACE FUNCTION check_rate_limit(
  client_ip TEXT,
  action_name TEXT,
  max_requests INT DEFAULT 3,
  window_minutes INT DEFAULT 10
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recent_count INT;
BEGIN
  -- 原子化：先插入记录，再检查计数（反直觉但正确）
  -- INSERT 在当前事务中完成，COUNT 会包含本次插入
  -- 整个函数在单个事务中执行，无 TOCTOU 窗口
  INSERT INTO public.rate_limits (ip, action)
  VALUES (client_ip, action_name);

  SELECT COUNT(*) INTO recent_count
  FROM public.rate_limits
  WHERE ip = client_ip
    AND action = action_name
    AND created_at > now() - (window_minutes || ' minutes')::INTERVAL;

  -- 概率性清理 1 小时前的过期记录（~1%，避免每次请求都执行 DELETE）
  -- 作为 Vercel Cron 每日定时清理的补充保障
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE created_at < now() - INTERVAL '1 hour';
  END IF;

  -- 返回剩余次数（负数表示已超限）
  -- 注意：即使超限也会保留本次 INSERT 记录（fail-closed），
  -- 使攻击者的每次尝试都被计入，不会因回滚而"免费重试"
  RETURN max_requests - recent_count;
END;
$$;

GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, TEXT, INT, INT) TO anon, authenticated;

-- ============================================================
-- 修复 3：撤销 increment_likes 对 anon 的执行权限
-- anon key 是公开的（存在于浏览器端 NEXT_PUBLIC_SUPABASE_ANON_KEY）
-- 攻击者可直接调用 increment_likes() 并伪造 client_ip 参数，
-- 每次换一个 IP 值即可绕过 blessing_likes 唯一约束，无限刷赞
-- 修复后仅 service_role（admin client）可调用，
-- API 路由作为唯一入口，从请求头提取真实 IP 后传入
-- ============================================================
REVOKE EXECUTE ON FUNCTION increment_likes(UUID, TEXT) FROM anon, authenticated;

-- 注意：不 GRANT TO authenticated 也是因为攻击者可以注册 Supabase Auth 账号
-- 获取 authenticated key 后同样可以伪造 IP 调用该函数
-- 该函数现在仅能通过 service_role key（admin client）调用

-- ============================================================
-- 修复 5：blessings INSERT 触发器 — 强制安全默认值
-- RLS INSERT 策略是 WITH CHECK (true)，攻击者可通过 anon key
-- 直接插入 status='approved'、likes=99999 的记录绕过审核
-- 此触发器在数据库层强制覆盖，无论 INSERT 传入什么值
-- ============================================================
CREATE OR REPLACE FUNCTION force_blessing_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- 强制安全默认值，阻止攻击者绕过审核流程
  NEW.status := 'pending';
  NEW.likes := 0;
  NEW.is_featured := COALESCE(NEW.is_featured, false);
  NEW.created_at := COALESCE(NEW.created_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blessing_insert ON blessings;
CREATE TRIGGER trg_blessing_insert
  BEFORE INSERT ON blessings
  FOR EACH ROW
  EXECUTE FUNCTION force_blessing_defaults();
