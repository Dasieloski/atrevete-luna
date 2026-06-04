'use client'

import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export type StatAccent = 'primary' | 'success' | 'warning' | 'error' | 'accent-teal' | 'accent-amber' | 'neutral'

export interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  accent?: StatAccent
  delta?: number | null
  deltaLabel?: string
  invertedDelta?: boolean
}

const ACCENT_VALUE: Record<StatAccent, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  'accent-teal': 'text-accent-teal',
  'accent-amber': 'text-accent-amber',
  neutral: 'text-ink',
}

const ACCENT_ICON_BG: Record<StatAccent, string> = {
  primary: 'bg-primary/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  error: 'bg-error/10',
  'accent-teal': 'bg-accent-teal/10',
  'accent-amber': 'bg-accent-amber/10',
  neutral: 'bg-surface-soft',
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'neutral',
  delta,
  deltaLabel,
  invertedDelta = false,
}: StatCardProps) {
  const showDelta = typeof delta === 'number' && isFinite(delta)
  const isUp = showDelta && delta! > 0.5
  const isDown = showDelta && delta! < -0.5
  const isFlat = showDelta && !isUp && !isDown

  const goodDirection = (isUp && !invertedDelta) || (isDown && invertedDelta)
  const badDirection = (isDown && !invertedDelta) || (isUp && invertedDelta)

  return (
    <div className="bg-surface-card rounded-xl p-5 border border-hairline">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold mt-1.5 ${ACCENT_VALUE[accent]}`}>{value}</p>
          {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
        </div>
        {Icon && (
          <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ACCENT_ICON_BG[accent]}`}>
            <Icon className={`w-5 h-5 ${ACCENT_VALUE[accent]}`} />
          </div>
        )}
      </div>
      {showDelta && (
        <div className="mt-3 pt-3 border-t border-hairline/60 flex items-center gap-1.5 text-xs">
          {isUp && <TrendingUp className={`w-3.5 h-3.5 ${goodDirection ? 'text-success' : badDirection ? 'text-error' : 'text-muted'}`} />}
          {isDown && <TrendingDown className={`w-3.5 h-3.5 ${goodDirection ? 'text-success' : badDirection ? 'text-error' : 'text-muted'}`} />}
          {isFlat && <Minus className="w-3.5 h-3.5 text-muted" />}
          <span className={goodDirection ? 'text-success font-semibold' : badDirection ? 'text-error font-semibold' : 'text-muted'}>
            {isUp ? '+' : ''}{delta!.toFixed(1)}%
          </span>
          {deltaLabel && <span className="text-muted">vs {deltaLabel}</span>}
        </div>
      )}
    </div>
  )
}
