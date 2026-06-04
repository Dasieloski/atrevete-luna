'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/src/lib/utils'

export interface ModalProps {
  open?: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: React.ReactNode
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Modal({
  open = true,
  title,
  subtitle,
  onClose,
  children,
  size = 'md',
  footer,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!open) return
    setMounted(true)
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open && !mounted) return null
  if (!open && mounted) {
    return null
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4">
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(5,0,56,0.4)] backdrop-blur-sm"
          />
          <motion.div
            key="dialog"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              'relative flex w-full flex-col bg-canvas',
              'shadow-[0_16px_48px_-8px_rgba(5,0,56,0.12)]',
              'rounded-t-2xl sm:rounded-xl',
              'max-h-[100dvh] sm:max-h-[90vh]',
              'sm:border sm:border-hairline-soft',
              SIZE[size]
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-hairline-soft px-6 py-5">
              <div className="min-w-0 flex-1">
                <h2
                  id="modal-title"
                  className="text-lg font-medium leading-tight tracking-[-0.25px] text-ink"
                >
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-1.5 text-sm text-slate">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="ts-btn-icon-circular -mr-1"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <div className="flex flex-col-reverse gap-2 border-t border-hairline-soft px-6 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
