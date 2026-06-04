import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/src/lib/utils'

export function Card({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-hairline-soft bg-canvas shadow-[0_4px_12px_0_rgba(5,0,56,0.06)]',
        className
      )}
      {...rest}
    />
  )
}

export function CardHeader({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 border-b border-hairline px-6 py-5',
        className
      )}
      {...rest}
    />
  )
}

export function CardTitle({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <h3
      className={cn(
        'text-lg font-medium leading-tight tracking-tight text-ink',
        className
      )}
    >
      {children}
    </h3>
  )
}

export function CardDescription({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <p
      className={cn('text-sm text-slate', className)}
    >
      {children}
    </p>
  )
}

export function CardBody({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-5', className)} {...rest} />
}

export function CardFooter({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 border-t border-hairline px-6 py-3',
        className
      )}
      {...rest}
    />
  )
}
