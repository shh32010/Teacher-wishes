# 📋 Changelog

All notable changes to Teacher Wishes Platform will be documented in this file.

---

## [2.0.0] — 2026-09-05（待发布）

### ✨ 产品重构（甲方需求）

- 📚 **祝福语库** — 祝福语由甲方收集入库，学生**选择**代替自由输入；后台词库管理支持单条 CRUD + **CSV 批量导入**（≤1000 行/次，逐行敏感词过滤 + 去重）
- 🎁 **数字礼物系统** — 8 种礼物（鲜花/星星/书本/粉笔/咖啡/信件/苹果/小树）+ 沉浸式送礼动画（3.8s，礼物化作光点飞入星河）+ 后台礼物管理（开关/排序）
- 🌌 **取消指定老师** — 祝福不绑定老师，全校汇聚成「教师节祝福星河」；`teachers` 表保留做教师介绍页，历史 353 条祝福平滑迁移
- 🎯 **/gift 送礼主流程** — 6 步状态机（情绪 → 祝福 → 礼物 → 确认 → 动画 → 成功），Turnstile + 冷却 + 限流双保险

### 🤖 AI 能力（8 个创意点）

- AI 智能祝福推荐（**DB tags 语义匹配，零 LLM 调用**，零成本零延迟）
- 词库批量分类（AI 打标签 + 关键词规则降级）
- 今日金句（AI 打分 top5 候选 → 管理员确认 → 首页展示）
- 全校情绪洞察（情绪/礼物分布聚合）
- 活动收官总结（AI 生成 + 模板降级）
- 仪式文案矩阵（6 情绪 × 8 礼物 = 48 组静态快照）
- 架构：DeepSeek adapter（openai 兼容，可切智谱/SiliconFlow）+ **无 key 全规则降级** + 活动期间零实时 LLM

### 🔒 安全

- **服务端取词防伪造** — 客户端只传 `template_id`，祝福内容由服务端读官方词库（停用模板因 RLS 查不到 → 400）
- 013 严格触发器 — INSERT 强制 `template_id`（与前端同步上线后启用）
- 新表 RLS — 词库/礼物 anon 仅读启用项；`ai_generations` 无 anon 策略（AI 数据隔离）
- CSV 导入防护（大小/行数/敏感词/去重）+ admin 字段白名单

### 🗑️ 移除

- 大屏模式 `/display`（含 QRCode 组件、qrcode 依赖、稳定性测试脚本）
- 旧祝福表单 BlessingForm（逻辑并入 GiftFlow，Turnstile 提取为 `useTurnstile` hook）

### 🧪 测试

- 单元测试 107/107（新增 CSV 解析 / AI 规则降级 / 仪式文案矩阵 24 个）
- E2E 25/25（新增 `gift.spec.ts` 全流程 3 用例；motion 按钮 force click 策略）
- 安全回归 `security-check.mjs` 扩展 6 项 v2 断言（共 21 项）
- k6 脚本适配 v2 契约（template_id + gift_id + CSRF）

---

## [1.3.4] — 2026-08-20

### ✨ 功能增强

- 🔴 **敏感词过滤** — 中英文敏感词精确匹配（130+ 中文 + 400+ 英文）
  - 精确匹配策略，避免误伤正常词汇（如"逼真"、"大麻花"）
  - 分类词库：脏话/涉黄/涉暴/歧视/政治/毒品/赌博
  - 检查祝福内容 + 昵称

### 🔧 优化

- 班级占位符示例改为"网络2401"
- 昵称占位符示例改为"浩浩"
- 敏感词库持续扩充

### 📚 文档

- CLAUDE.md 更新 API 处理模式（新增敏感词过滤步骤）
- SECURITY.md 新增敏感词过滤章节

---

## [1.3.3] — 2026-08-20

### 🎉 正式发布

- ✅ **安全收口完成** — Turnstile production fail-closed + CSRF 全环境强制 + Admin 二次鉴权
- ✅ **文档架构重构** — 6 份核心文档 + 3 份归档，单一真相源
- ✅ **验收通过** — 移动端真机 + 大屏稳定性 + Lighthouse + Vercel 部署

### 🔒 安全

- Turnstile production fail-closed — 未配置返回 503
- 环境变量分组 — Turnstile 生产必填

### 📚 文档

- 环境变量分组 + 开发环境 Turnstile 描述修正
- 大屏稳定性测试脚本

### 🧪 测试

- 大屏长时间稳定性测试脚本（`load-tests/display-stability.js`）
- Lighthouse 审计通过

---

## [1.3.2] — 2026-08-20

### 🔒 安全收口

- 🔴 **Migration 重编号**：004→005~008，新增 009 权限收口
- 🔴 **cleanup_rate_limits 权限最小化**：仅 service_role 可调用
- 🔴 **blessing_likes 禁止匿名 INSERT**：防止直接写入绕过 API
- 🔴 **increment_likes 仅 service_role**：API 路由作为唯一入口
- 🔴 **client IP 统一**：`getClientIp()` 函数，优先 `x-vercel-forwarded-for`
- 🔴 **Turnstile 生产 fail-closed**：未配置时返回 503
- 🔴 **Admin requireAdmin 二次鉴权**：每个管理 API 路由内验签
- 🔴 **CSRF 全环境强制**：开发/测试/生产统一要求，Cookie 缺失返回 403

### 🧪 测试

- ✅ **Playwright CI**：GitHub Actions 自动运行 E2E 测试
- ✅ **安全回归测试**：`database/security-check.mjs` 验证权限配置

### 📚 文档重构

- ✅ **CLAUDE.md 重写**：反映当前架构（admin_token + requireAdmin + CSRF 全环境）
- ✅ **docs/SECURITY.md 新增**：安全模型唯一真相
- ✅ **docs/OPERATIONS.md 新增**：运维部署指南
- ✅ **docs/ARCHITECTURE.md 更新**：删除旧 Auth 架构，更新权限矩阵
- ✅ **docs/API.md 更新**：管理认证、Turnstile、IP 获取说明修正
- ✅ **历史文档归档**：TECHNICAL_DESIGN、ARCHITECTURE_REVIEW、VISUAL_REDESIGN 移至 `docs/archive/`
- ✅ **版本统一**：README、PROGRESS、CHANGELOG 统一到 v1.3.2

### 🔧 其他

- ✅ **load-tests/README.md 修正**：CSRF 说明更新为全环境强制
- ✅ **安全模型文档化**：RLS 权限矩阵、认证流程、CSRF 机制完整记录

---

## [1.3.1] — 2026-08-11

### 🐛 祝福墙性能修复（请求风暴根治）

- 🔴 **无限滚动死循环**：`loadMore` 依赖 `size` 导致 observer 反复重建 → 6468 次请求撑爆浏览器。修复：stateRef 模式 + observer 只创建一次 + 500ms 冷却 + 函数式 `setSize`
- 🔴 **Realtime 请求风暴**：移除 UPDATE 监听（每次点赞触发全量重取），INSERT 加 3 秒防抖
- 🔴 **Next.js fetch 缓存**：所有读 API 加 `export const dynamic = 'force-dynamic'`，数据库更新后不再返回旧数据
- 🟠 **分页闪屏**：`isLoading` 在后续分页时也为 true 导致整页替换为「加载中」，改为 `isLoading && !pages` 才全屏等待
- 🟠 **无限滚动不触发**：初始加载时哨兵未渲染导致 observer 未 attach，effect 依赖补上 `hasMore/isLoading`
- ⚙️ 滑动到底自动加载，每次 60 条，上限 360（覆盖全部祝福）

### ✨ 管理后台增强

- 过滤按钮显示实时统计数量（待审核/已通过/已拒绝/全部）
- 分页支持页码直接跳转（最多 10 页按钮）
- 表格新增「祝福对象」列（教师名/全体）
- 精选行 ⭐ 标记 + 金色背景，精选支持切换（再点取消）
- 修复「全部」筛选白屏（`statusParam === ''` 误判）
- 教师管理添加统计看板（总数/头像/覆盖率）
- stats API 改用 service_role 绕过 RLS，pending/rejected 计数正确

### 📱 移动端优化

- Header 信息层级重排：Logo 单行 + 排序移到卡片上方 + 移除写祝福按钮（底部浮动按钮覆盖）
- 祝福卡片密度压缩（p-4、13px 字号、三层结构）
- 浮动按钮 safe-area 适配 + 页面底部留白防遮挡
- 防横向溢出：break-words + overflow-x-hidden
- 首页动画加速 4x（CTA 桌面 2s / 移动 1.3s）

### 🎨 功能完善

- ⭐ 精选祝福全站展示：祝福墙金色边框+徽章、星河星星更大更亮
- 夜间模式 Tailwind ink 色板改用 CSS 变量驱动（`rgb(var(--ink-rgb) / <alpha-value>)`）
- 登录页改为纯密码认证（不依赖 Supabase Auth，解决生产登录失败）
- SEO：favicon + robots.txt + OG 图片 + Twitter 卡片

### 🧪 测试

- 修复 BlessingCard 测试 mock（motion.span + next/image URL 断言），83/83 全过

### 🗄️ 数据

- 教师扩充至 18 位（全科覆盖），祝福数据 353 条
- 清理测试数据（6/66/7/test 等）

---

## [1.3.0] — 2026-08-10

### 🔒 数据库层安全加固（P1 × 5）

- 🔴 **P1-1**：`increment_likes` IP 可被调用者伪造 → 撤销 `anon`/`PUBLIC` 执行权限，仅 `service_role`（admin client）可调用 RPC，API 路由作为唯一入口
- 🔴 **P1-2**：`rate_limits` 表无 RLS → 启用 RLS，仅允许 INSERT，禁止 anon SELECT/DELETE（防隐私泄露 + 垃圾数据攻击）
- 🔴 **P1-3**：`check_rate_limit` SELECT+INSERT 非原子 → 改为同一 PL/pgSQL 事务中原子 INSERT+COUNT，消除 TOCTOU 竞态窗口
- 🟠 **P1-4**：`cleanup_rate_limits()` 无定时调度 → 函数内 1% 概率自清理 + Vercel Cron 每日 4:00 UTC 兜底
- 🟠 **P1-5**：blessings INSERT RLS `WITH CHECK (true)` 可绕过审核 → `BEFORE INSERT` 触发器强制 `status='pending'`、`likes=0`、`is_featured=false`

### 🔒 应用层安全硬化（P2 × 3）

- 🟡 **P2-1**：`ADMIN_PASSWORD` 双重用途（密码+签名密钥）→ 拆分为 `ADMIN_TOKEN_SECRET`（签名）+ `ADMIN_PASSWORD`（登录），生产环境强制独立密钥
- 🟡 **P2-2**：Storage 策略无身份验证 → 删除 `storage.objects` 的 INSERT/UPDATE/DELETE 匿名策略，仅保留公开 SELECT，写入走 API 路由（service_role）
- 🟡 **P2-3**：`admin_token` 无过期标记 → 载荷编码 24h 过期时间戳（`randomPart.expiry.signature`），中间件验证过期

### ✅ 上线验证

- ✅ Vercel 环境变量 7/7 验证通过（含新增 `ADMIN_TOKEN_SECRET` + `CRON_SECRET`）
- ✅ 生产冒烟测试 6/6 通过（原子限流/触发器/RLS/策略/权限/Storage）
- ✅ k6 负载测试：20 VU / 620 req / 0 失败 / p95=1.37s
- ✅ Supabase 索引验证：全部就绪（含 `idx_blessing_likes_unique` + `idx_rate_limits_ip_action`）

### 🔧 上线前硬化

- 🔧 Cron fail-closed：生产环境 `CRON_SECRET` 缺失 → 500 拒绝（不再静默跳过鉴权）
- 🔧 强制 `ADMIN_TOKEN_SECRET`：生产环境不回退到 `ADMIN_PASSWORD` 签名
- 🔧 删除旧 token 格式兼容：仅接受 `randomPart.expiry.signature`，旧格式 `randomPart.signature` 已移除

### 🎨 SEO / 分享优化

- 📱 Open Graph 图片 + Twitter `summary_large_image` 卡片
- 🍎 SVG favicon + `robots.txt`
- 🔗 `metadataBase` 规范 URL

### 📄 文档

- 📄 迁移文件：`005_security_hardening.sql`（5 项 SQL 加固）+ `006_storage_policies.sql`
- 📄 `.env.local` 模板：新增 `SUPABASE_DB_PASSWORD` / `ADMIN_TOKEN_SECRET` / `CRON_SECRET`

---

## [1.2.1] — 2026-08-10

### 🔒 安全修复（安全审查 9 条链路）

- 🔴 **P0**：点赞 API 零限流 → 新增 `check_rate_limit`，每 IP 每分钟 20 次，fail-closed（`api/blessings/[id]/like/route.ts`）
- 🔴 **P0**：`admin_token` 从未被验证 → HMAC-SHA256 签名 token + 中间件 Web Crypto 验签，作为 Supabase Auth 后备方案（`middleware.ts` + `api/admin/login/route.ts`）
- 🟠 **P1**：提交祝福 TOCTOU 竞态 → `rate_limits` 写入移到 `blessings` 插入之前，写入失败阻断请求（`api/blessings/route.ts`）
- 🟠 **P1**：Admin PATCH 字段无白名单 → 显式过滤仅允许 `status`（含合法值校验）+ `is_featured`（`api/admin/blessings/route.ts`）
- 🟠 **P1**：管理员登录无限流 → 每 IP 每分钟 5 次登录尝试 + 错误密码也写入限流记录（`api/admin/login/route.ts`）
- 🟠 **P1**：点赞 IP 可伪造 → 依赖 Vercel 可信代理层（非代码修复，部署环境保障）

### 🎨 提交祝福特效修复

- 🐛 **Confetti 清理**：`useEffect` 返回 cleanup 函数，取消所有 `setTimeout` + `requestAnimationFrame`，防止组件卸载后继续执行
- ♿ **prefers-reduced-motion**：减弱动画偏好时跳过全部 Confetti
- 🎨 **教师节化视觉**：阶段 2 从「左右彩带喷射」改为「金色花瓣缓慢飘落」（低重力 0.3、微风漂移 1.5、圆形粒子），色板移除粉橙只留暖金大地色
- 🐛 **Duration 对齐**：默认 duration 对齐组件卸载时机（3500ms）

### 💬 审核 UX 优化

- 🎯 成功提示文案：「✨ 祝福已送达！已进入审核队列，审核通过后会出现在祝福墙」
- 🎯 新增「知道了」手动关闭按钮（8s 自动消失作为兜底，原 2.5s 直接消失）

### 📄 文档完善

- 📄 **CLAUDE.md** 大幅完善：新增 Tailwind 色板/工具类速查、API 路由清单（9 端点）、双认证系统说明、架构陷阱、Pre-commit 钩子、文档索引

---

## [1.2.0] — 2026-08-08

### 🎨 视觉重构 v2.0 — Design Token 体系（18 文件 + 3 新文件）

全面升级为 CSS 自定义属性驱动的设计系统，告别组件内硬编码颜色。

- 🎨 **Design Token 体系**：40+ CSS 自定义属性（`src/app/globals.css` `:root`），覆盖背景/主色/点缀/文字/玻璃态/阴影/圆角
- 🌙 **温暖夜间模式**：`prefers-color-scheme: dark` 自动切换，深蓝紫 (`#1A1A2E`) + 暗金点缀，非纯黑
- 🔤 **字体本地化**：霞鹜文楷 Bold 通过 `@fontsource/lxgw-wenkai` + `next/font/local` 加载，零 CDN 依赖
- 🪟 **可复用 Glass UI 组件**：新增 `NavHeader`（玻璃态导航栏，覆盖 3 页面）、`input-glass`/`input-glass-sm`（统一输入框样式）、`btn-ghost`（幽灵按钮）
- 🌸 **性能优化**：FallingPetals 从 30→20(Desktop)/10(Mobile) 花瓣、移除 `filter: blur()`、`pointer-events: none`
- ⭐ **星光 Token 化**：BlessingGalaxy 改用 `color-mix(in srgb, var(--color-*) X%, transparent)` 替代硬编码 rgba
- 🎯 **色板精细化**：新增 `sentiment`（gold/warm/earth/rose）情感点缀色 + `danger` 功能色
- 📄 **文档**：新增 `CLAUDE.md`（AI 协作指南）、`docs/VISUAL_REDESIGN.md`（完整视觉重构方案）

### 🔧 工程

- GlassCard hover 效果改用 CSS 变量
- 管理后台审批按钮迁移到 success/danger Token
- 表单错误/超限提示统一为 `text-danger`

### 🔧 Bug 修复 + 主题切换 (2026-08-08)

- 🌓 **主题切换系统**：新增 `ThemeToggle` 组件（三态循环 ☀️/🌙/🖥）+ `useTheme` hook（localStorage 持久化），已集成至 NavHeader
- 🎲 **确定性动画**：BlessingGalaxy 中 `Math.random()` 替换为 `stableRandom(id)` 哈希函数，消除 hydration/重渲染不一致
- 🔤 **字体加载优化**：霞鹄文楷 woff2 设置 `preload: false`（7MB 不阻塞首屏，靠 `font-display: swap` 渐进增强）
- 🌙 **昼夜双触发**：CSS 同时支持 `[data-theme]` 属性 + `@media (prefers-color-scheme)`，覆盖手动/自动两种使用场景

---

## [1.1.0] — 2026-08-07

### 🎨 视觉重构 — 暖色教师节主题（23 文件）

全新 Apple + 秋天 + 校园 设计语言，告别暗黑模式。

- 🎨 **色板重建**：主色 `#2563EB`(蓝) → `#D97706`(琥珀金)，新增 `warm` 背景色阶 + `ink` 文字色阶
- 🌅 **暖色渐变背景**：`#FFF8F0 → #FDF6EC → #F8F3FF` 替代纯黑 `#0B1020`
- 🪟 **白色玻璃态**：卡片 `rgba(255,255,255,0.75)` + 毛玻璃，替代暗底半透
- 🌸 **首页重设计**：语录 "一支粉笔，两袖清风" / "三尺讲台，四季耕耘"，标题加 🌸
- 🍂 **花瓣飘落**：纯 CSS 银杏/枫叶/樱花飘落动画（FallingPetals 组件）
- ⭐ **黄昏星河**：教师天体蓝光→金光，祝福星星三层辉光增强可见度
- 🔤 **霞鹜文楷**：标题字体引入 `LXGW WenKai`，正文保持无衬线
- 🎉 **点赞爆发**：LikeBurst 组件 — 点赞时 6 个彩色小心心飞出

### 🔒 点赞唯一性约束

- 🗄️ 新建 `blessing_likes` 表 + `UNIQUE(blessing_id, ip_address)` 索引
- 🔄 RPC `increment_likes(blessing_id, client_ip)` 原子插入+递增
- 🛡️ 同 IP 重复点赞 → 返回 409，前端乐观回滚
- 🧹 localStorage 清除/换浏览器 均无法绕过

### 🐛 修复

- 祝福墙 Realtime mutate 导致重复 key → `flatMap` + `Set` 去重
- GlassCard 测试断言更新（暗色 hover → 暖色 hover）
- Vercel Analytics 导入路径修复（`/react` → `/next`），已确认在线收集数据

---

## [1.0.0] — 2026-08-07

### 🎉 首次正式发布

教师节祝福活动平台，从零到一完整构建。

### ✨ 功能

- 🎆 沉浸式首页：tsParticles 星空 + 语录渐显 + 渐变标题动画 + 斐波那契祝福星河
- 🌌 祝福星河：教师天体（蓝色光晕）+ 祝福星星（金色闪烁），点击弹窗预览，layoutId 重排
- 📝 发布祝福：玻璃态弹窗表单 + 教师搜索下拉 + Turnstile 人机验证
- 💬 祝福墙：瀑布流卡片 + 时间/点赞排序 + Supabase Realtime 实时更新 + 无限滚动
- 👩‍🏫 教师主页：SSR + 精选祝福标记 + 时间/点赞排序 + 一键分享
- 📺 大屏模式：全屏自动轮播 + QR 码 + 键盘导航 + 鼠标隐藏
- 🔐 管理后台：Supabase Auth 鉴权 + 审核/置顶/精选 + 头像上传 + 数据统计
- 🛡️ 安全防护：CSRF + IP 限流 + RLS + Turnstile + Middleware 鉴权
- ♿ 无障碍：WCAG AA + focus-visible + 焦点陷阱 + aria 属性
- 📊 监控：Vercel Analytics + Sentry（DSN 可选激活）

### 🏗 工程化

- ESLint + Prettier + Husky + lint-staged
- Vitest 81+ 单元测试 + Playwright 25 E2E + k6 负载测试
- GitHub Actions CI（lint → typecheck → test → build）
- Bundle Analyzer + next/image WebP/AVIF + splitChunks
- 五件套文档：README / ARCHITECTURE / API / CAPACITY / PROGRESS

### 🐛 修复

- PGRST103：分页超出范围 → 返回空列表而非 500
- SWR fetcher 无限重试崩溃 → 防御性错误处理 + errorRetryCount=3
- Multiple GoTrueClient 实例 → 单例模式
- BlessingGalaxy SWC 解析错误 → 显式 if/return 替代隐式三元
- Middleware 拦截 login API 死循环
- 硬编码默认密码 → 环境变量必设
- CSRF Cookie 明文 token → 加密随机值
- 速率限制 RPC 失败静默放行 → fail-closed

### ⚠️ 已知限制

- 敏感词过滤（`bad-words` 已安装，服务端逻辑待接入）
- Supabase Free 方案：200 Realtime 并发连接限制
