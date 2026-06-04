'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, Factory, Package, Boxes, DollarSign, TrendingUp, Search, History } from 'lucide-react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { DateRangeFilter, defaultRange } from '@/src/components/DateRangeFilter'
import { StatCard } from '@/src/components/StatCard'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { formatDate, formatNumber, formatCurrency, todayInputDate, daysBetween } from '@/src/lib/format'
import { inRange, type DateRange } from '@/src/lib/business'

interface Production {
  id: string
  boxes: number
  unitsPerBox: number
  quantity: number
  date: string
  notes: string | null
  product: { id: string; name: string; priceWarehouse: number; unitsPerBox: number }
}

interface Product {
  id: string
  name: string
  unitsPerBox: number
  priceWarehouse: number
}

export default function ProduccionPage() {
  const [production, setProduction] = useState<Production[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Production | null>(null)
  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('')
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
    const [prodRes, productsRes] = await Promise.all([
      fetch('/api/production'),
      fetch('/api/products'),
    ])
    setProduction((await prodRes.json()) || [])
    setProducts((await productsRes.json()) || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const product = products.find(p => p.id === form.productId)
    if (!product) return

    const payload = {
      productId: form.productId,
      boxes: parseInt(form.boxes.toString()),
      unitsPerBox: product.unitsPerBox,
      date: form.date,
      notes: form.notes || null,
    }

    if (editing) {
      await fetch('/api/production', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...payload, editedBy: 'admin' }),
      })
    } else {
      await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    closeModal()
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este lote de producción?')) return
    await fetch(`/api/production?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  function openModal(prod?: Production) {
    if (prod) {
      setEditing(prod)
      setForm({
        productId: prod.product.id,
        boxes: prod.boxes,
        date: prod.date.split('T')[0],
        notes: prod.notes || '',
      })
    } else {
      setEditing(null)
      setForm({ productId: products[0]?.id || '', boxes: 1, date: todayInputDate(), notes: '' })
    }
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm({ productId: '', boxes: 1, date: todayInputDate(), notes: '' })
  }

  const filteredProduction = useMemo(() => {
    return production
      .filter(p => inRange(p.date, range))
      .filter(p => !productFilter || p.product.id === productFilter)
      .filter(p => !search || p.product.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [production, range, productFilter, search])

  const stats = useMemo(() => {
    const boxes = filteredProduction.reduce((s, p) => s + p.boxes, 0)
    const units = filteredProduction.reduce((s, p) => s + p.quantity, 0)
    const value = filteredProduction.reduce((s, p) => s + p.quantity * p.product.priceWarehouse, 0)
    const days = daysBetween(range.from, range.to)
    return {
      batches: filteredProduction.length,
      boxes,
      units,
      value,
      boxesPerDay: days > 0 ? boxes / days : boxes,
      unitsPerDay: days > 0 ? units / days : units,
    }
  }, [filteredProduction, range])

  const productBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; boxes: number; units: number; value: number; batches: number }>()
    for (const p of filteredProduction) {
      const cur = map.get(p.product.id) || { name: p.product.name, boxes: 0, units: 0, value: 0, batches: 0 }
      cur.boxes += p.boxes
      cur.units += p.quantity
      cur.value += p.quantity * p.product.priceWarehouse
      cur.batches += 1
      map.set(p.product.id, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.units - a.units)
  }, [filteredProduction])

  const totalUnitsForBreakdown = productBreakdown.reduce((s, p) => s + p.units, 0) || 1

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Producción</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Registra los lotes fabricados diariamente. Cada lote se suma al stock de la fábrica y, cuando lo transfieras al almacén desde la sección <strong>Almacén</strong>, quedará disponible para distribución.
          </p>
        </div>
        <PermissionGuard module="produccion" action="create">
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Registrar producción
          </button>
        </PermissionGuard>
      </header>

      <DateRangeFilter value={range} onChange={setRange} />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Lotes registrados"
          value={formatNumber(stats.batches)}
          hint="En el período"
          icon={Factory}
          accent="primary"
        />
        <StatCard
          label="Cajas producidas"
          value={formatNumber(stats.boxes)}
          hint={`${stats.boxesPerDay.toFixed(1)} cjs / día`}
          icon={Boxes}
        />
        <StatCard
          label="Unidades producidas"
          value={formatNumber(stats.units)}
          hint={`${formatNumber(Math.round(stats.unitsPerDay))} uds / día`}
          icon={Package}
        />
        <StatCard
          label="Valor de producción"
          value={formatCurrency(stats.value)}
          hint="Costo a precio de almacén"
          icon={DollarSign}
          accent="accent-teal"
        />
      </section>

      {productBreakdown.length > 0 && (
        <section className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
          <div className="px-5 py-4 border-b border-hairline flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-ink">Producción por producto</h2>
            <span className="text-xs text-muted ml-auto">Período seleccionado</span>
          </div>
          <div className="divide-y divide-hairline">
            {productBreakdown.map((p) => {
              const pct = (p.units / totalUnitsForBreakdown) * 100
              return (
                <div key={p.name} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-ink truncate">{p.name}</span>
                      <span className="text-xs text-muted shrink-0">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-surface-soft rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0 text-xs text-muted hidden sm:block">
                    <div className="text-ink font-semibold">{formatNumber(p.boxes)} cjs · {formatNumber(p.units)} uds</div>
                    <div>{p.batches} lote{p.batches === 1 ? '' : 's'} · {formatCurrency(p.value)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted" />
            <h2 className="text-sm font-bold text-ink">Historial de producción</h2>
          </div>
          <div className="flex-1 min-w-[180px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-hairline rounded-lg bg-canvas text-body text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="px-3 py-1.5 border border-hairline rounded-lg bg-canvas text-body text-sm"
          >
            <option value="">Todos los productos</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {filteredProduction.length === 0 ? (
          <EmptyState
            icon={Factory}
            title="Sin producción en este período"
            description={production.length === 0 ? 'Aún no has registrado ningún lote. Pulsa "Registrar producción" para empezar.' : 'No hay lotes que coincidan con los filtros. Ajusta el rango de fechas o limpia los filtros.'}
            action={production.length === 0 ? <button onClick={() => openModal()} className="text-sm text-primary font-semibold hover:underline">+ Registrar el primer lote</button> : null}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-soft">
                <tr>
                  <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Producto</th>
                  <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Cajas</th>
                  <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Unidades</th>
                  <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Valor</th>
                  <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Notas</th>
                  <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredProduction.map(p => (
                  <tr key={p.id} className="hover:bg-surface-soft/50">
                    <td className="px-5 py-3 text-sm text-body whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-ink">{p.product.name}</td>
                    <td className="px-5 py-3 text-sm text-body text-right tabular-nums">{formatNumber(p.boxes)}</td>
                    <td className="px-5 py-3 text-sm text-body text-right tabular-nums">{formatNumber(p.quantity)}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-ink text-right tabular-nums">{formatCurrency(p.quantity * p.product.priceWarehouse)}</td>
                    <td className="px-5 py-3 text-sm text-muted max-w-[200px] truncate">{p.notes || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModal(p)} className="p-1.5 text-muted hover:text-ink hover:bg-surface-soft rounded" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-muted hover:text-error hover:bg-surface-soft rounded" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-soft border-t-2 border-hairline">
                <tr>
                  <td colSpan={2} className="px-5 py-3 text-sm font-bold text-ink text-right">Totales del período</td>
                  <td className="px-5 py-3 text-sm font-bold text-ink text-right tabular-nums">{formatNumber(stats.boxes)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-ink text-right tabular-nums">{formatNumber(stats.units)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-primary text-right tabular-nums">{formatCurrency(stats.value)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <Modal
          title={editing ? 'Editar lote de producción' : 'Registrar producción'}
          subtitle="Los lotes se suman al stock de la fábrica en cuanto los registras."
          onClose={closeModal}
          size="md"
          footer={
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeModal} className="px-4 py-2 bg-surface-soft text-body rounded-lg hover:bg-surface-cream-strong font-medium">
                Cancelar
              </button>
              <button
                type="submit"
                form="production-form"
                className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium"
              >
                {editing ? 'Guardar cambios' : 'Registrar lote'}
              </button>
            </div>
          }
        >
          <form id="production-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Producto fabricado</label>
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                required
                disabled={!!editing}
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body disabled:opacity-50"
              >
                <option value="">Selecciona un producto</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} · {p.unitsPerBox} uds/caja</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Cajas</label>
                <input
                  type="number"
                  value={form.boxes}
                  onChange={(e) => setForm({ ...form, boxes: parseInt(e.target.value) || 1 })}
                  required
                  min="1"
                  className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
                />
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

            {form.productId && form.boxes > 0 && (
              <div className="bg-surface-soft rounded-lg p-3 text-sm space-y-1">
                {(() => {
                  const p = products.find(x => x.id === form.productId)
                  if (!p) return null
                  const units = form.boxes * p.unitsPerBox
                  return (
                    <>
                      <div className="flex justify-between"><span className="text-muted">Total unidades:</span><span className="font-semibold text-ink">{formatNumber(units)} uds</span></div>
                      <div className="flex justify-between"><span className="text-muted">Valor estimado:</span><span className="font-semibold text-ink">{formatCurrency(units * p.priceWarehouse)}</span></div>
                    </>
                  )
                })()}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Notas (opcional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Incidencias, mermas, lote incompleto..."
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body resize-none"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
