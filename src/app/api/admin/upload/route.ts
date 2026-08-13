// ============================================================
// POST /api/admin/upload — 教师头像上传
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';
import { requireAdmin } from '@/lib/auth/admin';

export async function POST(request: NextRequest) {
  // 纵深防御：中间件之外的二次验签
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  // CSRF 验证（所有环境统一要求 Cookie + Header）
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const formData = await request.formData();
    const teacherId = formData.get('teacher_id') as string;
    const file = formData.get('file') as File;

    if (!teacherId || !file) {
      return NextResponse.json({ error: '缺少 teacher_id 或 file' }, { status: 400 });
    }

    // teacherId 必须是合法 UUID
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(teacherId)) {
      return NextResponse.json({ error: '非法教师 ID' }, { status: 400 });
    }

    // MIME 白名单 — 不信任扩展名，只信 file.type
    const ALLOWED_TYPES: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json({ error: '仅支持 JPG、PNG、WebP 图片' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: '文件不能超过 2MB' }, { status: 400 });
    }

    // 使用 service_role 上传（绕过 RLS）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 扩展名由 MIME 类型映射，文件名用随机 UUID，不用用户输入
    const ext = ALLOWED_TYPES[file.type];
    const filename = `teacher-${teacherId}-${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filename, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (uploadError) {
      console.error('[Upload] 上传失败:', uploadError);
      return NextResponse.json({ error: '上传失败' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename);

    const avatarUrl = urlData.publicUrl;

    // 更新教师头像字段
    const { error: updateError } = await supabase
      .from('teachers')
      .update({ avatar_url: avatarUrl })
      .eq('id', teacherId);

    if (updateError) {
      console.error('[Upload] 更新教师记录失败:', updateError);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ url: avatarUrl });
  } catch (err) {
    console.error('[Upload] 异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
