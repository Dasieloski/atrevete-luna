'use client'

import { Calendar, X } from 'lucide-react'
import { todayInputDate, monthStartInputDate } from '@/src/lib/format'
import type { DateRange } from '@/src/lib/business'

export interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
  presets?: PresetKey[]
  className?: string
}

type PresetKey = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'all'

const PRESETS: Record<PresetKey, { label: string; get: () => DateRange }> = {
  today: {
    label: 'Hoy',
    get: () => {
      const t = todayInputDate()
      return { from: t, to: t }
    },
  },
  yesterday: {
    label: 'Ayer',
    get: () => {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      const s = d.toISOString().split('T')[0]
      return { from: s, to: s }
    },
  },
  thisWeek: {
    label: 'Esta semana',
    get: () => {
      const d = new Date()
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d.setDate(diff))
      const s = monday.toISOString().split('T')[0]
      const t = todayInputDate()
      return { from: s, to: t }
    },
  },
  lastWeek: {
    label: 'Semana pasada',
    get: () => {
      const d = new Date()
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) - 7
      const monday = new Date(d.setDate(diff))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: monday.toISOString().split('T')[0], to: sunday.toISOString().split('T')[0] }
    },
  },
  thisMonth: {
    label: 'Este mes',
    get: () => ({ from: monthStartInputDate(), to: todayInputDate() }),
  },
  lastMonth: {
    label: 'Mes pasado',
    get: () => {
      const d = new Date()
      d.setMonth(d.getMonth() - 1)
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
      return { from: start, to: end }
    },
  },
  thisYear: {
    label: 'Este año',
    get: () => {
      const y = new Date().getFullYear()
      return { from: `${y}-01-01`, to: todayInputDate() }
    },
  },
  lastYear: {
    label: 'Año pasado',
    get: () => {
      const y = new Date().getFullYear() - 1
      return { from: `${y}-01-01`, to: `${y}-12-31` }
    },
  },
  all: {
    label: 'Todo',
    get: () => ({ from: '2000-01-01', to: todayInputDate() }),
  },
}

const DEFAULT_PRESETS: PresetKey[] = ['today', 'thisWeek', 'thisMonth', 'lastMonth', 'thisYear', 'all']

export function DateRangeFilter({ value, onChange, presets = DEFAULT_PRESETS, className = '' }: DateRangeFilterProps) {
  const isActive = (key: PresetKey) => {
    const p = PRESETS[key].get()
    return value.from === p.from && value.to === p.to
  }

  return (
    <div className={`bg-surface-card border border-hairline rounded-xl p-4 ${className}`}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-sm text-muted shrink-0">
          <Calendar className="w-4 h-4" />
          <span className="font-medium text-ink">Período</span>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Desde</label>
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="px-3 py-1.5 border border-hairline rounded-lg bg-canvas text-body text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Hasta</label>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="px-3 py-1.5 border border-hairline rounded-lg bg-canvas text-body text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((key) => (
            <button
              key={key}
              onClick={() => onChange(PRESETS[key].get())}
              className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                isActive(key)
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'bg-surface-soft text-body hover:bg-surface-cream-strong'
              }`}
            >
              {PRESETS[key].label}
            </button>
          ))}
        </div>
        {(value.from || value.to) && (
          <button
            onClick={() => onChange({ from: '', to: '' })}
            className="ml-auto flex items-center gap-1 px-2 py-1.5 text-xs text-muted hover:text-body"
            title="Limpiar rango"
          >
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>
    </div>
  )
}

export function defaultRange(): DateRange {
  return { from: monthStartInputDate(), to: todayInputDate() }
}
