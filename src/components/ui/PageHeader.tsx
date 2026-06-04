import type { ReactNode } from 'react'
import { cn } from '@/src/lib/utils'

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[clamp(1.75rem,1.4rem+1.6vw,2.5rem)] font-medium leading-[1.1] tracking-[-0.5px] text-ink text-balance">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-base text-slate text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {actions}
        </div>
      )}
    </div>
  )
}
