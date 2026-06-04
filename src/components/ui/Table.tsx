import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/src/lib/utils'

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn('w-full border-collapse text-sm', className)}
        {...rest}
      />
    </div>
  )
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'bg-surface text-[11px] uppercase tracking-wider text-steel',
        className
      )}
      {...rest}
    />
  )
}

export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('', className)} {...rest} />
}

export function TR({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-hairline-soft transition-colors duration-[var(--dur-base)] ease-[var(--ease-miro)] hover:bg-surface',
        className
      )}
      {...rest}
    />
  )
}

export function TH({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-3 text-left font-semibold text-steel first:pl-6 last:pr-6',
        className
      )}
      {...rest}
    />
  )
}

export function TD({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 align-middle text-charcoal first:pl-6 last:pr-6',
        className
      )}
      {...rest}
    />
  )
}

export function TableEmpty({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={100} className="px-6 py-14 text-center text-sm text-slate">
        {children}
      </td>
    </tr>
  )
}
