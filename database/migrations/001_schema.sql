-- ============================================================
-- 教师节祝福墙 · 数据库初始化迁移
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- 1. 教师表
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT,
  avatar_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 祝福表（核心）
CREATE TABLE IF NOT EXISTS blessings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),   -- 可为空（匿名）
  teacher_id UUID REFERENCES teachers(id),  -- 可为空（全体教师）
  nickname TEXT,                             -- 学生昵称
  class TEXT,                                -- 班级
  content TEXT NOT NULL,
  likes INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',             -- pending | approved | rejected
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 事件模板表（未来扩展）
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  theme_config JSONB,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
);

-- ============================================================
-- 索引优化
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_blessings_created ON blessings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blessings_status ON blessings(status);
CREATE INDEX IF NOT EXISTS idx_blessings_teacher ON blessings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_blessings_likes ON blessings(likes DESC);

-- ============================================================
-- 行级安全 (RLS) 策略
-- ============================================================

-- 启用 RLS
ALTER TABLE blessings ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- 公开读取已审核祝福
CREATE POLICY "任何人都可以读取已审核祝福" ON blessings
  FOR SELECT
  USING (status = 'approved');

-- 公开插入祝福（匿名用户可提交）
CREATE POLICY "任何人都可以提交祝福" ON blessings
  FOR INSERT
  WITH CHECK (true);

-- 用户只能修改自己的祝福（未登录则无法修改）
CREATE POLICY "用户只能修改自己的祝福" ON blessings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 公开读取教师列表
CREATE POLICY "任何人都可以读取教师列表" ON teachers
  FOR SELECT
  USING (true);

-- ============================================================
-- Supabase Realtime 发布
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE blessings;

-- ============================================================
-- 示例数据（可选）
-- ============================================================

-- 插入示例教师
-- 教师种子：真实姓氏示例（信息工程学院，完整名单见运营导入）
INSERT INTO teachers (name, department) VALUES
  ('王老师', '信息工程学院'),
  ('盛老师', '信息工程学院'),
  ('林老师', '信息工程学院')
ON CONFLICT DO NOTHING;
