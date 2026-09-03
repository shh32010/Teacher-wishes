// ============================================================
// POST /api/blessings 契约测试（审查建议：固定测试服务端安全契约）
// 覆盖：正常提交 / 跳过礼物 / 内容伪造无效 / 停用模板礼物拒绝 /
//       非法 ID / 超长昵称 / 匿名数据最小化 / CSRF / Turnstile / 双层限流
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ─── mock 客户端（由各用例按需配置 from/rpc 行为） ───
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createAnonClient: () => mockSupabase,
}));

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: vi.fn(() => true),
  csrfErrorResponse: () => NextResponse.json({ error: 'CSRF 验证失败' }, { status: 403 }),
}));

import { POST } from '@/app/api/blessings/route';
import { validateCsrfToken } from '@/lib/csrf';

const TEMPLATE_ID = '11111111-1111-4111-8111-111111111111';
const TEMPLATE_ROW = { id: TEMPLATE_ID, content: '桃李不言，下自成蹊。', category: '感恩' };
const GIFT_ROW = { id: 'rose', name: '鲜花', icon: '🌹' };

/** 构造 thenable 的查询链 mock（select/eq/single 等全部返回自身） */
function makeBuilder(resolveData: unknown, resolveError: unknown = null) {
  const builder: Record<string, unknown> = {
    then: (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: resolveData, error: resolveError }).then(onFulfilled),
  };
  for (const method of ['select', 'eq', 'order', 'limit', 'range', 'lte', 'gte', 'setHeader']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(async () => ({ data: resolveData, error: resolveError }));
  // insert 默认成功（个别用例需要断言插入参数时单独覆盖）
  builder.insert = vi.fn(async () => ({ error: null }));
  return builder;
}

/** 默认成功场景：设置表空 + 模板/礼物可查 + 双层限流放行 + 插入成功 */
function setupSuccessScenario() {
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'activity_settings') return makeBuilder([]);
    if (table === 'blessing_templates') return makeBuilder(TEMPLATE_ROW);
    if (table === 'gifts') return makeBuilder(GIFT_ROW);
    if (table === 'blessings') return makeBuilder(null, null);
    return makeBuilder([]);
  });
  mockSupabase.rpc.mockResolvedValue({ data: 100, error: null });
}

/** 组装 POST 请求 */
function makeRequest(body: Record<string, unknown>, withTurnstile = true) {
  return new NextRequest('http://localhost/api/blessings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'token' },
    body: JSON.stringify({
      turnstile_token: withTurnstile ? 'test-token' : undefined,
      ...body,
    }),
  });
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

describe('POST /api/blessings 契约', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateCsrfToken as ReturnType<typeof vi.fn>).mockReturnValue(true);
    setupSuccessScenario();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  /** 捕获 blessings 表的 insert mock，供断言插入参数使用 */
  function captureInsert() {
    let captured: ReturnType<typeof vi.fn> | null = null;
    const base = makeBuilder(null, null);
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activity_settings') return makeBuilder([]);
      if (table === 'blessing_templates') return makeBuilder(TEMPLATE_ROW);
      if (table === 'gifts') return makeBuilder(GIFT_ROW);
      if (table === 'blessings') {
        captured = vi.fn(async () => ({ error: null }));
        base.insert = captured;
        return base;
      }
      return makeBuilder([]);
    });
    return () => captured;
  }

  it('正常 template + gift → 201，插入内容为服务端模板原文', async () => {
    const getInsert = captureInsert();
    const res = await POST(makeRequest({ template_id: TEMPLATE_ID, gift_id: 'rose' }));
    expect(res.status).toBe(201);
    const body = await readJson(res);
    expect(body.success).toBe(true);

    const inserted = getInsert()?.mock.calls[0]?.[0]?.[0] as Record<string, unknown>;
    expect(inserted.content).toBe('桃李不言，下自成蹊。');
    expect(inserted.gift_id).toBe('rose');
    expect(inserted.template_id).toBe(TEMPLATE_ID);
  });

  it('跳过礼物（无 gift_id）→ 201，gift_id 插入为 null', async () => {
    const getInsert = captureInsert();
    const res = await POST(makeRequest({ template_id: TEMPLATE_ID }));
    expect(res.status).toBe(201);

    const inserted = getInsert()?.mock.calls[0]?.[0]?.[0] as Record<string, unknown>;
    expect(inserted.gift_id).toBeNull();
    expect(inserted.content).toBe('桃李不言，下自成蹊。');
  });

  it('客户端伪造 content 无效 — 插入内容永远来自服务端查库', async () => {
    const getInsert = captureInsert();
    const res = await POST(
      makeRequest({ template_id: TEMPLATE_ID, gift_id: 'rose', content: '被伪造的内容' })
    );
    expect(res.status).toBe(201);

    // 插入的 content 是服务端模板原文，不是客户端伪造值
    const inserted = getInsert()?.mock.calls[0]?.[0]?.[0] as Record<string, unknown>;
    expect(inserted.content).toBe('桃李不言，下自成蹊。');
    expect(inserted.content).not.toBe('被伪造的内容');
  });

  it('停用模板（查不到）→ 400 祝福语不存在或已停用', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activity_settings') return makeBuilder([]);
      if (table === 'blessing_templates') return makeBuilder(null, { message: 'not found' });
      return makeBuilder([]);
    });
    const res = await POST(makeRequest({ template_id: TEMPLATE_ID, gift_id: 'rose' }));
    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('祝福语不存在或已停用');
  });

  it('停用礼物（查不到）→ 400 礼物不存在或已停用', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activity_settings') return makeBuilder([]);
      if (table === 'blessing_templates') return makeBuilder(TEMPLATE_ROW);
      if (table === 'gifts') return makeBuilder(null, { message: 'not found' });
      return makeBuilder([]);
    });
    const res = await POST(makeRequest({ template_id: TEMPLATE_ID, gift_id: 'rose' }));
    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('礼物不存在或已停用');
  });

  it('非法 template_id → 400 非法模板ID', async () => {
    const res = await POST(makeRequest({ template_id: 'not-a-uuid', gift_id: 'rose' }));
    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('非法模板ID');
  });

  it('非法 gift_id slug → 400 非法礼物ID', async () => {
    const res = await POST(makeRequest({ template_id: TEMPLATE_ID, gift_id: 'BAD_SLUG!' }));
    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('非法礼物ID');
  });

  it('超长昵称 → 400 昵称不能超过20字', async () => {
    const res = await POST(
      makeRequest({ template_id: TEMPLATE_ID, gift_id: 'rose', nickname: 'x'.repeat(21) })
    );
    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('昵称不能超过20字');
  });

  it('匿名送出 → 插入 nickname/class 均为 null（数据最小化）', async () => {
    const insertMock = vi.fn(async (rows?: unknown[]) => {
      if (!rows) throw new Error('insert 未收到行');
      return { error: null };
    });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'activity_settings') return makeBuilder([]);
      if (table === 'blessing_templates') return makeBuilder(TEMPLATE_ROW);
      if (table === 'gifts') return makeBuilder(GIFT_ROW);
      if (table === 'blessings') {
        const b = makeBuilder(null, null);
        b.insert = insertMock;
        return b;
      }
      return makeBuilder([]);
    });
    const res = await POST(
      makeRequest({
        template_id: TEMPLATE_ID,
        gift_id: 'rose',
        nickname: '小明',
        class: '高一(3)班',
        is_anonymous: true,
      })
    );
    expect(res.status).toBe(201);
    const inserted = insertMock.mock.calls[0]?.[0]?.[0] as Record<string, unknown>;
    expect(inserted.nickname).toBeNull();
    expect(inserted.class).toBeNull();
    expect(inserted.is_anonymous).toBe(true);
  });

  it('CSRF 验证失败 → 403', async () => {
    (validateCsrfToken as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const res = await POST(makeRequest({ template_id: TEMPLATE_ID, gift_id: 'rose' }));
    expect(res.status).toBe(403);
  });

  it('生产模式无 Turnstile token → 400 人机验证失败', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');
    const res = await POST(makeRequest({ template_id: TEMPLATE_ID, gift_id: 'rose' }, false));
    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('人机验证失败，请刷新重试');
  });

  it('IP 限流超限 → 429 发送太频繁', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 0, error: null });
    const res = await POST(makeRequest({ template_id: TEMPLATE_ID, gift_id: 'rose' }));
    expect(res.status).toBe(429);
    expect((await readJson(res)).error).toBe('发送太频繁，请10分钟后再试');
  });

  it('全局限流超限 → 429 活动太火爆', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: 100, error: null }); // per-IP 放行
    mockSupabase.rpc.mockResolvedValueOnce({ data: 0, error: null }); // global 超限
    const res = await POST(makeRequest({ template_id: TEMPLATE_ID, gift_id: 'rose' }));
    expect(res.status).toBe(429);
    expect((await readJson(res)).error).toBe('活动太火爆，请稍后再试');
  });

  it('限流 RPC 异常 → 503 fail-closed', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'rpc down' } });
    const res = await POST(makeRequest({ template_id: TEMPLATE_ID, gift_id: 'rose' }));
    expect(res.status).toBe(503);
    expect((await readJson(res)).error).toBe('系统繁忙，请稍后重试');
  });
});
