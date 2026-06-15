'use client'

import { useState, useEffect } from 'react'
import { Zap, Package, ArrowRight, ShoppingCart } from 'lucide-react'
import { Modal } from '@/src/components/Modal'
import { Button } from '@/src/components/ui/Button'
import { formatNumber, formatCurrency, todayInputDate } from '@/src/lib/format'

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

export function QuickProcessModal({ open, onClose, onComplete }: QuickProcessModalProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [productId, setProductId] = useState('')
  const [boxes, setBoxes] = useState(1)
  const [customerId, setCustomerId] = useState('')
  const [price, setPrice] = useState(0)
  const [date, setDate] = useState(todayInputDate())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!open) return
    const load = async () => {
      const [prodRes, custRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/customers'),
      ])
      const prods: Product[] = await prodRes.json()
      const custs: Customer[] = await custRes.json()
      setProducts(prods)
      setCustomers(custs)
      if (prods.length > 0) {
        setProductId(prods[0].id)
        setPrice(+(prods[0].priceDistribution * prods[0].unitsPerBox).toFixed(2))
      }
      if (custs.length > 0) setCustomerId(custs[0].id)
    }
    load()
    setStep(0)
    setError('')
    setBoxes(1)
    setDate(todayInputDate())
  }, [open])

  const selectedProduct = products.find((p) => p.id === productId)
  const totalSale = boxes * price

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct || !customerId) return
    setSubmitting(true)
    setError('')

    try {
      setStep(1)
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

      setStep(2)
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

      setStep(3)
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

      onComplete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  const totalUnits = selectedProduct ? boxes * selectedProduct.unitsPerBox : 0
  const debtValue = selectedProduct ? +(totalUnits * selectedProduct.priceWarehouse).toFixed(2) : 0

  return (
    <Modal
      title="Proceso rápido"
      subtitle="Crea producción, transfiere al almacén y vende en un solo paso."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="quick-form"
            disabled={!productId || !customerId || boxes < 1 || price <= 0 || submitting}
            loading={submitting}
          >
            {submitting
              ? step === 1
                ? 'Produciendo…'
                : step === 2
                  ? 'Transfiriendo…'
                  : 'Vendiendo…'
              : 'Procesar completo'}
          </Button>
        </>
      }
    >
      <form id="quick-form" onSubmit={handleSubmit} className="space-y-5">
        {submitting && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Zap className="h-4 w-4 animate-pulse" />
            <span>
              {step === 1 && 'Creando producción...'}
              {step === 2 && 'Transfiriendo al almacén...'}
              {step === 3 && 'Registrando venta...'}
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-error/30 bg-error-soft px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}

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
            <option value="">Selecciona producto</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} &middot; {p.unitsPerBox} uds/caja
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="ts-label">Cajas</label>
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

        <div>
          <label className="ts-label">Cliente</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
            disabled={submitting}
            className="ts-input"
          >
            <option value="">Selecciona cliente</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} &mdash; {c.province}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="ts-label">Precio de venta por caja</label>
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

        {selectedProduct && boxes > 0 && (
          <div className="space-y-2 rounded-md bg-ash px-3 py-3 text-sm">
            <h4 className="font-medium text-ink">Resumen</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted">
              <span>Unidades totales:</span>
              <span className="text-right font-mono text-ink">{formatNumber(totalUnits)}</span>
              <span>Valor producción:</span>
              <span className="text-right font-mono text-ink">{formatCurrency(debtValue)}</span>
              <span>Deuda generada:</span>
              <span className="text-right font-mono text-warning">{formatCurrency(debtValue)}</span>
              <span>Total venta:</span>
              <span className="text-right font-mono font-semibold text-primary">{formatCurrency(totalSale)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted">
          <Package className="h-3.5 w-3.5 shrink-0" />
          <span>Producción</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span>Almacén</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
          <span>Venta</span>
        </div>
      </form>
    </Modal>
  )
}
