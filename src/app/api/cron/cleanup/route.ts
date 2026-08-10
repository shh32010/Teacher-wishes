// ============================================================
// GET /api/cron/cleanup — Vercel Cron Job：清理过期限流记录
// 每天执行一次，作为 check_rate_limit 概率性清理的补充保障
// ============================================================
// Vercel Cron 通过 Authorization: Bearer <CRON_SECRET> 头鉴权
// 需在 Vercel Dashboard 设置 CRON_SECRET 环境变量
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // 验证 Cron 请求（仅 Vercel Cron 持有 CRON_SECRET）
  const cronSecret = process.env.CRON_SECRET;

  // fail-closed：生产环境必须配置 CRON_SECRET，否则拒绝所有请求
  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Cron] CRON_SECRET 未配置，拒绝请求');
      return NextResponse.json({ error: '服务未配置，请联系管理员' }, { status: 500 });
    }
    // 开发环境允许无密钥访问（方便本地调试）
  } else {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc('cleanup_rate_limits');

    if (error) {
      console.error('[Cron] 清理限流记录失败:', error);
      return NextResponse.json({ error: '清理失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '清理完成' });
  } catch (err) {
    console.error('[Cron] 清理异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
