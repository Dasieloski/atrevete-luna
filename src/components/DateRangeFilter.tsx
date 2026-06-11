'use client'

import { Calendar, X, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { todayInputDate, monthStartInputDate } from '@/src/lib/format'
import type { DateRange } from '@/src/lib/business'
import { cn } from '@/src/lib/utils'

export interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
  presets?: PresetKey[]
  className?: string
}

type PresetKey =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisSemester'
  | 'lastSemester'
  | 'thisYear'
  | 'lastYear'
  | 'all'

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
      const s = d.toLocaleDateString('en-CA')
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
      const s = monday.toLocaleDateString('en-CA')
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
      return {
        from: monday.toLocaleDateString('en-CA'),
        to: sunday.toLocaleDateString('en-CA'),
      }
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
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA')
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('en-CA')
      return { from: start, to: end }
    },
  },
  thisQuarter: {
    label: 'Este trimestre',
    get: () => {
      const d = new Date()
      const q = Math.floor(d.getMonth() / 3)
      const start = new Date(d.getFullYear(), q * 3, 1).toLocaleDateString('en-CA')
      const end = todayInputDate()
      return { from: start, to: end }
    },
  },
  lastQuarter: {
    label: 'Trimestre pasado',
    get: () => {
      const d = new Date()
      const q = Math.floor(d.getMonth() / 3) - 1
      const year = d.getFullYear() + (q < 0 ? -1 : 0)
      const actualQ = q < 0 ? 3 : q
      const start = new Date(year, actualQ * 3, 1).toLocaleDateString('en-CA')
      const end = new Date(year, actualQ * 3 + 3, 0).toLocaleDateString('en-CA')
      return { from: start, to: end }
    },
  },
  thisSemester: {
    label: 'Este semestre',
    get: () => {
      const d = new Date()
      const s = d.getMonth() < 6 ? 0 : 6
      const start = new Date(d.getFullYear(), s, 1).toLocaleDateString('en-CA')
      const end = todayInputDate()
      return { from: start, to: end }
    },
  },
  lastSemester: {
    label: 'Semestre pasado',
    get: () => {
      const d = new Date()
      const s = d.getMonth() < 6 ? 6 : 0
      const year = d.getMonth() < 6 ? d.getFullYear() - 1 : d.getFullYear()
      const start = new Date(year, s, 1).toLocaleDateString('en-CA')
      const end = new Date(year, s + 6, 0).toLocaleDateString('en-CA')
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

const DEFAULT_PRESETS: PresetKey[] = [
  'today',
  'thisWeek',
  'thisMonth',
  'lastMonth',
  'thisQuarter',
  'lastQuarter',
  'thisSemester',
  'lastSemester',
  'thisYear',
  'lastYear',
  'all',
]

export function DateRangeFilter({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  className = '',
}: DateRangeFilterProps) {
  const isActive = (key: PresetKey) => {
    const p = PRESETS[key].get()
    return value.from === p.from && value.to === p.to
  }

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-canvas px-3 py-2',
        className
      )}
    >
      <div className="flex items-center gap-1.5 pr-1 text-sm text-slate">
        <Calendar className="h-3.5 w-3.5" />
        <span className="hidden font-medium text-ink sm:inline">Período</span>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="date"
          aria-label="Desde"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className={cn(
            'h-8 rounded-md border border-hairline-strong bg-canvas px-2 text-xs text-ink',
            'hover:border-stone focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20',
            'transition-colors duration-[var(--dur-base)]'
          )}
        />
        <span className="text-xs text-stone">→</span>
        <input
          type="date"
          aria-label="Hasta"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className={cn(
            'h-8 rounded-md border border-hairline-strong bg-canvas px-2 text-xs text-ink',
            'hover:border-stone focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20',
            'transition-colors duration-[var(--dur-base)]'
          )}
        />
      </div>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-pill border border-hairline-strong bg-canvas px-3 text-xs font-medium text-charcoal',
            'hover:border-stone hover:text-ink',
            'transition-colors duration-[var(--dur-base)]'
          )}
        >
          Predeterminados
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-[var(--dur-base)]',
              open && 'rotate-180'
            )}
          />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 z-30 mt-1.5 w-44 overflow-hidden rounded-md border border-hairline-soft bg-canvas shadow-[0_16px_48px_-8px_rgba(5,0,56,0.12)]"
            >
              <div className="p-1">
                {presets.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onChange(PRESETS[key].get())
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left text-xs transition-colors',
                      isActive(key)
                        ? 'bg-canary-soft font-semibold text-yellow-dark'
                        : 'text-charcoal hover:bg-surface hover:text-ink'
                    )}
                  >
                    {PRESETS[key].label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {(value.from || value.to) && (
        <button
          type="button"
          onClick={() => onChange({ from: '', to: '' })}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-slate hover:bg-surface hover:text-ink"
          title="Limpiar rango"
        >
          <X className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Limpiar</span>
        </button>
      )}
    </div>
  )
}

export function defaultRange(): DateRange {
  return { from: monthStartInputDate(), to: todayInputDate() }
}
