import { describe, expect, it } from 'vitest';
import { basenameNoExt, downloadWorkbook, sanitizeSheetName } from './markdown-tools';

describe('basenameNoExt', () => {
  it('strips directory and extension', () => {
    expect(basenameNoExt('conductor/rules/common/harness-contract.md')).toBe('harness-contract');
  });

  it('handles a bare filename', () => {
    expect(basenameNoExt('CLAUDE.md')).toBe('CLAUDE');
  });

  it('leaves an extensionless path untouched', () => {
    expect(basenameNoExt('README')).toBe('README');
  });
});

describe('downloadWorkbook', () => {
  it('returns false without touching the DOM when there are no tables', async () => {
    await expect(downloadWorkbook('doc', [])).resolves.toBe(false);
  });
});

// Regression for a real bug: table titles come from markdown headings, which
// routinely contain characters ExcelJS's addWorksheet() rejects outright
// (colons, slashes, brackets) — e.g. "## API: GET /users". Un-sanitized, the
// very first real-world doc with such a heading threw and the export menu
// item failed silently behind the generic error alert.
describe('sanitizeSheetName', () => {
  it('strips characters ExcelJS forbids in a worksheet name', () => {
    expect(sanitizeSheetName('API: GET /users', 'Table 1')).toBe('API GET users');
    expect(sanitizeSheetName('Q&A [draft]', 'Table 1')).toBe('Q&A draft');
    expect(sanitizeSheetName('50% complete?', 'Table 1')).toBe('50% complete');
  });

  it('strips a leading/trailing single quote', () => {
    expect(sanitizeSheetName("'Quoted Title'", 'Table 1')).toBe('Quoted Title');
  });

  it('falls back when the name is empty or "History" after cleaning', () => {
    expect(sanitizeSheetName('///', 'Table 1')).toBe('Table 1');
    expect(sanitizeSheetName('History', 'Table 1')).toBe('Table 1');
  });

  it('truncates to 31 characters', () => {
    const long = 'A'.repeat(50);
    expect(sanitizeSheetName(long, 'Table 1')).toHaveLength(31);
  });

  it('produces names ExcelJS actually accepts for addWorksheet()', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const dirtyTitles = ['API: GET /users', 'Q&A [draft]', "'Quoted'", 'History', '///'];
    for (const [i, title] of dirtyTitles.entries()) {
      expect(() => workbook.addWorksheet(sanitizeSheetName(title, `Table ${i + 1}`))).not.toThrow();
    }
  });
});
