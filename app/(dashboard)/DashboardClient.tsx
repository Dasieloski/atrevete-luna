'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  RefreshCw,
  CalendarDays,
  Table2,
  BarChart3,
  AlertTriangle,
  ChevronDown,
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
import { DashboardCharts } from '@/src/components/dashboard/DashboardCharts'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Button } from '@/src/components/ui/Button'
import { StatCard } from '@/src/components/StatCard'
import { Tabs } from '@/src/components/ui/Tabs'
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table'
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

  return map
}

type View = 'calendar' | 'table' | 'charts'

export default function DashboardClient() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: yearStartInputDate(), to: todayInputDate() })
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('calendar')

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

  const currentMonth = useMemo(() => {
    if (dateRange.from) return new Date(dateRange.from + 'T12:00:00')
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

  // Table rows for the new daily summary
  const summaryRows = useMemo(() => {
    const dates = Object.keys(dailyData).sort().reverse()
    return dates.map((date) => {
      const day = dailyData[date]
      const debt = dailyDebtBalance[date]
      return {
        date,
        factoryQty: Object.values(day.production).reduce((s, v) => s + v, 0),
        factoryValue: day.factoryValue,
        warehouseQty: Object.values(day.transfers).reduce((s, v) => s + v, 0),
        warehouseValue: day.warehouseValue,
        distributionQty: Object.values(day.sales).reduce((s, v) => s + v.quantity, 0),
        distributionValue: day.distributionValue,
        payments: day.payments,
        remaining: debt?.remaining ?? 0,
      }
    })
  }, [dailyData, dailyDebtBalance])

  const totalFactoryValue = summaryRows.reduce((s, r) => s + r.factoryValue, 0)
  const totalWarehouseValue = summaryRows.reduce((s, r) => s + r.warehouseValue, 0)
  const totalDistributionValue = summaryRows.reduce((s, r) => s + r.distributionValue, 0)
  const totalPayments = summaryRows.reduce((s, r) => s + r.payments, 0)

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
          {/* Daily Summary Table */}
          <section className="ts-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <Table2 className="h-4 w-4 text-muted" />
                <h2 className="text-sm font-medium text-ink">Resumen diario</h2>
              </div>
              <span className="text-xs text-muted">
                {summaryRows.length} día{summaryRows.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH rowSpan={2} className="align-bottom">Fecha</TH>
                    <TH colSpan={2} className="text-center border-b border-hairline-soft">Fábrica</TH>
                    <TH colSpan={2} className="text-center border-b border-hairline-soft">Almacén (Recogida)</TH>
                    <TH colSpan={2} className="text-center border-b border-hairline-soft">Distribución</TH>
                    <TH rowSpan={2} className="text-right align-bottom">Deuda pagada</TH>
                    <TH rowSpan={2} className="text-right align-bottom">Saldo deuda</TH>
                  </TR>
                  <TR>
                    <TH className="text-right text-[10px]">Cantidad</TH>
                    <TH className="text-right text-[10px]">Precio</TH>
                    <TH className="text-right text-[10px]">Cantidad</TH>
                    <TH className="text-right text-[10px]">Precio</TH>
                    <TH className="text-right text-[10px]">Cantidad</TH>
                    <TH className="text-right text-[10px]">Precio</TH>
                  </TR>
                </THead>
                <TBody>
                  {summaryRows.map((row) => (
                    <TR key={row.date}>
                      <TD className="whitespace-nowrap font-mono text-[13px]">
                        {formatDate(row.date)}
                      </TD>
                      <TD className="text-right font-mono">
                        {row.factoryQty > 0 ? formatNumber(row.factoryQty) : '—'}
                      </TD>
                      <TD className="text-right font-mono text-ink">
                        {row.factoryValue > 0 ? formatCurrency(row.factoryValue) : '—'}
                      </TD>
                      <TD className="text-right font-mono">
                        {row.warehouseQty > 0 ? formatNumber(row.warehouseQty) : '—'}
                      </TD>
                      <TD className="text-right font-mono text-ink">
                        {row.warehouseValue > 0 ? formatCurrency(row.warehouseValue) : '—'}
                      </TD>
                      <TD className="text-right font-mono">
                        {row.distributionQty > 0 ? formatNumber(row.distributionQty) : '—'}
                      </TD>
                      <TD className="text-right font-mono text-ink">
                        {row.distributionValue > 0 ? formatCurrency(row.distributionValue) : '—'}
                      </TD>
                      <TD className="text-right font-mono text-success">
                        {row.payments > 0 ? formatCurrency(row.payments) : '—'}
                      </TD>
                      <TD className={cn(
                        'text-right font-mono font-semibold',
                        row.remaining < -0.01 ? 'text-success' : row.remaining > 0.01 ? 'text-error' : 'text-ink'
                      )}>
                        {row.remaining !== 0 ? formatCurrency(Math.abs(row.remaining)) : '—'}
                        {row.remaining < -0.01 && (
                          <Badge tone="success" className="ml-1">Fábrica debe</Badge>
                        )}
                        {row.remaining > 0.01 && (
                          <Badge tone="warning" className="ml-1">Pendiente</Badge>
                        )}
                      </TD>
                    </TR>
                  ))}
                  {/* Totals row */}
                  <TR className="bg-surface font-medium hover:bg-surface">
                    <TD className="text-right uppercase tracking-wider text-ink">Total</TD>
                    <TD colSpan={2} className="text-right font-mono text-primary">
                      {formatCurrency(totalFactoryValue)}
                    </TD>
                    <TD colSpan={2} className="text-right font-mono text-primary">
                      {formatCurrency(totalWarehouseValue)}
                    </TD>
                    <TD colSpan={2} className="text-right font-mono text-primary">
                      {formatCurrency(totalDistributionValue)}
                    </TD>
                    <TD className="text-right font-mono text-success">
                      {formatCurrency(totalPayments)}
                    </TD>
                    <TD className="text-right font-mono">
                      {summaryRows.length > 0 && (
                        <span className={cn(
                          summaryRows[0].remaining < -0.01 ? 'text-success' : 'text-error'
                        )}>
                          {formatCurrency(Math.abs(summaryRows[0].remaining))}
                        </span>
                      )}
                    </TD>
                  </TR>
                </TBody>
              </Table>
            </div>
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
                <span className="text-xs text-muted-soft">
                  {currentMonth.toLocaleDateString('es-ES', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <p className="mb-4 text-xs text-muted">
                Cada celda muestra la producción del día por producto.
              </p>
              <ProductionCalendar
                products={data.products}
                dailyData={dailyData}
                currentMonth={currentMonth}
                dateRange={dateRange}
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
        </div>
      )}
    </div>
  )
}
