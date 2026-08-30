// ============================================================
// AI 工具层单元测试 — 仪式文案矩阵 / 规则分类降级 / JSON 宽松解析
// ============================================================

import { describe, it, expect } from 'vitest';
import { getGiftMessage } from '@/lib/ai/messages';
import { ruleClassify, VALID_CATEGORIES } from '@/lib/ai/prompts';
import { parseJsonLoose, AiNotConfiguredError, isNotConfigured } from '@/lib/ai/provider';

describe('getGiftMessage 仪式文案矩阵', () => {
  it('应该覆盖 6 情绪 × 8 礼物全部组合且不重复', () => {
    const giftIds = ['rose', 'star', 'book', 'chalk', 'coffee', 'letter', 'apple', 'sapling'];
    const seen = new Set<string>();
    for (const emotion of VALID_CATEGORIES) {
      for (const giftId of giftIds) {
        const message = getGiftMessage(emotion, giftId);
        expect(message.length).toBeGreaterThan(5);
        expect(seen.has(message)).toBe(false);
        seen.add(message);
      }
    }
    expect(seen.size).toBe(48);
  });

  it('未知组合应降级为通用文案', () => {
    const message = getGiftMessage(null, 'unknown_gift');
    expect(message).toContain('被温柔以待');
  });

  it('已知礼物 + 未知情绪应使用礼物词', () => {
    const message = getGiftMessage(null, 'rose');
    expect(message).toContain('这束花');
  });
});

describe('ruleClassify 规则分类降级', () => {
  it('「谢谢/感恩」关键词 → 感恩类', () => {
    expect(ruleClassify('谢谢您三年的陪伴').category).toBe('感恩');
  });

  it('「愿/祝福」关键词 → 祝愿类', () => {
    expect(ruleClassify('愿您桃李满天下').category).toBe('祝愿');
  });

  it('「青春/毕业」关键词 → 青春类', () => {
    expect(ruleClassify('青春有您真好').category).toBe('青春');
  });

  it('「温暖/温柔」关键词 → 温暖类', () => {
    expect(ruleClassify('您温柔的目光').category).toBe('温暖');
  });

  it('「粉笔/桃李」关键词 → 文艺类', () => {
    expect(ruleClassify('一支粉笔写春秋').category).toBe('文艺');
  });

  it('「可爱/有趣」关键词 → 趣味类', () => {
    expect(ruleClassify('您发火的样子可爱极了').category).toBe('趣味');
  });

  it('无关键词命中 → 默认祝愿类 + 心意标签', () => {
    const result = ruleClassify('平平淡淡的一句话');
    expect(result.category).toBe('祝愿');
    expect(result.tags).toEqual(['心意']);
  });
});

describe('parseJsonLoose JSON 宽松解析', () => {
  it('应该解析标准 JSON', () => {
    const result = parseJsonLoose<{ a: number }>('{"a": 1}');
    expect(result.a).toBe(1);
  });

  it('应该剥离 ```json 代码块', () => {
    const result = parseJsonLoose<{ a: number }>('```json\n{"a": 2}\n```');
    expect(result.a).toBe(2);
  });

  it('应该剥离前后缀说明文字', () => {
    const result = parseJsonLoose<{ a: number }>('好的，结果如下：{"a": 3} 以上就是全部');
    expect(result.a).toBe(3);
  });

  it('应该容忍尾逗号', () => {
    const result = parseJsonLoose<{ a: number; b: string }>('{"a": 4, "b": "x",}');
    expect(result.a).toBe(4);
    expect(result.b).toBe('x');
  });
});

describe('AiNotConfiguredError', () => {
  it('isNotConfigured 应正确识别未配置错误', () => {
    expect(isNotConfigured(new AiNotConfiguredError())).toBe(true);
    expect(isNotConfigured(new Error('网络错误'))).toBe(false);
  });
});
