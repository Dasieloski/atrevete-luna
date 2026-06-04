'use client'

import { useState, useEffect, useMemo } from 'react'
import { ArrowRight, Package, Boxes, Warehouse, ArrowDownToLine, ArrowUpFromLine, History, AlertCircle, Search } from 'lucide-react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { DateRangeFilter, defaultRange } from '@/src/components/DateRangeFilter'
import { StatCard } from '@/src/components/StatCard'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { formatDate, formatNumber, todayInputDate, daysBetween } from '@/src/lib/format'
import { inRange, type DateRange } from '@/src/lib/business'

interface Stock {
  productId: string
  location: string
  quantity: number
  product: { id: string; name: string; unitsPerBox: number }
}

interface Transfer {
  id: string
  productId: string
  fromLocation: string
  toLocation: string
  quantity: number
  date: string
  notes: string | null
  product: { id: string; name: string; unitsPerBox: number }
}

interface Sale {
  id: string
  productId: string
  quantity: number
  date: string
  product: { id: string; name: string; unitsPerBox: number }
}

interface Product {
  id: string
  name: string
  unitsPerBox: number
}

interface Movement {
  id: string
  date: string
  product: { id: string; name: string; unitsPerBox: number }
  type: 'Entrada' | 'Salida'
  boxes: number
  source: 'Transferencia' | 'Venta'
  notes: string | null
}

export default function AlmacenPage() {
  const [stock, setStock] = useState<Stock[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Entrada' | 'Salida'>('all')
  const [range, setRange] = useState<DateRange>(defaultRange)

  const [form, setForm] = useState({
    productId: '',
    boxes: 1,
    date: todayInputDate(),
    notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [transfersRes, productsRes, stockRes, salesRes] = await Promise.all([
      fetch('/api/transfers'),
      fetch('/api/products'),
      fetch('/api/stock'),
      fetch('/api/sales'),
    ])
    setTransfers((await transfersRes.json()) || [])
    setProducts((await productsRes.json()) || [])
    setStock((await stockRes.json()) || [])
    setSales((await salesRes.json()) || [])
  }

  function getUnits(productId: string, location: string): number {
    return stock.find(s => s.productId === productId && s.location === location)?.quantity || 0
  }

  function getBoxes(productId: string, location: string): number {
    const p = products.find(pr => pr.id === productId)
    if (!p) return 0
    return Math.floor(getUnits(productId, location) / (p.unitsPerBox || 100))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const product = products.find(p => p.id === form.productId)
    if (!product) return

    const payload = {
      productId: form.productId,
      fromLocation: 'factory',
      toLocation: 'main',
      boxes: parseInt(form.boxes.toString()),
      date: form.date,
      notes: form.notes || null,
    }

    const res = await fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json()
      alert(err.error || 'Error al transferir')
      return
    }

    closeModal()
    fetchData()
  }

  function openModal() {
    setForm({ productId: products[0]?.id || '', boxes: 1, date: todayInputDate(), notes: '' })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setForm({ productId: '', boxes: 1, date: todayInputDate(), notes: '' })
  }

  const stockByProduct = useMemo(() => {
    return products.map(p => {
      const factoryUnits = stock.find(s => s.productId === p.id && s.location === 'factory')?.quantity || 0
      const mainUnits = stock.find(s => s.productId === p.id && s.location === 'main')?.quantity || 0
      return {
        ...p,
        factoryBoxes: Math.floor(factoryUnits / (p.unitsPerBox || 100)),
        factoryUnits,
        mainBoxes: Math.floor(mainUnits / (p.unitsPerBox || 100)),
        mainUnits,
      }
    }).filter(p => p.factoryUnits > 0 || p.mainUnits > 0)
  }, [products, stock])

  const movements: Movement[] = useMemo(() => {
    const list: Movement[] = []
    for (const t of transfers) {
      if (t.toLocation !== 'main' && t.fromLocation !== 'main') continue
      list.push({
        id: `t-${t.id}`,
        date: t.date,
        product: t.product,
        type: t.toLocation === 'main' ? 'Entrada' : 'Salida',
        boxes: Math.floor(t.quantity / (t.product.unitsPerBox || 100)),
        source: 'Transferencia',
        notes: t.notes,
      })
    }
    for (const s of sales) {
      list.push({
        id: `s-${s.id}`,
        date: s.date,
        product: s.product,
        type: 'Salida',
        boxes: Math.floor(s.quantity / (s.product.unitsPerBox || 100)),
        source: 'Venta',
        notes: null,
      })
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transfers, sales])

  const filteredMovements = useMemo(() => {
    return movements
      .filter(m => inRange(m.date, range))
      .filter(m => typeFilter === 'all' || m.type === typeFilter)
      .filter(m => !search || m.product.name.toLowerCase().includes(search.toLowerCase()))
  }, [movements, range, typeFilter, search])

  const stats = useMemo(() => {
    let entries = 0
    let exits = 0
    for (const m of filteredMovements) {
      if (m.type === 'Entrada') entries += m.boxes
      else exits += m.boxes
    }
    const currentMainBoxes = stockByProduct.reduce((s, p) => s + p.mainBoxes, 0)
    const currentFactoryBoxes = stockByProduct.reduce((s, p) => s + p.factoryBoxes, 0)
    const days = daysBetween(range.from, range.to)
    return {
      currentMainBoxes,
      currentFactoryBoxes,
      entries,
      exits,
      netChange: entries - exits,
      entriesPerDay: days > 0 ? entries / days : entries,
    }
  }, [filteredMovements, stockByProduct, range])

  const selectedProduct = products.find(p => p.id === form.productId)
  const availableFactoryBoxes = selectedProduct ? getBoxes(selectedProduct.id, 'factory') : 0

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Almacén</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Centro de distribución. Aquí ves el stock listo para vender, mueves lotes desde la fábrica y revisas el historial de entradas y salidas.
          </p>
        </div>
        <PermissionGuard module="almacen" action="create">
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            Transferir de fábrica
          </button>
        </PermissionGuard>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Stock en almacén"
          value={`${formatNumber(stats.currentMainBoxes)} cjs`}
          hint="Disponible para vender"
          icon={Warehouse}
          accent="primary"
        />
        <StatCard
          label="Entradas (período)"
          value={`${formatNumber(stats.entries)} cjs`}
          hint={`${stats.entriesPerDay.toFixed(1)} cjs / día · desde fábrica`}
          icon={ArrowDownToLine}
          accent="success"
        />
        <StatCard
          label="Salidas (período)"
          value={`${formatNumber(stats.exits)} cjs`}
          hint="Por ventas a clientes"
          icon={ArrowUpFromLine}
          accent="accent-amber"
        />
        <StatCard
          label="Stock en fábrica"
          value={`${formatNumber(stats.currentFactoryBoxes)} cjs`}
          hint="Aún sin transferir al almacén"
          icon={Boxes}
        />
      </section>

      <section className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-ink">Stock por producto</h2>
          <span className="text-xs text-muted ml-auto">Estado actual</span>
        </div>
        {stockByProduct.length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title="Sin stock todavía"
            description="Cuando transfieras lotes desde la fábrica o recibas producción, aparecerán aquí."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-soft">
                <tr>
                  <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Producto</th>
                  <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">En fábrica</th>
                  <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">En almacén</th>
                  <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {stockByProduct.map(p => {
                  const totalBoxes = p.factoryBoxes + p.mainBoxes
                  const totalUnits = p.factoryUnits + p.mainUnits
                  return (
                    <tr key={p.id} className="hover:bg-surface-soft/50">
                      <td className="px-5 py-3 text-sm font-semibold text-ink">{p.name}</td>
                      <td className="px-5 py-3 text-sm text-body text-right tabular-nums">
                        <div>{formatNumber(p.factoryBoxes)} cjs</div>
                        <div className="text-xs text-muted-soft">{formatNumber(p.factoryUnits)} uds</div>
                      </td>
                      <td className="px-5 py-3 text-sm text-right tabular-nums">
                        <div className="font-semibold text-primary">{formatNumber(p.mainBoxes)} cjs</div>
                        <div className="text-xs text-muted-soft">{formatNumber(p.mainUnits)} uds</div>
                      </td>
                      <td className="px-5 py-3 text-sm text-ink font-semibold text-right tabular-nums">
                        <div>{formatNumber(totalBoxes)} cjs</div>
                        <div className="text-xs text-muted font-normal">{formatNumber(totalUnits)} uds</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted" />
            <h2 className="text-sm font-bold text-ink">Historial de movimientos</h2>
          </div>
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-hairline rounded-lg bg-canvas text-body text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-1 bg-surface-soft rounded-lg p-1 border border-hairline">
            {([
              { key: 'all', label: 'Todos' },
              { key: 'Entrada', label: 'Entradas' },
              { key: 'Salida', label: 'Salidas' },
            ] as const).map(opt => (
              <button
                key={opt.key}
                onClick={() => setTypeFilter(opt.key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  typeFilter === opt.key
                    ? 'bg-surface-card text-ink shadow-sm'
                    : 'text-muted hover:text-body'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pt-3 pb-2">
          <DateRangeFilter value={range} onChange={setRange} className="!bg-canvas border-0 p-0" />
        </div>

        {filteredMovements.length === 0 ? (
          <EmptyState
            icon={History}
            title="Sin movimientos en este período"
            description="Cuando muevas lotes desde la fábrica o registres ventas, aparecerán aquí."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-soft">
                <tr>
                  <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Tipo</th>
                  <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Producto</th>
                  <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Origen</th>
                  <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Cajas</th>
                  <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredMovements.map(m => (
                  <tr key={m.id} className="hover:bg-surface-soft/50">
                    <td className="px-5 py-3 text-sm text-body whitespace-nowrap">{formatDate(m.date)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        m.type === 'Entrada'
                          ? 'bg-success/15 text-success'
                          : 'bg-error/15 text-error'
                      }`}>
                        {m.type === 'Entrada' ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                        {m.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-ink">{m.product.name}</td>
                    <td className="px-5 py-3 text-sm text-muted">{m.source}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-ink text-right tabular-nums">{formatNumber(m.boxes)}</td>
                    <td className="px-5 py-3 text-sm text-muted max-w-[200px] truncate">{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <Modal
          title="Transferir de fábrica a almacén"
          subtitle="Mueve cajas desde la fábrica al almacén para que estén disponibles para venta."
          onClose={closeModal}
          size="md"
          footer={
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeModal} className="px-4 py-2 bg-surface-soft text-body rounded-lg hover:bg-surface-cream-strong font-medium">
                Cancelar
              </button>
              <button
                type="submit"
                form="transfer-form"
                disabled={!selectedProduct || availableFactoryBoxes === 0}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Transferir
              </button>
            </div>
          }
        >
          <form id="transfer-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Producto</label>
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value, boxes: 1 })}
                required
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
              >
                <option value="">Selecciona un producto</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {getBoxes(p.id, 'factory')} cjs en fábrica
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="bg-surface-soft rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted">Stock en fábrica:</span>
                  <span className={`font-semibold ${availableFactoryBoxes > 0 ? 'text-ink' : 'text-error'}`}>
                    {formatNumber(availableFactoryBoxes)} cjs · {formatNumber(selectedProduct.unitsPerBox * availableFactoryBoxes)} uds
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Stock en almacén:</span>
                  <span className="font-semibold text-ink">
                    {formatNumber(getBoxes(selectedProduct.id, 'main'))} cjs
                  </span>
                </div>
                {availableFactoryBoxes === 0 && (
                  <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-hairline text-xs text-error">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>No hay stock en fábrica. Registra producción primero.</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Cajas a transferir</label>
                <input
                  type="number"
                  value={form.boxes}
                  onChange={(e) => setForm({ ...form, boxes: parseInt(e.target.value) || 0 })}
                  required
                  min="1"
                  max={availableFactoryBoxes || undefined}
                  disabled={!selectedProduct}
                  className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body disabled:opacity-50"
                />
                {selectedProduct && availableFactoryBoxes > 0 && (
                  <p className="text-xs text-muted mt-1">Máx: {formatNumber(availableFactoryBoxes)} cjs</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Fecha</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Notas (opcional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Motivo, lote de producción..."
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
