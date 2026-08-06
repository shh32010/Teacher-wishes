# 📋 Changelog

All notable changes to Teacher Wishes Platform will be documented in this file.

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
