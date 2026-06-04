'use client'

import { useMemo } from 'react'
import { formatCurrency } from '@/src/lib/format'

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

interface ProductionCalendarProps {
  products: ProductInfo[]
  dailyData: Record<string, DayProduction>
  currentMonth: Date
  dateRange: { from: string; to: string }
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const COLORS = ['#cc785c', '#5db8a6', '#e8a55a']

export function ProductionCalendar({ products, dailyData, currentMonth, dateRange }: ProductionCalendarProps) {
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const cells: { day: number; date: string | null; isCurrentMonth: boolean; isInRange: boolean; isToday: boolean }[] = []

    for (let i = 0; i < startPad; i++) {
      cells.push({ day: 0, date: null, isCurrentMonth: false, isInRange: false, isToday: false })
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const fromMs = new Date(dateRange.from + 'T00:00:00').getTime()
    const toMs = new Date(dateRange.to + 'T23:59:59').getTime()

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d)
      const dateStr = dateObj.toISOString().split('T')[0]
      const dateMs = dateObj.getTime()
      cells.push({
        day: d,
        date: dateStr,
        isCurrentMonth: true,
        isInRange: dateMs >= fromMs && dateMs <= toMs,
        isToday: dateStr === todayStr,
      })
    }

    while (cells.length % 7 !== 0) {
      cells.push({ day: 0, date: null, isCurrentMonth: false, isInRange: false, isToday: false })
    }

    return cells
  }, [currentMonth, dateRange])

  const weeks = useMemo(() => {
    const result = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7))
    }
    return result
  }, [calendarDays])

  return (
    <div className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
      <div className="grid grid-cols-7">
        {DAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-muted uppercase tracking-wider border-b border-hairline bg-surface-soft/50">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.map((week, wi) =>
          week.map((cell, ci) => {
            if (!cell.date) {
              return <div key={`${wi}-${ci}`} className="min-h-[100px] p-1.5 border-b border-r border-hairline/40 bg-surface-soft/20" />
            }
            const dayData = dailyData[cell.date]
            const hasData = dayData && Object.keys(dayData.production).length > 0

            return (
              <div
                key={cell.date}
                className={`min-h-[100px] p-1.5 border-b border-r border-hairline/40 transition-colors ${
                  cell.isToday ? 'bg-primary/5 ring-1 ring-primary/30' : cell.isInRange ? 'bg-canvas' : 'bg-surface-soft/30'
                }`}
              >
                <div className={`text-xs font-bold mb-1 ${cell.isToday ? 'text-primary' : 'text-muted'}`}>
                  {cell.day}
                </div>
                {hasData && (
                  <div className="space-y-0.5">
                    {Object.entries(dayData.production).map(([prodId, qty], idx) => {
                      const product = products.find((p) => p.id === prodId)
                      const prodColor = COLORS[idx % COLORS.length]
                      return (
                        <div key={prodId} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: prodColor }} />
                          <span className="text-[10px] leading-tight text-body-strong font-medium truncate">
                            {product?.name?.split(' ')[0] || '?'}
                          </span>
                          <span className="text-[10px] leading-tight font-mono text-ink ml-auto">
                            {qty.toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                    {dayData.factoryValue > 0 && (
                      <div className="text-[9px] text-muted font-mono pt-0.5 border-t border-hairline/30 mt-0.5">
                        {formatCurrency(dayData.factoryValue)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
