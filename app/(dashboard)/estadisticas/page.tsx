'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { BarChart3, TrendingUp, Package, Wallet } from 'lucide-react'
import { StatCard } from '@/src/components/StatCard'
import { DateRangeFilter, defaultRange } from '@/src/components/DateRangeFilter'
import { EmptyState } from '@/src/components/EmptyState'
import { PageHeader } from '@/src/components/ui/PageHeader'
import {
  CubaProvinceChart,
  type CubaSalesByProvince,
} from '@/src/components/dashboard/CubaProvinceChart'
import { formatNumber, formatCurrency } from '@/src/lib/format'
import type { DateRange } from '@/src/lib/business'
import { inRange } from '@/src/lib/business'

interface Sale {
  id: string
  quantity: number
  total: number
  date: string
  product: { name: string }
  customer: { name: string; province: string }
}

const COLORS = [
  '#3E6AE1',
  '#12B76A',
  '#F79009',
  '#8E8E8E',
  '#5C5E62',
  '#D0D1D2',
  '#234AA8',
  '#171A20',
]

export default function EstadisticasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [range, setRange] = useState<DateRange>(defaultRange)

  useEffect(() => {
    fetch('/api/sales')
      .then((r) => r.json())
      .then(setSales)
  }, [])

  const filteredSales = useMemo(() => {
    return sales.filter((s) => inRange(s.date, range))
  }, [sales, range])

  const salesByProduct = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const s of filteredSales) {
      acc[s.product.name] = (acc[s.product.name] || 0) + s.quantity
    }
    return Object.entries(acc).map(([name, value]) => ({ name, value }))
  }, [filteredSales])

  const totalUnits = filteredSales.reduce((sum, s) => sum + s.quantity, 0)

  const salesByProvince = useMemo(() => {
    const acc: Record<string, { province: string; total: number; customers: number }> = {}
    for (const s of filteredSales) {
      const p = s.customer.province
      if (!acc[p]) acc[p] = { province: p, total: 0, customers: 0 }
      acc[p].total += s.total
      acc[p].customers += 1
    }
    return Object.values(acc).map((v) => ({
      province: v.province,
      total: parseFloat(v.total.toFixed(2)),
      customers: v.customers,
    })) as CubaSalesByProvince[]
  }, [filteredSales])

  function getDateKey(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const timelineData = useMemo(() => {
    const acc: Record<string, { period: string; ventas: number; unidades: number }> = {}
    for (const s of filteredSales) {
      const key = getDateKey(s.date)
      if (!acc[key]) acc[key] = { period: key, ventas: 0, unidades: 0 }
      acc[key].ventas += s.total
      acc[key].unidades += s.quantity
    }
    return Object.values(acc).sort((a, b) => a.period.localeCompare(b.period))
  }, [filteredSales])

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0)
  const avgPeriod =
    timelineData.length > 0 ? totalRevenue / timelineData.length : 0

  const productData = useMemo(() => {
    return salesByProduct.sort((a, b) => b.value - a.value)
  }, [salesByProduct])

  const hasData = filteredSales.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Análisis"
        title="Estadísticas"
        description="Analiza el rendimiento de ventas por período, producto y provincia."
      />

      <DateRangeFilter
        value={range}
        onChange={setRange}
        presets={['thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'all']}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Ingresos totales"
          value={formatCurrency(totalRevenue)}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          label="Unidades vendidas"
          value={formatNumber(totalUnits)}
          icon={Package}
        />
        <StatCard
          label="Promedio por período"
          value={formatCurrency(avgPeriod)}
          hint={timelineData.length > 0 ? `${timelineData.length} período(s)` : ''}
          icon={TrendingUp}
          accent="success"
        />
      </section>

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Sin datos en este período"
          description="No hay ventas registradas en el rango de fechas seleccionado. Ajusta el filtro o registra ventas para ver estadísticas."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="ts-card-pad">
              <h2 className="text-sm font-medium text-ink">
                Ventas por período
              </h2>
              <p className="mt-0.5 text-xs text-muted-soft">
                Evolución mensual de ingresos
              </p>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" />
                    <XAxis
                      dataKey="period"
                      stroke="var(--color-pewter)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--color-pewter)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-canvas)',
                        border: '1px solid var(--color-hairline-strong)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--color-ink)',
                      }}
                      cursor={{ stroke: 'var(--color-hairline-strong)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ventas"
                      stroke="var(--color-primary)"
                      name="Ventas"
                      strokeWidth={2}
                      dot={{ r: 3, fill: 'var(--color-primary)' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="ts-card-pad">
              <h2 className="text-sm font-medium text-ink">
                Ventas por producto
              </h2>
              <p className="mt-0.5 text-xs text-muted-soft">
                Distribución de unidades vendidas
              </p>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={95}
                      paddingAngle={1}
                      dataKey="value"
                      stroke="var(--color-canvas)"
                    >
                      {productData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-canvas)',
                        border: '1px solid var(--color-hairline-strong)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, color: 'var(--color-pewter)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="ts-card-pad">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-ink">
                  Mapa de ventas por provincia
                </h2>
                <p className="mt-0.5 text-xs text-muted-soft">
                  Distribución geográfica de ingresos. Haz clic en una provincia
                  para resaltarla.
                </p>
              </div>
            </div>
            <CubaProvinceChart
              data={salesByProvince}
              metric="total"
              height={520}
            />
          </section>

          <section className="ts-card-pad">
            <h2 className="text-sm font-medium text-ink">
              Distribución por producto
            </h2>
            <p className="mt-0.5 text-xs text-muted-soft">
              Participación de cada producto en el total de unidades
            </p>
            <div className="mt-4 space-y-3">
              {productData.map((item, i) => {
                const pct = totalUnits > 0 ? (item.value / totalUnits) * 100 : 0
                return (
                  <div key={item.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{item.name}</span>
                      <span className="font-mono text-muted">
                        {formatNumber(item.value)} uds · {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ash">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
