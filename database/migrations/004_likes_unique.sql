-- ============================================================
-- 点赞唯一性约束：同 IP + 同祝福 只能点一次
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- 1. 新建点赞记录表（谁在什么时间点了哪条祝福）
CREATE TABLE IF NOT EXISTS blessing_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blessing_id UUID NOT NULL REFERENCES blessings(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 唯一约束：同一 IP 对同一祝福只能点一次
CREATE UNIQUE INDEX IF NOT EXISTS idx_blessing_likes_unique
  ON blessing_likes(blessing_id, ip_address);

-- 3. 查询索引：按祝福查点赞数、按 IP 查点赞记录
CREATE INDEX IF NOT EXISTS idx_blessing_likes_blessing
  ON blessing_likes(blessing_id);
CREATE INDEX IF NOT EXISTS idx_blessing_likes_ip
  ON blessing_likes(ip_address);

-- 4. 启用 RLS（无公开策略：点赞唯一入口是 increment_likes RPC，
--    由 SECURITY DEFINER 绕过 RLS 内部写入，anon 无法直接读写此表）
ALTER TABLE blessing_likes ENABLE ROW LEVEL SECURITY;

-- 5. 新 RPC：原子点赞（插入记录 + 递增计数，已在别处定义则替换）
-- 删除旧版函数（无 IP 参数版本）
DROP FUNCTION IF EXISTS increment_likes(UUID);

-- 创建新版函数
CREATE OR REPLACE FUNCTION increment_likes(blessing_id UUID, client_ip TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_likes INTEGER;
BEGIN
  -- 尝试插入点赞记录（UNIQUE 约束在并发时由 DB 保证原子性）
  INSERT INTO public.blessing_likes (blessing_id, ip_address)
  VALUES (blessing_id, client_ip);

  -- 插入成功 → 递增赞数
  UPDATE public.blessings
  SET likes = likes + 1
  WHERE id = blessing_id
  RETURNING likes INTO new_likes;

  IF new_likes IS NULL THEN
    RAISE EXCEPTION '祝福不存在';
  END IF;

  RETURN new_likes;
EXCEPTION
  WHEN unique_violation THEN
    -- 已点过赞，返回 -1 作为标记
    RETURN -1;
END;
$$;

-- 授予 anon 角色调用权限
GRANT EXECUTE ON FUNCTION increment_likes(UUID, TEXT) TO anon, authenticated;
