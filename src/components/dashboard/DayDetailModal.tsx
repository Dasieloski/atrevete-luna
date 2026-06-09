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

interface DayDetailModalProps {
  open: boolean
  onClose: () => void
  date: string
  dayData: DayData | undefined
  products: ProductInfo[]
}

const COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', bar: '#3E6AE1' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: '#12B76A' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: '#F79009' },
]

export function DayDetailModal({ open, onClose, date, dayData, products }: DayDetailModalProps) {
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

  // Totals
  let totalRecogidoCajas = 0
  let totalVendidoCajas = 0
  if (dayData) {
    for (const [prodId, units] of Object.entries(dayData.transfers)) {
      const prod = products.find((p) => p.id === prodId)
      const upb = prod?.unitsPerBox ?? 1
      totalRecogidoCajas += upb > 0 ? Math.floor(units / upb) : units
    }
    for (const [prodId, saleData] of Object.entries(dayData.sales)) {
      const prod = products.find((p) => p.id === prodId)
      const upb = prod?.unitsPerBox ?? 1
      totalVendidoCajas += upb > 0 ? Math.floor(saleData.quantity / upb) : saleData.quantity
    }
  }

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
                          <div className="mt-1.5 flex items-center justify-between">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/60">
                              <div
                                className="h-full rounded-full"
                                style={{ width: '100%', backgroundColor: color.bar }}
                              />
                            </div>
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

              {/* Recogido y Vendido en una fila */}
              <div className="grid grid-cols-2 gap-3">
                {/* Recogido */}
                <div className="rounded-xl border border-hairline-soft bg-ash/40 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4 text-ink" />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted">Recogido</span>
                  </div>
                  {totalRecogidoCajas > 0 ? (
                    <>
                      <span className="text-2xl font-bold tabular-nums text-ink">
                        {formatNumber(totalRecogidoCajas)}
                      </span>
                      <span className="ml-1 text-xs text-muted">cjs</span>
                      <div className="mt-1 text-xs tabular-nums text-muted">
                        {formatCurrency(dayData.warehouseValue)} precio fábrica
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-muted-soft">Sin recogida</span>
                  )}
                </div>

                {/* Vendido */}
                <div className="rounded-xl border border-hairline-soft bg-ash/40 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium uppercase tracking-wider text-primary/70">Vendido</span>
                  </div>
                  {totalVendidoCajas > 0 ? (
                    <>
                      <span className="text-2xl font-bold tabular-nums text-primary">
                        {formatNumber(totalVendidoCajas)}
                      </span>
                      <span className="ml-1 text-xs text-primary/70">cjs</span>
                      <div className="mt-1 text-xs tabular-nums text-primary/70">
                        {formatCurrency(dayData.distributionValue)} ventas
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-muted-soft">Sin ventas</span>
                  )}
                </div>
              </div>

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

              {/* Resumen financiero del día */}
              <div className="rounded-xl border border-hairline bg-ash/20 p-4">
                <h5 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
                  Resumen financiero del día
                </h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Valor producción</span>
                    <span className="font-semibold tabular-nums text-ink">
                      {formatCurrency(dayData.factoryValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Valor recogido</span>
                    <span className="font-semibold tabular-nums text-ink">
                      {formatCurrency(dayData.warehouseValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Valor ventas</span>
                    <span className="font-semibold tabular-nums text-primary">
                      {formatCurrency(dayData.distributionValue)}
                    </span>
                  </div>
                  {dayData.payments > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Pagado</span>
                      <span className="font-semibold tabular-nums text-success">
                        − {formatCurrency(dayData.payments)}
                      </span>
                    </div>
                  )}
                  <div className="mt-2 border-t border-hairline pt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">Balance del día</span>
                      <span className="font-bold tabular-nums text-ink">
                        {formatCurrency(dayData.distributionValue - dayData.payments)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
