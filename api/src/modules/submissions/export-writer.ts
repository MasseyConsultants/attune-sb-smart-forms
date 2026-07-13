// Author: Robert Massey | Created: 2026-07-13 | Module: Submissions
// Purpose: Serializes submission rows to CSV / XLSX buffers for the export
// endpoint. Columns come from the published schema (stable order); values are
// flattened for spreadsheet consumption.

import { Workbook } from 'exceljs';

import type { ExportColumn, SubmissionDto } from './submissions.service';

const META_COLUMNS: ReadonlyArray<{ id: string; label: string }> = [
  { id: '__submittedAt', label: 'Submitted at' },
  { id: '__status', label: 'Status' },
];

function cellValue(row: SubmissionDto, columnId: string): string {
  if (columnId === '__submittedAt') {
    return row.submittedAt ? row.submittedAt.toISOString() : '';
  }
  if (columnId === '__status') {
    return row.status;
  }
  const raw = row.data[columnId];
  if (raw === null || raw === undefined) {
    return '';
  }
  if (Array.isArray(raw)) {
    return raw.map(String).join('; ');
  }
  if (typeof raw === 'object') {
    return JSON.stringify(raw);
  }
  return String(raw);
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function writeCsv(columns: ExportColumn[], rows: SubmissionDto[]): Buffer {
  const allColumns = [...META_COLUMNS, ...columns];
  const lines: string[] = [allColumns.map((c) => csvEscape(c.label)).join(',')];

  for (const row of rows) {
    lines.push(allColumns.map((c) => csvEscape(cellValue(row, c.id))).join(','));
  }

  // BOM so Excel opens UTF-8 CSVs with correct encoding.
  return Buffer.concat([Buffer.from('\uFEFF', 'utf8'), Buffer.from(lines.join('\r\n'), 'utf8')]);
}

export async function writeXlsx(
  sheetName: string,
  columns: ExportColumn[],
  rows: SubmissionDto[],
): Promise<Buffer> {
  const allColumns = [...META_COLUMNS, ...columns];
  const workbook = new Workbook();
  // Excel caps sheet names at 31 chars and rejects a handful of characters.
  const sheet = workbook.addWorksheet(
    sheetName.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Submissions',
  );

  sheet.columns = allColumns.map((c) => ({ header: c.label, key: c.id, width: 24 }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(Object.fromEntries(allColumns.map((c) => [c.id, cellValue(row, c.id)])));
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
