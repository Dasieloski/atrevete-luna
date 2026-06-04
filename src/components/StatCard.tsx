'use client'

import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/src/lib/utils'

export type StatAccent = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'canary' | 'coral' | 'teal'

export interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  accent?: StatAccent
  delta?: number | null
  deltaLabel?: string
  invertedDelta?: boolean
  className?: string
}

const ACCENT_VALUE: Record<StatAccent, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-coral-dark',
  neutral: 'text-ink',
  canary: 'text-yellow-dark',
  coral: 'text-coral-dark',
  teal: 'text-teal-dark',
}

const ACCENT_ICON_BG: Record<StatAccent, string> = {
  primary: 'bg-primary/10',
  success: 'bg-success-soft',
  warning: 'bg-warning-soft',
  error: 'bg-error-soft',
  neutral: 'bg-surface',
  canary: 'bg-canary',
  coral: 'bg-coral-soft',
  teal: 'bg-teal-soft',
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
  className,
}: StatCardProps) {
  const showDelta = typeof delta === 'number' && isFinite(delta)
  const isUp = showDelta && delta! > 0.5
  const isDown = showDelta && delta! < -0.5
  const isFlat = showDelta && !isUp && !isDown

  const goodDirection = (isUp && !invertedDelta) || (isDown && invertedDelta)
  const badDirection = (isDown && !invertedDelta) || (isUp && invertedDelta)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        'rounded-xl border border-hairline-soft bg-canvas p-6',
        'transition-shadow duration-[var(--dur-base)] ease-[var(--ease-miro)]',
        'hover:shadow-[0_4px_12px_0_rgba(5,0,56,0.06)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
            {label}
          </p>
          <p
            className={cn(
              'mt-3 font-mono text-[clamp(1.5rem,1.2rem+1vw,1.875rem)] font-medium leading-none tracking-[-0.5px]',
              ACCENT_VALUE[accent]
            )}
          >
            {value}
          </p>
          {hint && <p className="mt-2 text-xs text-slate">{hint}</p>}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              ACCENT_ICON_BG[accent]
            )}
          >
            <Icon className={cn('h-5 w-5', ACCENT_VALUE[accent])} />
          </div>
        )}
      </div>
      {showDelta && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          {isUp && (
            <TrendingUp
              className={cn(
                'h-3.5 w-3.5',
                goodDirection
                  ? 'text-success'
                  : badDirection
                  ? 'text-coral-dark'
                  : 'text-muted'
              )}
            />
          )}
          {isDown && (
            <TrendingDown
              className={cn(
                'h-3.5 w-3.5',
                goodDirection
                  ? 'text-success'
                  : badDirection
                  ? 'text-coral-dark'
                  : 'text-muted'
              )}
            />
          )}
          {isFlat && <Minus className="h-3.5 w-3.5 text-muted" />}
          <span
            className={cn(
              'font-medium',
              goodDirection
                ? 'text-success'
                : badDirection
                ? 'text-coral-dark'
                : 'text-muted'
            )}
          >
            {isUp ? '+' : ''}
            {delta!.toFixed(1)}%
          </span>
          {deltaLabel && <span className="text-stone">vs {deltaLabel}</span>}
        </div>
      )}
    </motion.div>
  )
}
