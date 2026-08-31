// ============================================================
// AI Provider Adapter — openai 兼容接口统一封装
// 默认 DeepSeek（用户拍板，全活动用量 < ¥1），备选智谱 GLM-4-Flash（免费）/ SiliconFlow
// 无 AI_API_KEY 时抛出 AiNotConfiguredError，调用方走规则降级
// ============================================================

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiChatResult {
  content: string;
  model: string;
}

/** AI 未配置（无 key）— 调用方应降级到规则方案，不影响核心链路 */
export class AiNotConfiguredError extends Error {
  constructor() {
    super('AI_API_KEY 未配置');
    this.name = 'AiNotConfiguredError';
  }
}

interface ProviderConfig {
  baseUrl: string;
  model: string;
}

/** 支持的供应商（openai 兼容格式） */
const PROVIDERS: Record<string, ProviderConfig> = {
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  siliconflow: { baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen3-8B' },
};

/** 解析供应商配置（环境变量驱动，禁止硬编码 key；默认 DeepSeek） */
function resolveProvider(): ProviderConfig {
  const name = (process.env.AI_PROVIDER || 'deepseek').toLowerCase();
  return PROVIDERS[name] || PROVIDERS.deepseek;
}

/**
 * 调用 LLM 对话补全
 * @param options.maxTokens 输出上限（默认 4000——批量分类 50 条的 JSON 输出约 3000 token，
 *   过小会截断 JSON 导致解析失败）
 * @throws AiNotConfiguredError 未配置 key
 * @throws Error 网络/服务端错误
 */
export async function chat(
  messages: AiChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<AiChatResult> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new AiNotConfiguredError();
  }

  const provider = resolveProvider();
  const model = process.env.AI_MODEL || provider.model;

  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4000,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`AI 服务错误 (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content || '';
  if (!content) {
    throw new Error('AI 返回内容为空');
  }
  return { content, model: data.model || model };
}

/**
 * 宽松解析 LLM 返回的 JSON：
 * 容忍 ```json 代码块包裹、前后缀说明文字、单引号、尾逗号
 */
export function parseJsonLoose<T>(raw: string): T {
  let text = raw.trim();

  // 剥离 ```json ... ``` 代码块
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  } else {
    // 无代码块：截取第一个 { 到最后一个 }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      text = text.slice(start, end + 1);
    }
  }

  // 宽容处理：单引号换双引号、去尾逗号
  text = text.replace(/'([^']*)':/g, '"$1":').replace(/,\s*([}\]])/g, '$1');

  return JSON.parse(text) as T;
}

/** 判断错误是否为「未配置」类型 */
export function isNotConfigured(err: unknown): err is AiNotConfiguredError {
  return err instanceof AiNotConfiguredError;
}
