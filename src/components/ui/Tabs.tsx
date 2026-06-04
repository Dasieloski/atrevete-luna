'use client'

import { useState, type ReactNode } from 'react'
import { cn } from '@/src/lib/utils'

type Tab = { id: string; label: ReactNode; count?: number; disabled?: boolean }

type TabsProps = {
  tabs: Tab[]
  value?: string
  defaultValue?: string
  onChange?: (id: string) => void
  variant?: 'pill' | 'underline' | 'filter'
  className?: string
  size?: 'sm' | 'md'
}

export function Tabs({
  tabs,
  value,
  defaultValue,
  onChange,
  variant = 'underline',
  className,
  size = 'md',
}: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.id)
  const current = value ?? internal

  const handleClick = (id: string, disabled?: boolean) => {
    if (disabled) return
    if (value === undefined) setInternal(id)
    onChange?.(id)
  }

  return (
    <div
      role="tablist"
      className={cn(
        variant === 'pill' && 'inline-flex items-center gap-1 rounded-md bg-surface p-1',
        variant === 'filter' &&
          'inline-flex flex-wrap items-center gap-2',
        variant === 'underline' &&
          'flex items-end gap-1 border-b border-hairline overflow-x-auto no-scrollbar',
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === current
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => handleClick(tab.id, tab.disabled)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap font-medium transition-colors duration-[var(--dur-base)] ease-[var(--ease-miro)]',
              variant === 'filter' &&
                cn(
                  'h-9 rounded-pill border px-3 text-[13px]',
                  active
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-hairline-strong bg-canvas text-steel hover:bg-surface hover:text-ink'
                ),
              variant === 'pill' &&
                cn(
                  'rounded-md',
                  size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm',
                  active
                    ? 'bg-canvas text-ink shadow-[0_1px_2px_0_rgba(5,0,56,0.06)]'
                    : 'text-steel hover:text-ink'
                ),
              variant === 'underline' &&
                cn(
                  size === 'sm' ? 'h-10 px-3 text-sm' : 'h-12 px-3 text-sm',
                  'border-b-2 -mb-px',
                  active
                    ? 'border-primary text-ink'
                    : 'border-transparent text-steel hover:text-ink'
                ),
              tab.disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'rounded-pill px-1.5 py-0.5 text-[10px] font-semibold',
                  variant === 'filter' && active
                    ? 'bg-canary text-primary'
                    : variant === 'underline'
                    ? active
                      ? 'bg-primary/10 text-primary'
                      : 'bg-surface text-slate'
                    : active
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface text-slate'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
