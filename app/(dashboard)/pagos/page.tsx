'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Receipt,
  Search,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { EmptyState } from '@/src/components/EmptyState'
import { DateRangeFilter } from '@/src/components/DateRangeFilter'
import { ExportDropdown } from '@/src/components/ExportDropdown'
import { formatDate, formatNumber, formatCurrency, todayInputDate, monthStartInputDate } from '@/src/lib/format'
import type { DateRange } from '@/src/lib/business'

interface Transfer {
  id: string
  productId: string
  fromLocation: string
  toLocation: string
  quantity: number
  date: string
  product: { priceWarehouse: number; unitsPerBox: number }
}

interface Payment {
  id: string
  amount: number
  currency: string
  usdAmount: number | null
  cupAmount: number | null
  boxes: number | null
  date: string
  type: string
}

interface DayRow {
  date: string
  recogidasCajas: number
  recogidasUSD: number
  pagosCUP: number
  pagosUSD: number
  pagosCajas: number
  pendienteUSD: number
  pendienteCajas: number
}

const FACTORY_PRICE = 0.49
const UNITS_PER_BOX = 100

function defaultRange(): DateRange {
  return { from: monthStartInputDate(), to: todayInputDate() }
}

export default function PagosPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    setError('')
    try {
      const [transfersRes, paymentsRes] = await Promise.all([
        fetch('/api/transfers'),
        fetch('/api/payments'),
      ])

      if (!transfersRes.ok) throw new Error('Error cargando recogidas')
      if (!paymentsRes.ok) throw new Error('Error cargando pagos')

      setTransfers(await transfersRes.json())
      setPayments(await paymentsRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const rows = useMemo(() => {
    const fromStr = range.from || '2000-01-01'
    const toStr = range.to || todayInputDate()
    const fromTs = new Date(fromStr + 'T00:00:00').getTime()
    const toTs = new Date(toStr + 'T23:59:59').getTime()

    // Agrupar recogidas (transfers factory -> main) por día
    const recogidasByDay = new Map<string, number>()
    const recogidasUSDByDay = new Map<string, number>()
    for (const t of transfers) {
      if (t.fromLocation !== 'factory' || t.toLocation !== 'main') continue
      const d = new Date(t.date).toISOString().split('T')[0]
      const ts = new Date(d + 'T00:00:00').getTime()
      if (ts < fromTs || ts > toTs) continue
      const prev = recogidasByDay.get(d) || 0
      const price = t.product?.priceWarehouse ?? FACTORY_PRICE
      const upb = t.product?.unitsPerBox || UNITS_PER_BOX
      const boxes = t.quantity / upb
      recogidasByDay.set(d, prev + boxes)
      recogidasUSDByDay.set(d, (recogidasUSDByDay.get(d) || 0) + t.quantity * price)
    }

    // Agrupar pagos por día
    const payCUPByDay = new Map<string, number>()
    const payUSDByDay = new Map<string, number>()
    const payBoxesByDay = new Map<string, number>()
    for (const p of payments) {
      const d = new Date(p.date).toISOString().split('T')[0]
      const ts = new Date(d + 'T00:00:00').getTime()
      if (ts < fromTs || ts > toTs) continue
      if (p.currency === 'CUP' && p.cupAmount) {
        payCUPByDay.set(d, (payCUPByDay.get(d) || 0) + p.cupAmount)
      }
      const usd = p.usdAmount ?? p.amount
      if (usd) {
        payUSDByDay.set(d, (payUSDByDay.get(d) || 0) + usd)
      }
      // Cajas pagadas: si viene en el payment usarla, si no calcular desde USD
      const boxesPaid = p.boxes ?? (usd > 0 ? usd / (UNITS_PER_BOX * FACTORY_PRICE) : 0)
      if (boxesPaid > 0) {
        payBoxesByDay.set(d, (payBoxesByDay.get(d) || 0) + boxesPaid)
      }
    }

    // Deuda acumulada (recogidas factory -> main) hasta cada día
    const allTransfers = transfers
      .filter((t) => t.fromLocation === 'factory' && t.toLocation === 'main')
      .filter((t) => {
        const ts = new Date(t.date).getTime()
        return ts >= new Date('2000-01-01T00:00:00').getTime() && ts <= toTs
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const allPayments = payments
      .filter((p) => {
        const ts = new Date(p.date).getTime()
        return ts >= new Date('2000-01-01T00:00:00').getTime() && ts <= toTs
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let runningDebt = 0
    let runningPayments = 0
    const debtByDay = new Map<string, number>()
    const paymentsByDay = new Map<string, number>()

    for (const tr of allTransfers) {
      const d = new Date(tr.date).toISOString().split('T')[0]
      const price = tr.product?.priceWarehouse ?? FACTORY_PRICE
      runningDebt += tr.quantity * price
      debtByDay.set(d, runningDebt)
    }

    for (const p of allPayments) {
      const d = new Date(p.date).toISOString().split('T')[0]
      const usd = p.usdAmount ?? p.amount
      runningPayments += usd
      paymentsByDay.set(d, runningPayments)
    }

    // Calcular acumulado previo al rango
    let prevDebt = 0
    let prevPayments = 0
    for (const [d, val] of debtByDay.entries()) {
      if (d < fromStr && val > prevDebt) prevDebt = val
    }
    for (const [d, val] of paymentsByDay.entries()) {
      if (d < fromStr && val > prevPayments) prevPayments = val
    }

    // Construir filas: generar todos los días en el rango para propagar acumulados
    const result: DayRow[] = []
    const start = new Date(fromStr + 'T00:00:00')
    const end = new Date(toStr + 'T00:00:00')

    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const d = dt.toISOString().split('T')[0]

      const recogidasCajas = recogidasByDay.get(d) || 0
      const recogidasUSD = recogidasUSDByDay.get(d) || 0
      const pagosCUP = payCUPByDay.get(d) || 0
      const pagosUSD = payUSDByDay.get(d) || 0
      const pagosCajas = payBoxesByDay.get(d) || 0

      // Propagar acumulados si no hay movimiento ese día
      const debtUntil = debtByDay.get(d) ?? prevDebt
      const paymentsUntil = paymentsByDay.get(d) ?? prevPayments
      const pendienteUSD = Math.max(0, +(debtUntil - paymentsUntil).toFixed(2))
      const pendienteCajas = pendienteUSD > 0 ? +(pendienteUSD / (UNITS_PER_BOX * FACTORY_PRICE)).toFixed(2) : 0

      prevDebt = debtUntil
      prevPayments = paymentsUntil

      result.push({
        date: d,
        recogidasCajas,
        recogidasUSD,
        pagosCUP,
        pagosUSD,
        pagosCajas,
        pendienteUSD,
        pendienteCajas,
      })
    }

    return result
      .filter((r) => {
        if (!search) return true
        return r.date.includes(search)
      })
      .sort((a, b) => {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime()
        return sortDir === 'desc' ? diff : -diff
      })
  }, [transfers, payments, range, search, sortDir])

  const totals = useMemo(() => {
    let recogidasCajas = 0, recogidasUSD = 0, pagosCUP = 0, pagosUSD = 0, pagosCajas = 0
    for (const r of rows) {
      recogidasCajas += r.recogidasCajas
      recogidasUSD += r.recogidasUSD
      pagosCUP += r.pagosCUP
      pagosUSD += r.pagosUSD
      pagosCajas += r.pagosCajas
    }
    // Pendiente es el del último día (acumulado)
    const lastPendienteUSD = rows.length > 0 ? rows[0].pendienteUSD : 0
    const lastPendienteCajas = rows.length > 0 ? rows[0].pendienteCajas : 0
    return { recogidasCajas, recogidasUSD, pagosCUP, pagosUSD, pagosCajas, pendienteUSD: lastPendienteUSD, pendienteCajas: lastPendienteCajas }
  }, [rows])

  const exportRows = useMemo(() => {
    return rows.map((r) => ({
      Fecha: formatDate(r.date),
      'Recogidas Cajas': r.recogidasCajas,
      'Recogidas USD': r.recogidasUSD,
      'Pagos CUP': r.pagosCUP || '',
      'Pagos USD': r.pagosUSD,
      'Pagos Cajas': r.pagosCajas,
      'Pendiente USD': r.pendienteUSD,
      'Pendiente Cajas': r.pendienteCajas,
    }))
  }, [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resumen"
        title="Pagos a la fábrica"
        description="Seguimiento diario de recogidas, pagos y saldos pendientes con la fábrica."
      />

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-coral/30 bg-coral-soft px-4 py-3 text-sm text-coral-dark">
          <FileText className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <DateRangeFilter value={range} onChange={setRange} />

      {/* Stats cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ts-card flex flex-col gap-1 p-4">
          <span className="text-xs text-stone">Recogidas (cajas)</span>
          <span className="text-2xl font-semibold text-ink">{formatNumber(totals.recogidasCajas)}</span>
          <span className="text-xs text-muted">{formatCurrency(totals.recogidasUSD)} USD</span>
        </div>
        <div className="ts-card flex flex-col gap-1 p-4">
          <span className="text-xs text-stone">Pagos USD</span>
          <span className="text-2xl font-semibold text-success">{formatCurrency(totals.pagosUSD)}</span>
          <span className="text-xs text-muted">{formatNumber(totals.pagosCajas)} cajas</span>
        </div>
        <div className="ts-card flex flex-col gap-1 p-4">
          <span className="text-xs text-stone">Pagos CUP</span>
          <span className="text-2xl font-semibold text-primary">{totals.pagosCUP > 0 ? formatNumber(totals.pagosCUP) : '—'}</span>
          <span className="text-xs text-muted">{totals.pagosCUP > 0 ? 'Total trimestre' : 'Sin pagos CUP'}</span>
        </div>
        <div className="ts-card flex flex-col gap-1 p-4">
          <span className="text-xs text-stone">Pendiente</span>
          <span className="text-2xl font-semibold text-error">{formatCurrency(totals.pendienteUSD)}</span>
          <span className="text-xs text-muted">{formatNumber(totals.pendienteCajas)} cajas</span>
        </div>
      </section>

      {/* Table */}
      <section className="ts-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-medium text-ink">Detalle diario</h2>
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
              {rows.length} día{rows.length !== 1 ? 's' : ''}
            </span>
            <ExportDropdown
              rows={exportRows}
              headers={['Fecha', 'Recogidas Cajas', 'Recogidas USD', 'Pagos CUP', 'Pagos USD', 'Pagos Cajas', 'Pendiente USD', 'Pendiente Cajas']}
              filename={`pagos_${range.from}_${range.to}`}
              pdfTitle="Pagos a la Fábrica"
              pdfSubtitle={`Período: ${range.from} a ${range.to}`}
              disabled={rows.length === 0}
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Sin datos en este período"
            description="No hay recogidas ni pagos registrados en el rango de fechas seleccionado."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              {/* ========== HEADER ROW 1: Main groups ========== */}
              <thead>
                <tr>
                  {/* Fecha */}
                  <th
                    rowSpan={2}
                    className="border border-hairline px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-steel align-bottom"
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

                  {/* Recogidas — group header */}
                  <th
                    colSpan={2}
                    className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-blue bg-blue-soft/30"
                  >
                    Recogidas
                  </th>

                  {/* Pagos — group header */}
                  <th
                    colSpan={3}
                    className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-success bg-success-soft/30"
                  >
                    Pagos
                  </th>

                  {/* Pendientes — group header */}
                  <th
                    colSpan={2}
                    className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-error bg-error-soft/30"
                  >
                    Pendientes
                  </th>
                </tr>

                {/* ========== HEADER ROW 2: Sub-columns ========== */}
                <tr>
                  {/* Recogidas sub-columns */}
                  <th className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-blue-soft/20">
                    Cajas
                  </th>
                  <th className="border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-blue-soft/20">
                    USD
                  </th>

                  {/* Pagos sub-columns */}
                  <th className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-success-soft/20">
                    CUP
                  </th>
                  <th className="border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-success-soft/20">
                    USD
                  </th>
                  <th className="border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-success-soft/20">
                    Cajas
                  </th>

                  {/* Pendientes sub-columns */}
                  <th className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-error-soft/20">
                    USD
                  </th>
                  <th className="border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-error-soft/20">
                    Cajas
                  </th>
                </tr>
              </thead>

              {/* ========== BODY ========== */}
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={r.date}
                    className={
                      idx % 2 === 0 ? 'bg-canvas' : 'bg-surface/30'
                    }
                  >
                    {/* Fecha */}
                    <td className="border border-hairline px-4 py-3 whitespace-nowrap font-mono text-[13px] text-ink">
                      {formatDate(r.date)}
                    </td>

                    {/* Recogidas */}
                    <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono text-charcoal bg-blue-soft/10">
                      {formatNumber(r.recogidasCajas)}
                    </td>
                    <td className="border border-hairline px-4 py-3 text-right font-mono text-charcoal bg-blue-soft/10">
                      {formatCurrency(r.recogidasUSD)}
                    </td>

                    {/* Pagos */}
                    <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono text-primary bg-success-soft/10">
                      {r.pagosCUP > 0 ? formatNumber(r.pagosCUP) : '—'}
                    </td>
                    <td className="border border-hairline px-4 py-3 text-right font-mono text-success bg-success-soft/10">
                      {formatCurrency(r.pagosUSD)}
                    </td>
                    <td className="border border-hairline px-4 py-3 text-right font-mono text-charcoal bg-success-soft/10">
                      {formatNumber(r.pagosCajas)}
                    </td>

                    {/* Pendientes */}
                    <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono font-semibold text-error bg-error-soft/10">
                      {formatCurrency(r.pendienteUSD)}
                    </td>
                    <td className="border border-hairline px-4 py-3 text-right font-mono text-charcoal bg-error-soft/10">
                      {formatNumber(r.pendienteCajas)}
                    </td>
                  </tr>
                ))}

                {/* ========== TOTALS ROW ========== */}
                <tr className="bg-surface font-semibold">
                  <td className="border border-hairline px-4 py-3 text-right text-sm uppercase tracking-wider text-ink">
                    Total
                  </td>

                  {/* Recogidas totals */}
                  <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono text-sm text-ink bg-blue-soft/20">
                    {formatNumber(totals.recogidasCajas)}
                  </td>
                  <td className="border border-hairline px-4 py-3 text-right font-mono text-sm text-ink bg-blue-soft/20">
                    {formatCurrency(totals.recogidasUSD)}
                  </td>

                  {/* Pagos totals */}
                  <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono text-sm text-primary bg-success-soft/20">
                    {totals.pagosCUP > 0 ? formatNumber(totals.pagosCUP) : '—'}
                  </td>
                  <td className="border border-hairline px-4 py-3 text-right font-mono text-sm text-success bg-success-soft/20">
                    {formatCurrency(totals.pagosUSD)}
                  </td>
                  <td className="border border-hairline px-4 py-3 text-right font-mono text-sm text-ink bg-success-soft/20">
                    {formatNumber(totals.pagosCajas)}
                  </td>

                  {/* Pendientes totals */}
                  <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono text-sm text-error bg-error-soft/20">
                    {formatCurrency(totals.pendienteUSD)}
                  </td>
                  <td className="border border-hairline px-4 py-3 text-right font-mono text-sm text-ink bg-error-soft/20">
                    {formatNumber(totals.pendienteCajas)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
