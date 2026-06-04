import type { HTMLAttributes } from 'react'
import { cn } from '@/src/lib/utils'

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-surface',
        className
      )}
      {...rest}
    />
  )
}
