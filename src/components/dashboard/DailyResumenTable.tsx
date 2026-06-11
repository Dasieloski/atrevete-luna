'use client'

import { useMemo, useState } from 'react'
import {
  Receipt,
  Search,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  FileSpreadsheet,
  File,
} from 'lucide-react'
import { ExportDropdown } from '@/src/components/ExportDropdown'
import { EmptyState } from '@/src/components/EmptyState'
import { formatDate, formatNumber, formatCurrency } from '@/src/lib/format'
import { cn } from '@/src/lib/utils'

export interface ProductInfo {
  id: string
  name: string
  priceWarehouse: number
  priceDistribution: number
  unitsPerBox: number
}

export interface ProductBreakdown {
  boxes: number
  value: number
}

export interface ResumenRow {
  date: string
  products: Record<string, ProductBreakdown>
  transfers: Record<string, ProductBreakdown>
  sales: Record<string, ProductBreakdown>
  factoryStock: Record<string, number>
  warehouseStock: Record<string, number>
  payments: number
  remaining: number
}

export interface DailyResumenTableProps {
  rows: ResumenRow[]
  products: ProductInfo[]
  totalPending: number
  totalPaid: number
}

export function DailyResumenTable({
  rows,
  products,
  totalPending,
  totalPaid,
}: DailyResumenTableProps) {
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('asc')

  const displayRows = useMemo(() => {
    const filtered = !search
      ? rows
      : rows.filter((r) => r.date.includes(search))
    return [...filtered].sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime()
      return sortDir === 'desc' ? diff : -diff
    })
  }, [rows, search, sortDir])

  const totals = useMemo(() => {
    const t: {
      products: Record<string, { boxes: number; value: number }>
      transfers: Record<string, { boxes: number; value: number }>
      sales: Record<string, { boxes: number; value: number }>
      payments: number
      remaining: number
    } = {
      products: {},
      transfers: {},
      sales: {},
      payments: 0,
      remaining: 0,
    }
    for (const row of displayRows) {
      for (const prod of products) {
        if (!t.products[prod.id]) t.products[prod.id] = { boxes: 0, value: 0 }
        if (!t.transfers[prod.id]) t.transfers[prod.id] = { boxes: 0, value: 0 }
        if (!t.sales[prod.id]) t.sales[prod.id] = { boxes: 0, value: 0 }
        const pb = row.products[prod.id]
        if (pb) { t.products[prod.id].boxes += pb.boxes; t.products[prod.id].value += pb.value }
        const tb = row.transfers[prod.id]
        if (tb) { t.transfers[prod.id].boxes += tb.boxes; t.transfers[prod.id].value += tb.value }
        const sb = row.sales[prod.id]
        if (sb) { t.sales[prod.id].boxes += sb.boxes; t.sales[prod.id].value += sb.value }
      }
      t.payments += row.payments
    }
    if (displayRows.length > 0) {
      const firstRow = sortDir === 'desc' ? displayRows[0] : displayRows[displayRows.length - 1]
      t.remaining = firstRow.remaining
    }
    return t
  }, [displayRows, products, sortDir])

  const exportRows = useMemo(() => {
    const list = displayRows.map((r) => {
      const result: Record<string, string | number> = { Fecha: formatDate(r.date) }
      for (const prod of products) {
        result[`Producido ${prod.name}`] = formatNumber(r.products[prod.id]?.boxes ?? 0)
        result[`Recogido ${prod.name}`] = formatNumber(r.transfers[prod.id]?.boxes ?? 0)
        result[`Vendido ${prod.name}`] = formatNumber(r.sales[prod.id]?.boxes ?? 0)
      }
      result['Pagos USD'] = formatCurrency(r.payments)
      result['Pendiente USD'] = formatCurrency(r.remaining)
      return result
    })
    return list
  }, [displayRows, products])

  const exportHeaders = useMemo(() => {
    const headers: string[] = ['Fecha']
    for (const prod of products) {
      headers.push(`Producido ${prod.name}`)
      headers.push(`Recogido ${prod.name}`)
      headers.push(`Vendido ${prod.name}`)
    }
    headers.push('Pagos USD', 'Pendiente USD')
    return headers
  }, [products])

  const exportTotals = useMemo(() => {
    const result: Record<string, string | number> = { Fecha: 'TOTAL' }
    for (const prod of products) {
      result[`Producido ${prod.name}`] = formatNumber(totals.products[prod.id]?.boxes ?? 0)
      result[`Recogido ${prod.name}`] = formatNumber(totals.transfers[prod.id]?.boxes ?? 0)
      result[`Vendido ${prod.name}`] = formatNumber(totals.sales[prod.id]?.boxes ?? 0)
    }
    result['Pagos USD'] = formatCurrency(totals.payments)
    result['Pendiente USD'] = formatCurrency(totals.remaining)
    return result
  }, [totals, products])

  const columnAligns = useMemo<(('left' | 'center' | 'right')[])>(() => {
    const aligns: ('left' | 'center' | 'right')[] = ['center']
    for (let i = 0; i < products.length * 3; i++) aligns.push('right')
    aligns.push('right', 'right')
    return aligns
  }, [products.length])

  if (rows.length === 0) {
    return (
      <div className="ts-card-pad text-center text-sm text-muted">
        No hay datos para mostrar
      </div>
    )
  }

  const hasProducts = products.length > 0

  return (
    <section className="ts-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-medium text-ink">Resumen diario</h2>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar fecha (YYYY-MM-DD)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ts-input h-8 w-48 pl-8 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-hairline px-2 text-xs text-charcoal hover:bg-surface"
          >
            {sortDir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
            {sortDir === 'desc' ? 'Más reciente' : 'Más antiguo'}
          </button>
          <span className="text-xs text-muted">
            {displayRows.length} día{displayRows.length !== 1 ? 's' : ''}
          </span>
          <ExportDropdown
            rows={exportRows}
            headers={exportHeaders}
            filename={`resumen_diario`}
            pdfTitle="Resumen Diario"
            pdfSubtitle={`Período: ${displayRows[displayRows.length - 1]?.date ?? ''} a ${displayRows[0]?.date ?? ''}`}
            totalsRow={exportTotals}
            columnAligns={columnAligns}
            disabled={displayRows.length === 0}
          />
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 gap-3 border-b border-hairline bg-surface/40 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone">Pendiente con fábrica:</span>
          <span className="text-sm font-semibold tabular-nums text-error">
            {formatCurrency(totalPending)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone">Pagado a fábrica:</span>
          <span className="text-sm font-semibold tabular-nums text-success">
            {formatCurrency(totalPaid)}
          </span>
        </div>
      </div>

      {displayRows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin datos en este período"
          description="No hay movimientos en el rango de fechas seleccionado."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            {/* Header row 1: groups */}
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="border border-hairline px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-steel align-bottom bg-surface/40"
                >
                  <button
                    type="button"
                    onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                    className="flex items-center gap-1"
                  >
                    Fecha
                    {sortDir === 'desc' ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronUp className="h-3.5 w-3.5" />
                    )}
                  </button>
                </th>

                {hasProducts && (
                  <th
                    colSpan={products.length}
                    className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-blue bg-blue-soft/30"
                  >
                    Producido
                  </th>
                )}

                {hasProducts && (
                  <th
                    colSpan={products.length}
                    className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50"
                  >
                    Recogido
                  </th>
                )}

                {hasProducts && (
                  <th
                    colSpan={products.length}
                    className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50"
                  >
                    Vendido
                  </th>
                )}

                <th
                  colSpan={2}
                  className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-primary bg-primary-soft/30"
                >
                  Pagos a fábrica
                </th>
              </tr>

              {/* Header row 2: per product */}
              <tr>
                {products.map((prod, i) => (
                  <th
                    key={`p-${prod.id}`}
                    className={cn(
                      'border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-blue-soft/20',
                      i === 0 && 'border-l-2 border-l-steel/30'
                    )}
                  >
                    {prod.name}
                  </th>
                ))}
                {products.map((prod, i) => (
                  <th
                    key={`r-${prod.id}`}
                    className={cn(
                      'border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-emerald-50/60',
                      i === 0 && 'border-l-2 border-l-steel/30'
                    )}
                  >
                    {prod.name}
                  </th>
                ))}
                {products.map((prod, i) => (
                  <th
                    key={`s-${prod.id}`}
                    className={cn(
                      'border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-amber-50/60',
                      i === 0 && 'border-l-2 border-l-steel/30'
                    )}
                  >
                    {prod.name}
                  </th>
                ))}
                <th className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-primary-soft/20">
                  USD
                </th>
                <th className="border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-primary-soft/20">
                  Pendiente
                </th>
              </tr>
            </thead>

            <tbody>
              {displayRows.map((r, idx) => (
                <tr
                  key={r.date}
                  className={idx % 2 === 0 ? 'bg-canvas' : 'bg-surface/30'}
                >
                  <td className="border border-hairline px-4 py-3 whitespace-nowrap font-mono text-[13px] text-ink">
                    {formatDate(r.date)}
                  </td>
                  {products.map((prod, i) => (
                    <td
                      key={`p-${prod.id}`}
                      className={cn(
                        'border border-hairline px-4 py-3 text-right font-mono text-charcoal bg-blue-soft/10',
                        i === 0 && 'border-l-2 border-l-steel/30'
                      )}
                    >
                      {formatNumber(r.products[prod.id]?.boxes ?? 0)}
                    </td>
                  ))}
                  {products.map((prod, i) => (
                    <td
                      key={`r-${prod.id}`}
                      className={cn(
                        'border border-hairline px-4 py-3 text-right font-mono text-charcoal bg-emerald-50/40',
                        i === 0 && 'border-l-2 border-l-steel/30'
                      )}
                    >
                      {formatNumber(r.transfers[prod.id]?.boxes ?? 0)}
                    </td>
                  ))}
                  {products.map((prod, i) => (
                    <td
                      key={`s-${prod.id}`}
                      className={cn(
                        'border border-hairline px-4 py-3 text-right font-mono text-charcoal bg-amber-50/40',
                        i === 0 && 'border-l-2 border-l-steel/30'
                      )}
                    >
                      {formatNumber(r.sales[prod.id]?.boxes ?? 0)}
                    </td>
                  ))}
                  <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono font-semibold text-success bg-primary-soft/10">
                    {r.payments > 0 ? formatCurrency(r.payments) : '—'}
                  </td>
                  <td className="border border-hairline px-4 py-3 text-right font-mono font-semibold text-error bg-primary-soft/10">
                    {formatCurrency(r.remaining)}
                  </td>
                </tr>
              ))}

              {/* Totals row */}
              <tr className="bg-surface font-semibold">
                <td className="border border-hairline px-4 py-3 text-right text-sm uppercase tracking-wider text-ink">
                  Total
                </td>
                {products.map((prod, i) => (
                  <td
                    key={`tp-${prod.id}`}
                    className={cn(
                      'border border-hairline px-4 py-3 text-right font-mono text-sm text-ink bg-blue-soft/20',
                      i === 0 && 'border-l-2 border-l-steel/30'
                    )}
                  >
                    {formatNumber(totals.products[prod.id]?.boxes ?? 0)}
                  </td>
                ))}
                {products.map((prod, i) => (
                  <td
                    key={`tr-${prod.id}`}
                    className={cn(
                      'border border-hairline px-4 py-3 text-right font-mono text-sm text-ink bg-emerald-50/60',
                      i === 0 && 'border-l-2 border-l-steel/30'
                    )}
                  >
                    {formatNumber(totals.transfers[prod.id]?.boxes ?? 0)}
                  </td>
                ))}
                {products.map((prod, i) => (
                  <td
                    key={`ts-${prod.id}`}
                    className={cn(
                      'border border-hairline px-4 py-3 text-right font-mono text-sm text-ink bg-amber-50/60',
                      i === 0 && 'border-l-2 border-l-steel/30'
                    )}
                  >
                    {formatNumber(totals.sales[prod.id]?.boxes ?? 0)}
                  </td>
                ))}
                <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono text-sm text-success bg-primary-soft/20">
                  {totals.payments > 0 ? formatCurrency(totals.payments) : '—'}
                </td>
                <td className="border border-hairline px-4 py-3 text-right font-mono text-sm text-error bg-primary-soft/20">
                  {formatCurrency(totals.remaining)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
