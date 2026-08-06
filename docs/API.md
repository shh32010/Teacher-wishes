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

- `POST /api/blessings` — 每 IP 每 10 分钟最多 3 条
- 超限返回 `429 Too Many Requests`

---

## 🔓 公开 API

### `GET /api/blessings`

获取已审核的祝福列表（分页 + 教师筛选）。

**Query Parameters:**

| 参数 | 类型 | 默认 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | int | `1` | 页码，最小 1 |
| `pageSize` | int | `20` | 每页数量，最大 50 |
| `teacher_id` | UUID | — | 按教师筛选 |

**响应:**

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": null,
      "teacher_id": "uuid",
      "nickname": "小明",
      "class": "高一(3)班",
      "content": "王老师辛苦了！",
      "likes": 5,
      "is_featured": false,
      "is_anonymous": false,
      "status": "approved",
      "created_at": "2026-08-06T10:00:00Z",
      "teacher": {
        "id": "uuid",
        "name": "王老师",
        "department": "语文组",
        "avatar_url": null,
        "description": null,
        "created_at": "2026-01-01T00:00:00Z"
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

提交一条新祝福（默认状态 `pending`，需审核后展示）。

**请求体:**

```json
{
  "teacher_id": "uuid (可选)",
  "nickname": "小明 (可选, 最长20字)",
  "class": "高一(3)班 (可选, 最长30字)",
  "content": "祝福内容 (必填, 最长500字)",
  "is_anonymous": false,
  "turnstile_token": "cf-turnstile-token (可选, 配置后必填)"
}
```

**响应 (201):**

```json
{
  "success": true,
  "message": "祝福提交成功，等待审核后展示"
}
```

**校验规则:**

| 规则 | 错误信息 |
| :--- | :--- |
| content 为空/纯空格 | `祝福内容不能为空` |
| content > 500 字 | `祝福内容不能超过500字` |
| Turnstile 验证失败 | `人机验证失败，请刷新重试` |
| 速率超限 | `发送太频繁，请10分钟后再试` |

---

### `POST /api/blessings/[id]/like`

为指定祝福点赞（原子递增，通过 PostgreSQL RPC 实现）。

**路径参数:** `id` — 祝福 UUID

**响应:**

```json
{
  "id": "uuid",
  "likes_count": 6
}
```

> ⚠️ 前端使用 `localStorage` 记录已点赞 ID，防止重复点赞。后端 RPC 函数 `increment_likes` 使用 `SECURITY DEFINER` 绕过 RLS。

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
      "avatar_url": "https://...",
      "description": "从教20年",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### `GET /api/teachers/[id]`

获取教师详情及其收到的祝福列表。

**路径参数:** `id` — 教师 UUID

**Query Parameters:**

| 参数 | 类型 | 默认 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | int | `1` | 页码 |
| `pageSize` | int | `20` | 每页数量，最大 50 |

**响应:**

```json
{
  "teacher": {
    "id": "uuid",
    "name": "王老师",
    "department": "语文组",
    "avatar_url": "https://...",
    "description": "从教20年的资深语文教师",
    "created_at": "2026-01-01T00:00:00Z"
  },
  "stats": {
    "total_blessings": 12,
    "total_likes": 35
  },
  "blessings": {
    "data": [...],
    "count": 12,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 🔒 管理后台 API（需登录）

所有 `/api/admin/*` 路由通过 Supabase Auth + middleware 保护，未登录重定向至 `/admin/login`。

### `GET /api/admin/blessings`

获取所有祝福列表（含待审核），支持状态筛选。

**Query Parameters:**

| 参数 | 类型 | 默认 | 说明 |
| :--- | :--- | :--- | :--- |
| `pageSize` | int | `50` | 每页数量 |
| `status` | string | — | `pending` / `approved` / `rejected` |

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
| `updates.status` | string | 可选，`pending`/`approved`/`rejected` |
| `updates.is_featured` | boolean | 可选，是否精选 |

**响应:**

```json
{
  "success": true,
  "count": 2
}
```

---

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
teachers                   blessings                  rate_limits
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│ id (PK)      │──┐       │ id (PK)      │          │ id (PK)      │
│ name         │  │      ┌│ teacher_id → │          │ ip           │
│ department   │  │      ││ user_id      │          │ action       │
│ avatar_url   │  │      ││ nickname     │          │ created_at   │
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
| `increment_likes(blessing_id UUID)` | 原子递增点赞数 | `SECURITY DEFINER` |
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

**大屏模式** (`/display`) 额外监听 INSERT 事件，新祝福自动加入轮播队列。
