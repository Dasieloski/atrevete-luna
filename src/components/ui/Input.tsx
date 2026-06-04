import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/src/lib/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leadingIcon, trailingIcon, invalid, className, ...rest },
  ref
) {
  return (
    <div className="relative w-full">
      {leadingIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-steel">
          {leadingIcon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-md border bg-canvas text-sm text-ink placeholder:text-muted',
          'transition-colors duration-[var(--dur-base)] ease-[var(--ease-miro)]',
          'hover:border-stone',
          'focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20',
          'disabled:bg-surface disabled:text-muted',
          invalid
            ? 'border-coral focus:border-coral focus:ring-coral/20'
            : 'border-hairline-strong',
          leadingIcon ? 'pl-10' : 'pl-4',
          trailingIcon ? 'pr-10' : 'pr-4',
          className
        )}
        {...rest}
      />
      {trailingIcon && (
        <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-steel">
          {trailingIcon}
        </span>
      )}
    </div>
  )
})
