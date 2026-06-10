'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ArrowRight,
  Package,
  Boxes,
  Warehouse,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  AlertCircle,
  Search,
} from 'lucide-react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { DateRangeFilter, defaultRange } from '@/src/components/DateRangeFilter'
import { StatCard } from '@/src/components/StatCard'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Badge } from '@/src/components/ui/Badge'
import { Tabs } from '@/src/components/ui/Tabs'
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table'
import { formatDate, formatNumber, todayInputDate, daysBetween } from '@/src/lib/format'
import { inRange, type DateRange } from '@/src/lib/business'
import { ExportDropdown } from '@/src/components/ExportDropdown'

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
    return (
      stock.find((s) => s.productId === productId && s.location === location)
        ?.quantity || 0
    )
  }

  function getBoxes(productId: string, location: string): number {
    const p = products.find((pr) => pr.id === productId)
    if (!p) return 0
    return Math.floor(getUnits(productId, location) / (p.unitsPerBox || 100))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const product = products.find((p) => p.id === form.productId)
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
    setForm({
      productId: products[0]?.id || '',
      boxes: 1,
      date: todayInputDate(),
      notes: '',
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setForm({ productId: '', boxes: 1, date: todayInputDate(), notes: '' })
  }

  const stockByProduct = useMemo(() => {
    return products
      .map((p) => {
        const factoryUnits =
          stock.find((s) => s.productId === p.id && s.location === 'factory')
            ?.quantity || 0
        const mainUnits =
          stock.find((s) => s.productId === p.id && s.location === 'main')
            ?.quantity || 0
        return {
          ...p,
          factoryBoxes: Math.floor(factoryUnits / (p.unitsPerBox || 100)),
          factoryUnits,
          mainBoxes: Math.floor(mainUnits / (p.unitsPerBox || 100)),
          mainUnits,
        }
      })
      .filter((p) => p.factoryUnits > 0 || p.mainUnits > 0)
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
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [transfers, sales])

  const filteredMovements = useMemo(() => {
    return movements
      .filter((m) => inRange(m.date, range))
      .filter((m) => typeFilter === 'all' || m.type === typeFilter)
      .filter(
        (m) =>
          !search || m.product.name.toLowerCase().includes(search.toLowerCase())
      )
  }, [movements, range, typeFilter, search])

  const stats = useMemo(() => {
    let entries = 0
    let exits = 0
    for (const m of filteredMovements) {
      if (m.type === 'Entrada') entries += m.boxes
      else exits += m.boxes
    }
    const currentMainBoxes = stockByProduct.reduce(
      (s, p) => s + p.mainBoxes,
      0
    )
    const currentFactoryBoxes = stockByProduct.reduce(
      (s, p) => s + p.factoryBoxes,
      0
    )
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

  const selectedProduct = products.find((p) => p.id === form.productId)
  const availableFactoryBoxes = selectedProduct
    ? getBoxes(selectedProduct.id, 'factory')
    : 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cadena de suministro · 2 / 3"
        title="Almacén"
        description="Centro de distribución. Aquí ves el stock listo para vender, mueves lotes desde la fábrica y revisas el historial de entradas y salidas."
        actions={
          <PermissionGuard module="almacen" action="create">
            <Button
              onClick={openModal}
              leadingIcon={<ArrowRight className="h-4 w-4" />}
            >
              Transferir de fábrica
            </Button>
          </PermissionGuard>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          accent="warning"
        />
        <StatCard
          label="Stock en fábrica"
          value={`${formatNumber(stats.currentFactoryBoxes)} cjs`}
          hint="Aún sin transferir al almacén"
          icon={Boxes}
        />
      </section>

      <section className="ts-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-hairline px-5 py-4 sm:px-6">
          <Package className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium text-ink">Stock por producto</h2>
          <span className="ml-auto text-xs text-muted-soft">Estado actual</span>
        </div>
        {stockByProduct.length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title="Sin stock todavía"
            description="Cuando transfieras lotes desde la fábrica o recibas producción, aparecerán aquí."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Producto</TH>
                  <TH className="text-right">En fábrica</TH>
                  <TH className="text-right">En almacén</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {stockByProduct.map((p) => {
                  const totalBoxes = p.factoryBoxes + p.mainBoxes
                  const totalUnits = p.factoryUnits + p.mainUnits
                  return (
                    <TR key={p.id}>
                      <TD className="font-medium text-ink">{p.name}</TD>
                      <TD className="text-right font-mono">
                        <div>{formatNumber(p.factoryBoxes)} cjs</div>
                        <div className="text-xs text-muted-soft">
                          {formatNumber(p.factoryUnits)} uds
                        </div>
                      </TD>
                      <TD className="text-right font-mono">
                        <div className="font-medium text-primary">
                          {formatNumber(p.mainBoxes)} cjs
                        </div>
                        <div className="text-xs text-muted-soft">
                          {formatNumber(p.mainUnits)} uds
                        </div>
                      </TD>
                      <TD className="text-right font-mono font-medium text-ink">
                        <div>{formatNumber(totalBoxes)} cjs</div>
                        <div className="text-xs font-normal text-muted">
                          {formatNumber(totalUnits)} uds
                        </div>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </div>
        )}
      </section>

      <section className="ts-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-medium text-ink">
              Historial de movimientos
            </h2>
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
            <Tabs
              size="sm"
              variant="pill"
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as 'all' | 'Entrada' | 'Salida')}
              tabs={[
                { id: 'all', label: 'Todos' },
                { id: 'Entrada', label: 'Entradas' },
                { id: 'Salida', label: 'Salidas' },
              ]}
            />
            <ExportDropdown
              rows={filteredMovements.map((m) => ({
                Fecha: formatDate(m.date),
                Tipo: m.type,
                Producto: m.product.name,
                Origen: m.source,
                Cajas: m.boxes,
                Notas: m.notes || '',
              }))}
              headers={['Fecha', 'Tipo', 'Producto', 'Origen', 'Cajas', 'Notas']}
              filename={`movimientos_${range.from}_${range.to}`}
              pdfTitle="Historial de Movimientos"
              pdfSubtitle={`Período: ${range.from} a ${range.to}`}
              disabled={filteredMovements.length === 0}
            />
          </div>
        </div>

        <div className="px-5 py-3 sm:px-6">
          <DateRangeFilter
            value={range}
            onChange={setRange}
            className="border-0 bg-transparent p-0"
          />
        </div>

        {filteredMovements.length === 0 ? (
          <EmptyState
            icon={History}
            title="Sin movimientos en este período"
            description="Cuando muevas lotes desde la fábrica o registres ventas, aparecerán aquí."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Tipo</TH>
                  <TH>Producto</TH>
                  <TH>Origen</TH>
                  <TH className="text-right">Cajas</TH>
                  <TH>Notas</TH>
                </TR>
              </THead>
              <TBody>
                {filteredMovements.map((m) => (
                  <TR key={m.id}>
                    <TD className="whitespace-nowrap font-mono text-[13px]">
                      {formatDate(m.date)}
                    </TD>
                    <TD>
                      <Badge tone={m.type === 'Entrada' ? 'success' : 'error'}>
                        {m.type === 'Entrada' ? (
                          <ArrowDownToLine className="h-3 w-3" />
                        ) : (
                          <ArrowUpFromLine className="h-3 w-3" />
                        )}
                        {m.type}
                      </Badge>
                    </TD>
                    <TD className="font-medium text-ink">{m.product.name}</TD>
                    <TD className="text-muted">{m.source}</TD>
                    <TD className="text-right font-mono font-medium text-ink">
                      {formatNumber(m.boxes)}
                    </TD>
                    <TD className="max-w-[200px] truncate text-muted">
                      {m.notes || '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
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
            <>
              <Button variant="ghost" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="transfer-form"
                disabled={!selectedProduct || availableFactoryBoxes === 0}
              >
                Transferir
              </Button>
            </>
          }
        >
          <form id="transfer-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="ts-label">Producto</label>
              <select
                value={form.productId}
                onChange={(e) =>
                  setForm({ ...form, productId: e.target.value, boxes: 1 })
                }
                required
                className="ts-input"
              >
                <option value="">Selecciona un producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {getBoxes(p.id, 'factory')} cjs en fábrica
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="space-y-1.5 rounded-md bg-ash px-3 py-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Stock en fábrica:</span>
                  <span
                    className={
                      availableFactoryBoxes > 0
                        ? 'font-medium text-ink'
                        : 'font-medium text-error'
                    }
                  >
                    {formatNumber(availableFactoryBoxes)} cjs ·{' '}
                    {formatNumber(
                      selectedProduct.unitsPerBox * availableFactoryBoxes
                    )}{' '}
                    uds
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Stock en almacén:</span>
                  <span className="font-medium text-ink">
                    {formatNumber(getBoxes(selectedProduct.id, 'main'))} cjs
                  </span>
                </div>
                {availableFactoryBoxes === 0 && (
                  <div className="mt-2 flex items-start gap-1.5 border-t border-hairline pt-2 text-xs text-error">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      No hay stock en fábrica. Registra producción primero.
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ts-label">Cajas a transferir</label>
                <input
                  type="number"
                  value={form.boxes}
                  onChange={(e) =>
                    setForm({ ...form, boxes: parseInt(e.target.value) || 0 })
                  }
                  required
                  min="1"
                  max={availableFactoryBoxes || undefined}
                  disabled={!selectedProduct}
                  className="ts-input"
                />
                {selectedProduct && availableFactoryBoxes > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    Máx: {formatNumber(availableFactoryBoxes)} cjs
                  </p>
                )}
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

            <div>
              <label className="ts-label">Notas (opcional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Motivo, lote de producción…"
                className="ts-input"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
