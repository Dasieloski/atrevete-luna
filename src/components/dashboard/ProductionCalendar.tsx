'use client'

import { useMemo } from 'react'
import { formatCurrency, formatNumber } from '@/src/lib/format'
import { Package, ShoppingCart, Wallet, Factory } from 'lucide-react'
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
  remainingByDate?: Record<string, number>
  onCellClick?: (date: string) => void
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const PROD_COLORS = [
  { text: 'text-blue-700', dot: 'bg-blue-500', bg: 'bg-blue-soft/20' },
  { text: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50' },
  { text: 'text-amber-700', dot: 'bg-amber-500', bg: 'bg-amber-50' },
  { text: 'text-violet-700', dot: 'bg-violet-500', bg: 'bg-violet-50' },
  { text: 'text-rose-700', dot: 'bg-rose-500', bg: 'bg-rose-50' },
]

export function ProductionCalendar({
  products,
  dailyData,
  currentMonth,
  remainingByDate,
  onCellClick,
}: ProductionCalendarProps) {
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

  return (
    <section className="ts-card overflow-hidden">
      {/* Header: Day names */}
      <div className="grid grid-cols-7">
        {DAYS.map((day) => (
          <div
            key={day}
            className="border-b border-hairline bg-ash/50 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-steel"
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
                  className="min-h-[140px] border-b border-r border-hairline/40 bg-ash/20 p-1.5 last:border-r-0"
                />
              )
            }

            const dayData = dailyData[cell.date]
            const remaining = remainingByDate?.[cell.date] ?? 0
            const hasAnyData = dayData && (
              Object.keys(dayData.production).length > 0 ||
              Object.keys(dayData.transfers).length > 0 ||
              Object.keys(dayData.sales).length > 0 ||
              dayData.payments > 0
            )

            return (
              <button
                key={cell.date}
                onClick={() => cell.date && onCellClick?.(cell.date)}
                className={cn(
                  'min-h-[140px] w-full border-b border-r border-hairline/40 p-1.5 text-left transition-colors last:border-r-0',
                  cell.isToday
                    ? 'bg-primary/5 ring-1 ring-inset ring-primary/30'
                    : 'bg-canvas hover:bg-ash/30'
                )}
              >
                {/* Day number */}
                <div className={cn('mb-1 flex items-center justify-between', cell.isToday ? 'text-primary' : 'text-steel')}>
                  <span className="text-xs font-semibold">{cell.day}</span>
                  {remaining > 0 && (
                    <span className="font-mono text-[9px] font-medium text-error">
                      {formatCurrency(remaining)}
                    </span>
                  )}
                </div>

                {hasAnyData && dayData && (
                  <div className="space-y-1.5">
                    {/* Per product: Producido / Recogido / Vendido */}
                    {products.map((prod, idx) => {
                      const prodUnits = dayData.production[prod.id] || 0
                      const transUnits = dayData.transfers[prod.id] || 0
                      const saleUnits = dayData.sales[prod.id]?.quantity || 0
                      const upb = prod.unitsPerBox || 1
                      const prodBoxes = upb > 0 ? Math.floor(prodUnits / upb) : prodUnits
                      const transBoxes = upb > 0 ? Math.floor(transUnits / upb) : transUnits
                      const saleBoxes = upb > 0 ? Math.floor(saleUnits / upb) : saleUnits

                      if (prodBoxes === 0 && transBoxes === 0 && saleBoxes === 0) return null

                      const color = PROD_COLORS[idx % PROD_COLORS.length]
                      const shortName = prod.name.split(' ')[0]

                      return (
                        <div key={prod.id} className="rounded border border-hairline/40 bg-canvas/60 p-1">
                          <div className={cn('mb-0.5 flex items-center gap-1 text-[10px] font-semibold', color.text)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', color.dot)} />
                            <span className="truncate">{shortName}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-0.5 text-[9px]">
                            {prodBoxes > 0 && (
                              <div className="flex flex-col items-center">
                                <span className="font-mono font-semibold tabular-nums text-blue-700">
                                  {formatNumber(prodBoxes)}
                                </span>
                                <span className="text-[8px] uppercase tracking-wide text-muted-soft">P</span>
                              </div>
                            )}
                            {transBoxes > 0 && (
                              <div className="flex flex-col items-center">
                                <span className="font-mono font-semibold tabular-nums text-emerald-700">
                                  {formatNumber(transBoxes)}
                                </span>
                                <span className="text-[8px] uppercase tracking-wide text-muted-soft">R</span>
                              </div>
                            )}
                            {saleBoxes > 0 && (
                              <div className="flex flex-col items-center">
                                <span className="font-mono font-semibold tabular-nums text-amber-700">
                                  {formatNumber(saleBoxes)}
                                </span>
                                <span className="text-[8px] uppercase tracking-wide text-muted-soft">V</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Day summary footer: payments */}
                    {dayData.payments > 0 && (
                      <div className="flex items-center gap-1 border-t border-hairline/40 pt-1 text-[10px] text-success">
                        <Wallet className="h-3 w-3 shrink-0" />
                        <span className="font-mono font-semibold">{formatCurrency(dayData.payments)}</span>
                        <span className="text-success/70">pagado</span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-t border-hairline bg-surface/40 px-4 py-2 text-[10px] text-muted">
        <span className="font-semibold uppercase tracking-wider text-steel">Leyenda:</span>
        <span className="flex items-center gap-1">
          <span className="font-mono font-semibold text-blue-700">P</span>
          <span>Producido</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-mono font-semibold text-emerald-700">R</span>
          <span>Recogido</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-mono font-semibold text-amber-700">V</span>
          <span>Vendido</span>
        </span>
        <span className="ml-auto flex items-center gap-1">
          <span className="font-mono text-error">$</span>
          <span>Esquina superior derecha = pendiente con fábrica</span>
        </span>
      </div>
    </section>
  )
}
