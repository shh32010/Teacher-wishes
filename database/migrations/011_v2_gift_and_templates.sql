-- ============================================================
-- 教师节祝福墙 v2.0 · 礼物系统 + 词库模板迁移
-- 依赖：001~010 已全部执行
-- ⚠️ 严格触发器（新 INSERT 强制 template_id）在 013 文件，
--    须与 v2.0 前端代码同步上线后执行，避免旧版提交被阻断
-- ============================================================

-- 1. 祝福语模板表（甲方词库）
CREATE TABLE IF NOT EXISTS blessing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,                          -- 官方祝福语原文
  category TEXT NOT NULL DEFAULT '感恩',           -- 感恩|祝愿|青春|温暖|文艺|趣味
  tags TEXT[] NOT NULL DEFAULT '{}',              -- 语义标签，如 {'谢谢','成长','陪伴'}
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,                      -- 被学生选用次数（冗余计数）
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON blessing_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON blessing_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON blessing_templates USING GIN (tags);

-- 2. 礼物表（slug 主键，运营可读）
CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY,                            -- rose|star|book|chalk|coffee|letter|apple|sapling
  name TEXT NOT NULL,                             -- 鲜花
  icon TEXT NOT NULL,                             -- 🌹
  description TEXT,                               -- 含义说明
  animation TEXT NOT NULL,                        -- bloom|twinkle|page|write|steam|envelope|bounce|grow
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 种子礼物（8 种）
INSERT INTO gifts (id, name, icon, description, animation, sort_order) VALUES
  ('rose',    '鲜花', '🌹', '感谢老师的辛勤付出', 'bloom',    1),
  ('star',    '星星', '🌟', '感恩老师的指引之光', 'twinkle',  2),
  ('book',    '书本', '📚', '感谢老师的谆谆教诲', 'page',     3),
  ('chalk',   '粉笔', '✏️', '致敬三尺讲台的坚守', 'write',    4),
  ('coffee',  '咖啡', '☕', '愿老师忙碌中有片刻温暖', 'steam', 5),
  ('letter',  '信件', '💌', '一封写给老师的心意', 'envelope', 6),
  ('apple',   '苹果', '🍎', '一份朴素的敬意', 'bounce',      7),
  ('sapling', '小树', '🌱', '感谢老师的浇灌与陪伴', 'grow',   8)
ON CONFLICT (id) DO NOTHING;

-- 3. blessings 表 ALTER（新列全部可空，历史数据不受影响）
ALTER TABLE blessings ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES blessing_templates(id);
ALTER TABLE blessings ADD COLUMN IF NOT EXISTS gift_id TEXT REFERENCES gifts(id);
ALTER TABLE blessings ADD COLUMN IF NOT EXISTS emotion TEXT;      -- 情绪快照（防模板分类后改）
ALTER TABLE blessings ADD COLUMN IF NOT EXISTS ai_message TEXT;   -- 仪式文案快照

CREATE INDEX IF NOT EXISTS idx_blessings_template ON blessings(template_id);
CREATE INDEX IF NOT EXISTS idx_blessings_gift ON blessings(gift_id);

-- 4. AI 生成物表（审计 + 缓存复用）
CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,                  -- classify|gift_message|quote_score|daily_summary|closing
  input JSONB,                         -- 输入快照
  output JSONB,                        -- 输出快照
  model TEXT,                          -- 模型名
  status TEXT DEFAULT 'done',          -- pending|done|failed
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_type ON ai_generations(type);

-- ============================================================
-- 行级安全 (RLS)
-- ============================================================

ALTER TABLE blessing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- 公开读取：仅启用状态的词库/礼物（service_role 绕过 RLS 可看全部）
CREATE POLICY "公开读取启用词库" ON blessing_templates
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "公开读取启用礼物" ON gifts
  FOR SELECT
  USING (is_active = true);

-- ai_generations 不建任何策略 → 仅 service_role 可访问
