'use client'

import { useEffect, useRef } from 'react'
import {
  X,
  Factory,
  Package,
  ShoppingCart,
  Wallet,
  Calendar,
} from 'lucide-react'
import { formatCurrency, formatNumber, formatDate } from '@/src/lib/format'
import { cn } from '@/src/lib/utils'

interface ProductInfo {
  id: string
  name: string
  priceWarehouse: number
  priceDistribution: number
  unitsPerBox: number
}

interface DayData {
  date: string
  production: Record<string, number>
  transfers: Record<string, number>
  sales: Record<string, { quantity: number; total: number }>
  payments: number
  factoryValue: number
  warehouseValue: number
  distributionValue: number
}

interface StockData {
  factoryStock: Record<string, number>
  warehouseStock: Record<string, number>
}

interface DayDetailModalProps {
  open: boolean
  onClose: () => void
  date: string
  dayData: DayData | undefined
  products: ProductInfo[]
  stockData?: StockData
}

const COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', bar: '#3E6AE1' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: '#12B76A' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: '#F79009' },
]

export function DayDetailModal({ open, onClose, date, dayData, products, stockData }: DayDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const hasData = dayData && (
    Object.keys(dayData.production).length > 0 ||
    Object.keys(dayData.transfers).length > 0 ||
    Object.keys(dayData.sales).length > 0 ||
    dayData.payments > 0
  )

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-hairline bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">
                {formatDate(date)}
              </h3>
              <p className="text-xs text-muted">
                Resumen del día
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ts-btn-icon"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {!hasData && (
            <div className="rounded-xl border border-dashed border-hairline bg-ash/30 py-10 text-center text-sm text-muted">
              No hubo actividad este día
            </div>
          )}

          {hasData && dayData && (
            <div className="space-y-5">
              {/* Producción por fábrica */}
              {Object.keys(dayData.production).length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Factory className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-ink">Producido por fábrica</h4>
                  </div>
                  <div className="space-y-2">
                    {products.map((prod, idx) => {
                      const units = dayData.production[prod.id] || 0
                      if (units === 0) return null
                      const boxes = prod.unitsPerBox > 0 ? Math.floor(units / prod.unitsPerBox) : units
                      const value = units * prod.priceWarehouse
                      const color = COLORS[idx % COLORS.length]

                      return (
                        <div
                          key={prod.id}
                          className={cn(
                            'rounded-xl border p-3',
                            color.bg,
                            color.border
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn('text-sm font-medium', color.text)}>
                              {prod.name.split(' ')[0]}
                            </span>
                            <span className="text-lg font-bold tabular-nums text-ink">
                              {formatNumber(boxes)} <span className="text-xs font-normal text-muted">cjs</span>
                            </span>
                          </div>
                          <div className="mt-1.5 text-right text-xs font-medium tabular-nums text-muted">
                            {formatCurrency(value)} precio fábrica
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recogido por producto */}
              {Object.keys(dayData.transfers).length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-ink" />
                    <h4 className="text-sm font-semibold text-ink">Recogido del almacén</h4>
                  </div>
                  <div className="space-y-2">
                    {products.map((prod, idx) => {
                      const units = dayData.transfers[prod.id] || 0
                      if (units === 0) return null
                      const boxes = prod.unitsPerBox > 0 ? Math.floor(units / prod.unitsPerBox) : units
                      const value = units * prod.priceWarehouse
                      const color = COLORS[idx % COLORS.length]

                      return (
                        <div
                          key={prod.id}
                          className={cn(
                            'rounded-xl border p-3',
                            color.bg,
                            color.border
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn('text-sm font-medium', color.text)}>
                              {prod.name.split(' ')[0]}
                            </span>
                            <span className="text-lg font-bold tabular-nums text-ink">
                              {formatNumber(boxes)} <span className="text-xs font-normal text-muted">cjs</span>
                            </span>
                          </div>
                          <div className="mt-1.5 text-right text-xs font-medium tabular-nums text-muted">
                            {formatCurrency(value)} precio fábrica
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Vendido por producto */}
              {Object.keys(dayData.sales).length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-ink">Vendido / Distribuido</h4>
                  </div>
                  <div className="space-y-2">
                    {products.map((prod, idx) => {
                      const saleData = dayData.sales[prod.id]
                      if (!saleData || saleData.quantity === 0) return null
                      const boxes = prod.unitsPerBox > 0 ? Math.floor(saleData.quantity / prod.unitsPerBox) : saleData.quantity
                      const color = COLORS[idx % COLORS.length]

                      return (
                        <div
                          key={prod.id}
                          className={cn(
                            'rounded-xl border p-3',
                            color.bg,
                            color.border
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn('text-sm font-medium', color.text)}>
                              {prod.name.split(' ')[0]}
                            </span>
                            <span className="text-lg font-bold tabular-nums text-primary">
                              {formatNumber(boxes)} <span className="text-xs font-normal text-primary/70">cjs</span>
                            </span>
                          </div>
                          <div className="mt-1.5 text-right text-xs font-medium tabular-nums text-muted">
                            {formatCurrency(saleData.total)} ventas
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Pagos */}
              {dayData.payments > 0 && (
                <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-success" />
                    <span className="text-xs font-medium uppercase tracking-wider text-success">Saldo pagado</span>
                  </div>
                  <span className="text-2xl font-bold tabular-nums text-success">
                    {formatCurrency(dayData.payments)}
                  </span>
                  <p className="mt-1 text-xs text-success/70">
                    Pago realizado a la fábrica este día
                  </p>
                </div>
              )}

              {/* Stock por recoger en fábrica */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Factory className="h-4 w-4 text-warning" />
                  <h4 className="text-sm font-semibold text-ink">Por recoger en fábrica</h4>
                </div>
                <div className="space-y-2">
                  {products.map((prod, idx) => {
                    const boxes = stockData?.factoryStock[prod.id] ?? 0
                    if (boxes === 0) return null
                    const color = COLORS[idx % COLORS.length]

                    return (
                      <div
                        key={prod.id}
                        className={cn(
                          'flex items-center justify-between rounded-xl border p-3',
                          color.bg,
                          color.border
                        )}
                      >
                        <span className={cn('text-sm font-medium', color.text)}>
                          {prod.name.split(' ')[0]}
                        </span>
                        <span className="text-lg font-bold tabular-nums text-ink">
                          {formatNumber(boxes)} <span className="text-xs font-normal text-muted">cjs</span>
                        </span>
                      </div>
                    )
                  })}
                  {products.every((p) => (stockData?.factoryStock[p.id] ?? 0) === 0) && (
                    <span className="text-sm text-muted-soft">Todo ha sido recogido</span>
                  )}
                </div>
              </div>

              {/* Stock en almacén */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-ink">En almacén</h4>
                </div>
                <div className="space-y-2">
                  {products.map((prod, idx) => {
                    const boxes = stockData?.warehouseStock[prod.id] ?? 0
                    if (boxes === 0) return null
                    const color = COLORS[idx % COLORS.length]

                    return (
                      <div
                        key={prod.id}
                        className={cn(
                          'flex items-center justify-between rounded-xl border p-3',
                          color.bg,
                          color.border
                        )}
                      >
                        <span className={cn('text-sm font-medium', color.text)}>
                          {prod.name.split(' ')[0]}
                        </span>
                        <span className="text-lg font-bold tabular-nums text-ink">
                          {formatNumber(boxes)} <span className="text-xs font-normal text-muted">cjs</span>
                        </span>
                      </div>
                    )
                  })}
                  {products.every((p) => (stockData?.warehouseStock[p.id] ?? 0) === 0) && (
                    <span className="text-sm text-muted-soft">Almacén vacío</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
