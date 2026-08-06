// ============================================================
// POST /api/admin/upload — 教师头像上传
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  // CSRF 验证（如果未设置 csrf_token Cookie 则跳过）
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

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '仅支持图片文件' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: '文件不能超过 2MB' }, { status: 400 });
    }

    // 使用 service_role 上传（绕过 RLS）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `teacher-${teacherId}-${Date.now()}.${ext}`;

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
