// ============================================================
// GET  /api/blessings — 获取已审核祝福列表（分页）
// POST /api/blessings — 提交新祝福
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import type { Blessing, CreateBlessingPayload, EmotionCategory, PaginatedResponse } from '@/types';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';
import { getClientIp } from '@/lib/client-ip';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const sort = searchParams.get('sort') || 'time'; // 'time' | 'likes'
  const offset = (page - 1) * pageSize;

  // 排序字段映射
  const sortField = sort === 'likes' ? 'likes' : 'created_at';

  try {
    // GET 接口为公开读，使用 anon client（不依赖 Cookie/Session）
    const supabase = createAnonClient();

    // v2.0 产品契约：公开响应 = blessing + gift，不返回 teacher 关联
    // （取消指定老师；教师维度查询仅教师页内部直连使用）。
    // 明确字段而非 select('*')，未来新增敏感列不会自动暴露
    const { data, error, count } = await supabase
      .from('blessings')
      .select(
        `id, content, nickname, class, is_anonymous, likes, is_featured,
         status, created_at, emotion, ai_message, template_id, gift_id,
         gift:gifts(id, name, icon)`,
        { count: 'exact' }
      )
      .eq('status', 'approved')
      .order(sortField, { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      // PGRST103: 请求范围超出数据总量（如请求第3页但只有40条数据）
      // 这不是真的错误，返回空列表即可
      if (error.code === 'PGRST103') {
        return NextResponse.json({
          data: [],
          count: 0,
          page,
          pageSize,
        });
      }
      console.error('[API] 获取祝福列表失败:', JSON.stringify(error));
      // 不向客户端返回 detail/code，避免泄露表名/权限细节（审查 P3-1）
      return NextResponse.json({ error: '获取祝福列表失败' }, { status: 500 });
    }

    const response: PaginatedResponse<Blessing> = {
      // 字段化 select 不含 user_id/teacher_id 等 DB 内部列；运行时结构即公开契约
      data: (data as unknown as Blessing[]) || [],
      count: count || 0,
      page,
      pageSize,
    };

    const res = NextResponse.json(response);
    res.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
    return res;
  } catch (err) {
    console.error('[API] 获取祝福列表异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // CSRF 验证（所有环境统一要求 Cookie + Header）
  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const body: CreateBlessingPayload = await request.json();

    // 活动状态检查（anon 可读 activity_settings）：closed 时拒绝新提交
    const anonForSettings = createAnonClient();
    const { data: statusRow } = await anonForSettings
      .from('activity_settings')
      .select('value')
      .eq('key', 'activity_status')
      .single();
    if (statusRow?.value === 'closed') {
      return NextResponse.json({ error: '活动已结束，感谢参与' }, { status: 503 });
    }

    // v2.0 契约：客户端只传 template_id + gift_id，
    // 祝福内容由服务端从官方词库读取，客户端伪造 content 无效
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!body.template_id || !UUID_RE.test(body.template_id)) {
      return NextResponse.json({ error: '非法模板ID' }, { status: 400 });
    }
    if (!body.gift_id || !/^[a-z][a-z0-9_-]{1,19}$/.test(body.gift_id)) {
      return NextResponse.json({ error: '非法礼物ID' }, { status: 400 });
    }

    // 昵称/班级服务端校验（前端 maxLength 可被绕过）
    const trimmedNickname = (body.nickname || '').trim();
    const trimmedClass = (body.class || '').trim();
    if (trimmedNickname.length > 20) {
      return NextResponse.json({ error: '昵称不能超过20字' }, { status: 400 });
    }
    if (trimmedClass.length > 30) {
      return NextResponse.json({ error: '班级不能超过30字' }, { status: 400 });
    }

    // 获取客户端 IP（Vercel 可信头优先，未知时 'unknown' 防共享限流桶）
    const ip = getClientIp(request);

    const supabase = createAnonClient();

    // 速率限制：每10分钟最多200条（校园 NAT 场景下同一出口 IP 可能服务数十名学生，
    // 100 条在活动现场集中提交时会误伤；Turnstile + 3 秒冷却仍为前置防线）
    const { data: remaining, error: rateError } = await supabase.rpc('check_rate_limit', {
      client_ip: ip,
      action_name: 'submit_blessing',
      max_requests: 200,
      window_minutes: 10,
    });

    // fail-closed：RPC 异常时拒绝请求，防止攻击者通过制造 RPC 故障绕过限流
    if (rateError || remaining === null) {
      console.error('[API] 速率限制检查异常:', rateError);
      return NextResponse.json({ error: '系统繁忙，请稍后重试' }, { status: 503 });
    }
    if (remaining <= 0) {
      return NextResponse.json({ error: '发送太频繁，请10分钟后再试' }, { status: 429 });
    }

    // Turnstile 验证（Production fail-closed）：
    // - 生产环境：TURNSTILE_SECRET_KEY 必须配置，否则 503
    // - 生产环境已配置：必须有 token，验证失败返回 400
    // - 开发环境：可选，未配置时跳过验证
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (process.env.NODE_ENV === 'production') {
      if (!turnstileSecret) {
        console.error('[API] 生产环境未配置 TURNSTILE_SECRET_KEY');
        return NextResponse.json({ error: '服务未配置人机验证，请联系管理员' }, { status: 503 });
      }
      if (!body.turnstile_token) {
        console.error('[API] 生产环境缺少 Turnstile token');
        return NextResponse.json({ error: '人机验证失败，请刷新重试' }, { status: 400 });
      }
    }
    if (turnstileSecret && body.turnstile_token) {
      const turnstileRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: turnstileSecret,
            response: body.turnstile_token,
          }),
        }
      );
      const turnstileData = await turnstileRes.json();
      if (!turnstileData.success) {
        return NextResponse.json({ error: '人机验证失败，请刷新重试' }, { status: 400 });
      }
    }

    // 服务端查模板：anon client 受 RLS 限制，仅能读到 is_active=true 的模板，
    // 查不到 = 模板不存在或已停用 → 拒绝
    const { data: template, error: templateError } = await supabase
      .from('blessing_templates')
      .select('id, content, category')
      .eq('id', body.template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: '祝福语不存在或已停用' }, { status: 400 });
    }

    // 服务端查礼物：同样受 RLS 过滤，停用礼物查不到
    const { data: gift, error: giftError } = await supabase
      .from('gifts')
      .select('id, name, icon')
      .eq('id', body.gift_id)
      .single();

    if (giftError || !gift) {
      return NextResponse.json({ error: '礼物不存在或已停用' }, { status: 400 });
    }

    // 敏感词过滤（双保险：词库入库时已过滤，此处防历史脏数据；昵称/班级仍需过滤）
    const { containsProfanity } = await import('@/lib/profanity');
    if (
      containsProfanity(template.content) ||
      containsProfanity(trimmedNickname) ||
      containsProfanity(trimmedClass)
    ) {
      return NextResponse.json({ error: '内容包含敏感词，请修改后重试' }, { status: 400 });
    }

    // is_anonymous 类型收窄（防 "0"/对象等非布尔值入库）
    const isAnonymous = typeof body.is_anonymous === 'boolean' ? body.is_anonymous : false;

    // 匿名送出时服务端强制 class=null（数据最小化，兑现「不显示昵称和班级」承诺）
    const finalClass = isAnonymous ? null : trimmedClass || null;

    // 仪式文案：按「情绪 × 礼物」从静态矩阵取快照写入（AI-3）
    const { getGiftMessage } = await import('@/lib/ai/messages');
    const aiMessage = getGiftMessage(template.category as EmotionCategory | null, gift.id);

    // 插入祝福（v2.0：不绑定老师；内容/情绪取自官方模板）
    // 不使用 .select()，避免 RLS SELECT 冲突
    const { error } = await supabase.from('blessings').insert([
      {
        template_id: template.id,
        gift_id: gift.id,
        emotion: template.category,
        ai_message: aiMessage,
        teacher_id: null, // v2.0 取消指定老师，送给全体教师
        nickname: trimmedNickname || null,
        class: finalClass,
        content: template.content,
        is_anonymous: isAnonymous,
      },
    ]);

    if (error) {
      console.error('[API] 提交祝福失败:', error);
      return NextResponse.json({ error: '提交失败，请稍后再试' }, { status: 500 });
    }

    // 使用次数递增由数据库触发器完成（013 迁移，与代码同步上线），
    // API 层不维护冗余计数，避免竞态

    return NextResponse.json(
      {
        success: true,
        message: '🎁 礼物已送达！祝福已自动汇入星河',
        gift_icon: gift.icon,
        gift_name: gift.name,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[API] 提交祝福异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
