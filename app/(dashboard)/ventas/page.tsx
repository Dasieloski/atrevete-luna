'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, ShoppingCart, Package, Search, TrendingUp, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { StatCard } from '@/src/components/StatCard'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { DateRangeFilter, defaultRange } from '@/src/components/DateRangeFilter'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Tabs } from '@/src/components/ui/Tabs'
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table'
import { cn } from '@/src/lib/utils'
import { formatDate, formatNumber, formatCurrency } from '@/src/lib/format'
import type { DateRange } from '@/src/lib/business'
import { inRange } from '@/src/lib/business'
import { ExportDropdown } from '@/src/components/ExportDropdown'

interface Sale {
  id: string
  quantity: number
  total: number
  date: string
  seller: string
  notes: string | null
  product: { id: string; name: string; priceDistribution: number; unitsPerBox: number; priceWarehouse: number }
  customer: { id: string; name: string; province: string }
}

interface Product {
  id: string
  name: string
  priceDistribution: number
  priceWarehouse: number
  unitsPerBox: number
}

interface Customer {
  id: string
  name: string
  province: string
}

interface Stock {
  productId: string
  location: string
  quantity: number
}

type Tab = 'ventas' | 'historial-producto'
type SortField = 'date' | 'product' | 'customer' | 'boxes' | 'total'

export default function DistribucionPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ventas')
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stock, setStock] = useState<Stock[]>([])
  const [showModal, setShowModal] = useState(false)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [range, setRange] = useState<DateRange>(defaultRange)

  const [form, setForm] = useState({
    productId: '',
    customerId: '',
    boxes: 1,
    price: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const PAGE_SIZES = [10, 25, 50, 100]

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [salesRes, productsRes, customersRes, stockRes] = await Promise.all([
      fetch('/api/sales'),
      fetch('/api/products'),
      fetch('/api/customers'),
      fetch('/api/stock'),
    ])
    setSales(await salesRes.json())
    setProducts(await productsRes.json())
    setCustomers(await customersRes.json())
    setStock(await stockRes.json())
  }

  function getStockAt(productId: string): number {
    return stock.find((s) => s.productId === productId && s.location === 'main')?.quantity || 0
  }

  function getBoxesAt(productId: string): number {
    const p = products.find((pr) => pr.id === productId)
    if (!p) return 0
    return Math.floor(getStockAt(productId) / (p.unitsPerBox || 100))
  }

  function getDefaultPrice(productId: string): number {
    const p = products.find((pr) => pr.id === productId)
    if (!p) return 0
    return +(p.priceDistribution * (p.unitsPerBox || 100)).toFixed(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const product = products.find((p) => p.id === form.productId)
    if (!product) return

    const boxes = parseInt(form.boxes.toString())
    const maxBoxes = getBoxesAt(form.productId)
    if (maxBoxes === 0) {
      alert('No hay stock disponible en almacén')
      return
    }
    if (boxes > maxBoxes) {
      alert(`Solo hay ${maxBoxes} cajas disponibles en almacén`)
      return
    }

    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: form.productId,
        customerId: form.customerId,
        boxes,
        price: form.price,
        date: form.date,
        seller: 'alex',
        notes: form.notes || null,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      alert(err.error || 'Error al registrar venta')
      return
    }

    closeModal()
    fetchData()
  }

  function openModal() {
    const firstProductId = products[0]?.id || ''
    setForm({
      productId: firstProductId,
      customerId: '',
      boxes: 1,
      price: firstProductId ? getDefaultPrice(firstProductId) : 0,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setForm({
      productId: '',
      customerId: '',
      boxes: 1,
      price: 0,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    })
  }

  const totalVentas = sales.reduce((sum, s) => sum + s.total, 0)
  const totalCajas = sales.reduce(
    (sum, s) => sum + Math.floor(s.quantity / (s.product.unitsPerBox || 100)),
    0
  )
  const totalUnidades = sales.reduce((sum, s) => sum + s.quantity, 0)

  const filteredSales = useMemo(() => {
    return sales
      .filter((s) => inRange(s.date, range))
      .filter((s) => {
        if (!search) return true
        const t = search.toLowerCase()
        return (
          s.product.name.toLowerCase().includes(t) ||
          s.customer.name.toLowerCase().includes(t) ||
          s.customer.province.toLowerCase().includes(t)
        )
      })
      .sort((a, b) => {
        let aVal: string | number = 0
        let bVal: string | number = 0
        switch (sortField) {
          case 'date':
            aVal = new Date(a.date).getTime()
            bVal = new Date(b.date).getTime()
            break
          case 'product':
            aVal = a.product.name
            bVal = b.product.name
            return sortOrder === 'asc'
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal)
          case 'customer':
            aVal = a.customer.name
            bVal = b.customer.name
            return sortOrder === 'asc'
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal)
          case 'boxes':
            aVal = Math.floor(a.quantity / (a.product.unitsPerBox || 100))
            bVal = Math.floor(b.quantity / (b.product.unitsPerBox || 100))
            break
          case 'total':
            aVal = a.total
            bVal = b.total
            break
        }
        return sortOrder === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number)
      })
  }, [sales, range, search, sortField, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize))
  const paginatedSales = filteredSales.slice((page - 1) * pageSize, page * pageSize)

  const salesByProduct = useMemo(() => {
    return products
      .map((p) => {
        const prodSales = sales.filter((s) => s.product.id === p.id)
        const cajas = prodSales.reduce(
          (sum, s) => sum + Math.floor(s.quantity / (p.unitsPerBox || 100)),
          0
        )
        const total = prodSales.reduce((sum, s) => sum + s.total, 0)
        return { product: p, count: prodSales.length, cajas, total }
      })
      .filter((p) => p.count > 0)
  }, [products, sales])

  const filteredProdHistory = salesByProduct
    .filter((sp) => !productFilter || sp.product.id === productFilter)
    .sort((a, b) => b.total - a.total)

  const selectedProduct = products.find((p) => p.id === form.productId)
  const availableBoxes = selectedProduct ? getBoxesAt(selectedProduct.id) : 0
  const filterRangeSales = filteredSales.length

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-soft" />
    return (
      <ArrowUpDown
        className={cn(
          'ml-1 inline h-3 w-3 transition-transform',
          sortOrder === 'asc' ? 'rotate-180' : '',
          'text-primary'
        )}
      />
    )
  }

  function SortableTH({
    field,
    children,
    className,
  }: {
    field: SortField
    children: React.ReactNode
    className?: string
  }) {
    return (
      <TH
        className={cn('cursor-pointer select-none', className)}
        onClick={() => handleSort(field)}
      >
        {children}
        <SortIcon field={field} />
      </TH>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cadena de suministro · 3 / 3"
        title="Distribución y ventas"
        description="Registra las ventas del día a los distribuidores y consulta el historial completo. Cada venta descuenta stock del almacén y genera una deuda automática."
        actions={
          <PermissionGuard module="ventas" action="create">
            <Button
              onClick={openModal}
              leadingIcon={<Plus className="h-4 w-4" />}
            >
              Nueva venta
            </Button>
          </PermissionGuard>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Ingresos totales"
          value={formatCurrency(totalVentas)}
          icon={ShoppingCart}
          accent="success"
        />
        <StatCard
          label="Cajas vendidas"
          value={formatNumber(totalCajas)}
          icon={Package}
          accent="primary"
        />
        <StatCard
          label="Unidades vendidas"
          value={formatNumber(totalUnidades)}
          icon={Package}
        />
        <StatCard
          label="Registros totales"
          value={formatNumber(sales.length)}
          icon={ShoppingCart}
        />
      </section>

      <DateRangeFilter value={range} onChange={setRange} />

      <Tabs
        value={activeTab}
        onChange={(v) => setActiveTab(v as Tab)}
        tabs={[
          {
            id: 'ventas',
            label: (
              <span className="inline-flex items-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" />
                Ventas
              </span>
            ),
          },
          {
            id: 'historial-producto',
            label: (
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Historial por producto
              </span>
            ),
          },
        ]}
      />

      {activeTab === 'ventas' && (
        <>
          <section className="ts-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted" />
                <h2 className="text-sm font-medium text-ink">
                  Registro de ventas
                </h2>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <Input
                  type="text"
                  placeholder="Buscar por producto, cliente o provincia…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  leadingIcon={<Search className="h-3.5 w-3.5" />}
                  className="w-56 sm:w-72"
                />
                <span className="text-xs text-muted">
                  {filterRangeSales} venta{filterRangeSales !== 1 ? 's' : ''}
                </span>
                <ExportDropdown
                  rows={filteredSales.map((s) => {
                    const unitsPerBox = s.product.unitsPerBox || 100
                    const boxes = Math.floor(s.quantity / unitsPerBox)
                    return {
                      Fecha: formatDate(s.date),
                      Producto: s.product.name,
                      Cliente: s.customer.name,
                      Provincia: s.customer.province,
                      Cajas: boxes,
                      Unidades: s.quantity,
                      Total: s.total,
                      Vendedor: s.seller,
                      Notas: s.notes || '',
                    }
                  })}
                  headers={['Fecha', 'Producto', 'Cliente', 'Provincia', 'Cajas', 'Unidades', 'Total', 'Vendedor', 'Notas']}
                  filename={`ventas_${range.from}_${range.to}`}
                  pdfTitle="Registro de Ventas"
                  pdfSubtitle={`Período: ${range.from} a ${range.to}`}
                  disabled={filteredSales.length === 0}
                />
              </div>
            </div>

            {paginatedSales.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="Sin ventas en este período"
                description={
                  sales.length === 0
                    ? 'Aún no has registrado ninguna venta. Pulsa "Nueva venta" para empezar.'
                    : 'No hay ventas que coincidan con los filtros. Ajusta el rango de fechas o limpia la búsqueda.'
                }
                action={
                  sales.length === 0 ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={openModal}
                      leadingIcon={<Plus className="h-3.5 w-3.5" />}
                    >
                      Registrar primera venta
                    </Button>
                  ) : null
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <SortableTH field="date">Fecha</SortableTH>
                      <SortableTH field="product">Producto</SortableTH>
                      <SortableTH field="customer">Cliente</SortableTH>
                      <TH>Provincia</TH>
                      <SortableTH field="boxes" className="text-right">
                        Cajas
                      </SortableTH>
                      <TH className="text-right">Unidades</TH>
                      <SortableTH field="total" className="text-right">
                        Total
                      </SortableTH>
                      <TH>Notas</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {paginatedSales.map((sale) => {
                      const unitsPerBox = sale.product.unitsPerBox || 100
                      const boxes = Math.floor(sale.quantity / unitsPerBox)
                      return (
                        <TR key={sale.id}>
                          <TD className="whitespace-nowrap font-mono text-[13px]">
                            {formatDate(sale.date)}
                          </TD>
                          <TD className="font-medium text-ink">
                            {sale.product.name}
                          </TD>
                          <TD>{sale.customer.name}</TD>
                          <TD className="text-muted">{sale.customer.province}</TD>
                          <TD className="text-right font-mono font-medium text-ink">
                            {formatNumber(boxes)}
                          </TD>
                          <TD className="text-right font-mono text-muted">
                            {formatNumber(sale.quantity)}
                          </TD>
                          <TD className="text-right font-mono font-semibold text-ink">
                            {formatCurrency(sale.total)}
                          </TD>
                          <TD className="max-w-[150px] truncate text-muted">
                            {sale.notes || '—'}
                          </TD>
                        </TR>
                      )
                    })}
                  </TBody>
                </Table>
              </div>
            )}
          </section>

          {paginatedSales.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>Mostrar</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value))
                    setPage(1)
                  }}
                  className="h-8 rounded-md border border-hairline-strong bg-canvas px-2 text-sm text-ink hover:border-pewter focus:border-primary focus:outline-none"
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <span>
                  de {filteredSales.length} registro
                  {filteredSales.length !== 1 ? 's' : ''}
                </span>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    leadingIcon={<ChevronLeft className="h-3.5 w-3.5" />}
                  >
                    Anterior
                  </Button>
                  {Array.from(
                    { length: Math.min(5, totalPages) },
                    (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                      const p = start + i
                      if (p > totalPages) return null
                      return (
                        <Button
                          key={p}
                          variant={p === page ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => setPage(p)}
                          className="min-w-[2rem]"
                        >
                          {p}
                        </Button>
                      )
                    }
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    trailingIcon={<ChevronRight className="h-3.5 w-3.5" />}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'historial-producto' && (
        <>
          <div className="ts-card-pad flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted">Filtrar por producto:</span>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="h-10 rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink hover:border-pewter focus:border-primary focus:outline-none"
            >
              <option value="">Todos los productos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="ml-auto text-xs text-muted-soft">
              {filteredProdHistory.length} producto
              {filteredProdHistory.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filteredProdHistory.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Sin ventas registradas"
              description="No hay ventas para mostrar. Registra tu primera venta para ver el historial por producto."
            />
          ) : (
            <div className="space-y-4">
              {filteredProdHistory.map((sp) => {
                const prodSales = sales.filter((s) => s.product.id === sp.product.id)
                return (
                  <div key={sp.product.id} className="ts-card overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-ash/40 px-5 py-3.5 sm:px-6">
                      <h3 className="text-sm font-medium text-ink">
                        {sp.product.name}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-muted">
                          {sp.count} venta{sp.count !== 1 ? 's' : ''}
                        </span>
                        <span className="font-medium text-ink">
                          {formatNumber(sp.cajas)} cajas
                        </span>
                        <span className="font-semibold text-ink">
                          {formatCurrency(sp.total)}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <THead>
                          <TR>
                            <TH>Fecha</TH>
                            <TH>Cliente</TH>
                            <TH>Provincia</TH>
                            <TH className="text-right">Cajas</TH>
                            <TH className="text-right">Total</TH>
                          </TR>
                        </THead>
                        <TBody>
                          {prodSales.map((s) => {
                            const unitsPerBox = s.product.unitsPerBox || 100
                            return (
                              <TR key={s.id}>
                                <TD className="whitespace-nowrap font-mono text-[13px]">
                                  {formatDate(s.date)}
                                </TD>
                                <TD>{s.customer.name}</TD>
                                <TD className="text-muted">
                                  {s.customer.province}
                                </TD>
                                <TD className="text-right font-mono font-medium text-ink">
                                  {formatNumber(Math.floor(s.quantity / unitsPerBox))}
                                </TD>
                                <TD className="text-right font-mono font-semibold text-ink">
                                  {formatCurrency(s.total)}
                                </TD>
                              </TR>
                            )
                          })}
                        </TBody>
                      </Table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {showModal && (
        <Modal
          title="Registrar venta"
          subtitle="La venta descuenta stock del almacén y genera una deuda automática."
          onClose={closeModal}
          size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="sale-form"
                disabled={
                  !form.productId ||
                  !form.customerId ||
                  form.boxes < 1 ||
                  form.price <= 0 ||
                  (selectedProduct !== undefined && availableBoxes === 0)
                }
              >
                Registrar venta
              </Button>
            </>
          }
        >
          <form id="sale-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="ts-label">Producto</label>
              <select
                value={form.productId}
                onChange={(e) => {
                  const id = e.target.value
                  setForm({
                    ...form,
                    productId: id,
                    boxes: 1,
                    price: getDefaultPrice(id),
                  })
                }}
                required
                className="ts-input"
              >
                <option value="">Selecciona un producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} —{' '}
                    {formatCurrency(p.priceDistribution * (p.unitsPerBox || 100))}
                    /caja ({formatNumber(getBoxesAt(p.id))} cjs disp.)
                  </option>
                ))}
              </select>
            </div>

            {form.productId && (
              <div
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2.5 text-sm',
                  availableBoxes > 0 ? 'bg-ash' : 'bg-error-soft'
                )}
              >
                <span className="text-muted">Stock disponible:</span>
                <span
                  className={cn(
                    'font-medium',
                    availableBoxes > 0 ? 'text-ink' : 'text-error'
                  )}
                >
                  {formatNumber(availableBoxes)} cajas (
                  {formatNumber(selectedProduct ? getStockAt(selectedProduct.id) : 0)}{' '}
                  uds)
                </span>
              </div>
            )}

            <div>
              <label className="ts-label">Cliente</label>
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                required
                className="ts-input"
              >
                <option value="">Selecciona un cliente</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.province}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ts-label">Cajas vendidas</label>
                <input
                  type="number"
                  value={form.boxes}
                  onChange={(e) =>
                    setForm({ ...form, boxes: parseInt(e.target.value) || 0 })
                  }
                  required
                  min="1"
                  max={form.productId ? availableBoxes : undefined}
                  className="ts-input"
                />
                {selectedProduct && availableBoxes > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    Máx disponible: {formatNumber(availableBoxes)} cajas
                  </p>
                )}
                {selectedProduct && availableBoxes === 0 && (
                  <p className="mt-1 text-xs text-error">
                    No hay stock disponible. Transfiere de fábrica al almacén primero.
                  </p>
                )}
              </div>
              <div>
                <label className="ts-label">Precio por caja</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="ts-input"
                />
              </div>
            </div>

            {form.productId && form.boxes > 0 && form.price > 0 && (
              <div className="flex items-center justify-between rounded-md bg-primary/10 px-3 py-2.5">
                <span className="text-sm text-muted">Total de la venta:</span>
                <span className="text-lg font-semibold text-primary">
                  {formatCurrency(form.boxes * form.price)}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="ts-label">Notas (opcional)</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Observaciones"
                  className="ts-input"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
