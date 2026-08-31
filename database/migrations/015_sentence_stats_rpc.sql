-- ============================================================
-- 015 同句计数 RPC — 数据库侧聚合，替代 API 层全表扫描
-- 用法：select content, sentence_count from get_sentence_stats();
-- ============================================================

CREATE OR REPLACE FUNCTION get_sentence_stats()
RETURNS TABLE(content TEXT, sentence_count BIGINT)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT content, COUNT(*)::BIGINT
  FROM blessings
  GROUP BY content;
$$ LANGUAGE sql;

-- 仅 service_role 可调用（管理端内部统计，不公开）
REVOKE ALL ON FUNCTION get_sentence_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_sentence_stats() TO service_role;
