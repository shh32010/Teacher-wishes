# 🎨 视觉重构方案 v2.0 — 从深色科技风到暖色教师节

> ⚠️ **历史设计方案** — 本文档描述已完成的视觉重构方案，当前实现请参考代码中的 `globals.css`、`tailwind.config.ts` 和组件文件。
>
> **版本**：v1.2 | **日期**：2026-08-11 | **状态**：Phase 0-8 ✅ 已完成

---

## 验收标准（Acceptance Criteria）

> **① 用户第一眼感受到的是"教师节"，而不是"深色科技网站"。**
> **② 暖色是氛围，不是把所有东西染成橙色。**
> **③ 所有动画必须服务于情绪和内容，同时不能牺牲移动端性能。**

---

## 设计原则

### 时间叙事：从黄昏走向星空

```
首页 Hero  →  🌅 暖色黄昏 + 少量粒子 + 花瓣
祝福墙     →  🌤️ 明亮暖色 + 纸张质感卡片
教师主页   →  📖 书卷气 + 暖光
大屏展示   →  🎆 金色粒子
祝福星河   →  🌆 黄昏渐深 → 星星逐渐出现
夜间模式   →  🌙 深蓝紫 + 星河（温暖夜间，非纯黑）
```

### 三层色彩体系

```
背景层（Background Layer）
  --bg-primary:       #FFF8F0   主背景（暖白）
  --bg-secondary:     #FDF3E7   次级背景（蛋壳）
  --bg-tertiary:      #FDF6EC   三级背景（奶油）

主色（Primary — 仅用于 CTA / 强调）
  --color-primary:        #D97706   琥珀金（按钮、链接）
  --color-primary-hover:  #B45309   深琥珀（悬停态）

情感点缀（Accent — 氛围色，非功能色）
  --color-accent-gold:    #E8A317   金穗色
  --color-accent-warm:    #C9825B   暖陶色
  --color-accent-earth:   #B98B73   大地色

文字层（Foreground Layer）
  --text-primary:     #3B2F2F   正文（暖深棕）
  --text-secondary:   #6B5B52   辅助文
  --text-muted:       #9B8B8B   提示文

卡片 / 玻璃态
  --glass-bg:         rgba(255,255,255,0.72)
  --glass-border:     rgba(217,119,6,0.12)
  --glass-shadow:     rgba(0,0,0,0.06)
```

### 视觉素材系统

不同页面使用不同核心元素，**不同时出现**：

| 页面 | 核心视觉 | 氛围 |
| :--- | :--- | :--- |
| 首页 Hero | 🌸 花瓣 + 🍂 银杏叶 | 温暖迎接 |
| 祝福墙 | 📝 纸张质感 + 🌸 花瓣 | 书写祝福 |
| 教师主页 | 📖 书页纹理 + ☀️ 暖光 | 致敬师恩 |
| 大屏展示 | ✨ 金色粒子 | 典礼感 |
| 祝福星河 | ⭐ 星星 | 星河璀璨 |
| 夜间模式 | 🌙 星河 + 🌌 微光 | 静谧温暖 |

完整视觉素材库：🌸 花瓣 / 🍂 银杏叶 / 🍁 枫叶 / ✏️ 铅笔 / 📖 书页 / 🖋️ 钢笔 / ⭐ 星星

---

## 实施阶段

### Phase 0 — 视觉 Token / Design System（当前）

**目标**：建立统一的 CSS 自定义属性体系，所有后续改动用 Token 而非硬编码。

- [x] 定义 `:root` 完整 Design Token（背景/文字/主色/点缀/卡片/阴影/圆角/间距）
- [x] Tailwind 配置同步 Token 色值（新增 sentiment 色板、更新 night 色板）
- [x] 字体本地化 — LXGW WenKai Bold (700) 通过 `@fontsource/lxgw-wenkai` + `next/font/local` 加载
- [x] 正文使用系统无衬线字体，标题使用 LXGW WenKai（`font-wenkai` Tailwind 类）
- [x] 全局 CSS 改用 Token 引用（body、glass、btn-primary、btn-glass 等）
- [x] 夜间模式 Token 通过 `prefers-color-scheme: dark` 自动切换
- [x] 移除 Google Fonts CDN 依赖，字体完全本地化
- [ ] Token 预览页（开发辅助，可选）

### Phase 1 — 基础设施 ✅

**目标**：布局、全局样式、毛玻璃组件升级。

- [x] 全局背景渐变改为暖色三段式（Phase 0 已完成）
- [x] GlassCard 组件 hover 效果改用 CSS 变量（`--glass-bg-hover`, `--glass-shadow-hover`）
- [x] 按钮体系完善 — btn-primary / btn-glass / btn-ghost 三种变体
- [x] 管理后台审批按钮改用 success/danger Token
- [x] 表单错误/超限提示改用 `text-danger` Token
- [x] Tailwind 配置新增 `danger` 色板
- [x] 测试更新 — GlassCard 断言匹配新 class 名
- [x] 滚动条、焦点环、选中态已在 Phase 0 完成 Token 化
- [x] `body` 字体、行高、颜色已在 Phase 0 完成 Token 化

### Phase 2 — 全局 Glass UI ✅

**目标**：所有毛玻璃组件视觉效果统一。

- [x] NavHeader 可复用玻璃态导航栏组件（替换 wall/teacher/admin 三处重复代码）
- [x] input-glass / input-glass-sm 统一输入框样式（替换 3 处硬编码 input class）
- [x] 弹窗遮罩、下拉面板、QR 容器等均使用 `glass` / `glass-card`
- [x] 错误提示色从 `text-red-500` 迁移到 `text-danger` Token

### Phase 3 — 首页 Hero + 花瓣 + 黄昏粒子 ✅

**目标**：首页是第一印象，优先改造。

- [x] Hero 区域已是暖色黄昏背景（Phase 0 完成）
- [x] tsParticles 粒子颜色已是暖色调（StarBackground `#FFE4C4` 等）
- [x] FallingPetals 性能优化：Desktop 20 个 / Mobile 10 个（从 30 降至 20/10）
- [x] 花瓣移除 `filter: blur()` 以减少 GPU 开销
- [x] 标题/语录颜色使用 `text-gradient` / `text-ink-light` Token

### Phase 4 — 祝福墙 / 教师页 / Display ✅

**目标**：核心页面逐一适配。（Phase 0-2 已完成 Token 统一，页面自动适配）

- [x] 祝福墙导航栏使用 NavHeader 玻璃态组件
- [x] 教师页导航栏使用 NavHeader 组件
- [x] 所有页面使用 `text-ink`/`text-ink-muted`/`btn-primary`/`glass-card` Token 类
- [x] 错误提示色统一为 `text-danger`

### Phase 5 — 祝福星河 ✅

**目标**：星空动画从深色背景适配到黄昏背景。

- [x] 5 处星光色改用 CSS 变量 + `color-mix()`（教师天体光晕、祝福星星辉光、悬浮预览光晕）
- [x] 颜色从硬编码 `rgba(217,119,6,0.x)` → `color-mix(in srgb, var(--color-primary) X%, transparent)`
- [x] 自动适配日间/夜间模式（CSS 变量自动切换）

### Phase 6 — 昼夜模式 ✅

**目标**：温暖夜间模式，非简单的亮/暗切换。（Phase 0 已完整实现）

```
☀️ 温暖日间               🌙 温暖夜间
Cream (#FFF8F0)           Deep Navy (#1A1A2E)
Amber (#D97706)           Muted Gold (#C9825B)
Ginkgo / Petals           Stars / Galaxy
```

- [x] CSS 媒体查询 `prefers-color-scheme: dark` 自动切换
- [x] 手动切换开关（ThemeToggle 三态循环：☀️/🌙/🖥，localStorage 记忆）
- [x] 夜间模式仍保持"教师节"氛围

### Phase 7 — 响应式 + 性能 + 无障碍

**目标**：确保移动端体验和可访问性。

- [x] 移动端花瓣数量自动降低（FallingPetals `getPetalCount()` 检测 window.innerWidth）
- [x] `prefers-reduced-motion` 全局关闭动画（globals.css 已有）
- [x] `prefers-reduced-transparency` 禁用毛玻璃（globals.css 已有）
- [x] 焦点环使用 Token 色、对比度 WCAG AA 已验证（Phase 0 完成）
- [x] 移动端毛玻璃降级为 blur(8px)、卡片圆角/间距缩小（globals.css 已有）
- [ ] 移动端完整走查（建议在真实设备上验证）

### Phase 8 — 截图 / README / Demo

**目标**：文档更新、宣传素材。

- [ ] 四张页面截图更新（需启动 dev server 手动截取）
- [ ] README 更新主题描述
- [ ] 可选：30s Demo 视频

---

## 字体方案

### 标题字体：LXGW WenKai（霞鹜文楷）

- **获取方式**：`node_modules/@fontsource/lxgw-wenkai` 通过 `next/font/local` 加载
- **使用范围**：页面标题（h1/h2）、Hero 大字、教师姓名
- **不用于**：正文、按钮、表单、卡片内容
- **子集化**：仅保留常用汉字 3500 个 + 标点，减小体积

### 正文字体：系统无衬线

```
-apple-system, BlinkMacSystemFont, "Segoe UI",
Roboto, "Noto Sans SC", sans-serif
```

---

## 性能约束

| 约束项 | 限制 |
| :--- | :--- |
| FallingPetals Desktop | 20 个 DOM 元素 |
| FallingPetals Mobile | 10 个 DOM 元素 |
| tsParticles 粒子数 | 与花瓣总数协调，两者叠加 ≤ 80 个粒子 |
| 动画属性 | 仅使用 `transform` + `opacity`，禁 `top/left` |
| `pointer-events` | 所有装饰性元素设为 `none` |
| 低端设备 | `prefers-reduced-motion` + `prefers-reduced-transparency` 降级 |
| 字体加载 | `font-display: swap`，预加载 woff2 |
