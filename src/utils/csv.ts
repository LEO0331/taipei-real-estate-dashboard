const formulaStart = /^[\s\u0000-\u001f]*[=+\-@＝＋－＠\t\r\n]/u;

export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  // Mark formula-like source text as literal while preserving typed numbers.
  const safeText = typeof value === 'string' && formulaStart.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(',');
}
