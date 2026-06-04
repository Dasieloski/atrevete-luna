'use client'

import { Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/src/lib/utils'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        className
      )}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
        <Icon className="h-7 w-7 text-steel" />
      </div>
      <h3 className="text-base font-medium text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-slate text-pretty">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
