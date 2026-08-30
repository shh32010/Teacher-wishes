// ============================================================
// CSV 解析工具 — 供词库批量导入使用（支持引号包裹/转义）
// ============================================================

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/**
 * 解析 CSV 文本（RFC 4180 子集：逗号分隔、双引号包裹、"" 转义、\r\n 换行）
 * 第一行作为表头返回，其余行作为数据行返回
 */
export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // 包裹字段内的转义引号 ""
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === '') {
      // 仅字段起始引号进入包裹模式（RFC 4180）；字段中间的引号按字面处理
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else if (ch !== '\r') {
      field += ch;
    }
  }

  // 收尾：最后一行的最后一个字段（换行结尾时 field/row 均为空，跳过）
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.length > 0 ? rows.shift()! : [];
  return { headers, rows };
}
