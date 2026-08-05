-- ============================================================
-- 点赞功能修复：使用 SECURITY DEFINER 函数绕过 RLS
-- ============================================================

-- 原子递增点赞数（SECURITY DEFINER 以函数所有者身份执行，绕过 RLS）
CREATE OR REPLACE FUNCTION increment_likes(blessing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_likes INTEGER;
BEGIN
  UPDATE public.blessings
  SET likes = likes + 1
  WHERE id = blessing_id
  RETURNING likes INTO new_likes;

  IF new_likes IS NULL THEN
    RAISE EXCEPTION '祝福不存在';
  END IF;

  RETURN new_likes;
END;
$$;

-- 授予 anon 角色调用权限
GRANT EXECUTE ON FUNCTION increment_likes(UUID) TO anon, authenticated;
