# 📡 API 文档 — 教师节祝福墙

> Base URL: `https://teacher.shh32010.dpdns.org` | 本地: `http://localhost:3000`

---

## 通用说明

### 响应格式

所有 API 返回 JSON，成功时 HTTP 200/201，失败时返回：

```json
{ "error": "错误描述" }
```

### 缓存策略

| 端点 | Cache-Control |
| :--- | :--- |
| `GET /api/blessings` | `s-maxage=5, stale-while-revalidate=30` |
| `GET /api/blessings/stats` | `s-maxage=10, stale-while-revalidate=59` |
| 其他 | 不缓存 |

### 速率限制

| 端点 | 限制 | 窗口 |
| :--- | :--- | :--- |
| `POST /api/blessings` | 每 IP 最多 400 条（校园 NAT 出口 IP 共享场景放宽） | 10 分钟 |
| `POST /api/blessings/[id]/like` | 每 IP 最多 20 次 | 1 分钟 |
| `POST /api/admin/login` | 每 IP 最多 5 次 | 1 分钟 |
| 超限返回 `429 Too Many Requests` |

> 所有限流均通过 `check_rate_limit` RPC（`SECURITY DEFINER`）实现，fail-closed 策略：RPC 异常时返回 503。

---

## 🔓 公开 API

### `GET /api/blessings`

获取已审核的祝福列表（分页 + 排序）。

**Query Parameters:**

| 参数 | 类型 | 默认 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | int | `1` | 页码，最小 1 |
| `pageSize` | int | `20` | 每页数量，最大 50 |
| `sort` | string | `time` | 排序方式：`time`（最新）/ `likes`（最热） |

**响应（v2.0 公开契约：blessing + gift，不返回 teacher 关联）:**

```json
{
  "data": [
    {
      "id": "uuid",
      "nickname": "小明",
      "class": "高一(3)班",
      "content": "感谢您的谆谆教诲，让成长的路上充满方向。",
      "likes": 5,
      "is_featured": false,
      "is_anonymous": false,
      "emotion": "感恩",
      "ai_message": "这束花，送给每一位辛勤耕耘的老师。",
      "created_at": "2026-09-01T10:00:00Z",
      "gift": {
        "id": "rose",
        "name": "鲜花",
        "icon": "🌹"
      }
    }
  ],
  "count": 31,
  "page": 1,
  "pageSize": 20
}
```

**状态码:**

| 码 | 说明 |
| :--- | :--- |
| 200 | 成功 |
| 500 | 服务器错误 |

---

### `POST /api/blessings`

**v2.0 送礼提交**：提交祝福 + 礼物（内容=官方词库原文，数据库触发器强制 `approved` **自动上墙**，事后治理走后台删除）。客户端只传模板/礼物 ID，**祝福内容由服务端从官方词库读取**——客户端伪造 content 无效。

**请求体:**

```json
{
  "template_id": "uuid (必填, 词库模板ID)",
  "gift_id": "rose (必填, 礼物slug)",
  "nickname": "小明 (可选, 最长20字)",
  "class": "高一(3)班 (可选, 最长30字)",
  "is_anonymous": false,
  "turnstile_token": "cf-turnstile-token (生产环境必填)"
}
```

**响应 (201):**

```json
{
  "success": true,
  "message": "🎁 礼物已送达！祝福已自动汇入星河",
  "gift_icon": "🌹",
  "gift_name": "鲜花"
}
```

**校验规则:**

| 规则 | 错误信息 |
| :--- | :--- |
| template_id 非法 UUID | `非法模板ID` |
| gift_id 非法 slug | `非法礼物ID` |
| 模板不存在或停用（RLS 过滤） | `祝福语不存在或已停用` |
| 礼物不存在或停用（RLS 过滤） | `礼物不存在或已停用` |
| 昵称 > 20 字 / 班级 > 30 字 | 对应长度错误 |
| 内容/昵称含敏感词（双保险） | `内容包含敏感词，请修改后重试` |
| Turnstile 未配置（生产） | `服务未配置人机验证，请联系管理员`（返回 503） |
| Turnstile 验证失败 | `人机验证失败，请刷新重试`（返回 400） |
| 速率超限 | `发送太频繁，请10分钟后再试` |

> 🔒 服务端用 anon client 查模板/礼物，RLS 只返回 `is_active=true` 的行——停用的词库/礼物对攻击者天然不可用。插入时 `teacher_id` 恒为 null（v2.0 取消指定老师）、`emotion` 取模板分类快照、`ai_message` 取仪式文案矩阵快照。

---

### `POST /api/blessings/[id]/like`

为指定祝福点赞（IP 唯一约束 + RPC 原子递增）。

**路径参数:** `id` — 祝福 UUID

**响应（200 — 首次点赞）:**

```json
{
  "id": "uuid",
  "likes_count": 6
}
```

**响应（409 — 重复点赞）:**

```json
{
  "error": "你已经点过赞了"
}
```

> 🔒 服务端通过 `blessing_likes` 表 + `UNIQUE(blessing_id, ip_address)` 约束保证点赞唯一性。客户端 IP 通过 `getClientIp()` 函数获取，优先级：`x-vercel-forwarded-for`（Vercel 可信代理）→ `x-forwarded-for` → `x-real-ip` → `unknown`。前端 `localStorage` 仅作乐观 UI 辅助，真正防重复的是服务端 IP 约束。

**速率限制:** 每 IP 每分钟 20 次点赞，超限返回 429。

**状态码:**

| 码 | 说明 |
| :--- | :--- |
| 200 | 点赞成功，返回新计数 |
| 409 | 已点过赞（IP 重复） |
| 429 | 点赞太频繁 |
| 500 | 服务器错误 |
| 503 | 限流服务异常 |

---

### `GET /api/blessings/stats`

获取全局统计数据。

**响应:**

```json
{
  "total_blessings": 31,
  "total_participants": 15,
  "total_likes": 87
}
```

---

### `GET /api/teachers`

获取教师列表。

**响应:**

```json
{
  "teachers": [
    {
      "id": "uuid",
      "name": "王老师",
      "department": "语文组",
      "avatar_url": "https://..."
    }
  ]
}
```

---

### `GET /api/templates`

**v2.0** 公开词库查询（anon client 受 RLS 限制，仅返回启用的祝福语）。

**查询参数:** `page`、`pageSize`（≤50）、`category`（感恩|祝愿|青春|温暖|文艺|趣味）

### `GET /api/gifts`

**v2.0** 礼物列表（仅启用项，按 sort_order 排序）。响应 `{ gifts: [...] }`。

### `GET /api/ai/recommend?mood=温暖`

**v2.0** AI 推荐 3 句（AI-1）。纯数据库 tags 语义匹配（`overlaps`），**无 LLM 调用**——零成本、零延迟、AI 服务不可用也不受影响。不足 3 条时从对应分类随机补齐。`Cache-Control: no-store`。

### `GET /api/ai/quote`

**v2.0** 精选金句（AI-4）。返回管理员确认的最新一条 `{ quote, created_at }`；无金句返回 `{ quote: null }`（前端隐藏区块）。

### `GET /api/ai/insights`

**v2.0** 全校情绪洞察（AI-5）。基于 approved 祝福聚合：`total_blessings`、`total_participants`、`emotions[]`（情绪分布）、`gifts[]`（礼物分布）、`summary`（最新 AI 总结文案，可为 null）。

### `GET /api/csrf`

获取 CSRF 令牌（Double Submit Cookie 模式）。

**响应:**

```json
{
  "csrf_token": "随机token字符串"
}
```

**说明:**
- 服务端生成随机 token → 设置为 `httpOnly=false` Cookie → 前端从响应体取 token
- 后续 POST/PATCH 请求需在 Header 中携带 `X-CSRF-Token`，服务端比对 Cookie 与 Header 一致
- 令牌缓存：`getCsrfToken()` 会缓存 token，避免重复请求

---

## 🔒 管理后台 API（需登录）

所有 `/api/admin/*` 路由通过以下机制保护：

1. **中间件验签**：`middleware.ts` 验证 `admin_token` Cookie（HMAC-SHA256 签名）
2. **路由内二次验签**：每个管理 API 路由调用 `requireAdmin()` 函数二次验证
3. **CSRF 防护**：POST/PATCH/DELETE 请求必须携带有效 CSRF token

未认证请求返回 401，CSRF 验证失败返回 403。

**注意**：Supabase Auth **不参与**管理后台授权，管理员认证完全基于 `admin_token` HMAC 签名机制。

### `GET /api/admin/blessings`

获取所有祝福记录列表（v2 自动上墙，支持状态筛选含 hidden 软删除）。

**Query Parameters:**

| 参数 | 类型 | 默认 | 说明 |
| :--- | :--- | :--- | :--- |
| `pageSize` | int | `50` | 每页数量 |
| `status` | string | — | `pending` / `approved` / `rejected` / `hidden`（软删除） |

**响应:** 同 `GET /api/blessings`，但不过滤 `status`（或按指定状态过滤）。

---

### `PATCH /api/admin/blessings`

批量审核/操作祝福。

**请求体:**

```json
{
  "ids": ["uuid-1", "uuid-2"],
  "updates": {
    "status": "approved",
    "is_featured": true
  }
}
```

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `ids` | UUID[] | 必填，祝福 ID 列表 |
| `updates.status` | string | 可选，仅允许 `pending`/`approved`/`rejected`/`hidden`（hidden→approved 即恢复上墙） |
| `updates.is_featured` | boolean | 可选，是否精选 |

> 🔒 **字段白名单**：服务端仅接受 `status`（含合法值校验）和 `is_featured` 字段，其他任意字段（如 `content`/`likes`/`user_id`）会被过滤，防止通过 service_role 修改任意列。

**响应:**

```json
[
  {
    "id": "uuid-1",
    "status": "approved",
    "is_featured": true
  },
  {
    "id": "uuid-2",
    "status": "approved",
    "is_featured": false
  }
]
```

---

### `DELETE /api/admin/blessings`

批量隐藏祝福（软删除：置 `status=hidden`，墙/星河经 RLS 自动不可见，后台可查看并恢复）。

**请求体:**

```json
{
  "ids": ["uuid-1", "uuid-2"]
}
```

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `ids` | UUID[] | 必填，1~100 个祝福 ID |

**校验规则:**

| 规则 | 错误信息 |
| :--- | :--- |
| ids 为空或超过 100 个 | `请指定 1~100 个祝福ID` |
| 任意 ID 非合法 UUID | `非法祝福ID` |

**响应:**

```json
{
  "deleted": 2
}
```

**状态码:**

| 码 | 说明 |
| :--- | :--- |
| 200 | 删除成功 |
| 400 | 参数校验失败 |
| 401 | 未授权 |
| 403 | CSRF 验证失败 |
| 500 | 服务器错误 |

---

### `GET/POST/PATCH/DELETE /api/admin/templates`

**v2.0** 词库管理（requireAdmin + CSRF）。GET 支持 `category`/`search`（ilike）/分页；POST 单条新增（长度 5~200 + 敏感词过滤 + 重复检测）；PATCH 白名单 `category`/`is_active`/`sort_order`；DELETE 批量删除——**被祝福引用的模板仅停用不物理删除**（响应 `{ deleted, deactivated }`）。

### `POST /api/admin/templates/import`

**v2.0** CSV 批量导入。请求体 `{ csv: string }`（≤2MB、≤1000 行）。表头兼容中英文（`content`/`内容`、`category`/`分类`）；逐行 trim + 长度校验 + 敏感词过滤 + 去重；分类缺失暂归感恩类（后续可用 AI 分类重分）。响应 `{ imported, skippedInvalid, skippedDuplicate }`。

### `GET/PATCH /api/admin/gifts`

**v2.0** 礼物管理。PATCH 白名单：`name`/`icon`/`description`/`is_active`/`sort_order`（`animation` 为受控列）。

### `POST /api/admin/ai/classify`

**v2.0** 批量 AI 分类：对 tags 为空的模板（每批 50 条）调用 LLM 生成分类/标签。无 `AI_API_KEY` 时降级为关键词规则分类。响应 `{ classified, mode: 'ai'|'rule' }`。

### `POST/PATCH /api/admin/ai/quotes`

**v2.0** 金句：POST 对近 50 条 approved 祝福打分返回 top5 候选（无 key 时按点赞数降级）；PATCH 确认候选 → 写入 `quote_of_day`（首页立即展示）。

### `POST /api/admin/ai/summary`

**v2.0** 收官总结：聚合全站数据 → LLM 生成 120 字总结 → 写入 `closing`（洞察接口返回）。无 key 时模板文案降级。

### `POST /api/admin/upload`

上传教师头像到 Supabase Storage。

**请求:** `multipart/form-data`

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `teacher_id` | UUID | 必填 |
| `file` | File | 必填，图片文件，最大 2MB |

**响应:**

```json
{
  "url": "https://ldykmebzzvszuxpuxqkt.supabase.co/storage/v1/object/public/avatars/teacher-uuid-123.jpg"
}
```

---

## 📊 数据库

### 表结构

```
teachers                   blessings                  rate_limits          blessing_likes
┌──────────────┐          ┌──────────────┐          ┌──────────────┐     ┌─────────────────┐
│ id (PK)      │──┐       │ id (PK)      │          │ id (PK)      │     │ blessing_id (PK)│
│ name         │  │      ┌│ teacher_id → │          │ ip           │     │ ip_address  (PK)│
│ department   │  │      ││ user_id      │          │ action       │     │ created_at      │
│ avatar_url   │  │      ││ nickname     │          │ created_at   │     └─────────────────┘
│ description  │  └──────┼│ class        │          └──────────────┘
│ created_at   │         ││ content      │
└──────────────┘         ││ likes        │
                         ││ is_featured  │
                         ││ is_anonymous │
                         ││ status       │
                         ││ created_at   │
                         └──────────────┘
```

### RLS 策略

| 表 | 操作 | 条件 |
| :--- | :--- | :--- |
| `blessings` | SELECT | `status = 'approved'`（公开） |
| `blessings` | INSERT | 所有人可插入（状态默认 `pending`） |
| `teachers` | SELECT | 所有人可读 |

### RPC 函数

| 函数 | 说明 | 权限 |
| :--- | :--- | :--- |
| `increment_likes(blessing_id UUID, client_ip TEXT)` | 原子递增点赞数（重复返回 -1） | `SECURITY DEFINER` |
| `check_rate_limit(client_ip, action_name, max_requests, window_minutes)` | IP 限流检查 | `SECURITY DEFINER` |

---

## 🔌 实时订阅（Realtime）

前端通过 Supabase WebSocket 订阅 `blessings` 表的变更：

```typescript
supabase
  .channel('blessings-wall')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blessings', filter: 'status=eq.approved' }, callback)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'blessings' }, callback)
  .subscribe();
```

**祝福墙**（`/wall`）通过该订阅 + 3 秒防抖实现新祝福即时上墙（v2.0 同句聚合刷新）。
