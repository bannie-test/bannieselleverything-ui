export type CsvColumn<T> = { header: string; value: (row: T) => string | number | boolean | null | undefined }

/** Downloads `rows` as a UTF-8 CSV (with BOM, so Excel shows Vietnamese correctly). */
export function downloadCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]) {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  const lines = [columns.map((c) => escape(c.header)).join(','), ...rows.map((r) => columns.map((c) => escape(c.value(r))).join(','))]
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
