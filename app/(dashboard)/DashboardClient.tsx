'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  RefreshCw,
  CalendarDays,
  Table2,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Factory,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
} from 'lucide-react'
import { motion } from 'motion/react'
import { DateRangeFilter } from '@/src/components/DateRangeFilter'
import { ProductionCalendar } from '@/src/components/dashboard/ProductionCalendar'
import { DailySummaryTable } from '@/src/components/dashboard/DailySummaryTable'
import { DailyResumenTable, type ResumenRow } from '@/src/components/dashboard/DailyResumenTable'
import { DayDetailModal } from '@/src/components/dashboard/DayDetailModal'
import { DashboardCharts } from '@/src/components/dashboard/DashboardCharts'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Button } from '@/src/components/ui/Button'
import { StatCard } from '@/src/components/StatCard'
import { Tabs } from '@/src/components/ui/Tabs'

import { Badge } from '@/src/components/ui/Badge'
import { cn } from '@/src/lib/utils'
import type { DateRange } from '@/src/lib/business'
import { formatCurrency, formatNumber, formatDate, yearStartInputDate, todayInputDate } from '@/src/lib/format'

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
  fromLocation: string
  toLocation: string
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

interface PaymentRecord {
  id: string
  amount: number
  date: string
  type: string
  notes: string | null
}

interface DebtRecord {
  amount: number
  paidAmount: number
  date: string
}

interface DayProduction {
  date: string
  production: Record<string, number>
  transfers: Record<string, number>
  sales: Record<string, { quantity: number; total: number }>
  factoryValue: number
  warehouseValue: number
  distributionValue: number
  payments: number
}

interface DashboardData {
  products: ProductInfo[]
  productions: ProductionRecord[]
  transfers: TransferRecord[]
  sales: SaleRecord[]
  waste: WasteRecord[]
  payments: PaymentRecord[]
  totalDebt: number
}

function buildDailyData(
  productions: ProductionRecord[],
  transfers: TransferRecord[],
  sales: SaleRecord[],
  payments: PaymentRecord[],
  products: ProductInfo[]
): Record<string, DayProduction> {
  const map: Record<string, DayProduction> = {}

  for (const p of productions) {
    const key = p.date.slice(0, 10)
    if (!map[key])
      map[key] = {
        date: key,
        production: {},
        transfers: {},
        sales: {},
        factoryValue: 0,
        warehouseValue: 0,
        distributionValue: 0,
        payments: 0,
      }
    map[key].production[p.productId] =
      (map[key].production[p.productId] || 0) + p.quantity
  }

  for (const t of transfers) {
    const key = t.date.slice(0, 10)
    if (!map[key])
      map[key] = {
        date: key,
        production: {},
        transfers: {},
        sales: {},
        factoryValue: 0,
        warehouseValue: 0,
        distributionValue: 0,
        payments: 0,
      }
    map[key].transfers[t.productId] =
      (map[key].transfers[t.productId] || 0) + t.quantity
  }

  for (const s of sales) {
    const key = s.date.slice(0, 10)
    if (!map[key])
      map[key] = {
        date: key,
        production: {},
        transfers: {},
        sales: {},
        factoryValue: 0,
        warehouseValue: 0,
        distributionValue: 0,
        payments: 0,
      }
    if (!map[key].sales[s.productId])
      map[key].sales[s.productId] = { quantity: 0, total: 0 }
    map[key].sales[s.productId].quantity += s.quantity
    map[key].sales[s.productId].total += s.total
  }

  for (const p of payments) {
    const key = p.date.slice(0, 10)
    if (!map[key])
      map[key] = {
        date: key,
        production: {},
        transfers: {},
        sales: {},
        factoryValue: 0,
        warehouseValue: 0,
        distributionValue: 0,
        payments: 0,
      }
    map[key].payments += p.amount
  }

  const priceMap: Record<string, number> = {}
  for (const prod of products) priceMap[prod.id] = prod.priceWarehouse

  for (const [, day] of Object.entries(map)) {
    let factoryVal = 0
    let warehouseVal = 0
    let distVal = 0

    for (const [prodId, qty] of Object.entries(day.production)) {
      const price = priceMap[prodId] || 0
      factoryVal += qty * price
    }

    for (const [prodId, qty] of Object.entries(day.transfers)) {
      const price = priceMap[prodId] || 0
      warehouseVal += qty * price
    }

    for (const [, saleData] of Object.entries(day.sales)) {
      distVal += saleData.total
    }

    day.factoryValue = factoryVal
    day.warehouseValue = warehouseVal
    day.distributionValue = distVal
  }

  // Re-calculate factoryValue based on transfers from factory to main (recogidas)
  // This overrides the production-based factoryValue
  for (const t of transfers) {
    if (t.fromLocation === 'factory' && t.toLocation === 'main') {
      const key = t.date.slice(0, 10)
      if (map[key]) {
        const price = priceMap[t.productId] || 0
        map[key].factoryValue += t.quantity * price
      }
    }
  }

  return map
}

type View = 'calendar' | 'table' | 'charts'

export default function DashboardClient() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: yearStartInputDate(), to: todayInputDate() })
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('calendar')
  const [allTimeData, setAllTimeData] = useState<DashboardData | null>(null)
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const refresh = useCallback(async (range: DateRange) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/dashboard-data?from=${range.from}&to=${range.to}`
      )
      if (!res.ok) throw new Error('Error al cargar datos')
      const json: DashboardData = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh(dateRange)
  }, [dateRange, refresh])

  useEffect(() => {
    const loadAllTime = async () => {
      try {
        const res = await fetch(
          `/api/dashboard-data?from=1970-01-01&to=${todayInputDate()}`
        )
        if (res.ok) {
          const json: DashboardData = await res.json()
          setAllTimeData(json)
        }
      } catch {
        // silently fail
      }
    }
    loadAllTime()
  }, [])

  const dailyData = useMemo(() => {
    if (!data) return {}
    return buildDailyData(
      data.productions,
      data.transfers,
      data.sales,
      data.payments,
      data.products
    )
  }, [data])

  // Running debt balance per day
  const dailyDebtBalance = useMemo(() => {
    if (!data) return {}
    
    // Get all unique dates sorted
    const dates = Object.keys(dailyData).sort()
    if (dates.length === 0) return {}

    // Calculate cumulative debt created and paid per day
    const result: Record<string, { debtCreated: number; debtPaid: number; remaining: number }> = {}
    
    let cumulativeDebt = 0
    let cumulativePaid = 0

    for (const date of dates) {
      const day = dailyData[date]
      
      // Debt created = factory value (production at warehouse price)
      cumulativeDebt += day.factoryValue
      cumulativePaid += day.payments
      
      result[date] = {
        debtCreated: cumulativeDebt,
        debtPaid: cumulativePaid,
        remaining: +(cumulativeDebt - cumulativePaid).toFixed(2),
      }
    }

    return result
  }, [dailyData, data])

  const allTimeDailyData = useMemo(() => {
    if (!allTimeData) return {}
    return buildDailyData(
      allTimeData.productions,
      allTimeData.transfers,
      allTimeData.sales,
      allTimeData.payments,
      allTimeData.products
    )
  }, [allTimeData])

  // Running debt balance for every date that has data
  const allTimeDebtBalance = useMemo(() => {
    if (!allTimeData) return {}
    const dates = Object.keys(allTimeDailyData).sort()
    if (dates.length === 0) return {}
    const result: Record<string, number> = {}
    let cumulativeDebt = 0
    let cumulativePaid = 0
    for (const date of dates) {
      const day = allTimeDailyData[date]
      cumulativeDebt += day.factoryValue
      cumulativePaid += day.payments
      result[date] = +(cumulativeDebt - cumulativePaid).toFixed(2)
    }
    return result
  }, [allTimeDailyData, allTimeData])

  // Running stock per day by product
  const stockByDate = useMemo(() => {
    if (!allTimeData) return {}
    const dates = Object.keys(allTimeDailyData).sort()
    const factoryStock: Record<string, number> = {}
    const warehouseStock: Record<string, number> = {}
    const result: Record<string, { factoryStock: Record<string, number>; warehouseStock: Record<string, number> }> = {}

    for (const date of dates) {
      const day = allTimeDailyData[date]
      for (const prod of allTimeData.products) {
        const produced = day.production[prod.id] || 0
        const transferred = day.transfers[prod.id] || 0
        const sold = day.sales[prod.id]?.quantity || 0

        factoryStock[prod.id] = (factoryStock[prod.id] || 0) + produced - transferred
        warehouseStock[prod.id] = (warehouseStock[prod.id] || 0) + transferred - sold
      }

      const fs: Record<string, number> = {}
      const ws: Record<string, number> = {}
      for (const prod of allTimeData.products) {
        const upb = prod.unitsPerBox || 1
        fs[prod.id] = Math.max(0, upb > 0 ? Math.floor((factoryStock[prod.id] || 0) / upb) : (factoryStock[prod.id] || 0))
        ws[prod.id] = Math.max(0, upb > 0 ? Math.floor((warehouseStock[prod.id] || 0) / upb) : (warehouseStock[prod.id] || 0))
      }

      result[date] = { factoryStock: fs, warehouseStock: ws }
    }
    return result
  }, [allTimeDailyData, allTimeData])

  const allTimeSummaryRows = useMemo(() => {
    if (!allTimeData) return []

    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // All dates with data, sorted
    const dataDates = Object.keys(allTimeDailyData).sort()
    let lastRemaining = 0

    const rows: ResumenRow[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const day = allTimeDailyData[dateStr]

      // Find remaining for this date
      if (allTimeDebtBalance[dateStr] !== undefined) {
        lastRemaining = allTimeDebtBalance[dateStr]
      }

      const row: ResumenRow = {
        date: dateStr,
        products: {},
        transfers: {},
        sales: {},
        factoryStock: {},
        warehouseStock: {},
        payments: day ? day.payments : 0,
        remaining: lastRemaining,
      }

      for (const prod of allTimeData.products) {
        // Produced
        const prodUnits = day ? (day.production[prod.id] || 0) : 0
        const prodBoxes = prod.unitsPerBox > 0 ? Math.floor(prodUnits / prod.unitsPerBox) : 0
        const prodValue = prodUnits * (prod.priceWarehouse || 0)
        row.products[prod.id] = { boxes: prodBoxes, value: prodValue }

        // Transferred (recogido)
        const transUnits = day ? (day.transfers[prod.id] || 0) : 0
        const transBoxes = prod.unitsPerBox > 0 ? Math.floor(transUnits / prod.unitsPerBox) : 0
        const transValue = transUnits * (prod.priceWarehouse || 0)
        row.transfers[prod.id] = { boxes: transBoxes, value: transValue }

        // Sold (vendido)
        const saleUnits = day ? (day.sales[prod.id]?.quantity || 0) : 0
        const saleBoxes = prod.unitsPerBox > 0 ? Math.floor(saleUnits / prod.unitsPerBox) : 0
        const saleValue = day ? (day.sales[prod.id]?.total || 0) : 0
        row.sales[prod.id] = { boxes: saleBoxes, value: saleValue }

        // Stock
        const stock = stockByDate[dateStr]
        row.factoryStock[prod.id] = stock?.factoryStock[prod.id] ?? 0
        row.warehouseStock[prod.id] = stock?.warehouseStock[prod.id] ?? 0
      }

      rows.push(row)
    }

    return rows.reverse()
  }, [allTimeDailyData, allTimeDebtBalance, allTimeData, calendarMonth, stockByDate])

  const allTimeTotalPending = useMemo(() => {
    if (allTimeSummaryRows.length === 0) return 0
    const lastRemaining = allTimeSummaryRows[0].remaining
    return lastRemaining > 0 ? lastRemaining : 0
  }, [allTimeSummaryRows])

  const allTimeTotalPaid = useMemo(() => {
    return allTimeSummaryRows.reduce((s, r) => s + r.payments, 0)
  }, [allTimeSummaryRows])

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

  const calendarDailyData = useMemo(() => {
    if (!allTimeData) return {}
    const year = calendarMonth.getFullYear()
    const month = String(calendarMonth.getMonth() + 1).padStart(2, '0')
    const prefix = `${year}-${month}`
    const filtered: Record<string, DayProduction> = {}
    for (const [date, day] of Object.entries(allTimeDailyData)) {
      if (date.startsWith(prefix)) {
        filtered[date] = day
      }
    }
    return filtered
  }, [allTimeDailyData, allTimeData, calendarMonth])

  return (
    <div>
      <PageHeader
        eyebrow="Resumen"
        title="Panel de control"
        description="Producción, almacén, ventas y deudas en un solo lugar."
        actions={
          <Button
            variant="secondary"
            leadingIcon={
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            }
            onClick={() => refresh(dateRange)}
            disabled={loading}
          >
            {loading ? 'Cargando…' : 'Actualizar'}
          </Button>
        }
      />

      {data && data.totalDebt > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-medium text-warning">Deuda pendiente</p>
            <p className="text-graphite">
              Hay{' '}
              <strong className="font-semibold text-ink">
                {formatCurrency(data.totalDebt)}
              </strong>{' '}
              en deudas por liquidar.
              <a
                href="/deudas"
                className="ts-link ml-1 text-primary"
              >
                Ir a pagos
              </a>
            </p>
          </div>
        </motion.div>
      )}

      {data && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Producido"
            value={totalProduction.toLocaleString('es-ES')}
            hint="Unidades en el período"
            icon={Factory}
            accent="primary"
          />
          <StatCard
            label="Vendido"
            value={`${totalSalesQty.toLocaleString('es-ES')} uds`}
            hint="Unidades vendidas"
            icon={ShoppingCart}
            accent="success"
          />
          <StatCard
            label="Ingresos"
            value={formatCurrency(totalSalesAmount)}
            hint="Total facturado"
            icon={TrendingUp}
            accent="primary"
          />
          <StatCard
            label="Deuda"
            value={formatCurrency(data.totalDebt)}
            hint={data.totalDebt > 0 ? 'Por liquidar' : 'Al día'}
            icon={CreditCard}
            accent={data.totalDebt > 0 ? 'warning' : 'success'}
          />
        </div>
      )}

      <div className="mb-6">
        <DateRangeFilter
          value={dateRange}
          onChange={setDateRange}
          presets={['today', 'thisWeek', 'thisMonth', 'lastMonth', 'thisYear', 'all']}
        />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-error/30 bg-error-soft px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-20 text-muted">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          <span className="text-sm">Cargando datos…</span>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          {/* Resumen */}
          <section className="ts-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <Table2 className="h-4 w-4 text-muted" />
                <h2 className="text-sm font-medium text-ink">Resumen</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCalendarMonth(
                      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                    )
                  }
                  className="ts-btn-icon"
                  aria-label="Mes anterior"
                  title="Mes anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input
                  type="month"
                  value={`${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split('-').map(Number)
                    setCalendarMonth(new Date(y, m - 1, 1))
                  }}
                  className="rounded-md border border-hairline bg-surface px-2 py-1 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() =>
                    setCalendarMonth(
                      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                    )
                  }
                  className="ts-btn-icon"
                  aria-label="Mes siguiente"
                  title="Mes siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCalendarMonth(new Date())}
                  className="ml-1 rounded-md border border-hairline bg-ash/50 px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-ash hover:text-ink"
                >
                  Hoy
                </button>
              </div>
            </div>
            <DailyResumenTable
              rows={allTimeSummaryRows}
              products={allTimeData?.products ?? []}
              totalPending={allTimeTotalPending}
              totalPaid={allTimeTotalPaid}
            />
          </section>

          <div className="overflow-x-auto">
            <Tabs
              value={view}
              onChange={(v) => setView(v as View)}
              tabs={[
                {
                  id: 'calendar',
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Calendario
                    </span>
                  ),
                },
                {
                  id: 'table',
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <Table2 className="h-3.5 w-3.5" />
                      Detalle
                    </span>
                  ),
                },
                {
                  id: 'charts',
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Gráficos
                    </span>
                  ),
                },
              ]}
            />
          </div>

          {view === 'calendar' && (
            <div className="ts-card-pad">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-ink">
                  Calendario de producción
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCalendarMonth(
                        new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                      )
                    }
                    className="ts-btn-icon"
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[120px] text-center text-xs text-muted-soft">
                    {calendarMonth.toLocaleDateString('es-ES', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    onClick={() =>
                      setCalendarMonth(
                        new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                      )
                    }
                    className="ts-btn-icon"
                    aria-label="Mes siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mb-4 text-xs text-muted">
                Cada celda muestra la producción del día por producto.
              </p>
              <ProductionCalendar
                products={allTimeData?.products ?? []}
                dailyData={calendarDailyData}
                currentMonth={calendarMonth}
                onCellClick={(date) => setSelectedDate(date)}
              />
            </div>
          )}

          {view === 'table' && (
            <div className="ts-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
                <h2 className="text-sm font-medium text-ink">Resumen detallado</h2>
              </div>
              <DailySummaryTable
                products={data.products}
                dailyData={dailyData}
              />
            </div>
          )}

          {view === 'charts' && (
            <div className="ts-card-pad">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-ink">
                  Gráficos y análisis
                </h2>
                <ChevronDown className="h-4 w-4 -rotate-90 text-muted-soft" />
              </div>
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

          <DayDetailModal
            open={!!selectedDate}
            onClose={() => setSelectedDate(null)}
            date={selectedDate ?? ''}
            dayData={selectedDate ? calendarDailyData[selectedDate] : undefined}
            products={allTimeData?.products ?? []}
            stockData={selectedDate ? stockByDate[selectedDate] : undefined}
          />
        </div>
      )}
    </div>
  )
}
