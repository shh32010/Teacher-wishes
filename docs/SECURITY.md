# 🔒 安全模型文档

> 本文档描述教师节祝福平台的当前安全架构，是安全相关修改的唯一参考。

---

## 威胁模型

### 主要威胁

| 威胁 | 风险等级 | 防护措施 |
| :--- | :---: | :--- |
| CSRF 攻击 | 高 | Double Submit Cookie |
| SQL 注入 | 高 | Supabase 参数化查询 + RLS |
| 管理后台未授权访问 | 高 | admin_token HMAC + requireAdmin |
| 点赞刷量 | 中 | IP 唯一约束 + 限流 |
| 祝福刷屏 | 中 | IP 限流 + Turnstile |
| 审核绕过 | 中 | RLS + BEFORE INSERT 触发器 |
| 敏感词注入 | 低 | 待接入（bad-words 已安装） |
| DDoS | 低 | Vercel Edge CDN + 限流 |

---

## 数据访问模型

### 权限矩阵 (RLS)

| 资源 | anon | authenticated | service_role |
| :--- | :---: | :---: | :---: |
| blessings SELECT (approved) | ✅ | ✅ | ✅ |
| blessings SELECT (全部) | ❌ | ❌ | ✅ |
| blessings INSERT | ✅ | ✅ | ✅ |
| blessings UPDATE | ❌ | ❌ | ✅ |
| blessings DELETE | ❌ | ❌ | ✅ |
| teachers SELECT | ✅ | ✅ | ✅ |
| teachers INSERT/UPDATE | ❌ | ❌ | ✅ |
| rate_limits INSERT | ❌ | ❌ | ✅ |
| blessing_likes INSERT | ❌ | ❌ | ✅ |
| increment_likes RPC | ❌ | ❌ | ✅ |
| check_rate_limit RPC | ✅ | ✅ | ✅ |
| cleanup_rate_limits RPC | ❌ | ❌ | ✅ |
| blessing_templates SELECT (is_active) | ✅ | ✅ | ✅ |
| blessing_templates INSERT/UPDATE/DELETE | ❌ | ❌ | ✅ |
| gifts SELECT (is_active) | ✅ | ✅ | ✅ |
| gifts INSERT/UPDATE/DELETE | ❌ | ❌ | ✅ |
| ai_generations 全部操作 | ❌ | ❌ | ✅ |

### 关键设计决策

1. **用户不能 UPDATE 祝福**：防止通过 UPDATE 修改 `status`/`likes`/`is_featured` 绕过审核
2. **increment_likes 仅 service_role**：API 路由作为唯一入口，防止直接调用 RPC
3. **rate_limits 仅 service_role INSERT**：防止锁定攻击（批量写入他人 IP 限流记录）
4. **cleanup_rate_limits 仅 service_role**：防止恶意清理限流记录
5. **v2.0 词库/礼物 RLS 只读启用项**：anon 仅能 SELECT `is_active=true` 的行——停用即从学生端消失，POST 提交时攻击者用停用 ID 也查不到模板 → 400
6. **v2.0 服务端取词**：客户端只传 `template_id`，祝福内容由服务端读官方词库，客户端伪造 content 无效（自由输入已完全移除）
7. **v2.0 严格触发器（013）**：blessings INSERT 强制 `template_id` 非空 + content 必须与**启用模板原文**完全一致（显式 is_active 条件 + RLS 双保险）——即使攻击者拿公开 anon key 直连 PostgREST，也无法注入任意内容（与前端同步上线后启用）
8. **v2.0 AI 数据隔离**：`ai_generations` 仅公开「已确认」的金句/总结（`type IN ('quote_of_day','closing') AND status='done'` 最小策略）；quote_score/classify 等内部数据仅 service_role 可见；查询层同时 `.eq('status','done')` 双保险
9. **v2.0 AI 降级红线**：AI 服务不可用/未配置 key 时全部规则降级，送礼核心链路（模板/礼物/提交）零 AI 依赖

---

## 管理员认证

### 认证流程

```
管理员输入密码
    ↓
POST /api/admin/login
    ↓
验证 ADMIN_PASSWORD
    ↓
生成 admin_token (HMAC-SHA256)
格式: randomPart.expiryTimestamp.signature
    ↓
设置 Cookie:
  - httpOnly: true
  - secure: true (生产环境)
  - sameSite: strict
  - maxAge: 24h
    ↓
后续请求 → middleware 验签
    ↓
/api/admin/* 路由内 requireAdmin() 二次验签
```

### 密钥管理

| 环境 | 签名密钥 | 说明 |
| :--- | :--- | :--- |
| 生产环境 | `ADMIN_TOKEN_SECRET` | 强制使用，fail-closed |
| 开发环境 | `ADMIN_TOKEN_SECRET` 或 `ADMIN_PASSWORD` | 可回退 |

### 关键实现

- **middleware.ts**：第一道防线，验证 admin_token Cookie
- **lib/auth/admin.ts**：`requireAdmin()` 函数，每个管理 API 路由内二次验签
- **timingSafeEqual**：防止时序攻击

---

## CSRF 防护

### 机制

采用 **Double Submit Cookie** 模式：

```
GET /api/csrf
    ↓
生成随机 token (crypto.randomBytes(32))
    ↓
设置 Cookie (httpOnly=false) + 响应体返回
    ↓
前端 POST/PATCH 请求：
  - Header: X-CSRF-Token
  - Cookie: csrf_token
    ↓
服务端比对：Cookie === Header
    ↓
不一致或缺失 → 403
```

### 关键点

- **所有环境统一强制**：开发/测试/生产都要求 CSRF
- **Cookie 缺失直接拒绝**：防止攻击者不携带 Cookie 绕过
- **httpOnly=false**：前端 JS 需要读取 Cookie 值

### 客户端使用

```typescript
import { getCsrfHeaders } from '@/lib/csrf-client';

// 获取 CSRF token（自动缓存）
const headers = await getCsrfHeaders();

// 发送请求
fetch('/api/blessings', {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

---

## 速率限制

### 限流规则

| 操作 | 限制 | 窗口 | 说明 |
| :--- | :--- | :--- | :--- |
| 提交祝福 | 100 次/IP | 10 分钟 | POST /api/blessings |
| 点赞 | 60 次/IP | 1 分钟 | POST /api/blessings/[id]/like |
| 管理登录 | 5 次/IP | 1 分钟 | POST /api/admin/login |

> **说明**：IP 限流主要用于异常流量抑制；Turnstile 是提交祝福的人机验证主防线。限流数值已针对校园 NAT 共享 IP 场景放宽。

### 实现方式

- **RPC 函数**：`check_rate_limit(client_ip, action_name, max_requests, window_minutes)`
- **原子操作**：INSERT + COUNT 在同一事务中，消除 TOCTOU 竞态
- **fail-closed**：RPC 异常时返回 503，拒绝请求
- **定时清理**：`cleanup_rate_limits()` 1% 概率自清理 + Vercel Cron 每日兜底

---

## 人机验证 (Turnstile)

### 配置状态

| 环境 | Turnstile 配置 | 行为 |
| :--- | :--- | :--- |
| 生产环境 | 已配置 | 必须验证，缺少 token 返回 400，验证失败返回 400 |
| 生产环境 | 未配置 | **fail-closed**，返回 503 |
| 开发环境 | 未配置 | 跳过验证（可选） |
| 开发环境 | 已配置 | 有 token 时执行真实验证 |

### 验证流程

```
前端获取 turnstile_token
    ↓
POST /api/blessings 携带 token
    ↓
服务端调用 Turnstile API 验证
    ↓
验证通过 → 继续处理
缺少 token（生产环境已配置） → 返回 400
验证失败 → 返回 400
```

### 返回码说明

| 场景 | 状态码 | 说明 |
| :--- | :--- | :--- |
| 生产环境未配置 TURNSTILE_SECRET_KEY | 503 | `服务未配置人机验证，请联系管理员` |
| 生产环境已配置但缺少 token | 400 | `人机验证失败，请刷新重试` |
| Token 验证失败 | 400 | `人机验证失败，请刷新重试` |
| 限流 RPC 异常 | 503 | `系统繁忙，请稍后重试`（非 Turnstile 问题） |

---

## Storage 安全

### 策略

- **公开读取**：所有人可读取头像
- **写入受限**：仅 service_role 可写入（通过 API 路由）
- **无匿名写入**：已删除匿名 INSERT/UPDATE/DELETE 策略

### 上传流程

```
管理员上传头像
    ↓
POST /api/admin/upload
    ↓
requireAdmin() 验证
    ↓
使用 service_role 写入 Supabase Storage
    ↓
返回公开 URL
```

---

## 客户端 IP 获取

### 优先级

```
getClientIp(request)
    ↓
1. x-vercel-forwarded-for (Vercel 可信代理)
2. x-forwarded-for (标准代理头)
3. x-real-ip (Nginx 等)
4. unknown (兜底)
```

### 使用场景

- 速率限制：`check_rate_limit(ip, action)`
- 点赞唯一性：`increment_likes(blessing_id, ip)`
- 日志记录

---

## 安全回归测试

### 测试文件

`database/security-check.mjs` 验证：

1. RLS 策略配置正确
2. RPC 函数权限最小化
3. 触发器存在且正确
4. 索引存在

### 运行方式

```bash
node database/security-check.mjs
```

---

## 环境变量安全分级

### 公开（NEXT_PUBLIC_）

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Turnstile 站点 key
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry DSN（前端用）

### 服务端（无 PUBLIC_）

- `SUPABASE_SERVICE_ROLE_KEY` — service_role key
- `ADMIN_PASSWORD` — 管理员登录密码
- `ADMIN_TOKEN_SECRET` — admin_token 签名密钥
- `TURNSTILE_SECRET_KEY` — Turnstile 密钥
- `CRON_SECRET` — Cron 任务鉴权密钥
- `SENTRY_DSN` — Sentry 服务端 DSN

---

## 敏感词过滤

### 词库规模

| 类型 | 数量 | 示例 |
| :--- | :---: | :--- |
| 中文敏感词 | 130+ | 傻逼、操你妈、冰毒、赌博 |
| 英文敏感词 | 400+ | fuck、shit、ass（bad-words 库） |

### 匹配策略

- **精确匹配**：使用正则表达式匹配完整词语
- **避免误伤**：如"逼真"不会被"逼"拦截，"大麻花"不会被"大麻"拦截
- **包含拦截**：如"傻逼老师"会被"傻逼"拦截

### 词库分类

| 分类 | 数量 | 说明 |
| :--- | :---: | :--- |
| 脏话/辱骂 | 40+ | 常见脏话和侮辱性词汇 |
| 涉黄词汇 | 20+ | 色情、淫秽相关 |
| 涉暴词汇 | 10+ | 暴力、自杀相关 |
| 歧视性词汇 | 10+ | 种族、性别歧视 |
| 政治敏感 | 10+ | 根据业务需求配置 |
| 毒品相关 | 10+ | 毒品名称和相关行为 |
| 赌博相关 | 5+ | 赌博相关 |

### 修改词库

编辑 `src/lib/profanity.ts` 中的 `CHINESE_PROFANITY` 数组。

---

## 安全红线

修改代码时必须遵守：

1. **CSRF**：所有 POST/PATCH/DELETE 请求必须验证 CSRF token
2. **认证**：管理 API 必须调用 `requireAdmin()` 二次验签
3. **权限**：禁止绕过 RLS，admin 操作使用 `createAdminClient()`
4. **输入**：所有用户输入必须 trim + 长度校验 + 敏感词过滤
5. **限流**：写入操作必须经过 `check_rate_limit` RPC
6. **密钥**：禁止硬编码密码、Key、Token，敏感信息走环境变量
7. **SQL**：使用参数化查询，禁止字符串拼接
8. **错误处理**：区分用户错误和服务端错误，不暴露内部细节
