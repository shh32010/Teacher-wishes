-- ============================================================
-- 速率限制 + Turnstile 验证
-- ============================================================

-- 速率限制表
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  action TEXT NOT NULL, -- 'submit_blessing' | 'like'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_action ON rate_limits(ip, action, created_at DESC);

-- 清理过期记录的函数（供定时任务调用，保留最近1小时）
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.rate_limits WHERE created_at < now() - INTERVAL '1 hour';
$$;

-- 检查是否超限的函数（返回剩余可操作次数）
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
  SELECT COUNT(*) INTO recent_count
  FROM public.rate_limits
  WHERE ip = client_ip
    AND action = action_name
    AND created_at > now() - (window_minutes || ' minutes')::INTERVAL;

  RETURN max_requests - recent_count;
END;
$$;

-- 授予调用权限
-- check_rate_limit: anon 可调用（内部 INSERT 由 SECURITY DEFINER 完成）
-- cleanup_rate_limits: 仅 service_role（Vercel Cron），由 009 迁移显式授予
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, TEXT, INT, INT) TO anon, authenticated;
