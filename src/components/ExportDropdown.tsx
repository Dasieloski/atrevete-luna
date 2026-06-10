'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react'
import { exportCSV, exportExcel, exportPDF } from '@/lib/export'

interface ExportDropdownProps {
  rows: Record<string, string | number | null | undefined>[]
  headers: string[]
  filename: string
  pdfTitle: string
  pdfSubtitle?: string
  disabled?: boolean
}

export function ExportDropdown({
  rows,
  headers,
  filename,
  pdfTitle,
  pdfSubtitle,
  disabled = false,
}: ExportDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [open])

  function handleExport(format: 'csv' | 'excel' | 'pdf') {
    if (rows.length === 0) return
    if (format === 'csv') exportCSV(filename, rows, headers)
    else if (format === 'excel') exportExcel(filename, rows, headers)
    else exportPDF(filename, rows, headers, pdfTitle, pdfSubtitle)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled || rows.length === 0}
        className="ts-btn-sm inline-flex items-center gap-1.5 disabled:opacity-40"
      >
        <Download className="h-3.5 w-3.5" />
        Exportar
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-44 rounded-md border border-hairline bg-canvas shadow-lg">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface"
          >
            <FileText className="h-4 w-4 text-muted" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport('excel')}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface"
          >
            <FileSpreadsheet className="h-4 w-4 text-success" />
            Excel
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface"
          >
            <File className="h-4 w-4 text-error" />
            PDF
          </button>
        </div>
      )}
    </div>
  )
}
