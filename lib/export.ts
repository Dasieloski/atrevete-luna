import { utils, writeFile } from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

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

export function exportExcel(filename: string, rows: ExportRow[], headers: string[]) {
  const ws = utils.json_to_sheet(rows, { header: headers })
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Datos')
  writeFile(wb, `${filename}.xlsx`)
}

export function exportPDF(
  filename: string,
  rows: ExportRow[],
  headers: string[],
  title: string,
  subtitle?: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Title
  doc.setFontSize(16)
  doc.setTextColor(40, 40, 40)
  doc.text(title, 40, 40)

  if (subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(subtitle, 40, 58)
  }

  // Generated at
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 40, subtitle ? 72 : 58)

  const body = rows.map((row) => headers.map((h) => String(row[h] ?? '—')))

  ;(doc as any).autoTable({
    head: [headers],
    body,
    startY: subtitle ? 82 : 68,
    margin: { left: 40, right: 40 },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center' },
    },
  })

  doc.save(`${filename}.pdf`)
}
