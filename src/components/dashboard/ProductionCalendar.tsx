'use client'

import { useMemo } from 'react'
import { formatCurrency } from '@/src/lib/format'
import { Package, ShoppingCart, Wallet } from 'lucide-react'
import { cn } from '@/src/lib/utils'

interface ProductInfo {
  id: string
  name: string
  priceWarehouse: number
  priceDistribution: number
  unitsPerBox: number
}

interface DayData {
  date: string
  production: Record<string, number>
  transfers: Record<string, number>
  sales: Record<string, { quantity: number; total: number }>
  payments: number
  factoryValue: number
}

interface ProductionCalendarProps {
  products: ProductInfo[]
  dailyData: Record<string, DayData>
  currentMonth: Date
  onCellClick?: (date: string) => void
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const COLORS = ['#3E6AE1', '#12B76A', '#F79009']

export function ProductionCalendar({ products, dailyData, currentMonth, onCellClick }: ProductionCalendarProps) {
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const cells: { day: number; date: string | null; isToday: boolean }[] = []

    for (let i = 0; i < startPad; i++) {
      cells.push({ day: 0, date: null, isToday: false })
    }

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({
        day: d,
        date: dateStr,
        isToday: dateStr === todayStr,
      })
    }

    while (cells.length % 7 !== 0) {
      cells.push({ day: 0, date: null, isToday: false })
    }

    return cells
  }, [currentMonth])

  const weeks = useMemo(() => {
    const result = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7))
    }
    return result
  }, [calendarDays])

  // Max boxes for any single product on any day (for bar scaling)
  const maxProdBoxes = useMemo(() => {
    let max = 0
    for (const day of Object.values(dailyData)) {
      for (const prod of products) {
        const units = day.production[prod.id] || 0
        const boxes = prod.unitsPerBox > 0 ? Math.floor(units / prod.unitsPerBox) : units
        if (boxes > max) max = boxes
      }
    }
    return max
  }, [dailyData, products])

  return (
    <section className="ts-card overflow-hidden">
      <div className="grid grid-cols-7">
        {DAYS.map((day) => (
          <div
            key={day}
            className="border-b border-hairline bg-ash/50 px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.map((week, wi) =>
          week.map((cell, ci) => {
            if (!cell.date) {
              return (
                <div
                  key={`${wi}-${ci}`}
                  className="min-h-[120px] border-b border-r border-hairline/40 bg-ash/20 p-1.5 last:border-r-0"
                />
              )
            }

            const dayData = dailyData[cell.date]
            const hasAnyData = dayData && (
              Object.keys(dayData.production).length > 0 ||
              Object.keys(dayData.transfers).length > 0 ||
              Object.keys(dayData.sales).length > 0 ||
              dayData.payments > 0
            )

            // Calculate totals for the day
            let totalRecogido = 0
            let totalVendido = 0
            if (dayData) {
              for (const [prodId, units] of Object.entries(dayData.transfers)) {
                const prod = products.find((p) => p.id === prodId)
                const upb = prod?.unitsPerBox ?? 1
                totalRecogido += upb > 0 ? Math.floor(units / upb) : units
              }
              for (const [prodId, saleData] of Object.entries(dayData.sales)) {
                const prod = products.find((p) => p.id === prodId)
                const upb = prod?.unitsPerBox ?? 1
                totalVendido += upb > 0 ? Math.floor(saleData.quantity / upb) : saleData.quantity
              }
            }

            return (
              <button
                key={cell.date}
                onClick={() => cell.date && onCellClick?.(cell.date)}
                className={cn(
                  'min-h-[120px] w-full border-b border-r border-hairline/40 p-1.5 text-left transition-colors last:border-r-0',
                  cell.isToday
                    ? 'bg-primary/5 ring-1 ring-inset ring-primary/30'
                    : 'bg-canvas hover:bg-ash/30'
                )}
              >
                <div className={cn('mb-1 text-xs font-medium', cell.isToday ? 'text-primary' : 'text-muted')}>
                  {cell.day}
                </div>

                {hasAnyData && dayData && (
                  <div className="space-y-1">
                    {/* Production bars per product */}
                    {products.map((prod, idx) => {
                      const units = dayData.production[prod.id] || 0
                      if (units === 0) return null
                      const boxes = prod.unitsPerBox > 0 ? Math.floor(units / prod.unitsPerBox) : units
                      const value = units * prod.priceWarehouse
                      const pct = maxProdBoxes > 0 ? Math.max((boxes / maxProdBoxes) * 100, 4) : 4
                      const color = COLORS[idx % COLORS.length]

                      return (
                        <div key={prod.id} className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-[10px] font-medium leading-tight text-body-strong">
                              {prod.name.split(' ')[0]}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] leading-tight text-ink">
                              {boxes} cjs
                            </span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-ash">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                          {value > 0 && (
                            <span className="font-mono text-[9px] text-muted">
                              {formatCurrency(value)}
                            </span>
                          )}
                        </div>
                      )
                    })}

                    {/* Day summary footer */}
                    <div className="mt-1 space-y-0.5 border-t border-hairline/30 pt-1">
                      {totalRecogido > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-muted">
                          <Package className="h-3 w-3 shrink-0 text-ink" />
                          <span className="font-mono">{totalRecogido} cjs</span>
                          <span className="text-muted-soft">recogido</span>
                        </div>
                      )}
                      {totalVendido > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-primary">
                          <ShoppingCart className="h-3 w-3 shrink-0" />
                          <span className="font-mono">{totalVendido} cjs</span>
                          <span className="text-primary/70">vendido</span>
                        </div>
                      )}
                      {dayData.payments > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-success">
                          <Wallet className="h-3 w-3 shrink-0" />
                          <span className="font-mono">{formatCurrency(dayData.payments)}</span>
                          <span className="text-success/70">pagado</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}
