# 📋 教师节祝福墙 · 开发进度管理

**项目启动**：2026-08-05 | **目标上线**：2026-09-01 | **当前阶段**：Phase 0 — 基建

---

## 🏷 阶段总览

| 阶段 | 周期 | 状态 | 完成度 |
| :--- | :--- | :--- | :--- |
| **Phase 0：基建** | 3天（08/05 - 08/07） | ✅ 已完成 | 100% |
| **Phase 1：核心 MVP** | 5天（08/08 - 08/12） | ⬜ 待开始 | 0% |
| **Phase 2：增强体验** | 4天（08/13 - 08/16） | ⬜ 待开始 | 0% |
| **Phase 3：星河与优化** | 3天（08/17 - 08/19） | ⬜ 待开始 | 0% |
| **Phase 4：上线准备** | 1天（08/20） | ⬜ 待开始 | 0% |

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

## Phase 1：核心 MVP（待开始，08/08 → 08/12）

### 后端 API

- [ ] `GET /api/blessings` — 分页查询 + 教师筛选
- [ ] `POST /api/blessings` — 提交祝福
  - [ ] 输入校验（长度限制、必填检查）
  - [ ] 敏感词过滤（集成 `bad-words` 或自定义黑名单）
  - [ ] IP 速率限制（每10分钟3条）
- [ ] `POST /api/blessings/[id]/like` — 点赞（防重复）
- [ ] `GET /api/blessings/stats` — 统计数据
- [ ] `GET /api/admin/blessings` — 管理后台列表查询
- [ ] `PATCH /api/admin/blessings` — 批量审核/置顶
- [ ] `POST /api/admin/login` — 管理登录
- [ ] `GET /api/teachers/[id]` — 教师详情 + 祝福列表

### 前端页面

- [ ] **首页** (`/`)
  - [x] 故事式交互时间线（星空 → 语录 → 标题 → 按钮）
  - [x] 星空背景（tsParticles，懒加载）
  - [ ] 数据看板组件（总祝福数、参与人数——数字滚动动画）
  - [ ] 首页性能优化（Lighthouse ≥ 95）
- [ ] **祝福墙** (`/wall`)
  - [x] Masonry 瀑布流卡片布局
  - [x] 祝福卡片组件（昵称、班级、内容、教师标签、点赞）
  - [ ] SWR 数据获取 + Supabase Realtime 实时订阅
  - [ ] 无限滚动分页加载
  - [x] 彩带庆祝特效（Canvas Confetti）
  - [ ] 空状态 / 错误状态 / 加载骨架屏
- [ ] **提交表单**（弹窗组件）
  - [x] 昵称、班级、祝福内容输入
  - [x] 教师选择下拉框
  - [ ] Framer Motion 弹窗动画
  - [ ] 表单验证提示
  - [ ] Turnstile / hCaptcha 人机验证
  - [ ] localStorage 记住昵称和班级
- [ ] **管理后台** (`/admin`)
  - [x] 统计数字看板
  - [x] 祝福审核表格 + 批量操作
  - [x] 状态筛选（待审核/已通过/已拒绝）
  - [x] 管理登录页
  - [ ] Supabase Auth 真实鉴权替换假登录

---

## Phase 2：增强体验（待开始，08/13 → 08/16）

### 大屏模式

- [x] `/display` 全屏自动轮播页面
- [x] Framer Motion `AnimatePresence` 卡片切换动画
- [ ] 二维码展示（指向提交页面）
- [ ] Supabase Realtime 新祝福即时插入队列
- [ ] ESC / F 键退出全屏 + 鼠标自动隐藏
- [ ] 移动端响应式适配
- [ ] 大屏性能测试（长时间运行不卡顿）

### 教师主页

- [x] `/teacher/[id]` SSR 页面骨架
- [x] 教师信息卡片（头像、部门、简介、祝福统计）
- [x] 祝福列表展示
- [ ] 分享功能（复制链接 / 生成分享卡片图片）
- [ ] 教师页面精选祝福标记

### 高级动画与特效

- [ ] 首页数字看板滚动动画（CountUp 效果）
- [ ] 祝福卡片入场 stagger 动画调优
- [ ] 页面转场动画（Framer Motion `layoutId`）
- [ ] 移动端动画降级（prefers-reduced-motion 适配）
- [ ] 粒子数量/帧率自适应

### 响应式与无障碍

- [ ] 移动端 UI 适配（表单、卡片、大屏）
- [ ] 键盘导航焦点管理
- [ ] aria-label / role 属性补全
- [ ] 色彩对比度检查（WCAG AA）
- [ ] `prefers-reduced-motion` 媒体查询适配

---

## Phase 3：星河与优化（待开始，08/17 → 08/19）

### 🌟 祝福星河（Enhancement）

- [ ] 星空背景中祝福对应星星（动态坐标生成）
- [ ] 鼠标悬浮气泡显示祝福片段
- [ ] 点击星星跳转祝福详情

### 安全加固

- [ ] Turnstile/hCaptcha 集成到提交表单
- [ ] Upstash RateLimit 或 Vercel KV 限流
- [ ] 敏感词库完善 + 服务端双重过滤
- [ ] CSRF Token 检查
- [ ] 安全依赖扫描（npm audit）

### 性能优化

- [ ] Lighthouse 性能评分 ≥ 95
- [ ] `next/dynamic` 非首屏组件懒加载确认
- [ ] `next/image` 图片转 WebP 确认
- [ ] 首页粒子 Canvas 渲染（非 DOM）
- [ ] Bundle Analyzer 分析 + Tree Shaking
- [ ] API 缓存策略（Cache-Control 头）

### 测试

- [ ] 单元测试 — 表单验证、数据格式化工具函数（Vitest）
- [ ] 集成测试 — API 路由 + 数据库查询
- [ ] E2E 测试 — Playwright 用户流程（提交→审核→展示）
- [ ] 负载测试 — k6 / JMeter 并发模拟

---

## Phase 4：上线准备（待开始，08/20）

### 部署

- [ ] Vercel 生产环境部署
- [ ] Supabase 生产项目创建 / 升级付费计划
- [ ] 环境变量检查与同步
- [ ] 自定义域名绑定 + SSL
- [ ] 分支预览环境测试

### 数据与运营

- [ ] 预置教师数据导入
- [ ] 活动数据预热（测试祝福数据）
- [ ] 监控告警配置（Sentry / Vercel Analytics）
- [ ] 数据库备份策略确认
- [ ] 应急预案（回滚 / 限流 / 关站）

### 文档

- [ ] README 完善（截图/GIF、架构图、本地运行指南）
- [ ] 演示文稿（PPT / Notion）
- [ ] 架构图 + ER 图 + 挑战与解决方案
- [ ] API 文档（Markdown / Swagger）

---

## 📊 统计

| 指标 | 数值 |
| :--- | :--- |
| 总任务数 | 73 |
| 已完成 | 28 |
| 进行中 | 0 |
| 待开始 | 45 |
| 整体完成度 | 38% |

---

## 🐛 已知问题

| # | 描述 | 严重程度 | 状态 |
| :--- | :--- | :--- | :--- |
| 1 | 管理后台使用假登录（Cookie 直设），需改为 Supabase Auth | 🟡 中 | 待修复 |
| 2 | 祝福墙当前用 SWR 轮询，未接入 Supabase Realtime | 🟡 中 | 待修复 |
| 3 | 敏感词过滤、速率限制、验证码均未实现 | 🔴 高 | Phase 1 完成 |
| 4 | 移动端适配未测试 | 🟢 低 | Phase 2 完成 |
| 5 | `@tsparticles/slim` 包已安装但未使用（v4 自动加载） | 🟢 低 | 可清理 |

---

## 📝 更新日志

| 日期 | 内容 |
| :--- | :--- |
| 08-05 | 项目初始化完成，Phase 0 基础架构搭建，构建验证通过 |
| 08-05 | Supabase 连接配置完成，数据库迁移执行，API 全链路调通 |
| 08-05 | 修复 RLS SELECT/POST 冲突：`.select()` 链式调用改为 `return=minimal` |
