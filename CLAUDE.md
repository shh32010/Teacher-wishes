# CLAUDE.md

本文件为 Claude Code 提供修改本项目代码的指导原则。

---

## 项目概述

教师节祝福墙 (Teacher Wishes) — 基于 Next.js 14 App Router 的沉浸式节日活动平台。暖色秋天美学 + 毛玻璃设计，支持祝福星河动画、实时祝福墙、教师主页、大屏轮播、管理后台。

**当前版本**：v1.3.2 | **状态**：上线验收

---

## 技术栈

| 层 | 技术 |
| :--- | :--- |
| 框架 | Next.js 14 (App Router) + TypeScript strict |
| 样式 | Tailwind CSS 3.4 + 暖色毛玻璃主题 |
| 后端 | Supabase (PostgreSQL + RLS + Realtime + Storage) |
| 数据请求 | SWR / useSWRInfinite |
| 动画 | Framer Motion + tsParticles v4 + Canvas Confetti |
| 安全 | CSRF (Double Submit Cookie) + IP 限流 (RPC) + Turnstile + RLS |
| 监控 | Vercel Analytics + Sentry (DSN 可选激活) |
| 测试 | Vitest (jsdom) + Playwright + k6 |
| 工程化 | ESLint + Prettier + Husky + lint-staged |

---

## 常用命令

```bash
npm run dev              # 启动开发服务器 (localhost:3000)
npm run build            # 生产构建
npm run start            # 启动生产服务器
npm run lint             # ESLint 检查
npm run format           # Prettier 格式化全部文件
npm run format:check     # Prettier 格式检查
npm run typecheck        # TypeScript 类型检查 (tsc --noEmit)

# 测试
npm test                 # Vitest 单元测试 (watch 模式)
npm run test:run         # Vitest 单次运行
npm run test:e2e         # Playwright E2E
npm run test:e2e:ui      # Playwright E2E UI 模式
npm run test:smoke       # k6 冒烟测试
npm run test:load        # k6 负载测试
npm run test:stress      # k6 压力测试

# 分析
npm run analyze          # Bundle 分析 (ANALYZE=true 触发)
```

**CI 流水线** (.github/workflows/ci.yml)：`lint → typecheck → test → build`，push/PR 到 master 时触发。

---

## 当前架构真相

### 管理员认证流程

```
管理员输入密码
    ↓
POST /api/admin/login
    ↓
验证 ADMIN_PASSWORD
    ↓
生成 admin_token (HMAC-SHA256)
    ↓
设置 Cookie (httpOnly, secure, sameSite)
    ↓
后续请求 → middleware 验签
    ↓
/api/admin/* 路由内 requireAdmin() 二次验签
```

**关键点**：
- Supabase Auth **不参与**管理后台授权
- 生产环境强制使用 `ADMIN_TOKEN_SECRET` 签名
- 开发环境可回退到 `ADMIN_PASSWORD` 签名
- 每个管理 API 路由内部都有 `requireAdmin()` 二次验证

### CSRF 防护模型

```
所有环境（开发/测试/生产）统一强制 CSRF：

GET /api/csrf
    ↓
生成随机 token
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

**关键点**：
- **所有环境都强制 CSRF**，不存在开发环境跳过
- Cookie 缺失直接返回 `false` → 403
- Double Submit Cookie 模式

### 客户端 IP 获取

```
getClientIp(request)
    ↓
优先级：
1. x-vercel-forwarded-for (Vercel 可信代理)
2. x-forwarded-for (标准代理头)
3. x-real-ip (Nginx 等)
4. unknown (兜底)
```

### 数据库权限矩阵 (RLS)

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

**关键点**：
- 用户**不能** UPDATE 自己的祝福（防止绕过审核）
- `increment_likes` 仅 service_role 可调用（API 路由作为唯一入口）
- `rate_limits` 仅允许 service_role INSERT（防锁定攻击）

---

## Supabase 客户端选择规则

项目定义了 5 种 Supabase 客户端，按场景选择：

| 客户端 | 文件 | 使用场景 | 权限 |
| :--- | :--- | :--- | :--- |
| 浏览器客户端 | `client.ts` → `createClient()` | 客户端组件 Auth 操作 | anon key |
| Realtime 客户端 | `client.ts` → `createRealtimeClient()` | WebSocket 订阅 | anon key |
| 服务端客户端 | `server.ts` → `createClient()` | Route Handler / Server Component | anon key，依赖 cookies() |
| Admin 客户端 | `server.ts` → `createAdminClient()` | 管理后台操作，绕过 RLS | service_role key |
| Anon 客户端 | `server.ts` → `createAnonClient()` | 公开 API（无需 cookie/session） | anon key，受 RLS 限制 |

**选择原则**：
- 公开读写 API（GET blessings、POST blessing、点赞）→ `createAnonClient()`
- 管理后台 PATCH/DELETE → `createAdminClient()`
- 需要 Auth session 的服务端操作 → `createClient()`

---

## 目录结构

```
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── page.tsx               # 首页（故事式时间线）
│   │   ├── layout.tsx             # 根布局 + SEO metadata
│   │   ├── wall/page.tsx          # 祝福墙（无限滚动 + Realtime）
│   │   ├── display/page.tsx       # 大屏模式（全屏轮播）
│   │   ├── teacher/[id]/page.tsx  # 教师主页（SSR）
│   │   ├── admin/
│   │   │   ├── page.tsx           # 管理后台（审核 + 统计 + 教师管理）
│   │   │   └── login/page.tsx     # 管理员登录
│   │   └── api/                   # API Route Handlers
│   │       ├── blessings/         # 祝福 CRUD + 点赞 + 统计
│   │       ├── teachers/          # 教师列表 + 详情
│   │       └── admin/             # 管理审核 + 头像上传
│   ├── components/
│   │   ├── home/                  # 首页组件
│   │   ├── blessing/              # 祝福相关组件
│   │   ├── admin/                 # 管理后台组件
│   │   └── ui/                    # 通用 UI 组件
│   ├── lib/
│   │   ├── supabase/              # Supabase 客户端封装
│   │   ├── auth/
│   │   │   └── admin.ts           # 管理员认证工具（requireAdmin）
│   │   ├── csrf.ts                # CSRF 令牌生成
│   │   ├── csrf-client.ts         # 客户端 CSRF 工具
│   │   ├── client-ip.ts           # 客户端 IP 获取
│   │   └── utils.ts               # 工具函数
│   ├── hooks/
│   │   ├── useInfiniteScroll.ts   # 无限滚动 Hook
│   │   └── useTheme.ts            # 主题切换 Hook
│   ├── types/
│   │   ├── index.ts               # 全局类型定义
│   │   └── turnstile.d.ts         # Turnstile 类型声明
│   ├── tests/                     # 测试文件
│   └── middleware.ts              # Admin 路由鉴权中间件
├── database/
│   └── migrations/                # SQL 迁移脚本（按编号顺序执行）
├── e2e/                           # Playwright E2E 测试
├── load-tests/                    # k6 负载测试
├── docs/                          # 文档
│   └── archive/                   # 历史文档归档
└── public/                        # 静态资源
```

---

## API 路由清单

所有 API Route Handler 遵循统一模式：
1. CSRF 验证（POST/PATCH 请求）
2. 输入校验（trim + 长度/必填）
3. 业务逻辑（Supabase 查询/RPC）
4. 错误处理（区分 Supabase error code、网络异常）
5. 缓存头（GET 接口：`s-maxage=5, stale-while-revalidate=30`）

| 路由 | 方法 | 客户端 | 认证 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `/api/blessings` | GET | Anon | 无 | 祝福列表（分页+排序） |
| `/api/blessings` | POST | Anon | CSRF + 限流 | 提交祝福 |
| `/api/blessings/[id]/like` | POST | Anon | CSRF + 限流 | 点赞 RPC |
| `/api/blessings/stats` | GET | Anon | 无 | 聚合统计 |
| `/api/teachers` | GET | Anon | 无 | 教师列表 |
| `/api/teachers/[id]` | GET | Anon | 无 | 教师详情 + 祝福 |
| `/api/admin/blessings` | GET | Admin | requireAdmin | 管理后台列表 |
| `/api/admin/blessings` | PATCH | Admin | requireAdmin + CSRF | 审核/置顶/精选 |
| `/api/admin/blessings` | DELETE | Admin | requireAdmin + CSRF | 批量删除 |
| `/api/admin/login` | POST | Anon | CSRF + 限流 | 管理员登录 |
| `/api/admin/upload` | POST | Admin | requireAdmin + CSRF | 头像上传 |
| `/api/csrf` | GET | 无 | 无 | CSRF 令牌生成 |

---

## 数据库迁移执行顺序

按文件名自然排序执行 `database/migrations/*.sql`（**必须全部执行**）：

1. `001_schema.sql` — 基础表 + RLS + Realtime
2. `002_likes_rpc.sql` — 点赞 RPC 函数
3. `003_rate_limit.sql` — 限流 RPC 函数
4. `004_likes_unique.sql` — 点赞唯一约束
5. `005_storage_avatars.sql` — 头像存储桶策略
6. `006_security_hardening.sql` — RLS 启用 + 限流原子化 + 点赞权限收紧 + 审核触发器
7. `007_storage_policies.sql` — Storage 写策略收紧
8. `008_review_fixes.sql` — 删除 UPDATE 策略（审核绕过）+ rate_limits INSERT 策略（锁定攻击）
9. `009_rate_limit_cleanup.sql` — cleanup RPC 权限最小化

---

## 安全红线

修改代码时必须遵守：

1. **CSRF**：所有 POST/PATCH/DELETE 请求必须验证 CSRF token
2. **认证**：管理 API 必须调用 `requireAdmin()` 二次验签
3. **权限**：禁止绕过 RLS，admin 操作使用 `createAdminClient()`
4. **输入**：所有用户输入必须 trim + 长度校验
5. **限流**：写入操作必须经过 `check_rate_limit` RPC
6. **密钥**：禁止硬编码密码、Key、Token，敏感信息走环境变量
7. **SQL**：使用参数化查询，禁止字符串拼接
8. **错误处理**：区分用户错误和服务端错误，不暴露内部细节

---

## 环境变量

```env
# 必填
NEXT_PUBLIC_SUPABASE_URL=           # Supabase 项目 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=          # service_role key，仅服务端
ADMIN_PASSWORD=                     # 管理员登录密码
ADMIN_TOKEN_SECRET=                 # admin_token 签名密钥（生产强制）

# 可选
NEXT_PUBLIC_TURNSTILE_SITE_KEY=     # Cloudflare Turnstile 站点 key（生产必填）
TURNSTILE_SECRET_KEY=               # Turnstile 密钥（生产必填，未配置返回 503）
CRON_SECRET=                        # Cron 任务鉴权密钥
NEXT_PUBLIC_SENTRY_DSN=             # Sentry DSN
SENTRY_DSN=                         # Sentry 服务端 DSN
SENTRY_ORG= / SENTRY_PROJECT=       # Sentry 组织/项目名
```

---

## 测试策略

- **Vitest** 单元测试在 `src/tests/`，环境 jsdom，setup 文件 `src/tests/setup.ts`
- **Playwright E2E** 在 `e2e/`，使用 mock 数据，自动启动 dev server
- **k6 负载测试** 在 `load-tests/`，含 smoke/load/stress 三级
- **安全回归测试** `database/security-check.mjs` 验证权限配置

---

## 关键模式

- **懒加载**：tsParticles、Canvas Confetti、QRCode、BlessingForm 均使用 `next/dynamic`
- **乐观更新**：点赞操作先更新 UI/localStorage，请求失败时回滚
- **Realtime 订阅**：祝福墙使用 `createRealtimeClient()` 订阅 INSERT 事件
- **无限滚动**：`useInfiniteScroll` hook 基于 `IntersectionObserver` + `useSWRInfinite`
- **主题切换**：`useTheme()` hook 支持三态循环（light/dark/auto）
- **Pre-commit 钩子**：Husky + lint-staged，commit 时自动运行 ESLint + Prettier

---

## 修改代码的工作原则

1. **先理解再改**：阅读相关文档和代码，理解当前架构
2. **小步修改**：每次只做一件事，频繁测试
3. **保持一致**：遵循现有的代码风格和命名规范
4. **安全优先**：任何修改都不能降低安全防护等级
5. **测试覆盖**：新功能必须有测试，修改必须通过现有测试
6. **文档同步**：修改架构/API/安全相关代码时，同步更新对应文档

---

## 文档索引

| 文档 | 说明 |
| :--- | :--- |
| `README.md` | 项目介绍、快速开始、部署指南 |
| `CLAUDE.md` | 本文件 — AI 修改代码的指导原则 |
| `PROGRESS.md` | 当前项目状态和任务进度 |
| `CHANGELOG.md` | 版本发布历史 |
| `docs/ARCHITECTURE.md` | 当前系统架构（唯一真相） |
| `docs/API.md` | API 端点文档（唯一真相） |
| `docs/SECURITY.md` | 安全模型文档（唯一真相） |
| `docs/OPERATIONS.md` | 运维部署指南 |
| `docs/CAPACITY.md` | 容量评估和压测结果 |
