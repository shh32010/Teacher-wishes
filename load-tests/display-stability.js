// 大屏模式稳定性测试
// 测试目标：验证大屏模式长时间运行不卡顿、内存不泄漏

import http from 'k6/http';
import { sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// 测试配置
export const options = {
  // 模拟 1 个用户持续访问大屏模式 10 分钟
  vus: 1,
  duration: '10m',

  // 阈值
  thresholds: {
    errors: ['rate<0.01'], // 错误率 < 1%
    response_time: ['p(95)<2000'], // 95% 响应时间 < 2s
  },
};

// 测试场景
export default function displayStabilityTest() {
  // 1. 访问大屏页面
  const displayRes = http.get('http://localhost:3000/display', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  errorRate.add(displayRes.status !== 200);
  responseTime.add(displayRes.timings.duration);

  // 2. 模拟轮播间隔（每 5 秒切换一次）
  sleep(5);

  // 3. 获取祝福列表（模拟 Realtime 更新）
  const blessingsRes = http.get('http://localhost:3000/api/blessings?page=1&pageSize=10');
  errorRate.add(blessingsRes.status !== 200);
  responseTime.add(blessingsRes.timings.duration);

  // 4. 等待下一轮
  sleep(5);
}

// 测试开始时
export function setup() {
  console.log('开始大屏稳定性测试...');
  console.log('测试时长：10 分钟');
  console.log('验证目标：无内存泄漏、无卡顿、响应时间稳定');
}

// 测试结束时
export function teardown() {
  console.log('大屏稳定性测试完成');
  console.log('检查指标：');
  console.log('- 错误率应 < 1%');
  console.log('- 95% 响应时间应 < 2s');
  console.log('- 内存使用应稳定（需手动监控）');
}
