'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
} from 'recharts'
import { formatCurrency, formatNumber } from '@/src/lib/format'
import { useTheme } from '@/src/lib/theme'

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

const COLOR_VARS = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--chart-6',
] as const

type ChartPalette = {
  colors: string[]
  tooltipBg: string
  tooltipBorder: string
  axis: string
  grid: string
}

function readPalette(): ChartPalette {
  if (typeof window === 'undefined') {
    return {
      colors: ['#3E6AE1', '#12B76A', '#F79009', '#F04438', '#5C5E62', '#8E8E8E'],
      tooltipBg: '#ffffff',
      tooltipBorder: '#e1e1e2',
      axis: '#5c5e62',
      grid: '#eeeeee',
    }
  }
  const styles = getComputedStyle(document.documentElement)
  const colors = COLOR_VARS.map((v) => styles.getPropertyValue(v).trim() || '#3E6AE1')
  return {
    colors,
    tooltipBg: styles.getPropertyValue('--chart-tooltip-bg').trim() || '#ffffff',
    tooltipBorder: styles.getPropertyValue('--chart-tooltip-border').trim() || '#e1e1e2',
    axis: styles.getPropertyValue('--chart-axis').trim() || '#5c5e62',
    grid: styles.getPropertyValue('--chart-grid').trim() || '#eeeeee',
  }
}

export function DashboardCharts({ products, dailyData, productions, transfers, sales, totalDebt }: DashboardChartsProps) {
  const { resolved } = useTheme()
  const [palette, setPalette] = useState<ChartPalette | null>(null)

  useEffect(() => {
    setPalette(readPalette())
  }, [resolved])

  const COLORS = palette?.colors ?? ['#3E6AE1', '#12B76A', '#F79009', '#F04438', '#5C5E62', '#8E8E8E']
  const CHART_TOOLTIP_STYLE = palette
    ? {
        backgroundColor: palette.tooltipBg,
        border: `1px solid ${palette.tooltipBorder}`,
        borderRadius: 8,
        fontSize: 12,
        color: palette.axis,
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
      }
    : {
        backgroundColor: '#ffffff',
        border: '1px solid #e1e1e2',
        borderRadius: 8,
        fontSize: 12,
        color: '#171a20',
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
      }
  const c1 = COLORS[0]
  const c2 = COLORS[1]
  const c3 = COLORS[2]
  const c4 = COLORS[3]
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
      <div className="ts-card-pad text-center text-sm text-muted">
        No hay suficientes datos para generar gráficos
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ts-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Total Producido</p>
          <p className="mt-1 font-mono text-[1.5rem] font-medium text-ink leading-tight">{formatNumber(totalProduced)}</p>
          <p className="mt-0.5 text-xs text-muted">{formatCurrency(totalFactoryValue)} valor fábrica</p>
        </div>
        <div className="ts-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Transferido a Almacén</p>
          <p className="mt-1 font-mono text-[1.5rem] font-medium text-success leading-tight">{formatNumber(totalTransferred)}</p>
          <p className="mt-0.5 text-xs text-muted">
            {totalTransferred > 0 ? ((totalTransferred / totalProduced) * 100).toFixed(1) : 0}% de la producción
          </p>
        </div>
        <div className="ts-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Vendido (uds)</p>
          <p className="mt-1 font-mono text-[1.5rem] font-medium text-ink leading-tight">{formatNumber(totalSalesQty)}</p>
          <p className="mt-0.5 text-xs text-muted">{formatCurrency(totalSalesValue)} total</p>
        </div>
        <div className="ts-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Deuda Pendiente</p>
          <p className={`mt-1 font-mono text-[1.5rem] font-medium leading-tight ${totalDebt > 0 ? 'text-warning' : 'text-success'}`}>
            {formatCurrency(totalDebt)}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Promedio diario: {formatCurrency(avgDailySales)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ts-card p-5">
          <h3 className="mb-4 text-sm font-medium text-ink">Producción Diaria</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailyTotals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="produccion" stroke={c1} name="Producido" strokeWidth={2} dot={{ r: 2.5, fill: c1 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="ts-card p-5">
          <h3 className="mb-4 text-sm font-medium text-ink">Producción por Producto</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={productionByProduct} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {productionByProduct.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ts-card p-5">
          <h3 className="mb-4 text-sm font-medium text-ink">Acumulado: Producción vs Ventas</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="produccionAcumulada" stroke={c1} fill={c1} fillOpacity={0.12} name="Prod. Acumulada" />
              <Area type="monotone" dataKey="ventasAcumuladas" stroke={c2} fill={c2} fillOpacity={0.12} name="Ventas Acumuladas" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="ts-card p-5">
          <h3 className="mb-4 text-sm font-medium text-ink">Ventas por Producto</h3>
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
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ts-card p-5">
          <h3 className="mb-4 text-sm font-medium text-ink">Valor de Fábrica Diario</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyTotals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="valor" fill={c2} radius={[4, 4, 0, 0]} name="Valor fábrica" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="ts-card p-5">
          <h3 className="mb-4 text-sm font-medium text-ink">Ventas por Provincia</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={salesByProvince}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="value" fill={c3} radius={[4, 4, 0, 0]} name="Ventas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ts-card p-5">
          <h3 className="mb-4 text-sm font-medium text-ink">Producción Promedio por Día de Semana</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weekDayProduction}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="promedio" fill={c1} radius={[4, 4, 0, 0]} name="Promedio diario" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="ts-card p-5">
          <h3 className="mb-4 text-sm font-medium text-ink">Transferencias por Producto</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={transfersByProduct} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {transfersByProduct.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ts-card p-5">
        <h3 className="mb-4 text-sm font-medium text-ink">Indicadores Clave</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Promedio diario producción', value: `${formatNumber(avgDailyProduction)} uds` },
            { label: 'Promedio diario ventas ($)', value: formatCurrency(avgDailySales), accent: 'text-primary' },
            { label: 'Productos activos', value: formatNumber(products.length) },
            { label: 'Días con producción', value: formatNumber(dailyTotals.length) },
            { label: 'Valor promedio por día', value: formatCurrency(totalFactoryValue / Math.max(1, dailyTotals.length)), accent: 'text-success' },
            { label: 'Precio promedio por unidad', value: totalSalesQty > 0 ? formatCurrency(totalSalesValue / totalSalesQty) : '—' },
            { label: '% Transferido vs Producido', value: totalProduced > 0 ? `${((totalTransferred / totalProduced) * 100).toFixed(1)}%` : '0%' },
            { label: '% Vendido vs Transferido', value: totalTransferred > 0 ? `${((totalSalesQty / totalTransferred) * 100).toFixed(1)}%` : '0%' },
          ].map((m) => (
            <div key={m.label} className="rounded-md bg-ash p-3">
              <p className="text-xs text-muted">{m.label}</p>
              <p className={`mt-0.5 font-mono text-lg font-medium ${m.accent ?? 'text-ink'}`}>
                {m.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
