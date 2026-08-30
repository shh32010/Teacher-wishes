// ============================================================
// 教师节祝福墙 — 压力测试 (k6 Stress Test)
// ============================================================
// 用途：找到系统性能拐点，了解在极端负载下的表现
// 运行：k6 run load-tests/stress.js
// 调试：k6 run --http-debug load-tests/stress.js
//
// 场景：
//   - 5 个阶段，从 10 VU 逐步增加到 200 VU
//   - 记录不同并发下的 p95/p99 延迟
//   - 记录何时开始出现错误
//
// 阶段设计：
//   1. 基准期（0-30s）：   10 → 50  VU  （建立基线）
//   2. 加压期（30-90s）：  50 → 100 VU  （逐步加压）
//   3. 重压期（90-150s）：100 → 150 VU  （寻找拐点）
//   4. 极限期（150-210s）：150 → 200 VU （测试上限）
//   5. 恢复期（210-240s）：200 → 0   VU  （观察恢复）
//
// 输出：
//   - 控制台：每个阶段的延迟分位数和错误率
//   - JSON 报告：k6 run --out json=stress-results.json load-tests/stress.js
// ============================================================

import http from 'k6/http';
import { check, sleep, group, trend } from 'k6';
import { Counter } from 'k6/metrics';

// ---- 测试目标 ----
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ---- 自定义指标 ----
// 细分不同操作的延迟
const homepageTrend = new trend('trend_homepage_duration', true);
const wallTrend = new trend('trend_wall_duration', true);
const apiTrend = new trend('trend_api_duration', true);
const postTrend = new trend('trend_post_duration', true);

// 错误计数器（按类型）
const rateLimitErrors = new Counter('errors_rate_limit');
const serverErrors = new Counter('errors_server');

// ---- 测试配置 ----
export const options = {
  stages: [
    // 阶段1：基准期 — 10 → 50 VU（建立基线）
    { duration: '30s', target: 50 },

    // 阶段2：加压期 — 50 → 100 VU（逐步加压）
    { duration: '60s', target: 100 },

    // 阶段3：重压期 — 100 → 150 VU（寻找拐点）
    { duration: '60s', target: 150 },

    // 阶段4：极限期 — 150 → 200 VU（测试上限）
    { duration: '60s', target: 200 },

    // 阶段5：恢复期 — 200 → 0 VU（观察恢复）
    { duration: '30s', target: 0 },
  ],

  // 宽松的阈值：压力测试的目的是观察行为，不是通过/失败
  thresholds: [
    // 记录错误率趋势，不强制中止
    { threshold: 'http_req_failed:rate<0.50', abortOnFail: false },
  ],

  // 摘要输出：打印详细趋势
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max', 'count'],
};

// ============================================================
// 自定义摘要 — 在测试结束后打印关键发现
// ============================================================
export function handleSummary(data) {
  const metrics = data.metrics;

  // 提取关键指标
  const reqDuration = metrics.http_req_duration?.values || {};
  const reqFailed = metrics.http_req_failed?.values || {};
  const homepage = metrics.trend_homepage_duration?.values || {};
  const wall = metrics.trend_wall_duration?.values || {};
  const api = metrics.trend_api_duration?.values || {};
  const post = metrics.trend_post_duration?.values || {};
  const rateLimits = metrics.errors_rate_limit?.values?.count || 0;
  const serverErrorsCount = metrics.errors_server?.values?.count || 0;
  const totalRequests = metrics.http_reqs?.values?.count || 0;
  const totalIterations = metrics.iterations?.values?.count || 0;

  const summary = {
    title: '教师节祝福墙 — 压力测试报告',
    timestamp: new Date().toISOString(),
    config: {
      baseUrl: BASE_URL,
      stages: options.stages,
    },
    results: {
      totalRequests,
      totalIterations,
      errorRate: ((reqFailed.rate || 0) * 100).toFixed(2) + '%',
      rateLimitErrors: rateLimits,
      serverErrors: serverErrorsCount,
      // 整体延迟
      latencies: {
        overall: {
          avg: (reqDuration.avg || 0).toFixed(2) + 'ms',
          p95: (reqDuration['p(95)'] || 0).toFixed(2) + 'ms',
          p99: (reqDuration['p(99)'] || 0).toFixed(2) + 'ms',
          max: (reqDuration.max || 0).toFixed(2) + 'ms',
        },
        // 按操作类型细分
        byType: {
          homepage: {
            avg: (homepage.avg || 0).toFixed(2) + 'ms',
            p95: (homepage['p(95)'] || 0).toFixed(2) + 'ms',
          },
          wall: {
            avg: (wall.avg || 0).toFixed(2) + 'ms',
            p95: (wall['p(95)'] || 0).toFixed(2) + 'ms',
          },
          api: {
            avg: (api.avg || 0).toFixed(2) + 'ms',
            p95: (api['p(95)'] || 0).toFixed(2) + 'ms',
          },
          post: {
            avg: (post.avg || 0).toFixed(2) + 'ms',
            p95: (post['p(95)'] || 0).toFixed(2) + 'ms',
          },
        },
      },
    },
    interpretation: {
      p95Under200ms: '🟢 优秀 — 系统在该负载下表现良好',
      p95Under500ms: '🟡 可接受 — 有一定性能压力',
      p95Under1s: '🟠 需关注 — 可能出现瓶颈',
      p95Over1s: '🔴 严重 — 需要优化',
      errorRateLow: '错误率 < 1% — 系统稳定',
      errorRateMedium: '错误率 1-5% — 有轻微问题',
      errorRateHigh: '错误率 > 5% — 需要立即排查',
    },
  };

  return {
    'stress-summary.json': JSON.stringify(summary, null, 2),
    stdout: `
╔══════════════════════════════════════════════════════════╗
║       教师节祝福墙 — 压力测试报告                         ║
╠══════════════════════════════════════════════════════════╣
║  总请求数：  ${String(totalRequests).padStart(8)}                            ║
║  总迭代数：  ${String(totalIterations).padStart(8)}                            ║
║  错误率：    ${summary.results.errorRate.padStart(8)}                            ║
║  限流错误：  ${String(rateLimits).padStart(8)}                            ║
║  服务端错误：${String(serverErrorsCount).padStart(8)}                            ║
╠══════════════════════════════════════════════════════════╣
║  整体延迟：                                              ║
║    avg:  ${String(summary.results.latencies.overall.avg).padStart(8)}    p95: ${String(summary.results.latencies.overall.p95).padStart(8)} ║
║    p99:  ${String(summary.results.latencies.overall.p99).padStart(8)}    max: ${String(summary.results.latencies.overall.max).padStart(8)} ║
╠══════════════════════════════════════════════════════════╣
║  按类型延迟 (p95)：                                      ║
║    首页:  ${String(summary.results.latencies.byType.homepage.p95).padStart(8)}                                  ║
║    祝福墙:${String(summary.results.latencies.byType.wall.p95).padStart(8)}                                  ║
║    API:   ${String(summary.results.latencies.byType.api.p95).padStart(8)}                                  ║
║    POST:  ${String(summary.results.latencies.byType.post.p95).padStart(8)}                                  ║
╚══════════════════════════════════════════════════════════╝

详细报告已保存到 stress-summary.json
`,
  };
}

// ---- 主测试逻辑 ----
export default function () {
  // 使用加权随机分配流量
  //   35% 首页
  //   25% 祝福墙页面
  //   25% API 调用
  //   15% POST 提交
  const route = Math.random();

  if (route < 0.35) {
    // ---- 首页 ----
    group('首页', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/`, { tags: { type: 'page' } });
      homepageTrend.add(Date.now() - start);

      if (![200, 304].includes(res.status) && res.status !== 429) {
        serverErrors.add(1);
      }
      check(res, {
        '首页响应 < 5s': (r) => r.timings.duration < 5000,
      });
    });
    sleep(2 + Math.random() * 4);
  } else if (route < 0.6) {
    // ---- 祝福墙 ----
    group('祝福墙', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/wall`, { tags: { type: 'page' } });
      wallTrend.add(Date.now() - start);

      if (![200, 304].includes(res.status) && res.status !== 429) {
        serverErrors.add(1);
      }
      check(res, {
        '祝福墙响应 < 5s': (r) => r.timings.duration < 5000,
      });
    });
    sleep(2 + Math.random() * 3);

    // 30% 概率再发一次 API 请求（模拟滚动加载）
    if (Math.random() < 0.3) {
      group('API-祝福列表', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/blessings?page=1&pageSize=10`, {
          tags: { type: 'api' },
        });
        apiTrend.add(Date.now() - start);

        if (res.status !== 200 && res.status !== 429) {
          serverErrors.add(1);
        }
        check(res, {
          API响应200: (r) => r.status === 200,
        });
      });
    }
  } else if (route < 0.85) {
    // ---- API 调用 ----
    // 50% 获取祝福列表，50% 获取统计
    if (Math.random() < 0.5) {
      group('API-祝福列表', () => {
        const start = Date.now();
        const res = http.get(
          `${BASE_URL}/api/blessings?page=${1 + Math.floor(Math.random() * 5)}&pageSize=20`,
          {
            tags: { type: 'api' },
          }
        );
        apiTrend.add(Date.now() - start);

        if (res.status !== 200 && res.status !== 429) {
          serverErrors.add(1);
        }
        check(res, {
          '祝福列表 200': (r) => r.status === 200,
        });
      });
    } else {
      group('API-统计', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/blessings/stats`, {
          tags: { type: 'api' },
        });
        apiTrend.add(Date.now() - start);

        if (res.status !== 200 && res.status !== 429) {
          serverErrors.add(1);
        }
        check(res, {
          '统计 200': (r) => r.status === 200,
        });
      });
    }
    sleep(0.5 + Math.random() * 1.5);
  } else {
    // ---- POST 提交祝福 + 送礼（v2.0 契约，先取 CSRF + 词库/礼物） ----
    group('POST-提交祝福', () => {
      // CSRF token（k6 自动管理 per-VU cookie jar）
      const csrfRes = http.get(`${BASE_URL}/api/csrf`, { tags: { type: 'api' } });
      const csrfToken = csrfRes.status === 200 ? csrfRes.json().token : '';

      // 随机词库模板
      let templateId = null;
      const tRes = http.get(`${BASE_URL}/api/templates?pageSize=50`, { tags: { type: 'api' } });
      if (tRes.status === 200) {
        const list = tRes.json().data || [];
        if (list.length > 0) templateId = list[Math.floor(Math.random() * list.length)].id;
      }
      if (!templateId) return;

      // 随机礼物
      let giftId = 'rose';
      const gRes = http.get(`${BASE_URL}/api/gifts`, { tags: { type: 'api' } });
      if (gRes.status === 200) {
        const glist = gRes.json().gifts || [];
        if (glist.length > 0) giftId = glist[Math.floor(Math.random() * glist.length)].id;
      }

      const payload = {
        template_id: templateId,
        gift_id: giftId,
        nickname: `测试用户${Math.floor(Math.random() * 10000)}`,
        class: `测试班级`,
        is_anonymous: Math.random() > 0.5,
      };

      const start = Date.now();
      const res = http.post(`${BASE_URL}/api/blessings`, JSON.stringify(payload), {
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        tags: { type: 'api' },
      });
      postTrend.add(Date.now() - start);

      if (res.status === 429) {
        rateLimitErrors.add(1);
      } else if (res.status !== 201) {
        serverErrors.add(1);
      }

      check(res, {
        'POST 201/429': (r) => r.status === 201 || r.status === 429,
      });
    });
    sleep(3 + Math.random() * 7);
  }
}
