import type { ReactNode } from 'react'
import { cn } from '@/src/lib/utils'

type Tone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'canary'
  | 'tag-yellow'
  | 'tag-purple'
  | 'tag-coral'
  | 'tag-teal'

const toneMap: Record<Tone, string> = {
  neutral: 'ts-chip-neutral',
  primary: 'ts-chip-primary',
  success: 'ts-chip-success',
  warning: 'ts-chip-warning',
  error: 'ts-chip-error',
  info: 'ts-chip-info',
  canary: 'ts-chip-yellow',
  'tag-yellow': 'ts-chip-tag-yellow',
  'tag-purple': 'ts-chip-tag-purple',
  'tag-coral': 'ts-chip-tag-coral',
  'tag-teal': 'ts-chip-tag-teal',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
  dot,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        toneMap[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
