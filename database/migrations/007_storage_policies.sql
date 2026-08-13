-- ============================================================
-- 006_storage_policies.sql
-- P2 安全加固：收紧 Storage 策略 + admin_token 过期
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- ============================================================
-- 修复：收紧 avatars 存储桶的写入策略
-- 旧策略 INSERT/UPDATE/DELETE 没有身份验证，
-- 任何拿到 anon key 的人都能上传/修改/删除头像文件
-- 修复后仅保留公开 SELECT，写入操作通过 API 路由
-- （使用 admin client = service_role key 绕过 RLS）
-- ============================================================

-- 删除过于宽松的写入策略
DROP POLICY IF EXISTS "管理员上传头像" ON storage.objects;
DROP POLICY IF EXISTS "管理员更新头像" ON storage.objects;
DROP POLICY IF EXISTS "管理员删除头像" ON storage.objects;

-- 确保公开读取策略存在（任何人可以查看头像，idempotent）
DROP POLICY IF EXISTS "公开读取头像" ON storage.objects;
CREATE POLICY "公开读取头像" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');
