'use client'

import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { StatCard } from '@/src/components/StatCard'
import { DateRangeFilter, defaultRange } from '@/src/components/DateRangeFilter'
import { EmptyState } from '@/src/components/EmptyState'
import { CubaProvinceChart, type CubaSalesByProvince } from '@/src/components/dashboard/CubaProvinceChart'
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

const COLORS = ['#cc785c', '#5db8a6', '#e8a55a', '#c64545', '#5db872', '#d4a017', '#6c6a64', '#8e8b82']

export default function EstadisticasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [range, setRange] = useState<DateRange>(defaultRange)

  useEffect(() => {
    fetch('/api/sales').then(r => r.json()).then(setSales)
  }, [])

  const filteredSales = useMemo(() => {
    return sales.filter(s => inRange(s.date, range))
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
  const avgPeriod = timelineData.length > 0 ? totalRevenue / timelineData.length : 0

  const productData = useMemo(() => {
    return salesByProduct.sort((a, b) => b.value - a.value)
  }, [salesByProduct])

  const hasData = filteredSales.length > 0

  const tooltipStyle = {
    backgroundColor: '#efe9de',
    border: '1px solid #e6dfd8',
    borderRadius: '8px',
    fontSize: '13px',
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Estadísticas</h1>
        <p className="text-sm text-muted mt-1">
          Analiza el rendimiento de ventas por período, producto y provincia.
        </p>
      </header>

      <DateRangeFilter value={range} onChange={setRange} presets={['thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'all']} />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Ingresos totales" value={formatCurrency(totalRevenue)} icon={BarChart3} accent="primary" />
        <StatCard label="Unidades vendidas" value={formatNumber(totalUnits)} icon={BarChart3} />
        <StatCard label="Promedio por período" value={formatCurrency(avgPeriod)} hint={timelineData.length > 0 ? `${timelineData.length} período(s)` : ''} icon={BarChart3} accent="accent-teal" />
      </section>

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Sin datos en este período"
          description="No hay ventas registradas en el rango de fechas seleccionado. Ajusta el filtro o registra ventas para ver estadísticas."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-card rounded-xl p-5 border border-hairline">
              <h2 className="text-sm font-bold text-ink mb-1">Ventas por período</h2>
              <p className="text-xs text-muted mb-4">Evolución mensual de ingresos</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6dfd8" />
                  <XAxis dataKey="period" stroke="#6c6a64" fontSize={12} />
                  <YAxis stroke="#6c6a64" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="ventas" stroke="#cc785c" name="Ventas ($)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-surface-card rounded-xl p-5 border border-hairline">
              <h2 className="text-sm font-bold text-ink mb-1">Ventas por producto</h2>
              <p className="text-xs text-muted mb-4">Distribución de unidades vendidas</p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={productData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {productData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface-card rounded-xl p-5 border border-hairline">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-ink">Mapa de ventas por provincia</h2>
                <p className="text-xs text-muted">Distribución geográfica de ingresos. Haz clic en una provincia para resaltarla.</p>
              </div>
            </div>
            <CubaProvinceChart data={salesByProvince} metric="total" height={520} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface-card rounded-xl p-5 border border-hairline">
              <h2 className="text-sm font-bold text-ink mb-1">Distribución por producto</h2>
              <p className="text-xs text-muted mb-4">Participación de cada producto en el total</p>
              <div className="space-y-3">
                {productData.map((item, i) => {
                  const pct = totalUnits > 0 ? (item.value / totalUnits) * 100 : 0
                  return (
                    <div key={item.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-body-strong">{item.name}</span>
                        <span className="text-muted">{formatNumber(item.value)} uds ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-surface-soft rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
