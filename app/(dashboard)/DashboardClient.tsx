'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, CalendarDays, Table2, BarChart3, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { DateRangeFilter, defaultRange } from '@/src/components/DateRangeFilter'
import { ProductionCalendar } from '@/src/components/dashboard/ProductionCalendar'
import { DailySummaryTable } from '@/src/components/dashboard/DailySummaryTable'
import { DashboardCharts } from '@/src/components/dashboard/DashboardCharts'
import type { DateRange } from '@/src/lib/business'
import { formatCurrency } from '@/src/lib/format'

interface ProductInfo {
  id: string
  name: string
  priceWarehouse: number
  priceDistribution: number
  unitsPerBox: number
}

interface ProductionRecord {
  id: string
  productId: string
  boxes: number
  unitsPerBox: number
  quantity: number
  date: string
  product: ProductInfo
}

interface TransferRecord {
  id: string
  productId: string
  quantity: number
  date: string
  product: ProductInfo
}

interface SaleRecord {
  id: string
  productId: string
  quantity: number
  total: number
  date: string
  product: ProductInfo
  customer: { name: string; province: string }
}

interface WasteRecord {
  id: string
  productId: string
  quantity: number
  date: string
  product: ProductInfo
}

interface DayProduction {
  date: string
  production: Record<string, number>
  transfers: Record<string, number>
  sales: Record<string, { quantity: number; total: number }>
  factoryValue: number
}

interface DashboardData {
  products: ProductInfo[]
  productions: ProductionRecord[]
  transfers: TransferRecord[]
  sales: SaleRecord[]
  waste: WasteRecord[]
  totalDebt: number
}

function buildDailyData(productions: ProductionRecord[], transfers: TransferRecord[], sales: SaleRecord[], products: ProductInfo[]): Record<string, DayProduction> {
  const map: Record<string, DayProduction> = {}

  for (const p of productions) {
    const key = p.date.slice(0, 10)
    if (!map[key]) map[key] = { date: key, production: {}, transfers: {}, sales: {}, factoryValue: 0 }
    map[key].production[p.productId] = (map[key].production[p.productId] || 0) + p.quantity
  }

  for (const t of transfers) {
    const key = t.date.slice(0, 10)
    if (!map[key]) map[key] = { date: key, production: {}, transfers: {}, sales: {}, factoryValue: 0 }
    map[key].transfers[t.productId] = (map[key].transfers[t.productId] || 0) + t.quantity
  }

  for (const s of sales) {
    const key = s.date.slice(0, 10)
    if (!map[key]) map[key] = { date: key, production: {}, transfers: {}, sales: {}, factoryValue: 0 }
    if (!map[key].sales[s.productId]) map[key].sales[s.productId] = { quantity: 0, total: 0 }
    map[key].sales[s.productId].quantity += s.quantity
    map[key].sales[s.productId].total += s.total
  }

  const priceMap: Record<string, number> = {}
  for (const prod of products) {
    priceMap[prod.id] = prod.priceWarehouse
  }

  for (const [, day] of Object.entries(map)) {
    let value = 0
    for (const [prodId, qty] of Object.entries(day.production)) {
      value += qty * (priceMap[prodId] || 0)
    }
    day.factoryValue = value
  }

  return map
}

export default function DashboardClient() {
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(true)
  const [showTable, setShowTable] = useState(true)
  const [showCharts, setShowCharts] = useState(true)

  const refresh = useCallback(async (range: DateRange) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard-data?from=${range.from}&to=${range.to}`)
      if (!res.ok) throw new Error('Error al cargar datos')
      const json: DashboardData = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load data on mount and when date range changes
  useEffect(() => { refresh(dateRange) }, [dateRange]) // eslint-disable-line

  const dailyData = useMemo(() => {
    if (!data) return {}
    return buildDailyData(data.productions, data.transfers, data.sales, data.products)
  }, [data])

  const currentMonth = useMemo(() => {
    if (dateRange.from) {
      return new Date(dateRange.from + 'T12:00:00')
    }
    return new Date()
  }, [dateRange])

  const totalProduction = useMemo(
    () => data?.productions.reduce((s, p) => s + p.quantity, 0) ?? 0,
    [data]
  )
  const totalSalesAmount = useMemo(
    () => data?.sales.reduce((s, sl) => s + sl.total, 0) ?? 0,
    [data]
  )
  const totalSalesQty = useMemo(
    () => data?.sales.reduce((s, sl) => s + sl.quantity, 0) ?? 0,
    [data]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Panel de Control</h1>
          <p className="text-sm text-muted">Producción, almacén, ventas y análisis</p>
        </div>
        <button
          onClick={() => refresh(dateRange)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-surface-card hover:bg-surface-soft border border-hairline text-body rounded-lg transition-colors w-fit cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Debt Alert */}
      {data && data.totalDebt > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-warning">Deuda Pendiente</h4>
            <p className="text-sm text-warning/95 mt-0.5">
              Hay <strong>{formatCurrency(data.totalDebt)}</strong> en deudas por liquidar.
              <a href="/deudas" className="ml-1 font-medium underline hover:text-warning">Ir a pagos</a>
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {data && (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="bg-surface-card rounded-xl px-4 py-3 border border-hairline flex items-center gap-3">
            <span className="text-xs text-muted font-semibold uppercase tracking-wider">Producido</span>
            <span className="text-lg font-bold text-ink font-mono ml-auto">{totalProduction.toLocaleString()}</span>
          </div>
          <div className="bg-surface-card rounded-xl px-4 py-3 border border-hairline flex items-center gap-3">
            <span className="text-xs text-muted font-semibold uppercase tracking-wider">Vendido</span>
            <span className="text-lg font-bold text-ink font-mono ml-auto">{totalSalesQty.toLocaleString()} uds</span>
          </div>
          <div className="bg-surface-card rounded-xl px-4 py-3 border border-hairline flex items-center gap-3">
            <span className="text-xs text-muted font-semibold uppercase tracking-wider">Ingresos</span>
            <span className="text-lg font-bold text-accent-teal font-mono ml-auto">{formatCurrency(totalSalesAmount)}</span>
          </div>
          <div className="bg-surface-card rounded-xl px-4 py-3 border border-hairline flex items-center gap-3">
            <span className="text-xs text-muted font-semibold uppercase tracking-wider">Deuda</span>
            <span className={`text-lg font-bold font-mono ml-auto ${data.totalDebt > 0 ? 'text-warning' : 'text-success'}`}>
              {formatCurrency(data.totalDebt)}
            </span>
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <DateRangeFilter value={dateRange} onChange={setDateRange} presets={['today', 'thisWeek', 'thisMonth', 'lastMonth', 'thisYear', 'all']} />

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-muted">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">Cargando datos...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-error text-sm">
          Error: {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Calendar Section */}
          <div className="bg-surface-card rounded-xl border border-hairline">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-ink">Calendario de Producción</h2>
              </div>
              {showCalendar ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </button>
            {showCalendar && (
              <div className="px-5 pb-5">
                <p className="text-xs text-muted mb-3">
                  {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  {' · '}Cada celda muestra la producción del día por producto
                </p>
                <ProductionCalendar
                  products={data.products}
                  dailyData={dailyData}
                  currentMonth={currentMonth}
                  dateRange={dateRange}
                />
              </div>
            )}
          </div>

          {/* Table Section */}
          <div className="bg-surface-card rounded-xl border border-hairline">
            <button
              onClick={() => setShowTable(!showTable)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-2">
                <Table2 className="w-5 h-5 text-accent-teal" />
                <h2 className="text-base font-bold text-ink">Resumen Diario</h2>
              </div>
              {showTable ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </button>
            {showTable && (
              <div className="px-5 pb-5">
                <DailySummaryTable products={data.products} dailyData={dailyData} />
              </div>
            )}
          </div>

          {/* Charts Section */}
          <div className="bg-surface-card rounded-xl border border-hairline">
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent-amber" />
                <h2 className="text-base font-bold text-ink">Gráficos y Análisis</h2>
              </div>
              {showCharts ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </button>
            {showCharts && (
              <div className="px-5 pb-5">
                <DashboardCharts
                  products={data.products}
                  dailyData={dailyData}
                  productions={data.productions}
                  transfers={data.transfers}
                  sales={data.sales}
                  totalDebt={data.totalDebt}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
