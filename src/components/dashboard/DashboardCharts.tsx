'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
} from 'recharts'
import { formatCurrency, formatNumber } from '@/src/lib/format'

interface ProductInfo {
  id: string
  name: string
  priceWarehouse: number
  priceDistribution: number
  unitsPerBox: number
}

interface DayProduction {
  date: string
  production: Record<string, number>
  transfers: Record<string, number>
  sales: Record<string, { quantity: number; total: number }>
  factoryValue: number
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

interface DashboardChartsProps {
  products: ProductInfo[]
  dailyData: Record<string, DayProduction>
  productions: ProductionRecord[]
  transfers: TransferRecord[]
  sales: SaleRecord[]
  totalDebt: number
}

const COLORS = ['#cc785c', '#5db8a6', '#e8a55a', '#c64545', '#5db872', '#d4a017']

export function DashboardCharts({ products, dailyData, productions, transfers, sales, totalDebt }: DashboardChartsProps) {
  const chartTooltipStyle = {
    backgroundColor: '#efe9de',
    border: '1px solid #e6dfd8',
    borderRadius: '8px',
    fontSize: '12px',
  }

  const dailyTotals = useMemo(() => {
    return Object.values(dailyData)
      .filter((d) => Object.keys(d.production).length > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const totalProd = Object.values(d.production).reduce((s, v) => s + v, 0)
        const totalSales = Object.values(d.sales).reduce((s, v) => s + v.quantity, 0)
        return {
          date: d.date.slice(5),
          produccion: totalProd,
          ventas: totalSales,
          valor: d.factoryValue,
        }
      })
  }, [dailyData])

  const productionByProduct = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of productions) {
      map[p.product.name] = (map[p.product.name] || 0) + p.quantity
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [productions])

  const transfersByProduct = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of transfers) {
      map[t.product.name] = (map[t.product.name] || 0) + t.quantity
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transfers])

  const salesByProduct = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of sales) {
      map[s.product.name] = (map[s.product.name] || 0) + s.total
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
  }, [sales])

  const salesByProvince = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of sales) {
      map[s.customer.province] = (map[s.customer.province] || 0) + s.total
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
  }, [sales])

  const cumulativeData = useMemo(() => {
    let cumProd = 0
    let cumSales = 0
    return Object.values(dailyData)
      .filter((d) => Object.keys(d.production).length > 0 || Object.keys(d.sales).length > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        cumProd += Object.values(d.production).reduce((s, v) => s + v, 0)
        cumSales += Object.values(d.sales).reduce((s, v) => s + v.quantity, 0)
        return {
          date: d.date.slice(5),
          produccionAcumulada: cumProd,
          ventasAcumuladas: cumSales,
        }
      })
  }, [dailyData])

  const weekDayProduction = useMemo(() => {
    const map: Record<string, number[]> = {}
    for (const d of Object.values(dailyData)) {
      const day = new Date(d.date + 'T12:00:00').getDay()
      const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][day]
      if (!map[dayName]) map[dayName] = []
      const total = Object.values(d.production).reduce((s, v) => s + v, 0)
      if (total > 0) map[dayName].push(total)
    }
    return Object.entries(map).map(([name, vals]) => ({
      name,
      promedio: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      total: vals.reduce((s, v) => s + v, 0),
    }))
  }, [dailyData])

  const totalProduced = useMemo(
    () => productions.reduce((s, p) => s + p.quantity, 0),
    [productions]
  )
  const totalTransferred = useMemo(
    () => transfers.reduce((s, t) => s + t.quantity, 0),
    [transfers]
  )
  const totalSalesQty = useMemo(
    () => sales.reduce((s, sl) => s + sl.quantity, 0),
    [sales]
  )
  const totalSalesValue = useMemo(
    () => sales.reduce((s, sl) => s + sl.total, 0),
    [sales]
  )
  const totalFactoryValue = useMemo(
    () => Object.values(dailyData).reduce((s, d) => s + d.factoryValue, 0),
    [dailyData]
  )
  const avgDailyProduction = useMemo(
    () => (Object.keys(dailyData).length > 0 ? Math.round(totalProduced / Object.keys(dailyData).length) : 0),
    [dailyData, totalProduced]
  )
  const avgDailySales = useMemo(
    () => (Object.keys(dailyData).length > 0 ? (totalSalesValue / Object.keys(dailyData).length) : 0),
    [dailyData, totalSalesValue]
  )

  if (dailyTotals.length === 0) {
    return (
      <div className="bg-surface-card rounded-xl border border-hairline p-8 text-center">
        <p className="text-sm text-muted">No hay suficientes datos para generar gráficos</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-surface-card rounded-xl p-4 border border-hairline">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">Total Producido</p>
          <p className="text-xl font-bold text-ink mt-1 font-mono">{formatNumber(totalProduced)}</p>
          <p className="text-xs text-muted mt-0.5">{formatCurrency(totalFactoryValue)} valor fábrica</p>
        </div>
        <div className="bg-surface-card rounded-xl p-4 border border-hairline">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">Transferido a Almacén</p>
          <p className="text-xl font-bold text-accent-teal mt-1 font-mono">{formatNumber(totalTransferred)}</p>
          <p className="text-xs text-muted mt-0.5">{totalTransferred > 0 ? ((totalTransferred / totalProduced) * 100).toFixed(1) : 0}% de la producción</p>
        </div>
        <div className="bg-surface-card rounded-xl p-4 border border-hairline">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">Vendido (uds)</p>
          <p className="text-xl font-bold text-ink mt-1 font-mono">{formatNumber(totalSalesQty)}</p>
          <p className="text-xs text-muted mt-0.5">{formatCurrency(totalSalesValue)} total</p>
        </div>
        <div className="bg-surface-card rounded-xl p-4 border border-hairline">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">Deuda Pendiente</p>
          <p className={`text-xl font-bold mt-1 font-mono ${totalDebt > 0 ? 'text-warning' : 'text-success'}`}>
            {formatCurrency(totalDebt)}
          </p>
          <p className="text-xs text-muted mt-0.5">
            Promedio diario: {formatCurrency(avgDailySales)}
          </p>
        </div>
      </div>

      {/* Row 1: Production trend + Product distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-surface-card rounded-xl p-5 border border-hairline">
          <h3 className="text-sm font-bold text-ink mb-4">Producción Diaria</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailyTotals}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6dfd8" />
              <XAxis dataKey="date" stroke="#6c6a64" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6c6a64" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="produccion" stroke="#cc785c" name="Producido" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface-card rounded-xl p-5 border border-hairline">
          <h3 className="text-sm font-bold text-ink mb-4">Producción por Producto</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={productionByProduct} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e6dfd8" />
              <XAxis type="number" stroke="#6c6a64" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" stroke="#6c6a64" tick={{ fontSize: 11 }} width={100} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {productionByProduct.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Cumulative area + Sales pie */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-surface-card rounded-xl p-5 border border-hairline">
          <h3 className="text-sm font-bold text-ink mb-4">Acumulado: Producción vs Ventas</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6dfd8" />
              <XAxis dataKey="date" stroke="#6c6a64" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6c6a64" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="produccionAcumulada" stroke="#cc785c" fill="#cc785c" fillOpacity={0.15} name="Prod. Acumulada" />
              <Area type="monotone" dataKey="ventasAcumuladas" stroke="#5db8a6" fill="#5db8a6" fillOpacity={0.15} name="Ventas Acumuladas" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface-card rounded-xl p-5 border border-hairline">
          <h3 className="text-sm font-bold text-ink mb-4">Ventas por Producto</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={salesByProduct}
                cx="50%" cy="50%" outerRadius={90}
                dataKey="value"
                label={({ name, percent }) => `${(name ?? '').split(' ')[0]} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {salesByProduct.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Daily factory value + Province Sales */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-surface-card rounded-xl p-5 border border-hairline">
          <h3 className="text-sm font-bold text-ink mb-4">Valor de Fábrica Diario</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyTotals}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6dfd8" />
              <XAxis dataKey="date" stroke="#6c6a64" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6c6a64" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="valor" fill="#5db8a6" radius={[2, 2, 0, 0]} name="Valor fábrica" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface-card rounded-xl p-5 border border-hairline">
          <h3 className="text-sm font-bold text-ink mb-4">Ventas por Provincia</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={salesByProvince}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6dfd8" />
              <XAxis dataKey="name" stroke="#6c6a64" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis stroke="#6c6a64" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="value" fill="#e8a55a" radius={[2, 2, 0, 0]} name="Ventas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4: Weekday averages + Transfer comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-surface-card rounded-xl p-5 border border-hairline">
          <h3 className="text-sm font-bold text-ink mb-4">Producción Promedio por Día de Semana</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weekDayProduction}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6dfd8" />
              <XAxis dataKey="name" stroke="#6c6a64" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6c6a64" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="promedio" fill="#cc785c" radius={[2, 2, 0, 0]} name="Promedio diario" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface-card rounded-xl p-5 border border-hairline">
          <h3 className="text-sm font-bold text-ink mb-4">Transferencias por Producto</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={transfersByProduct} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e6dfd8" />
              <XAxis type="number" stroke="#6c6a64" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" stroke="#6c6a64" tick={{ fontSize: 11 }} width={100} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {transfersByProduct.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 5: Key stats table */}
      <div className="bg-surface-card rounded-xl p-5 border border-hairline">
        <h3 className="text-sm font-bold text-ink mb-4">Indicadores Clave</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-3 bg-surface-soft rounded-lg border border-hairline/50">
            <p className="text-xs text-muted">Promedio diario producción</p>
            <p className="text-lg font-bold text-ink font-mono">{formatNumber(avgDailyProduction)} uds</p>
          </div>
          <div className="p-3 bg-surface-soft rounded-lg border border-hairline/50">
            <p className="text-xs text-muted">Promedio diario ventas ($)</p>
            <p className="text-lg font-bold text-ink font-mono">{formatCurrency(avgDailySales)}</p>
          </div>
          <div className="p-3 bg-surface-soft rounded-lg border border-hairline/50">
            <p className="text-xs text-muted">Productos activos</p>
            <p className="text-lg font-bold text-ink font-mono">{products.length}</p>
          </div>
          <div className="p-3 bg-surface-soft rounded-lg border border-hairline/50">
            <p className="text-xs text-muted">Días con producción</p>
            <p className="text-lg font-bold text-ink font-mono">{dailyTotals.length}</p>
          </div>
          <div className="p-3 bg-surface-soft rounded-lg border border-hairline/50">
            <p className="text-xs text-muted">Valor promedio por día</p>
            <p className="text-lg font-bold text-accent-teal font-mono">{formatCurrency(totalFactoryValue / Math.max(1, dailyTotals.length))}</p>
          </div>
          <div className="p-3 bg-surface-soft rounded-lg border border-hairline/50">
            <p className="text-xs text-muted">Precio promedio por unidad</p>
            <p className="text-lg font-bold text-ink font-mono">
              {totalSalesQty > 0 ? formatCurrency(totalSalesValue / totalSalesQty) : '—'}
            </p>
          </div>
          <div className="p-3 bg-surface-soft rounded-lg border border-hairline/50">
            <p className="text-xs text-muted">% Transferido vs Producido</p>
            <p className="text-lg font-bold text-ink font-mono">
              {totalProduced > 0 ? ((totalTransferred / totalProduced) * 100).toFixed(1) : '0'}%
            </p>
          </div>
          <div className="p-3 bg-surface-soft rounded-lg border border-hairline/50">
            <p className="text-xs text-muted">% Vendido vs Transferido</p>
            <p className="text-lg font-bold text-ink font-mono">
              {totalTransferred > 0 ? ((totalSalesQty / totalTransferred) * 100).toFixed(1) : '0'}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
