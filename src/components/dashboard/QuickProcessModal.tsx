'use client'

import { useState, useEffect, useRef } from 'react'
import { Zap, Factory, Warehouse, ShoppingCart, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { Modal } from '@/src/components/Modal'
import { Button } from '@/src/components/ui/Button'
import { formatNumber, formatCurrency, todayInputDate } from '@/src/lib/format'
import { cn } from '@/src/lib/utils'

interface Product {
  id: string
  name: string
  priceWarehouse: number
  priceDistribution: number
  unitsPerBox: number
}

interface Customer {
  id: string
  name: string
  province: string
}

interface QuickProcessModalProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

const STEPS = [
  { id: 1, label: 'Producción', api: '/api/production' },
  { id: 2, label: 'Almacén', api: '/api/transfers' },
  { id: 3, label: 'Venta', api: '/api/sales' },
]

export function QuickProcessModal({ open, onClose, onComplete }: QuickProcessModalProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [productId, setProductId] = useState('')
  const [boxes, setBoxes] = useState(1)
  const [customerId, setCustomerId] = useState('')
  const [price, setPrice] = useState(0)
  const [date, setDate] = useState(todayInputDate())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const initiatedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      initiatedRef.current = false
      return
    }
    if (initiatedRef.current) return
    initiatedRef.current = true

    setLoading(true)
    setError('')
    setCurrentStep(0)
    setCompletedSteps([])
    setBoxes(1)
    setDate(todayInputDate())

    const load = async () => {
      try {
        const [prodRes, custRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/customers'),
        ])
        if (!prodRes.ok) throw new Error('Error al cargar productos')
        if (!custRes.ok) throw new Error('Error al cargar clientes')
        const prods: Product[] = await prodRes.json()
        const custs: Customer[] = await custRes.json()
        setProducts(prods)
        setCustomers(custs)
        if (prods.length > 0) {
          setProductId(prods[0].id)
          setPrice(+(prods[0].priceDistribution * prods[0].unitsPerBox).toFixed(2))
        } else {
          setError('No hay productos registrados. Crea un producto primero.')
        }
        if (custs.length > 0) setCustomerId(custs[0].id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open])

  const selectedProduct = products.find((p) => p.id === productId)
  const totalUnits = selectedProduct ? boxes * selectedProduct.unitsPerBox : 0
  const debtValue = selectedProduct ? +(totalUnits * selectedProduct.priceWarehouse).toFixed(2) : 0
  const totalSale = boxes * price
  const noProducts = !loading && products.length === 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct || !customerId || noProducts) return
    setSubmitting(true)
    setError('')

    try {
      setCurrentStep(1)
      const prodRes = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          boxes,
          unitsPerBox: selectedProduct.unitsPerBox,
          date,
          notes: 'Proceso rápido',
        }),
      })
      if (!prodRes.ok) {
        const err = await prodRes.json()
        throw new Error(err.error || 'Error al crear producción')
      }
      setCompletedSteps((prev) => [...prev, 1])

      setCurrentStep(2)
      const transRes = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          fromLocation: 'factory',
          toLocation: 'main',
          boxes,
          date,
          notes: 'Transferencia automática (proceso rápido)',
        }),
      })
      if (!transRes.ok) {
        const err = await transRes.json()
        throw new Error(err.error || 'Error al transferir')
      }
      setCompletedSteps((prev) => [...prev, 2])

      setCurrentStep(3)
      const saleRes = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          customerId,
          boxes,
          price,
          date,
          seller: 'alex',
          notes: 'Venta rápida',
        }),
      })
      if (!saleRes.ok) {
        const err = await saleRes.json()
        throw new Error(err.error || 'Error al registrar venta')
      }
      setCompletedSteps((prev) => [...prev, 3])

      onComplete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Proceso rápido"
      subtitle="Producción + traslado + venta en un solo paso"
      onClose={onClose}
      size="xl"
      footer={
        noProducts ? (
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="quick-form"
              disabled={!productId || !customerId || boxes < 1 || price <= 0 || submitting || loading || noProducts}
              loading={submitting}
            >
              {submitting ? 'Procesando…' : 'Procesar completo'}
            </Button>
          </>
        )
      }
    >
      {/* Step indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    completedSteps.includes(s.id) && 'bg-success text-white',
                    currentStep === s.id && !completedSteps.includes(s.id) && 'bg-primary text-white ring-2 ring-primary/30',
                    currentStep < s.id && !completedSteps.includes(s.id) && 'bg-ash text-muted'
                  )}
                >
                  {completedSteps.includes(s.id) ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : currentStep === s.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    s.id
                  )}
                </div>
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    completedSteps.includes(s.id) || currentStep === s.id ? 'text-ink' : 'text-muted'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-2 mt-[-1.25rem] h-px w-16 sm:w-24',
                    completedSteps.includes(s.id) ? 'bg-success' : 'bg-hairline'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form id="quick-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error-soft px-3 py-2.5 text-sm text-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Cargando datos...</span>
          </div>
        )}

        {!loading && !error && noProducts && (
          <div className="flex flex-col items-center gap-3 py-6 text-sm text-muted">
            <AlertCircle className="h-8 w-8 text-warning" />
            <p className="text-center">No hay productos registrados todav&iacute;a.</p>
            <p className="text-center text-xs">Ve a Productos &rarr; A&ntilde;adir producto primero.</p>
          </div>
        )}

        <div className={cn('space-y-5', (loading || noProducts) && 'hidden')}>
          {/* Step 1: Production */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Factory className="h-4 w-4 text-primary" />
              1. Producci&oacute;n
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ts-label">Producto</label>
                <select
                  value={productId}
                  onChange={(e) => {
                    const id = e.target.value
                    setProductId(id)
                    const p = products.find((x) => x.id === id)
                    if (p) setPrice(+(p.priceDistribution * p.unitsPerBox).toFixed(2))
                  }}
                  required
                  disabled={submitting}
                  className="ts-input"
                >
                  <option value="">Seleccionar</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} &middot; {p.unitsPerBox} uds/caja
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ts-label">Cajas a producir</label>
                <input
                  type="number"
                  value={boxes}
                  onChange={(e) => setBoxes(parseInt(e.target.value) || 0)}
                  required
                  min="1"
                  disabled={submitting}
                  className="ts-input"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Transfer */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Warehouse className="h-4 w-4 text-primary" />
              2. Traslado
            </h3>
            <div className="rounded-md bg-ash px-3 py-2.5 text-sm text-muted">
              F&aacute;brica <strong className="text-ink">&rarr;</strong> Almac&eacute;n &mdash; {formatNumber(boxes)} caja{boxes !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Step 3: Sale */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ShoppingCart className="h-4 w-4 text-primary" />
              3. Venta
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ts-label">Cliente</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                  disabled={submitting}
                  className="ts-input"
                >
                  <option value="">Seleccionar</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} &mdash; {c.province}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ts-label">Precio por caja (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  required
                  disabled={submitting}
                  className="ts-input"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ts-label">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={submitting}
                className="ts-input"
              />
            </div>
          </div>

          {/* Summary */}
          {selectedProduct && boxes > 0 && (
            <div className="space-y-2 rounded-md border border-hairline bg-surface/60 px-4 py-3 text-sm">
              <h4 className="flex items-center gap-2 font-medium text-ink">
                <Zap className="h-4 w-4 text-warning" />
                Resumen del proceso
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-muted">
                <span>Producto:</span>
                <span className="text-right font-medium text-ink">{selectedProduct.name}</span>
                <span>Unidades totales:</span>
                <span className="text-right font-mono text-ink">{formatNumber(totalUnits)}</span>
                <span>Deuda generada:</span>
                <span className="text-right font-mono text-warning">{formatCurrency(debtValue)}</span>
                <span>Total venta:</span>
                <span className="text-right font-mono font-semibold text-primary">{formatCurrency(totalSale)}</span>
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
