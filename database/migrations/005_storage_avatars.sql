-- ============================================================
-- 004_storage_avatars.sql
-- 创建教师头像存储桶 + 公开访问策略
-- ============================================================

-- 1. 创建 avatars 存储桶（公开访问）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2MB 限制
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. 公开读取策略（任何人都可以查看头像）
CREATE POLICY "公开读取头像" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- 3. 管理员上传策略（使用 service_role 绕过，此处为 fallback）
--    实际上传通过 API route 使用 service_role key，该 key 绕过 RLS
CREATE POLICY "管理员上传头像" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

-- 4. 管理员更新/删除头像
CREATE POLICY "管理员更新头像" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'avatars');

CREATE POLICY "管理员删除头像" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'avatars');
