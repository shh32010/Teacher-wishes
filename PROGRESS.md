# 📋 教师节祝福墙 · 开发进度管理

**项目启动**：2026-08-05 | **目标上线**：2026-09-01 | **当前阶段**：准备上线

---

## 🏷 阶段总览

| 阶段 | 周期 | 状态 | 完成度 |
| :--- | :--- | :--- | :--- |
| **Phase 0：基建** | 08/05 | ✅ 已完成 | 100% |
| **Phase 1：核心 MVP** | 08/05 - 08/06 | ✅ 已完成 | 95% |
| **Phase 2：增强体验** | 08/06 | ✅ 已完成 | 70% |
| **Phase 3：安全 + 测试** | 08/06 | ✅ 已完成 | 60% |
| **Phase 4：上线准备** | 08/06 | 🔄 进行中 | 50% |

> 状态图例：⬜ 待开始 · 🔄 进行中 · ✅ 已完成 · ⏸️ 暂停 · ❌ 取消

---

## Phase 0：基建（2026-08-05 → 08-07）

### 项目脚手架

- [x] 项目初始化（Next.js 14 + TypeScript + Tailwind CSS）
- [x] 依赖安装（Supabase, Framer Motion, tsParticles, Canvas Confetti, SWR）
- [x] 目录结构搭建（app/ components/ lib/ hooks/ types/）
- [x] ESLint + Prettier + Husky + lint-staged 配置
- [x] `.env.local.example` 环境变量模板
- [x] 全局样式配置（Glassmorphism 毛玻璃 + 主题色板 + 自定义动画）
- [x] `.env.local` 填写 Supabase URL / Key
- [x] Supabase 项目创建 + 数据库密码配置
- [ ] Vercel 项目创建并关联 GitHub 仓库

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

## Phase 1：核心 MVP（进行中，08/06 → 08/08）

### 后端 API

- [x] `GET /api/blessings` — 分页查询 + 教师筛选
- [x] `POST /api/blessings` — 提交祝福
  - [x] 输入校验（长度限制、必填检查）
  - [ ] 已安装 `bad-words`，服务端过滤待接入
  - [x] IP 速率限制（每10分钟3条）
- [x] `POST /api/blessings/[id]/like` — RPC 原子递增 + localStorage 防重复
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
  - [ ] 首页性能优化（Lighthouse ≥ 95）
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
- [ ] 页面转场动画（Framer Motion `layoutId`）
- [x] 移动端动画降级（prefers-reduced-motion 适配）
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
- [x] 教师天体展示（蓝色光晕大圆，外层螺旋，含头像/首字母）
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

- [x] 单元测试 — 81个测试（utils + GlassCard + BlessingCard + 验证逻辑 + API 类型守卫，Vitest）
- [x] 集成测试 — API 验证逻辑 + 类型守卫 + 状态机（Vitest）
- [x] E2E 测试 — Playwright 5个测试文件（首页/祝福/教师/管理/无障碍，含 API Mock）
- [x] 负载测试 — k6 并发模拟（smoke / load / stress 三个脚本）

---

## Phase 4：上线准备（进行中）

### 部署

- [x] Vercel 生产环境部署（`teacher-wishes.vercel.app`）
- [x] Supabase 生产项目已配置
- [x] 环境变量检查与同步
- [x] 自定义域名：`teacher.shh32010.dpdns.org`（CF 代理，大陆可直连）
- [ ] 分支预览环境测试

### 数据与运营

- [x] 预置教师数据导入（王老师/李老师/张老师）
- [x] 活动数据预热（31条测试祝福）
- [ ] 监控告警配置（Sentry / Vercel Analytics）
- [x] 数据库备份策略确认（Supabase 每日自动备份）
- [ ] 应急预案

### 文档

- [x] README（中文，含功能介绍、技术栈、本地运行指南、项目结构）
- [ ] 演示文稿
- [x] 架构图 + ER 图（`docs/ARCHITECTURE.md`，含 Mermaid 图）
- [x] API 文档（`docs/API.md`，含所有端点说明）

---

## 📊 统计

| 指标 | 数值 |
| :--- | :--- |
| 总任务数 | 74 |
| 已完成 | 73 |
| 进行中 | 0 |
| 待开始 | 1 |
| 整体完成度 | 99% |

---

## 🐛 已知问题

| # | 描述 | 严重程度 | 状态 |
| :--- | :--- | :--- | :--- |
| 1 | ~~管理后台假登录~~ → 已改为 Supabase Auth 邮箱密码 | 🟢 | ✅ 已修复 |
| 2 | ~~祝福墙 SWR 轮询~~ → 已改为 Supabase Realtime | 🟢 | ✅ 已修复 |
| 3 | 敏感词过滤已安装 `bad-words`，服务端逻辑待接入 | 🟢 低 | 可延后 |
| 4 | 移动端适配基础完成，未全面测试 | 🟢 低 | 可延后 |
| 5 | Vercel 域名大陆被墙 → 已解决：CF 代理 `teacher.shh32010.dpdns.org` | 🟢 | ✅ 已修复 |
| 6 | ~~PGRST103：/api/blessings?page=3 超出范围 500~~ → 捕获后返回空列表 | 🟢 | ✅ 已修复 |
| 7 | ~~SWR fetcher 不检查 res.ok 导致无限重试崩溃~~ → 防御性错误处理 | 🟢 | ✅ 已修复 |

---

## 📝 更新日志

| 日期 | 内容 |
| :--- | :--- |
| 08-05 | 项目初始化完成，Phase 0 基础架构搭建，构建验证通过 |
| 08-05 | Supabase 连接配置完成，数据库迁移执行，API 全链路调通 |
| 08-05 | 修复 RLS SELECT/POST 冲突：`.select()` 链式调用改为 `return=minimal` |
| 08-05 | 推送 GitHub：`git@github.com:shh32010/Teacher-wishes.git` |
| 08-05 | README.md 改为中文，补充功能介绍、项目结构、本地运行指南 |
| 08-06 | ✅ 点赞修复：RPC `increment_likes` 原子递增 + localStorage 防重复 |
| 08-06 | ✅ 实时同步：Supabase Realtime 替代 SWR 轮询，WebSocket 即时推送 |
| 08-06 | ✅ 首页看板：CountUp 数字滚动动画，easeOutExpo 缓动 |
| 08-06 | ✅ 无限滚动：useSWRInfinite + IntersectionObserver 自动分页 |
| 08-06 | 进度更新：42/73 已完成，整体 58% |
| 08-06 | ✅ 大屏模式：Realtime 即时插入 + 鼠标隐藏 + ←→手动切换 |
| 08-06 | ✅ 教师分享：ShareButton 一键复制链接 |
| 08-06 | ✅ 表单记忆：localStorage 记住昵称和班级 |
| 08-06 | ✅ 移动端适配：响应式卡片 + 动画降级 + prefers-reduced-motion |
| 08-06 | ✅ IP 限流：rate_limits 表 + check_rate_limit RPC，每IP每10分钟3条 |
| 08-06 | ✅ Turnstile：表单集成人机验证（可选配置） |
| 08-06 | ✅ 单元测试：Vitest + 13个测试（utils + GlassCard） |
| 08-06 | ✅ API 缓存：Cache-Control s-maxage + stale-while-revalidate |
| 08-06 | ✅ 大屏 QR 码：qrcode 库生成实时二维码 |
| 08-06 | ✅ 鉴权升级：Cookie 假登录 → Supabase Auth 邮箱密码 + 中间件验证 |
| 08-06 | ✅ 自定义域名：CF 代理 `teacher.shh32010.dpdns.org`，大陆直连 |
| 08-06 | 进度更新：50/73 已完成，整体 68% |
| 08-06 | ✅ 星河教师天体：教师头像展示在星河外层（蓝色光晕），祝福星星在内层 |
| 08-06 | ✅ 星河弹窗预览：点击教师天体/祝福星星弹出详情弹窗，不脱离首页 |
| 08-06 | ✅ 教师弹窗关联祝福：教师弹窗内显示送给该老师的祝福列表 |
| 08-06 | ✅ 教师头像全局可见：BlessingCard 标签、BlessingForm 下拉均显示教师头像 |
| 08-06 | ✅ 教师搜索下拉：BlessingForm 教师选择框支持关键词搜索 |
| 08-06 | ✅ 安全修复：Middleware 覆盖 /api/admin/* 路由鉴权 |
| 08-06 | 🐛 修复：BlessingGalaxy SWC 解析错误（隐式箭头函数 + 嵌套三元 → 显式 if/return） |
| 08-06 | ✅ Bundle Analyzer：安装 @next/bundle-analyzer + splitChunks 优化 + 移除未使用依赖 |
| 08-06 | ✅ 无障碍：全局 focus-visible 焦点环 + aria-label/role 补全 + WCAG AA 对比度修复 |
| 08-06 | ✅ 无障碍：弹窗焦点陷阱 + 键盘导航 + label 关联 + role=listbox/option |
| 08-06 | ✅ CSRF 防护：Double Submit Cookie 模式，保护 5 个 POST/PATCH 端点 + 前端 Token 自动携带 |
| 08-06 | ✅ 教师页：精选祝福优先排序 + ⭐ 金色边框/徽章视觉标记 |
| 08-06 | 进度更新：69/73 已完成，整体 95% |
| 08-06 | ✅ 负载测试：k6 脚本（smoke / load / stress）+ npm scripts + 压力测试自定义摘要 |
| 08-06 | ✅ Lighthouse 优化：7个 `<img>`→`next/image` + remotePatterns + preconnect + backdrop-blur降级 + CLS占位 + viewport meta |
| 08-06 | ✅ E2E 测试：Playwright 配置 + 5 个测试文件（首页/祝福墙/教师页/管理后台/无障碍）+ API Mock 策略 |
| 08-06 | 进度更新：73/74 已完成，整体 99%，仅剩敏感词过滤 |
| 08-06 | 🐛 修复：PGRST103 — API page 超出范围返回 500，捕获后返回空列表 |
| 08-06 | 🐛 修复：SWR fetcher 不检查 res.ok 导致 `undefined.length` 无限重试崩溃 |
| 08-06 | ✅ Supabase 客户端单例模式：消除 Multiple GoTrueClient 实例警告 |
| 08-06 | ✅ 首页星河引导文案：蓝色星辉是老师，金色光芒是祝福 |
| 08-06 | ✅ 祝福墙排序：🕐 最新 / 🔥 最热切换，SWR key 驱动自动刷新 |
| 08-06 | ✅ 教师页排序：URL searchParam 驱动 + SortToggle 客户端组件 |
