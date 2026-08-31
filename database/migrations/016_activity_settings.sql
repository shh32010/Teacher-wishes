-- ============================================================
-- 016 活动设置表 — 甲方运营配置（key-value）
-- 只存运营级配置；部署级（密钥/连接）一律不走此表
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO activity_settings (key, value) VALUES
  ('activity_name', '2026 教师节祝福活动'),
  ('activity_status', 'open'),                 -- open | closed（closed 时拒绝新提交）
  ('start_at', '2026-09-01T00:00:00+08:00'),
  ('end_at', '2026-09-10T23:59:59+08:00'),
  ('allow_anonymous', 'true'),
  ('show_class', 'true'),
  ('allow_likes', 'true')
ON CONFLICT (key) DO NOTHING;

-- RLS：公开只读（学生端提交链路需检查活动状态），写走 service_role（管理 API）
ALTER TABLE activity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "公开读取活动设置" ON activity_settings
  FOR SELECT
  USING (true);
