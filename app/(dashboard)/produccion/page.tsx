'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Factory,
  Package,
  Boxes,
  DollarSign,
  TrendingUp,
  Search,
  History,
} from 'lucide-react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { DateRangeFilter, defaultRange } from '@/src/components/DateRangeFilter'
import { StatCard } from '@/src/components/StatCard'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/src/components/ui/Table'
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
    const product = products.find((p) => p.id === form.productId)
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
      setForm({
        productId: products[0]?.id || '',
        boxes: 1,
        date: todayInputDate(),
        notes: '',
      })
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
      .filter((p) => inRange(p.date, range))
      .filter((p) => !productFilter || p.product.id === productFilter)
      .filter(
        (p) =>
          !search || p.product.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [production, range, productFilter, search])

  const stats = useMemo(() => {
    const boxes = filteredProduction.reduce((s, p) => s + p.boxes, 0)
    const units = filteredProduction.reduce((s, p) => s + p.quantity, 0)
    const value = filteredProduction.reduce(
      (s, p) => s + p.quantity * p.product.priceWarehouse,
      0
    )
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
    const map = new Map<
      string,
      { name: string; boxes: number; units: number; value: number; batches: number }
    >()
    for (const p of filteredProduction) {
      const cur = map.get(p.product.id) || {
        name: p.product.name,
        boxes: 0,
        units: 0,
        value: 0,
        batches: 0,
      }
      cur.boxes += p.boxes
      cur.units += p.quantity
      cur.value += p.quantity * p.product.priceWarehouse
      cur.batches += 1
      map.set(p.product.id, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.units - a.units)
  }, [filteredProduction])

  const totalUnitsForBreakdown =
    productBreakdown.reduce((s, p) => s + p.units, 0) || 1

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cadena de suministro · 1 / 3"
        title="Producción"
        description="Registra los lotes fabricados diariamente. Cada lote se suma al stock de la fábrica y, cuando lo transfieras al almacén desde la sección Almacén, quedará disponible para distribución."
        actions={
          <PermissionGuard module="produccion" action="create">
            <Button
              onClick={() => openModal()}
              leadingIcon={<Plus className="h-4 w-4" />}
            >
              Registrar producción
            </Button>
          </PermissionGuard>
        }
      />

      <DateRangeFilter value={range} onChange={setRange} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          accent="success"
        />
      </section>

      {productBreakdown.length > 0 && (
        <section className="ts-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-hairline px-5 py-4 sm:px-6">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-ink">
              Producción por producto
            </h2>
            <span className="ml-auto text-xs text-muted-soft">
              Período seleccionado
            </span>
          </div>
          <div className="divide-y divide-hairline">
            {productBreakdown.map((p) => {
              const pct = (p.units / totalUnitsForBreakdown) * 100
              return (
                <div
                  key={p.name}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-ink">
                        {p.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ash">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="hidden shrink-0 text-right text-xs text-muted sm:block">
                    <div className="font-medium text-ink">
                      {formatNumber(p.boxes)} cjs · {formatNumber(p.units)} uds
                    </div>
                    <div>
                      {p.batches} lote{p.batches === 1 ? '' : 's'} ·{' '}
                      {formatCurrency(p.value)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="ts-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-medium text-ink">Historial de producción</h2>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Input
              type="text"
              placeholder="Buscar producto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leadingIcon={<Search className="h-3.5 w-3.5" />}
              className="w-44 sm:w-56"
            />
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="h-10 rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink hover:border-pewter focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Todos los productos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredProduction.length === 0 ? (
          <EmptyState
            icon={Factory}
            title="Sin producción en este período"
            description={
              production.length === 0
                ? 'Aún no has registrado ningún lote. Pulsa "Registrar producción" para empezar.'
                : 'No hay lotes que coincidan con los filtros. Ajusta el rango de fechas o limpia los filtros.'
            }
            action={
              production.length === 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openModal()}
                  leadingIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Registrar el primer lote
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Producto</TH>
                  <TH className="text-right">Cajas</TH>
                  <TH className="text-right">Unidades</TH>
                  <TH className="text-right">Valor</TH>
                  <TH>Notas</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {filteredProduction.map((p) => (
                  <TR key={p.id}>
                    <TD className="whitespace-nowrap font-mono text-[13px]">
                      {formatDate(p.date)}
                    </TD>
                    <TD className="font-medium text-ink">{p.product.name}</TD>
                    <TD className="text-right font-mono">
                      {formatNumber(p.boxes)}
                    </TD>
                    <TD className="text-right font-mono">
                      {formatNumber(p.quantity)}
                    </TD>
                    <TD className="text-right font-mono font-medium text-ink">
                      {formatCurrency(p.quantity * p.product.priceWarehouse)}
                    </TD>
                    <TD className="max-w-[200px] truncate text-muted">
                      {p.notes || '—'}
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openModal(p)}
                          className="ts-btn-icon"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <PermissionGuard module="produccion" action="delete">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="ts-btn-icon hover:bg-error-soft hover:text-error"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                      </div>
                    </TD>
                  </TR>
                ))}
                <TR className="bg-ash/40 font-medium hover:bg-ash/40">
                  <TD colSpan={2} className="text-right text-ink">
                    Totales del período
                  </TD>
                  <TD className="text-right font-mono text-ink">
                    {formatNumber(stats.boxes)}
                  </TD>
                  <TD className="text-right font-mono text-ink">
                    {formatNumber(stats.units)}
                  </TD>
                  <TD className="text-right font-mono text-primary">
                    {formatCurrency(stats.value)}
                  </TD>
                  <TD colSpan={2} />
                </TR>
              </TBody>
            </Table>
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
            <>
              <Button variant="ghost" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" form="production-form">
                {editing ? 'Guardar cambios' : 'Registrar lote'}
              </Button>
            </>
          }
        >
          <form id="production-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="ts-label">Producto fabricado</label>
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                required
                disabled={!!editing}
                className="ts-input"
              >
                <option value="">Selecciona un producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.unitsPerBox} uds/caja
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ts-label">Cajas</label>
                <input
                  type="number"
                  value={form.boxes}
                  onChange={(e) =>
                    setForm({ ...form, boxes: parseInt(e.target.value) || 1 })
                  }
                  required
                  min="1"
                  className="ts-input"
                />
              </div>
              <div>
                <label className="ts-label">Fecha</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="ts-input"
                />
              </div>
            </div>

            {form.productId && form.boxes > 0 && (
              <div className="space-y-1 rounded-md bg-ash px-3 py-2.5 text-sm">
                {(() => {
                  const p = products.find((x) => x.id === form.productId)
                  if (!p) return null
                  const units = form.boxes * p.unitsPerBox
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted">Total unidades:</span>
                        <span className="font-medium text-ink">
                          {formatNumber(units)} uds
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Valor estimado:</span>
                        <span className="font-medium text-ink">
                          {formatCurrency(units * p.priceWarehouse)}
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}

            <div>
              <label className="ts-label">Notas (opcional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Incidencias, mermas, lote incompleto…"
                className="w-full resize-none rounded-md border border-hairline-strong bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-muted-soft transition-colors hover:border-pewter focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
