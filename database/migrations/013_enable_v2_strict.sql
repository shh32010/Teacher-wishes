-- ============================================================
-- 教师节祝福墙 v2.0 · 严格模式触发器（安全审查 P1-1 完整版）
-- ⚠️ 本文件必须与 v2.0 前端代码【同步上线后】执行！
--    执行后旧版（自由输入 content 不传 template_id）提交将被拒绝。
--
-- 安全审查结论：仅校验 template_id 非空不够 —— 攻击者可拿公开
-- anon key 直连 PostgREST，随便填一个启用模板 UUID 但 content 写任意
-- 内容。本文件把契约在数据库层完整 enforce：
--   1. template_id 必填
--   2. 模板必须存在且 is_active=true（显式条件 + RLS 双保险）
--   3. content 必须与模板原文完全一致（客户端伪造 content 无效）
--   4. 顺带补齐 usage_count 计数触发器（审查 P3-6）
-- ============================================================

-- ── 1. 词库契约触发器：template_id 必填 + content = 启用模板原文 ──
CREATE OR REPLACE FUNCTION enforce_template_required()
RETURNS TRIGGER AS $$
DECLARE
  template_content TEXT;
BEGIN
  IF NEW.template_id IS NULL THEN
    RAISE EXCEPTION 'template_id is required (v2.0 strict mode)';
  END IF;

  -- 显式 is_active 条件 + 调用者（anon）受 blessing_templates RLS 过滤，
  -- 停用/不存在的模板均查不到 → 拒绝
  SELECT content INTO template_content
    FROM blessing_templates
   WHERE id = NEW.template_id
     AND is_active = true;

  IF template_content IS NULL THEN
    RAISE EXCEPTION 'template not found or inactive';
  END IF;

  IF NEW.content IS DISTINCT FROM template_content THEN
    RAISE EXCEPTION 'content must match official template';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blessings_require_template ON blessings;

CREATE TRIGGER trg_blessings_require_template
  BEFORE INSERT ON blessings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_template_required();

-- ── 2. usage_count 计数触发器（AFTER INSERT，SECURITY DEFINER） ──
-- anon 无 UPDATE 权限，计数必须由 DEFINER 触发器完成；
-- 输入仅 NEW.template_id/gift_id（已经前置触发器校验），无注入面
CREATE OR REPLACE FUNCTION increment_usage_counts()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE blessing_templates SET usage_count = usage_count + 1 WHERE id = NEW.template_id;
  IF NEW.gift_id IS NOT NULL THEN
    UPDATE gifts SET usage_count = usage_count + 1 WHERE id = NEW.gift_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blessings_usage ON blessings;

CREATE TRIGGER trg_blessings_usage
  AFTER INSERT ON blessings
  FOR EACH ROW
  EXECUTE FUNCTION increment_usage_counts();

-- ── 3. ai_generations 最小化公开策略（审查 P2-1） ──
-- 公开 AI 端点（金句/总结）此前因无策略而功能死亡；此处仅公开
-- 「已确认」的金句与总结，quote_score/classify 等内部数据不公开
CREATE POLICY "公开读取已确认金句与总结" ON ai_generations
  FOR SELECT
  USING (type IN ('quote_of_day', 'closing') AND status = 'done');

-- ── 4. v2 自动上墙（用户拍板 08-31） ──
-- 内容 = 官方词库原文（入库已过滤敏感词）→ 提交即 approved 自动上墙；
-- 事后治理走后台删除/下架。旧触发器（强制 pending）在此重建覆盖。
-- 注意：本触发器重建须在词库契约触发器（1）之后生效，同文件顺序执行即可
DROP TRIGGER IF EXISTS trg_blessing_insert ON blessings;

CREATE OR REPLACE FUNCTION force_blessing_safe_defaults()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status := 'approved';   -- v2 自动上墙（内容安全由词库契约触发器保证）
  NEW.likes := 0;
  NEW.is_featured := false;
  NEW.teacher_id := NULL;     -- v2 取消指定老师
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blessing_insert
  BEFORE INSERT ON blessings
  FOR EACH ROW
  EXECUTE FUNCTION force_blessing_safe_defaults();
