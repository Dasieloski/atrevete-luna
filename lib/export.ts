import { utils, writeFile } from 'xlsx'
import jsPDF from 'jspdf'
import { applyPlugin, autoTable } from 'jspdf-autotable'

applyPlugin(jsPDF as any)

export interface ExportRow {
  [key: string]: string | number | null | undefined
}

export function exportCSV(filename: string, rows: ExportRow[], headers: string[]) {
  const headerRow = headers.join(',')
  const dataRows = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h]
        if (val === null || val === undefined) return ''
        const str = String(val).replace(/"/g, '""')
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str}"`
        }
        return str
      })
      .join(',')
  )
  const csv = [headerRow, ...dataRows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

export function exportExcel(
  filename: string,
  rows: ExportRow[],
  headers: string[],
  totalsRow?: ExportRow
) {
  const allRows = totalsRow ? [...rows, totalsRow] : rows
  const ws = utils.json_to_sheet(allRows, { header: headers })

  const colWidths = headers.map((h) => {
    const maxLen = Math.max(
      h.length,
      ...allRows.map((r) => String(r[h] ?? '').length)
    )
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) }
  })
  ws['!cols'] = colWidths

  if (totalsRow) {
    const range = utils.decode_range(ws['!ref'] || 'A1')
    const lastRow = range.e.r
    for (let c = 0; c < headers.length; c++) {
      const cellRef = utils.encode_cell({ r: lastRow, c })
      const cell = ws[cellRef]
      if (cell) {
        cell.s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E293B' } },
          alignment: { horizontal: 'right' },
        }
      }
    }
  }

  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Datos')
  writeFile(wb, `${filename}.xlsx`)
}

export interface PDFOptions {
  title: string
  subtitle?: string
  columnStyles?: Record<number, { halign?: 'left' | 'center' | 'right' }>
  totalsRow?: ExportRow
}

export function exportPDF(
  filename: string,
  rows: ExportRow[],
  headers: string[],
  options: PDFOptions
) {
  const { title, subtitle, columnStyles, totalsRow } = options
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

  doc.setFontSize(16)
  doc.setTextColor(20, 20, 20)
  doc.text(title, 40, 40)

  let cursorY = subtitle ? 58 : 48

  if (subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(subtitle, 40, cursorY)
    cursorY += 14
  }

  doc.setFontSize(9)
  doc.setTextColor(140, 140, 140)
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 40, cursorY)
  cursorY += 18

  const body = rows.map((row) => headers.map((h) => String(row[h] ?? '—')))
  const foot = totalsRow
    ? [headers.map((h) => String(totalsRow[h] ?? ''))]
    : undefined

  autoTable(doc as any, {
    head: [headers],
    body,
    foot,
    startY: cursorY,
    margin: { left: 40, right: 40 },
    styles: {
      fontSize: 9,
      cellPadding: 5,
      overflow: 'linebreak',
      valign: 'middle',
      lineColor: [220, 220, 220],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'right',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: columnStyles ?? {},
  } as any)

  doc.save(`${filename}.pdf`)
}
