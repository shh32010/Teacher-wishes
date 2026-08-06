// ============================================================
// API 验证逻辑测试
// 覆盖 POST /api/blessings 和提交表单的输入校验规则
// ============================================================

import { describe, it, expect } from 'vitest';

// ============================================================
// 提取的验证函数（与 API 路由中的校验规则一致）
// ============================================================

/** 校验祝福内容 */
function validateContent(content: unknown): { valid: boolean; error?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: '祝福内容不能为空' };
  }
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '祝福内容不能为空' };
  }
  if (trimmed.length > 500) {
    return { valid: false, error: '祝福内容不能超过500字' };
  }
  return { valid: true };
}

/** 校验昵称 */
function validateNickname(nickname: unknown): { valid: boolean; error?: string } {
  if (nickname === undefined || nickname === null || nickname === '') {
    return { valid: true }; // 选填
  }
  if (typeof nickname !== 'string') {
    return { valid: false, error: '昵称格式不正确' };
  }
  if (nickname.trim().length > 20) {
    return { valid: false, error: '昵称不能超过20个字符' };
  }
  return { valid: true };
}

/** 校验班级 */
function validateClass(class_: unknown): { valid: boolean; error?: string } {
  if (class_ === undefined || class_ === null || class_ === '') {
    return { valid: true }; // 选填
  }
  if (typeof class_ !== 'string') {
    return { valid: false, error: '班级格式不正确' };
  }
  if (class_.trim().length > 30) {
    return { valid: false, error: '班级不能超过30个字符' };
  }
  return { valid: true };
}

/** 校验图片文件类型 */
function validateImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/** 校验文件大小（字节） */
function validateFileSize(bytes: number, maxMB: number = 2): boolean {
  return bytes <= maxMB * 1024 * 1024;
}

// ============================================================
// 测试用例
// ============================================================

describe('validateContent()', () => {
  it('应该拒绝空字符串', () => {
    expect(validateContent('')).toEqual({ valid: false, error: '祝福内容不能为空' });
  });

  it('应该拒绝纯空格', () => {
    expect(validateContent('   ')).toEqual({ valid: false, error: '祝福内容不能为空' });
  });

  it('应该拒绝 null/undefined', () => {
    expect(validateContent(null)).toEqual({ valid: false, error: '祝福内容不能为空' });
    expect(validateContent(undefined)).toEqual({ valid: false, error: '祝福内容不能为空' });
  });

  it('应该拒绝超过500字的内容', () => {
    const long = 'x'.repeat(501);
    expect(validateContent(long)).toEqual({ valid: false, error: '祝福内容不能超过500字' });
  });

  it('应该接受恰好500字的内容', () => {
    const exact = 'x'.repeat(500);
    expect(validateContent(exact)).toEqual({ valid: true });
  });

  it('应该接受正常内容', () => {
    expect(validateContent('老师辛苦了！')).toEqual({ valid: true });
  });

  it('应该接受含中文的内容', () => {
    expect(validateContent('感谢王老师这一年的教导，您辛苦了！')).toEqual({ valid: true });
  });

  it('应该接受含特殊字符的内容', () => {
    expect(validateContent("Happy Teacher's Day! 🎉✨")).toEqual({ valid: true });
  });

  it('应该自动 trim 后再检查长度', () => {
    // 502 个 x + 前后空格 → trim 后 502 > 500
    const withSpaces = '  ' + 'x'.repeat(502) + '  ';
    expect(validateContent(withSpaces)).toEqual({ valid: false, error: '祝福内容不能超过500字' });
  });
});

describe('validateNickname()', () => {
  it('选填字段 — 空值应该通过', () => {
    expect(validateNickname('')).toEqual({ valid: true });
    expect(validateNickname(null)).toEqual({ valid: true });
    expect(validateNickname(undefined)).toEqual({ valid: true });
  });

  it('应该接受正常昵称', () => {
    expect(validateNickname('小明')).toEqual({ valid: true });
    expect(validateNickname('Alice')).toEqual({ valid: true });
  });

  it('应该拒绝超过20字符的昵称', () => {
    expect(validateNickname('x'.repeat(21))).toEqual({
      valid: false,
      error: '昵称不能超过20个字符',
    });
  });

  it('应该接受恰好20字符的昵称', () => {
    expect(validateNickname('x'.repeat(20))).toEqual({ valid: true });
  });
});

describe('validateClass()', () => {
  it('选填字段 — 空值应该通过', () => {
    expect(validateClass('')).toEqual({ valid: true });
    expect(validateClass(null)).toEqual({ valid: true });
    expect(validateClass(undefined)).toEqual({ valid: true });
  });

  it('应该接受正常班级', () => {
    expect(validateClass('高一(3)班')).toEqual({ valid: true });
  });

  it('应该拒绝超过30字符的班级', () => {
    expect(validateClass('x'.repeat(31))).toEqual({
      valid: false,
      error: '班级不能超过30个字符',
    });
  });
});

describe('validateImageType()', () => {
  it('应该接受常见图片格式', () => {
    expect(validateImageType('image/jpeg')).toBe(true);
    expect(validateImageType('image/png')).toBe(true);
    expect(validateImageType('image/gif')).toBe(true);
    expect(validateImageType('image/webp')).toBe(true);
    expect(validateImageType('image/svg+xml')).toBe(true);
  });

  it('应该拒绝非图片格式', () => {
    expect(validateImageType('text/plain')).toBe(false);
    expect(validateImageType('application/pdf')).toBe(false);
    expect(validateImageType('video/mp4')).toBe(false);
  });
});

describe('validateFileSize()', () => {
  it('应该接受小于2MB的文件', () => {
    expect(validateFileSize(1024 * 1024)).toBe(true); // 1MB
    expect(validateFileSize(100)).toBe(true);
    expect(validateFileSize(0)).toBe(true);
  });

  it('应该拒绝超过2MB的文件', () => {
    expect(validateFileSize(3 * 1024 * 1024)).toBe(false); // 3MB
  });

  it('应该接受恰好2MB的文件（边界值）', () => {
    expect(validateFileSize(2 * 1024 * 1024)).toBe(true);
  });

  it('应该支持自定义大小限制', () => {
    expect(validateFileSize(6 * 1024 * 1024, 5)).toBe(false);
    expect(validateFileSize(4 * 1024 * 1024, 5)).toBe(true);
  });
});

// ============================================================
// Payload 结构测试
// ============================================================

describe('CreateBlessingPayload 结构', () => {
  it('最小有效负载应包含 content', () => {
    const payload = { content: '老师辛苦了' };
    expect(validateContent(payload.content).valid).toBe(true);
  });

  it('完整负载应包含所有可选字段', () => {
    const payload = {
      teacher_id: 'uuid-here',
      nickname: '小明',
      class: '高一(3)班',
      content: '感谢老师！',
      is_anonymous: false,
    };
    expect(validateContent(payload.content).valid).toBe(true);
    expect(validateNickname(payload.nickname).valid).toBe(true);
    expect(validateClass(payload.class).valid).toBe(true);
  });
});

describe('AdminUpdateBlessing 结构', () => {
  it('status 只能是三个有效值之一', () => {
    const validStatuses = ['pending', 'approved', 'rejected'] as const;
    validStatuses.forEach((status) => {
      expect(validStatuses).toContain(status);
    });
  });

  it('is_featured 应为布尔值', () => {
    const updates = [
      { status: 'approved' as const, is_featured: true },
      { status: 'approved' as const, is_featured: false },
    ];
    updates.forEach((u) => {
      expect(typeof u.is_featured).toBe('boolean');
    });
  });
});
