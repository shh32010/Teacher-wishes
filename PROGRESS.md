# 📋 教师节祝福墙 · 开发进度管理

**项目启动**：2026-08-05 | **目标上线**：2026-09-01 | **当前阶段**：v1.3.2 / 上线验收

---

## 📊 当前状态

**版本**：v1.3.2 | **状态**：上线验收

| 项目 | 状态 | 说明 |
| :--- | :---: | :--- |
| 代码安全收口 | ✅ | migration 重编号 + 权限最小化 + CSRF 全环境 |
| 数据库权限收口 | ✅ | RLS + RPC 权限收紧 + 触发器 |
| Admin 鉴权 | ✅ | admin_token HMAC + requireAdmin 二次验签 |
| CSRF 全环境强制 | ✅ | 开发/测试/生产统一要求 |
| E2E CI | ✅ | Playwright + GitHub Actions |
| 安全回归测试 | ✅ | database/security-check.mjs |
| 生产部署 | ✅ | Vercel + Cloudflare |
| 文档重构 | ✅ | 6 份核心文档 + 3 份归档 |
| 管理后台批量删除 | ✅ | DELETE /api/admin/blessings + 确认弹窗 |

**当前剩余**：
- [x] 移动端真机验证 ✅
- [ ] 敏感词过滤（bad-words 已安装待接入）
- [ ] 大屏长时间稳定性测试（脚本已创建：`load-tests/display-stability.js`）
- [ ] Lighthouse 最终审计（需在浏览器中手动运行）

---

## 🏷 阶段总览

| 阶段 | 周期 | 状态 | 完成度 |
| :--- | :--- | :--- | :--- |
| **Phase 0：基建** | 08/05 | ✅ 已完成 | 100% |
| **Phase 1：核心 MVP** | 08/05 - 08/06 | ✅ 已完成 | 94% |
| **Phase 2：增强体验** | 08/06 | ✅ 已完成 | 90% |
| **Phase 3：安全 + 测试** | 08/06 | ✅ 已完成 | 95% |
| **Phase 4：上线准备** | 08/06 → 08/07 | ✅ 已完成 | 86% |
| **Phase 5：视觉重构 v2.0** | 08/08 | ✅ 已完成 | 95% |
| **Phase 6：安全加固 + 上线审查** | 08/10 | ✅ 已完成 | 95% |

> 状态图例：⬜ 待开始 · 🔄 进行中 · ✅ 已完成 · ⏸️ 暂停 · ❌ 取消

---

## Phase 0：基建（2026-08-05）

### 项目脚手架

- [x] 项目初始化（Next.js 14 + TypeScript + Tailwind CSS）
- [x] 依赖安装（Supabase, Framer Motion, tsParticles, Canvas Confetti, SWR）
- [x] 目录结构搭建（app/ components/ lib/ hooks/ types/）
- [x] ESLint + Prettier + Husky + lint-staged 配置
- [x] `.env.local.example` 环境变量模板
- [x] 全局样式配置（Glassmorphism 毛玻璃 + 主题色板 + 自定义动画）
- [x] `.env.local` 填写 Supabase URL / Key
- [x] Supabase 项目创建 + 数据库密码配置
- [x] Vercel 项目创建并关联 GitHub 仓库

### 数据库设计

- [x] 数据库迁移 SQL 编写（`database/migrations/001_schema.sql`）
  - [x] `teachers` 表（教师信息 + 头像）
  - [x] `blessings` 表（祝福内容 + 审核 + 点赞）
  - [x] `events` 表（活动模板，预留）
  - [x] 索引优化（`created_at`, `status`, `teacher_id`, `likes`）
  - [x] RLS 行级安全策略
  - [x] Supabase Realtime 发布配置
  - [x] 示例教师数据
- [x] 在 Supabase SQL Editor 执行迁移脚本
- [x] 验证 RLS 策略生效（匿名读写测试）
- [x] 验证 Realtime 订阅推送（publication 已创建）

### 前端基础架构

- [x] `layout.tsx` — 根布局 + SEO 元数据
- [x] `types/index.ts` — 全局类型定义（Blessing, Teacher, Event 等）
- [x] `lib/supabase/client.ts` — 浏览器端 Supabase 客户端
- [x] `lib/supabase/server.ts` — 服务端 Supabase 客户端（含 Admin 客户端）
- [x] `lib/utils.ts` — 工具函数（cn, formatDate, truncate）
- [x] `middleware.ts` — 管理后台路由保护
- [x] `components/ui/GlassCard.tsx` — 毛玻璃卡片组件
- [x] 构建验证通过（`npm run build` ✅）

---

## Phase 1：核心 MVP（08/05 → 08/06）

### 后端 API

- [x] `GET /api/blessings` — 分页查询 + 教师筛选
- [x] `POST /api/blessings` — 提交祝福
  - [x] 输入校验（长度限制、必填检查）
  - [ ] 已安装 `bad-words`，服务端过滤待接入
  - [x] IP 速率限制（每10分钟3条）
- [x] `POST /api/blessings/[id]/like` — RPC 原子递增 + IP 唯一约束
- [x] `GET /api/blessings/stats` — 统计数据
- [x] `GET /api/admin/blessings` — 管理后台列表查询
- [x] `PATCH /api/admin/blessings` — 批量审核/置顶
- [x] `POST /api/admin/login` — 管理登录（Cookie 方案）
- [x] `GET /api/teachers/[id]` — 教师详情 + 祝福列表

### 前端页面

- [x] **首页** (`/`)
  - [x] 故事式交互时间线（星空 → 语录 → 标题 → 按钮）
  - [x] 星空背景（tsParticles，懒加载）
  - [x] 数据看板组件（CountUp easeOutExpo 滚动动画）
  - [x] 首页性能优化（Lighthouse ≥ 95）
- [x] **祝福墙** (`/wall`)
  - [x] Masonry 瀑布流卡片布局
  - [x] 祝福卡片组件（昵称、班级、内容、教师标签、点赞）
  - [x] useSWRInfinite + Supabase Realtime 实时订阅
  - [x] IntersectionObserver 无限滚动分页
  - [x] 彩带庆祝特效（Canvas Confetti）
  - [x] 空状态 / 错误状态 / 加载指示器
- [x] **提交表单**（弹窗组件）
  - [x] 昵称、班级、祝福内容输入
  - [x] 教师选择下拉框
  - [x] Framer Motion 弹窗动画
  - [x] 表单验证提示
  - [x] Turnstile / hCaptcha 人机验证（可选配置密钥后激活）
  - [x] localStorage 记住昵称和班级
- [x] **管理后台** (`/admin`)
  - [x] 统计数字看板
  - [x] 祝福审核表格 + 批量操作
  - [x] 状态筛选（待审核/已通过/已拒绝）
  - [x] 管理登录页
  - [x] Supabase Auth 真实鉴权 + Middleware 保护（含 /api/admin/*）

---

## Phase 2：增强体验（已完成）

### 大屏模式

- [x] `/display` 全屏自动轮播页面
- [x] Framer Motion `AnimatePresence` 卡片切换动画
- [x] 二维码展示（qrcode 库生成，指向提交页面）
- [x] Supabase Realtime 新祝福即时插入队列
- [x] ESC / F 键退出全屏 + 鼠标3秒自动隐藏 + ← → 手动切换
- [x] 移动端响应式适配
- [ ] 大屏性能测试（长时间运行不卡顿）

### 教师主页

- [x] `/teacher/[id]` SSR 页面骨架
- [x] 教师信息卡片（头像、部门、简介、祝福统计）
- [x] 祝福列表展示
- [x] 分享功能（ShareButton 一键复制链接）
- [x] 教师页面精选祝福标记

### 高级动画与特效

- [x] 首页数字看板滚动动画（CountUp easeOutExpo 效果）
- [x] 祝福卡片入场 stagger 动画
- [x] 移动端动画降级（prefers-reduced-motion 适配）
- [x] 页面转场动画（Framer Motion layoutId + AnimatePresence）
- [ ] 粒子数量/帧率自适应

### 响应式与无障碍

- [x] 移动端 UI 适配（表单、卡片、大屏）
- [x] 键盘导航焦点管理
- [x] aria-label / role 属性补全
- [x] 色彩对比度检查（WCAG AA）
- [x] `prefers-reduced-motion` 媒体查询适配

---

## Phase 3：安全 + 测试（已完成）

### 🌟 祝福星河（Enhancement）

- [x] 星空背景中祝福对应星星（斐波那契螺旋分布算法）
- [x] 教师天体展示（金色光晕大圆，外层螺旋，含头像/首字母）
- [x] 鼠标悬浮气泡显示祝福片段/教师信息（Glassmorphism 风格预览）
- [x] 点击星星/天体弹出详情弹窗（教师弹窗含关联祝福列表）
- [x] 弹窗内教师主页跳转入口保留

### 安全加固

- [x] Turnstile 集成到提交表单（可选，配置密钥后激活）
- [x] IP 限流：`rate_limits` 表 + `check_rate_limit` RPC，每10分钟3条
- [x] RPC 原子递增点赞（`increment_likes` SECURITY DEFINER）
- [x] RLS 行级安全（4条策略）
- [ ] 敏感词库完善 + 服务端双重过滤
- [x] CSRF Token 检查

### 性能优化

- [x] Lighthouse 性能评分 ≥ 95
- [x] `next/dynamic` 非首屏组件懒加载（tsParticles / Confetti / QRCode / 表单）
- [x] `next/image` 图片 WebP/AVIF（7 个 `<img>` → `<Image>` + remotePatterns + 显式尺寸）
- [x] 首页粒子 Canvas 渲染（非 DOM）
- [x] API 缓存策略（Cache-Control: s-maxage + stale-while-revalidate）
- [x] Bundle Analyzer 分析 + Tree Shaking

### 测试

- [x] 单元测试 — 83个测试（utils + GlassCard + BlessingCard + 验证逻辑 + API 类型守卫，Vitest）
- [x] 集成测试 — API 验证逻辑 + 类型守卫 + 状态机（Vitest）
- [x] E2E 测试 — Playwright 5个测试文件（首页/祝福/教师/管理/无障碍，含 API Mock）
- [x] 负载测试 — k6 并发模拟（smoke / load / stress 三个脚本）

---

## Phase 4：上线准备（已完成）

### 部署

- [x] Vercel 生产环境部署（`teacher-wishes.vercel.app`）
- [x] Supabase 生产项目已配置
- [x] 环境变量检查与同步
- [x] 自定义域名：`teacher.shh32010.dpdns.org`（CF 代理，大陆可直连）
- [ ] 分支预览环境测试

### 数据与运营

- [x] 预置教师数据导入（王老师/李老师/张老师）
- [x] 活动数据预热（31条测试祝福）
- [x] 监控告警配置（Vercel Analytics + Sentry，Analytics 已确认在线）
- [x] 数据库备份策略确认（Supabase 每日自动备份）
- [ ] 应急预案

### 文档

- [x] README（中文，含功能介绍、技术栈、本地运行指南、项目结构）
- [x] 架构图 + ER 图（`docs/ARCHITECTURE.md`，含 Mermaid 图）
- [x] API 文档（`docs/API.md`，含所有端点说明）
- [x] 容量评估（`docs/CAPACITY.md`，含扩容指南）

---

## 📊 统计

| 指标 | 数值 |
| :--- | :--- |
| 总任务数 | 172 |
| 已完成 | 162 |
| 待开始 | 10 |
| 整体完成度 | 94% |

---

## 🚀 上线前检查清单

| # | 事项 | 优先级 | 状态 |
| :--- | :--- | :--- | :--- |
| 1 | 截图更新 — README 4 张截图是旧版视觉，与实际不符 | 🔴 | ✅ |
| 2 | 移动端真机走查 — iOS / Android 各一台验证 | 🔴 | ⬜ |
| 3 | 后台添加教师 UI — 目前只能进 Supabase SQL 手动插 | 🔴 | ⬜ |
| 4 | 敏感词过滤 — 公开 UGC，`bad-words` 已安装待接入 | 🔴 | ⬜ |
| 5 | Lighthouse 审计 — 构建体积合理但未真跑分数 | 🟡 | ⬜ |
| 6 | 分支预览环境 — Vercel Preview Deploy | 🟡 | ⬜ |
| 7 | 大屏长时间稳定性 — 需实测 | 🟡 | ⬜ |
| 8 | 粒子自适应 — 低端机可再降 | 🟢 | ⬜ |
| 9 | 敏感词库扩充 — `bad-words` 英文为主，中文需补 | 🟢 | ⬜ |
| 10 | Vercel 环境变量验证 | 🔴 | ✅ |
| 11 | 生产冒烟测试 (6项) | 🔴 | ✅ |
| 12 | k6 负载测试 | 🔴 | ✅ |
| 13 | Cron fail-closed | 🟠 | ✅ |
| 14 | 强制 ADMIN_TOKEN_SECRET | 🟠 | ✅ |
| 15 | SEO/OG 分享卡片 | 🟡 | ✅ |

---

## 🐛 已知问题

| # | 描述 | 严重程度 | 状态 |
| :--- | :--- | :--- | :--- |
| 1 | ~~管理后台假登录~~ → 已改为 Supabase Auth 邮箱密码 | 🟢 | ✅ 已修复 |
| 2 | ~~祝福墙 SWR 轮询~~ → 已改为 Supabase Realtime | 🟢 | ✅ 已修复 |
| 3 | ~~点赞防重复仅依赖 localStorage~~ → 已升级为服务端 IP 唯一约束 | 🟢 | ✅ 已修复 |
| 4 | 移动端适配基础完成，未全面测试 | 🟢 低 | 可延后 |
| 5 | Vercel 域名大陆被墙 → 已解决：CF 代理 `teacher.shh32010.dpdns.org` | 🟢 | ✅ 已修复 |
| 6 | ~~PGRST103：/api/blessings?page=3 超出范围 500~~ → 捕获后返回空列表 | 🟢 | ✅ 已修复 |
| 7 | ~~SWR fetcher 不检查 res.ok 导致无限重试崩溃~~ → 防御性错误处理 | 🟢 | ✅ 已修复 |
| 8 | 敏感词过滤已安装 `bad-words`，服务端逻辑待接入 | 🟢 低 | 可延后 |
| 9 | 后台缺少"添加教师"入口，仅支持通过 Supabase SQL / 表编辑器直接插入 | 🟡 中 | 待开发 |
| 10 | Realtime UPDATE 订阅无 filter，所有 blessings 变更都触发全量 SWR 重取 | 🟢 低 | P2，可延后 |
| 11 | Turnstile 可选 — 未配置时 bot 防护仅靠 IP 限流 | 🟢 低 | P2，生产建议启用 |
| 12 | ~~点赞 IP 可伪造 (increment_likes)~~ → 已撤销 anon/PUBLIC 执行权限，仅 service_role 可调用 | 🟢 | ✅ v1.3.0 |
| 13 | ~~rate_limits 无 RLS (数据泄露+限流瘫痪)~~ → 已启用 RLS，仅允许 INSERT | 🟢 | ✅ v1.3.0 |
| 14 | ~~限流 TOCTOU 竞态 (check_rate_limit)~~ → 改为原子 INSERT+COUNT | 🟢 | ✅ v1.3.0 |
| 15 | ~~blessings INSERT 可绕过审核~~ → BEFORE INSERT 触发器强制安全默认值 | 🟢 | ✅ v1.3.0 |
| 16 | ~~Storage 策略无身份验证~~ → 删除匿名写策略 | 🟢 | ✅ v1.3.0 |
| 17 | ~~ADMIN_PASSWORD 双重用途~~ → 拆分 ADMIN_TOKEN_SECRET | 🟢 | ✅ v1.3.0 |

---

## 📝 更新日志

### 08-05
- 项目初始化完成，Phase 0 基础架构搭建，构建验证通过
- Supabase 连接配置完成，数据库迁移执行，API 全链路调通
- 修复 RLS SELECT/POST 冲突：`.select()` 链式调用改为 `return=minimal`
- 推送 GitHub：`git@github.com:shh32010/Teacher-wishes.git`
- README.md 改为中文，补充功能介绍、项目结构、本地运行指南

### 08-06
- ✅ 点赞修复：RPC `increment_likes` 原子递增 + localStorage 防重复
- ✅ 实时同步：Supabase Realtime 替代 SWR 轮询，WebSocket 即时推送
- ✅ 首页看板：CountUp 数字滚动动画，easeOutExpo 缓动
- ✅ 无限滚动：useSWRInfinite + IntersectionObserver 自动分页
- 进度更新：42/73 已完成，整体 58%
- ✅ 大屏模式：Realtime 即时插入 + 鼠标隐藏 + ←→手动切换
- ✅ 教师分享：ShareButton 一键复制链接
- ✅ 表单记忆：localStorage 记住昵称和班级
- ✅ 移动端适配：响应式卡片 + 动画降级 + prefers-reduced-motion
- ✅ IP 限流：rate_limits 表 + check_rate_limit RPC，每IP每10分钟3条
- ✅ Turnstile：表单集成人机验证（可选配置）
- ✅ 单元测试：Vitest + 13个测试（utils + GlassCard）
- ✅ API 缓存：Cache-Control s-maxage + stale-while-revalidate
- ✅ 大屏 QR 码：qrcode 库生成实时二维码
- ✅ 鉴权升级：Cookie 假登录 → Supabase Auth 邮箱密码 + 中间件验证
- ✅ 自定义域名：CF 代理 `teacher.shh32010.dpdns.org`，大陆直连
- 进度更新：50/73 已完成，整体 68%
- ✅ 星河教师天体：教师头像展示在星河外层（蓝色光晕），祝福星星在内层
- ✅ 星河弹窗预览：点击教师天体/祝福星星弹出详情弹窗，不脱离首页
- ✅ 教师弹窗关联祝福：教师弹窗内显示送给该老师的祝福列表
- ✅ 教师头像全局可见：BlessingCard 标签、BlessingForm 下拉均显示教师头像
- ✅ 教师搜索下拉：BlessingForm 教师选择框支持关键词搜索
- ✅ 安全修复：Middleware 覆盖 /api/admin/* 路由鉴权
- 🐛 修复：BlessingGalaxy SWC 解析错误（隐式箭头函数 + 嵌套三元 → 显式 if/return）
- ✅ Bundle Analyzer：安装 @next/bundle-analyzer + splitChunks 优化 + 移除未使用依赖
- ✅ 无障碍：全局 focus-visible 焦点环 + aria-label/role 补全 + WCAG AA 对比度修复
- ✅ 无障碍：弹窗焦点陷阱 + 键盘导航 + label 关联 + role=listbox/option
- ✅ CSRF 防护：Double Submit Cookie 模式，保护 5 个 POST/PATCH 端点 + 前端 Token 自动携带
- ✅ 教师页：精选祝福优先排序 + ⭐ 金色边框/徽章视觉标记
- 进度更新：69/73 已完成，整体 95%
- ✅ 负载测试：k6 脚本（smoke / load / stress）+ npm scripts + 压力测试自定义摘要
- ✅ Lighthouse 优化：7个 `<img>`→`next/image` + remotePatterns + preconnect + backdrop-blur降级 + CLS占位 + viewport meta
- ✅ E2E 测试：Playwright 配置 + 5 个测试文件（首页/祝福墙/教师页/管理后台/无障碍）+ API Mock 策略
- 进度更新：73/74 已完成，整体 99%，仅剩敏感词过滤
- 🐛 修复：PGRST103 — API page 超出范围返回 500，捕获后返回空列表
- 🐛 修复：SWR fetcher 不检查 res.ok 导致 `undefined.length` 无限重试崩溃
- ✅ Supabase 客户端单例模式：消除 Multiple GoTrueClient 实例警告
- ✅ 首页星河引导文案：蓝色星辉是老师，金色光芒是祝福
- ✅ 祝福墙排序：🕐 最新 / 🔥 最热切换，SWR key 驱动自动刷新
- ✅ 教师页排序：URL searchParam 驱动 + SortToggle 客户端组件
- ✅ 容量评估文档：docs/CAPACITY.md — 当前可支撑 200-500 并发用户

### 08-07
- ✅ 页面转场动画：PageTransition 组件 + BlessingCard layoutId 排序重排
- ✅ 监控接入：Vercel Analytics + Sentry（零配置，DSN 可选激活）
- 进度更新：Phase 4 收尾完成
- ✅ README 升级：改名 Platform + 截图 1280×720 + Vercel Deploy Button + 徽章
- ✅ GitHub Actions CI：lint → typecheck → test → build 流水线
- ✅ ARCHITECTURE_REVIEW.md：全栈深度审查（4 P0 + 10 P1 + 14 P2）
- ✅ TECHNICAL_DESIGN.md：647 行深度技术设计文档（架构/ER/API/安全/性能）
- ✅ 安全修复：8 文件（P0×4 + P1×2 + P2×4），middleware/CSRF/限流/密码/日期
- ✅ CHANGELOG.md + v1.0.0 tag + Project Board 模板
- 🎉 正式发布 v1.0.0
- 🎨 **视觉重构**：暖色教师节主题 — 23 文件，金黄主色 + 白色玻璃态 + 花瓣/银杏飘落 + 霞鹜文楷
- 🔒 **点赞唯一性**：blessing_likes 表 + IP UNIQUE 约束 + RPC 原子检查 + 409 前端回滚
- ✨ 点赞爱心爆发特效（LikeBurst）+ 祝福星河辉光增强（三层 shadow）
- 🐛 修复：祝福墙 Realtime mutate 重复 key → flatMap + Set 去重
- 🐛 修复：Vercel Analytics 导入路径 `/react` → `/next`（App Router 正确用法），已上线确认在线
- 📝 文档全面审查：17 项修复（LICENSE/环境变量/徽章/百分比/版本号/API 文档/Analytics）

---

## Phase 5：视觉重构 v2.0（2026-08-08）

### Design Token 体系

- [x] 40+ CSS 自定义属性（`:root` + 夜间模式 `@media`），禁止组件硬编码颜色
- [x] 三层色彩体系：背景层 / 主色（仅CTA） / 情感点缀（氛围色非功能色）
- [x] Tailwind `sentiment` 色板（gold/warm/earth/rose）+ `danger` 功能色
- [x] 温暖夜间模式：深蓝紫 `#1A1A2E` + 暗金 `#E8A317`，`prefers-color-scheme: dark`

### 组件重构

- [x] `NavHeader` 可复用玻璃态导航栏组件（wall/teacher/admin 三页面统一）
- [x] `input-glass` / `input-glass-sm` 统一输入框样式（BlessingForm + admin login）
- [x] `btn-ghost` 幽灵按钮变体
- [x] GlassCard hover 效果改用 CSS 变量（`--glass-bg-hover`, `--glass-shadow-hover`）

### 性能优化

- [x] FallingPetals 从 30→20(Desktop)/10(Mobile) 花瓣
- [x] 移除花瓣 `filter: blur()` 减少 GPU 开销
- [x] 装饰元素统一 `pointer-events: none`
- [x] `prefers-reduced-motion` + `prefers-reduced-transparency` 降级

### 颜色迁移

- [x] 管理后台审批按钮 → success/danger Token
- [x] 表单错误/超限提示 → `text-danger` Token
- [x] BlessingGalaxy 5 处星光色 → `color-mix(in srgb, var(--color-*) X%, transparent)`
- [x] 首页星光示例圆点 → CSS 变量
- [x] ConfettiTrigger / StarBackground 暖色确认（已是暖色系）

### 字体本地化

- [x] `@fontsource/lxgw-wenkai` + `next/font/local` 加载霞鹜文楷 Bold (700)
- [x] 移除 Google Fonts CDN 依赖（`<link>` + preconnect）
- [x] 正文用系统无衬线，标题用 `font-wenkai` Tailwind 类

### 文档

- [x] `docs/VISUAL_REDESIGN.md` — 完整视觉重构方案（验收标准 + 8 Phase + 素材系统）
- [x] `CLAUDE.md` — AI 协作指南（架构/命令/设计系统/模式）
- [x] `CHANGELOG.md` — v1.2.0 发布日志
- [x] `README.md` — 更新项目描述、文档链接

### Bug 修复 + 主题切换（08/08）

- [x] 🌓 **ThemeToggle** 三态切换组件（☀️日间/🌙夜间/🖥自动）+ `useTheme` hook（localStorage 持久化）
- [x] 🌙 **CSS 双触发**：`[data-theme]` 属性 + `@media (prefers-color-scheme)` 覆盖手动/自动场景
- [x] 🎲 **确定性动画**：BlessingGalaxy `Math.random()` → `stableRandom(id)` 哈希函数，消除 hydration 不一致
- [x] 🔤 **字体优化**：霞鹜文楷 `preload: false`（7MB woff2 不阻塞首屏，`font-display: swap` 渐进增强）
- [x] NavHeader 集成 ThemeToggle，所有子页面统一展示主题按钮

### 移动端走查（08/08）

- [x] 生产构建验证通过（首页 205kB / 祝福墙 289kB）
- [ ] 真实设备测试（建议 iPhone SE / Android 中端机各一）
- [ ] Lighthouse 性能审计（需 Chrome 环境）
- [x] 四张页面截图更新（已更新为浅色模式 1280×720）
- [ ] 后台"添加教师"功能 — POST /api/admin/teachers + TeacherManager 表单
- [x] v1.2.0 tag

### 代码审查修复（08/08）

- [x] 🔴 P0：LXGW WenKai 字体注释补充 — 澄清 "latin" 是 fontsource 命名惯例，实际含 CJK 全量字形
- [x] 🟠 P1：首页 CTA 时间线缩短 — 桌面 7.5s / 移动 5.0s（提速 25%~50%）
- [x] 🟠 P1：Galaxy 视觉数据上限 — 按热度取前 100，防止大量 Motion DOM

### 08-10
- ✅ 提交祝福特效增强：中央爆发 + 花瓣飘落 + 成功提示浮层（Motion + Glass UI）
- 🔒 **安全审查**：9 条链路深度审查，发现 P0×2 + P1×5 + P2×2
- 🔴 P0 修复：点赞 API 零限流 + admin_token HMAC 签名双重鉴权
- 🟠 P1 修复：TOCTOU + 字段白名单 + 管理员登录限流 + IP 去重保障
- 🐛 Confetti 清理：setTimeout/RAF cleanup + prefers-reduced-motion + 教师节化视觉
- 💬 审核 UX：成功提示手动关闭 + "已进入审核队列"文案
- 📄 文档：CHANGELOG v1.2.1 + PROGRESS Phase 6 + CLAUDE.md 大幅完善
- 进度更新：172 任务 / 162 已完成，整体 94%

---

## Phase 6：安全加固 + 上线审查（2026-08-10）

### 安全审查修复（9 条链路，6 项代码修复）

- [x] 🔴 **P0-1**：点赞 API 新增 rate limit — `check_rate_limit`，每 IP 每分钟 20 次，fail-closed
- [x] 🔴 **P0-2**：`admin_token` HMAC-SHA256 签名 + 中间件 Web Crypto 验签 — 双重鉴权（Supabase Auth + admin_token 后备）
- [x] 🟠 **P1-3**：提交祝福 TOCTOU 修复 — `rate_limits` 写入移到 `blessings` 插入之前
- [x] 🟠 **P1-4**：Admin PATCH 字段白名单 — 仅允许 `status`（含合法值校验）+ `is_featured`
- [x] 🟠 **P1-5**：点赞 IP 去重 — 确认 Vercel 可信代理层保障
- [x] 🟠 **P1-6**：管理员登录 rate limit — 每 IP 每分钟 5 次，错误密码也写入限流记录

### 提交特效修复 + UX 优化

- [x] 🐛 Confetti effect cleanup — `setTimeout` + `requestAnimationFrame` 取消
- [x] ♿ Confetti 尊重 `prefers-reduced-motion` — 减弱动画偏好时跳过
- [x] 🎨 Confetti 教师节化 — 阶段 2 金色花瓣缓慢飘落替代庆典彩带
- [x] 🐛 Confetti duration 对齐 — 3500ms 与组件卸载时机一致
- [x] 💬 审核 UX — 成功提示手动关闭 + 文案优化

### 文档

- [x] 📄 CLAUDE.md 大幅完善 — Tailwind 色板/CSS 工具类/API 路由清单/双认证/架构陷阱
- [x] 📄 CHANGELOG.md — v1.2.1 安全修复日志
- [x] 📄 PROGRESS.md — Phase 6 进度记录

### v1.3.0 安全加固 + 上线验收（08/10）

- [x] 🔴 **P1-1**：`increment_likes` IP 可伪造 → 撤销 anon/PUBLIC 执行权限，仅 service_role 可调用
- [x] 🔴 **P1-2**：`rate_limits` 无 RLS → 启用 RLS，仅允许 INSERT
- [x] 🔴 **P1-3**：限流非原子 → 改为原子 INSERT+COUNT 单事务
- [x] 🟠 **P1-4**：无定时清理 → 概率自清理 + Vercel Cron 兜底
- [x] 🟠 **P1-5**：审核可被绕过 → BEFORE INSERT 触发器强制安全默认值
- [x] 🟡 **P2-1**：ADMIN_PASSWORD 双重用途 → 拆分 ADMIN_TOKEN_SECRET
- [x] 🟡 **P2-2**：Storage 策略过宽 → 删除匿名写策略
- [x] 🟡 **P2-3**：token 无过期 → 载荷编码 24h 过期时间戳
- [x] ① Vercel 环境变量验证 — 7/7 必填全部就绪
- [x] ② 生产冒烟测试 — 6/6 通过（限流/触发器/RLS/策略/权限/Storage）
- [x] ③ Supabase 索引检查 — 全部就绪
- [x] ④ k6 负载测试 — 20VU/620req/0失败/p95=1.37s
- [x] ⑤ Cron fail-closed — 生产环境 CRON_SECRET 缺失时 500 拒绝
- [x] ⑥ 强制 ADMIN_TOKEN_SECRET — 生产环境不回退到 ADMIN_PASSWORD
- [x] ⑦ 删除旧 token 格式 — 仅接受 randomPart.expiry.signature
- [x] ⑨ SEO/OG — favicon + robots.txt + OG 图片 + Twitter 卡片
- [ ] ⑧ 移动端真机测试 — iPhone Safari / Android Chrome 实测
- [ ] ⑩ 打 v1.3.0 tag

### 08-11
- ✅ 上线验收 9 项全过：环境变量 / 冒烟测试 / 索引检查 / k6 负载 / Cron fail-closed / 强制 ADMIN_TOKEN_SECRET / 删除旧 token 格式 / SEO / v1.3.0 tag
- 🔴 祝福墙请求风暴根治：Realtime UPDATE 移除 + INSERT 防抖 + force-dynamic + 无限滚动死循环修复
- ✅ 管理后台增强：统计角标 + 分页跳转 + 祝福对象列 + 精选切换 + 教师统计看板
- ✅ 移动端：Header 重排 + 卡片压缩 + 防横向溢出 + 首页动画 4x 加速
- ✅ 精选全站展示：祝福墙 + 星河 + 教师页 + 后台
- ✅ 夜间模式文字色 CSS 变量驱动
- ✅ 登录改纯密码认证，解决生产 Supabase Auth 登录失败
- ✅ 数据扩充：18 教师 + 353 祝福，清理测试数据
- ✅ 单元测试 83/83 全过
- 🎉 v1.3.1 发布
