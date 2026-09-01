-- ============================================================
-- 017 AI 去重元数据 — 「停用」升级为「相似句去重」业务概念
-- dedup_group_id：同组保留句与变体共享的组标识
-- dedup_reason：去重原因（semantic_duplicate）
-- dedup_by：操作来源（ai / admin）
-- dedup_override：管理员覆盖 AI 判断（true 时下次 AI 去重跳过该句）
-- ============================================================

ALTER TABLE blessing_templates
  ADD COLUMN IF NOT EXISTS dedup_group_id TEXT,
  ADD COLUMN IF NOT EXISTS dedup_reason TEXT,
  ADD COLUMN IF NOT EXISTS dedup_by TEXT,
  ADD COLUMN IF NOT EXISTS dedup_override BOOLEAN DEFAULT false;

-- 回填历史 24 条去重句的基础元数据（group 关系由未来 dedup 重跑时写入）
UPDATE blessing_templates
SET dedup_reason = 'semantic_duplicate',
    dedup_by = 'ai'
WHERE is_active = false AND remark = 'AI 去重停用';
