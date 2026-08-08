# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

教师节祝福墙 (Teacher Wishes) — 基于 Next.js 14 App Router 的沉浸式节日活动平台。暖色秋天美学 + 毛玻璃设计，支持祝福星河动画、实时祝福墙、教师主页、大屏轮播、管理后台。

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
npm test                 # Vitest 单元测试 (watch 模式, 83 用例)
npm run test:run         # Vitest 单次运行
npm run test:e2e         # Playwright E2E (25 用例)
npm run test:e2e:ui      # Playwright E2E UI 模式
npm run test:smoke       # k6 冒烟测试
npm run test:load        # k6 负载测试
npm run test:stress      # k6 压力测试

# 分析
npm run analyze          # Bundle 分析 (ANALYZE=true 触发)
```

**CI 流水线** (.github/workflows/ci.yml)：`lint → typecheck → test → build`，push/PR 到 master 时触发。

## 技术栈

| 层 | 技术 |
| :--- | :--- |
| 框架 | Next.js 14 (App Router) + TypeScript strict |
| 样式 | Tailwind CSS 3.4 + 暖色毛玻璃主题 |
| 后端 | Supabase (PostgreSQL + RLS + Realtime + Storage + Auth) |
| 数据请求 | SWR / useSWRInfinite |
| 动画 | Framer Motion + tsParticles v4 + Canvas Confetti |
| 安全 | CSRF (Double Submit Cookie) + IP 限流 (RPC) + Turnstile + RLS |
| 监控 | Vercel Analytics + Sentry (DSN 可选激活) |
| 测试 | Vitest (jsdom) + Playwright + k6 |
| 工程化 | ESLint + Prettier + Husky + lint-staged |

## 核心架构

### Supabase 客户端分层（`src/lib/supabase/`）

项目定义了 **4 种 Supabase 客户端**，按场景选择：

| 客户端 | 文件 | 使用场景 | 权限 |
| :--- | :--- | :--- | :--- |
| 浏览器客户端 | `client.ts` → `createClient()` | 客户端组件 Auth 操作 (SSR cookie) | anon key |
| Realtime 客户端 | `client.ts` → `createRealtimeClient()` | WebSocket 订阅，不依赖 Cookie | anon key |
| 服务端客户端 | `server.ts` → `createClient()` | Route Handler / Server Component / Server Action | anon key，依赖 cookies() |
| Admin 客户端 | `server.ts` → `createAdminClient()` | 管理后台操作，绕过 RLS | service_role key |
| Anon 客户端 | `server.ts` → `createAnonClient()` | 公开 API（无需 cookie/session） | anon key，受 RLS 限制 |

**选择原则**：公开读写 API（GET blessings、POST blessing、点赞）用 `createAnonClient()`；需要 Auth session 的服务端操作用 `createClient()`；管理后台 PATCH/DELETE 用 `createAdminClient()`。

### 数据库核心表

- **teachers** — 教师信息（name, department, avatar_url, description）
- **blessings** — 祝福内容（content ≤ 500字），状态为 `pending → approved/rejected`，含 likes 计数、is_featured 标记
- **rate_limits** — IP + action 限流记录
- **blessing_likes** — 点赞唯一性约束（blessing_id + ip UNIQUE）

### RLS 安全策略

- blessings: 公开 SELECT 仅看 `status='approved'`；任何人可 INSERT（默认 pending）；仅 owner 可 UPDATE
- teachers: 公开 SELECT 所有人可读
- 点赞通过 `SECURITY DEFINER` RPC 函数 (`increment_likes`) 绕过 RLS，内部原子执行 INSERT + UPDATE

### 点赞流程

BlessingCard 点 ❤ → localStorage 乐观更新 (likes+1) → POST `/api/blessings/[id]/like` → RPC `increment_likes(blessing_id, client_ip)` → unique_violation 返回 -1（已点赞 409），否则返回新计数

### API 路由模式

所有 API Route Handler 遵循统一模式：
1. CSRF 验证（POST/PATCH 请求）
2. 输入校验（trim + 长度/必填）
3. 业务逻辑（Supabase 查询/RPC）
4. 错误处理（区分 Supabase error code、网络异常）
5. 缓存头（GET 接口：`s-maxage=5, stale-while-revalidate=30`）

### 中间件 (`src/middleware.ts`)

拦截 `/admin/:path*` 和 `/api/admin/:path*` 路由，通过 Supabase Auth session 验证管理员身份（匹配 `ADMIN_EMAIL` 环境变量）。登录页 `/admin/login` 和登录 API `/api/admin/login` 自身被排除。

### CSRF 防护 (`src/lib/csrf.ts`)

Double Submit Cookie 模式：GET `/api/csrf` 生成随机 token → 设为 `httpOnly=false` Cookie → 前端从响应体取 token → 后续 POST/PATCH 请求头携带 `X-CSRF-Token` → 服务端比对 Cookie 与 Header 一致。开发环境跳过验证（向后兼容）。

### 设计系统（v2.0 Design Token 体系）

**所有颜色通过 CSS 自定义属性（`globals.css` `:root`）定义，组件内禁止硬编码色值。** 改主题只需改一套变量。

完整的 Token 清单见 `src/app/globals.css :root` 块，核心层级：

| 层级 | Token | 用途 |
| :--- | :--- | :--- |
| 背景层 | `--bg-primary` / `--bg-secondary` / `--bg-tertiary` | 页面背景色阶 |
| 主色 | `--color-primary` (#D97706) | **仅 CTA / 强调**，不要满屏使用 |
| 情感点缀 | `--color-accent-gold` / `--color-accent-warm` / `--color-accent-earth` | 氛围装饰，非功能色 |
| 文字 | `--text-primary` / `--text-secondary` / `--text-muted` | 暖深棕文字色阶 |
| 玻璃态 | `--glass-bg` / `--glass-border` / `--glass-shadow` | 毛玻璃卡片 |

**暖色 ≠ 橙色**：`#D97706` 仅用于按钮/链接等 CTA 元素，情感点缀使用 `#E8A317`（金穗）、`#C9825B`（暖陶）、`#B98B73`（大地）。

**昼夜模式**：通过 `prefers-color-scheme: dark` 媒体查询自动切换。夜间是温暖深蓝紫 (`#1A1A2E`) + 暗金点缀，**不是纯黑**，保持"教师节"氛围。

**字体**：
- 正文：Geist (Sans + Mono)，`next/font/local` 本地加载
- 标题：霞鹜文楷 LXGW WenKai Bold (700)，`@fontsource/lxgw-wenkai` 本地 woff2，**零 CDN 依赖**
- 用 `font-wenkai` Tailwind 类名即可引用标题字体
- 霞鹜文楷**仅用于标题**，正文用系统无衬线

> 详细视觉重构方案见 `docs/VISUAL_REDESIGN.md`

### 测试策略

- **Vitest** 单元测试在 `src/tests/`，环境 jsdom，setup 引入 `@testing-library/jest-dom/vitest`
- **Playwright E2E** 在 `e2e/`，使用 mock 数据（`e2e/mocks.ts` 提供 `registerAllApiMocks`），仅 chromium 浏览器，自动启动 dev server。测试需调用 `disableAnimations(page)` 避免动画阻塞
- **k6 负载测试** 在 `load-tests/`，含 smoke/load/stress 三级

## 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=           # Supabase 项目 URL（必填）
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon key（必填）
SUPABASE_SERVICE_ROLE_KEY=          # service_role key，仅服务端（必填）
ADMIN_EMAIL=                        # 管理员邮箱，匹配 Supabase Auth 用户
ADMIN_PASSWORD=                     # 管理员登录密码
NEXT_PUBLIC_TURNSTILE_SITE_KEY=     # Cloudflare Turnstile 站点 key（可选）
TURNSTILE_SECRET_KEY=               # Turnstile 密钥（可选）
NEXT_PUBLIC_SENTRY_DSN=             # Sentry DSN（可选，生产推荐）
SENTRY_DSN=                         # Sentry 服务端 DSN（可选）
SENTRY_ORG= / SENTRY_PROJECT=       # Sentry 组织/项目名（可选）
```

## 数据库迁移执行顺序

在 Supabase SQL Editor 中依次执行：
1. `database/migrations/001_schema.sql` — 基础表 + RLS + Realtime
2. `database/migrations/002_likes_rpc.sql` — 点赞 RPC 函数
3. `database/migrations/003_rate_limit.sql` — 限流 RPC 函数
4. `database/migrations/004_likes_unique.sql` — 点赞唯一约束
5. `database/migrations/004_storage_avatars.sql` — 头像存储桶策略

## 页面路由

| 路由 | 渲染 | 说明 |
| :--- | :--- | :--- |
| `/` | 客户端 | 首页：暖色渐变 + tsParticles 星空 + 祝福星河 (斐波那契螺旋) |
| `/wall` | 客户端 | 祝福墙：SWR 无限滚动 + Supabase Realtime 实时推送 |
| `/display` | 客户端 | 大屏模式：全屏自动轮播 + QR 码，适用活动现场投影 |
| `/teacher/[id]` | SSR | 教师主页：服务端获取 teacher + blessings，支持排序 |
| `/admin/login` | 客户端 | 管理员登录 |
| `/admin` | 客户端 | 管理后台：审核/置顶/精选/拒绝 + 教师管理 + 数据统计 |

## 关键模式

- **懒加载**：tsParticles、Canvas Confetti、QRCode、BlessingForm 均使用 `next/dynamic(() => import(...), { ssr: false })` 按需加载
- **乐观更新**：点赞操作先更新 UI/localStorage，请求失败时回滚
- **Realtime 订阅**：祝福墙使用 `createRealtimeClient()` 订阅 `blessings` 表的 INSERT 事件，新祝福实时出现
- **无限滚动**：`useInfiniteScroll` hook 基于 `IntersectionObserver` + `useSWRInfinite`
- **Webpack chunk 分割**：framer-motion、tsparticles、supabase、confetti、qrcode 各自独立 vendor chunk
- **可复用 UI 组件**：`NavHeader`（玻璃态导航栏）、`GlassCard`（毛玻璃卡片）、`input-glass`/`input-glass-sm`（统一输入框样式）
- **性能约束**：FallingPetals Desktop 20/Mobile 10 个，所有装饰元素 `pointer-events: none`，优先使用 `transform` 动画

## 视觉重构 (v2.0)

完整方案见 `docs/VISUAL_REDESIGN.md`。核心变更：
- **Design Token 体系**：40+ CSS 自定义属性（`:root` + 夜间模式 `@media`），所有组件禁止硬编码颜色
- **暖色 ≠ 橙色**：`#D97706` 仅 CTA 使用，情感点缀用 `#E8A317`/`#C9825B`/`#B98B73`
- **字体本地化**：霞鹜文楷 Bold 通过 `@fontsource/lxgw-wenkai` + `next/font/local` 加载，零 CDN 依赖
- **温暖夜间模式**：深蓝紫 (`#1A1A2E`) + 暗金点缀，非纯黑，保持教师节氛围
- **星光色 Token 化**：BlessingGalaxy 使用 `color-mix(in srgb, var(--color-primary) X%, transparent)` 替代硬编码 rgba
