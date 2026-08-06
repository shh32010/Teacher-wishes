# 负载测试 (k6)

本项目使用 [k6](https://k6.io/) 进行负载测试，包含三种测试场景。

## 安装 k6

### Windows

```bash
# 方式一：chocolatey（需管理员权限）
choco install k6

# 方式二：winget
winget install k6

# 方式三：手动下载
# 从 https://github.com/grafana/k6/releases 下载 Windows zip
# 解压后将 k6.exe 放到 PATH 目录（如 C:\Windows\System32）
```

### macOS

```bash
brew install k6
```

### Linux (Debian/Ubuntu)

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Docker

```bash
docker pull grafana/k6
```

## 运行测试

### 冒烟测试

快速验证所有核心端点是否正常响应：

```bash
npm run test:smoke

# 或
k6 run load-tests/smoke.js

# 调试模式（查看 HTTP 请求/响应详情）
k6 run --http-debug load-tests/smoke.js

# 指定目标服务器
k6 run -e BASE_URL=https://teacher.shh32010.dpdns.org load-tests/smoke.js
```

### 负载测试

模拟 50→100 VU 的真实用户行为：

```bash
npm run test:load

# 指定目标服务器
k6 run -e BASE_URL=https://teacher.shh32010.dpdns.org load-tests/load.js

# 输出 JSON 报告
k6 run --out json=load-results.json load-tests/load.js
```

### 压力测试

从 10 VU 逐步加压到 200 VU，找到性能拐点：

```bash
npm run test:stress

# 指定目标服务器
k6 run -e BASE_URL=https://teacher.shh32010.dpdns.org load-tests/stress.js

# 输出 JSON 报告（自动生成 stress-summary.json）
k6 run load-tests/stress.js
```

## 测试脚本说明

| 脚本 | 类型 | VU 数 | 时长 | 用途 |
|:-----|:-----|:------|:-----|:-----|
| `smoke.js` | 冒烟测试 | 1 | 30s | 部署后快速验证端点可用性 |
| `load.js` | 负载测试 | 50→100 | 2min | 模拟正常流量，验证 p95<1s |
| `stress.js` | 压力测试 | 10→200→0 | 4min | 找到性能拐点，记录极限表现 |

### 用户行为模拟（load.js）

| 操作 | 占比 | 说明 |
|:-----|:-----|:-----|
| 浏览首页 | 40% | GET `/`，停留 3-8 秒 |
| 浏览祝福墙 | 30% | GET `/wall`，停留 2-6 秒 + 30%概率加载 API |
| 获取祝福列表 | 20% | GET `/api/blessings?page=N&pageSize=20` |
| 提交祝福 | 10% | POST `/api/blessings` |

### 压力测试阶段（stress.js）

| 阶段 | 时长 | VU 范围 | 目的 |
|:-----|:-----|:--------|:-----|
| 基准期 | 0-30s | 10→50 | 建立基线性能 |
| 加压期 | 30-90s | 50→100 | 观察线性增长 |
| 重压期 | 90-150s | 100→150 | 寻找拐点 |
| 极限期 | 150-210s | 150→200 | 测试硬件上限 |
| 恢复期 | 210-240s | 200→0 | 观察恢复能力 |

## 注意事项

1. **速率限制**：POST `/api/blessings` 有 IP 频率限制（每10分钟3条）。负载测试中，同一台机器的所有 VU 共享 IP，POST 请求会很快触发限流（返回 429）。脚本已将 429 视为预期行为。

2. **CSRF**：项目的 CSRF 保护采用向后兼容策略 -- 如果请求未携带 `csrf_token` Cookie，则跳过验证。k6 测试默认不携带该 Cookie，因此 POST 请求不会被 CSRF 拦截。

3. **本地 vs 生产**：本地运行 `next dev` 是开发服务器（单线程），性能指标不代表生产环境。建议在 `next start`（生产构建）或 Vercel 部署上运行负载测试。

4. **生产测试**：在对生产环境进行压力测试前，请确保：
   - 已通知团队/用户
   - 数据库有足够的连接池资源
   - Supabase 项目套餐支持目标并发数

## 指标解读

### 关键指标

| 指标 | 含义 | 优秀 | 需关注 |
|:-----|:-----|:-----|:------|
| `http_req_duration` p95 | 95%请求的响应时间 | < 500ms | > 1s |
| `http_req_duration` p99 | 99%请求的响应时间 | < 1s | > 2s |
| `http_req_failed` rate | 失败请求比例 | < 0.1% | > 1% |
| `http_reqs` | 总请求数 | — | — |
| `vus` | 并发虚拟用户数 | — | — |

### 压力测试自定义指标

- `trend_homepage_duration` — 首页响应时间趋势
- `trend_wall_duration` — 祝福墙响应时间趋势
- `trend_api_duration` — API 响应时间趋势
- `trend_post_duration` — POST 提交响应时间趋势
- `errors_rate_limit` — 速率限制错误计数
- `errors_server` — 服务端错误计数

## 故障排查

### k6: command not found

k6 未安装或不在 PATH 中。运行 `k6 version` 确认，或重新安装。

### ESOCKETTIMEDOUT / i/o timeout

目标服务器不可达。检查：
- 本地服务是否启动 (`npm run dev` 或 `npm start`)
- BASE_URL 是否正确
- 网络连接（国内访问 Vercel 可能需要代理）

### 429 Too Many Requests

正常现象 -- POST 端点的速率限制生效。在压力测试中这是预期行为，不影响 GET 类请求的测试结果。
