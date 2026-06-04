'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, ShoppingCart, Package, Search, TrendingUp } from 'lucide-react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { StatCard } from '@/src/components/StatCard'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { DateRangeFilter, defaultRange } from '@/src/components/DateRangeFilter'
import { formatDate, formatNumber, formatCurrency } from '@/src/lib/format'
import type { DateRange } from '@/src/lib/business'
import { inRange } from '@/src/lib/business'

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

export default function DistribucionPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ventas')
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stock, setStock] = useState<Stock[]>([])
  const [showModal, setShowModal] = useState(false)
  const [sortField, setSortField] = useState<'date' | 'product' | 'customer' | 'boxes' | 'total'>('date')
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

  useEffect(() => { fetchData() }, [])

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
    return stock.find(s => s.productId === productId && s.location === 'main')?.quantity || 0
  }

  function getBoxesAt(productId: string): number {
    const p = products.find(pr => pr.id === productId)
    if (!p) return 0
    return Math.floor(getStockAt(productId) / (p.unitsPerBox || 100))
  }

  function getDefaultPrice(productId: string): number {
    const p = products.find(pr => pr.id === productId)
    if (!p) return 0
    return +(p.priceDistribution * (p.unitsPerBox || 100)).toFixed(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const product = products.find(p => p.id === form.productId)
    if (!product) return

    const boxes = parseInt(form.boxes.toString())
    const maxBoxes = getBoxesAt(form.productId)
    if (maxBoxes === 0) { alert('No hay stock disponible en almacén'); return }
    if (boxes > maxBoxes) { alert(`Solo hay ${maxBoxes} cajas disponibles en almacén`); return }

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
      productId: '', customerId: '', boxes: 1, price: 0,
      date: new Date().toISOString().split('T')[0], notes: '',
    })
  }

  const totalVentas = sales.reduce((sum, s) => sum + s.total, 0)
  const totalCajas = sales.reduce((sum, s) => sum + Math.floor(s.quantity / (s.product.unitsPerBox || 100)), 0)
  const totalUnidades = sales.reduce((sum, s) => sum + s.quantity, 0)

  const filteredSales = useMemo(() => {
    return sales
      .filter(s => inRange(s.date, range))
      .filter(s => {
        if (!search) return true
        const t = search.toLowerCase()
        return s.product.name.toLowerCase().includes(t)
          || s.customer.name.toLowerCase().includes(t)
          || s.customer.province.toLowerCase().includes(t)
      })
      .sort((a, b) => {
        let aVal: string | number = 0, bVal: string | number = 0
        switch (sortField) {
          case 'date': aVal = new Date(a.date).getTime(); bVal = new Date(b.date).getTime(); break
          case 'product': aVal = a.product.name; bVal = b.product.name; return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
          case 'customer': aVal = a.customer.name; bVal = b.customer.name; return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
          case 'boxes': aVal = Math.floor(a.quantity / (a.product.unitsPerBox || 100)); bVal = Math.floor(b.quantity / (b.product.unitsPerBox || 100)); break
          case 'total': aVal = a.total; bVal = b.total; break
          default: aVal = 0; bVal = 0
        }
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      })
  }, [sales, range, search, sortField, sortOrder])

  const totalPages = Math.ceil(filteredSales.length / pageSize)
  const paginatedSales = filteredSales.slice((page - 1) * pageSize, page * pageSize)

  const salesByProduct = useMemo(() => {
    return products.map(p => {
      const prodSales = sales.filter(s => s.product.id === p.id)
      const cajas = prodSales.reduce((sum, s) => sum + Math.floor(s.quantity / (p.unitsPerBox || 100)), 0)
      const total = prodSales.reduce((sum, s) => sum + s.total, 0)
      return { product: p, count: prodSales.length, cajas, total }
    }).filter(p => p.count > 0)
  }, [products, sales])

  const filteredProdHistory = salesByProduct
    .filter(sp => !productFilter || sp.product.id === productFilter)
    .sort((a, b) => b.total - a.total)

  const selectedProduct = products.find(p => p.id === form.productId)
  const availableBoxes = selectedProduct ? getBoxesAt(selectedProduct.id) : 0
  const filterRangeSales = filteredSales.length

  function handleSort(field: typeof sortField) {
    setSortField(field);
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  function SortIcon(field: typeof sortField) {
    if (sortField !== field) return ''
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Ventas</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Registra las ventas del día a los distribuidores y consulta el historial completo. Cada venta descuenta stock del almacén y genera una deuda automática.
          </p>
        </div>
        <PermissionGuard module="ventas" action="create">
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva venta
          </button>
        </PermissionGuard>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard label="Ingresos totales" value={formatCurrency(totalVentas)} icon={ShoppingCart} accent="success" />
        <StatCard label="Cajas vendidas" value={formatNumber(totalCajas)} icon={Package} accent="primary" />
        <StatCard label="Unidades vendidas" value={formatNumber(totalUnidades)} icon={Package} />
        <StatCard label="Registros totales" value={formatNumber(sales.length)} icon={ShoppingCart} />
      </section>

      <DateRangeFilter value={range} onChange={setRange} />

      <div className="flex gap-1 bg-surface-soft rounded-lg p-1 border border-hairline w-fit">
        <button onClick={() => setActiveTab('ventas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'ventas' ? 'bg-surface-card text-ink shadow-sm' : 'text-muted hover:text-body'}`}>
          <ShoppingCart className="w-4 h-4" />
          Ventas
        </button>
        <button onClick={() => setActiveTab('historial-producto')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'historial-producto' ? 'bg-surface-card text-ink shadow-sm' : 'text-muted hover:text-body'}`}>
          <TrendingUp className="w-4 h-4" />
          Historial por producto
        </button>
      </div>

      {activeTab === 'ventas' && (
        <>
          <section className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
            <div className="px-5 py-4 border-b border-hairline flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted" />
                <h2 className="text-sm font-bold text-ink">Registro de ventas</h2>
              </div>
              <div className="flex-1 min-w-[200px] relative">
                <input type="text" placeholder="Buscar por producto, cliente o provincia..."
                  value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="w-full pl-3 pr-3 py-1.5 border border-hairline rounded-lg bg-canvas text-body text-sm focus:outline-none focus:border-primary" />
              </div>
              <span className="text-xs text-muted">{filterRangeSales} venta{filterRangeSales !== 1 ? 's' : ''}</span>
            </div>

            {paginatedSales.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="Sin ventas en este período"
                description={sales.length === 0 ? 'Aún no has registrado ninguna venta. Pulsa "Nueva venta" para empezar.' : 'No hay ventas que coincidan con los filtros. Ajusta el rango de fechas o limpia la búsqueda.'}
                action={sales.length === 0 ? <button onClick={openModal} className="text-sm text-primary font-semibold hover:underline">+ Registrar primera venta</button> : null}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-soft">
                    <tr>
                      <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider cursor-pointer hover:bg-surface-cream-strong select-none" onClick={() => handleSort('date')}>Fecha{SortIcon('date')}</th>
                      <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider cursor-pointer hover:bg-surface-cream-strong select-none" onClick={() => handleSort('product')}>Producto{SortIcon('product')}</th>
                      <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider cursor-pointer hover:bg-surface-cream-strong select-none" onClick={() => handleSort('customer')}>Cliente{SortIcon('customer')}</th>
                      <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Provincia</th>
                      <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider cursor-pointer hover:bg-surface-cream-strong select-none" onClick={() => handleSort('boxes')}>Cajas{SortIcon('boxes')}</th>
                      <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Unidades</th>
                      <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider cursor-pointer hover:bg-surface-cream-strong select-none" onClick={() => handleSort('total')}>Total (USD){SortIcon('total')}</th>
                      <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {paginatedSales.map(sale => {
                      const unitsPerBox = sale.product.unitsPerBox || 100
                      const boxes = Math.floor(sale.quantity / unitsPerBox)
                      return (
                        <tr key={sale.id} className="hover:bg-surface-soft/50">
                          <td className="px-5 py-3.5 text-sm text-body whitespace-nowrap">{formatDate(sale.date)}</td>
                          <td className="px-5 py-3.5 text-sm font-semibold text-ink">{sale.product.name}</td>
                          <td className="px-5 py-3.5 text-sm text-body">{sale.customer.name}</td>
                          <td className="px-5 py-3.5 text-sm text-muted">{sale.customer.province}</td>
                          <td className="px-5 py-3.5 text-sm font-semibold text-ink text-right tabular-nums">{formatNumber(boxes)}</td>
                          <td className="px-5 py-3.5 text-sm text-muted text-right tabular-nums">{formatNumber(sale.quantity)}</td>
                          <td className="px-5 py-3.5 text-sm font-bold text-ink text-right tabular-nums">{formatCurrency(sale.total)}</td>
                          <td className="px-5 py-3.5 text-sm text-muted max-w-[150px] truncate">{sale.notes || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {paginatedSales.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Mostrar</span>
                <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1) }}
                  className="px-2 py-1 border border-hairline rounded bg-canvas text-sm text-body">
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-sm text-muted">de {filteredSales.length} registro{filteredSales.length !== 1 ? 's' : ''}</span>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                    className="px-3 py-1 text-sm border border-hairline rounded hover:bg-surface-soft disabled:opacity-30 disabled:cursor-not-allowed">Anterior</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                    const p = start + i
                    if (p > totalPages) return null
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`px-3 py-1 text-sm border border-hairline rounded ${p === page ? 'bg-primary text-on-primary' : 'hover:bg-surface-soft'}`}>{p}</button>
                    )
                  })}
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                    className="px-3 py-1 text-sm border border-hairline rounded hover:bg-surface-soft disabled:opacity-30 disabled:cursor-not-allowed">Siguiente</button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'historial-producto' && (
        <>
          <div className="bg-surface-card rounded-xl p-4 border border-hairline">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted">Filtrar por producto:</span>
              <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}
                className="px-3 py-1.5 border border-hairline rounded-lg bg-canvas text-body text-sm">
                <option value="">Todos los productos</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <span className="text-xs text-muted ml-auto">{filteredProdHistory.length} producto{filteredProdHistory.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {filteredProdHistory.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Sin ventas registradas" description="No hay ventas para mostrar. Registra tu primera venta para ver el historial por producto." />
          ) : (
            <div className="space-y-4">
              {filteredProdHistory.map(sp => {
                const prodSales = sales.filter(s => s.product.id === sp.product.id)
                return (
                  <div key={sp.product.id} className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
                    <div className="px-5 py-3.5 bg-surface-soft flex items-center justify-between border-b border-hairline">
                      <h3 className="font-semibold text-ink text-sm">{sp.product.name}</h3>
                      <div className="flex gap-4 text-sm">
                        <span className="text-muted">{sp.count} venta{sp.count !== 1 ? 's' : ''}</span>
                        <span className="text-ink font-medium">{formatNumber(sp.cajas)} cajas</span>
                        <span className="text-ink font-bold">{formatCurrency(sp.total)}</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-surface-soft/50">
                            <th className="px-5 py-2 text-left text-2xs font-bold text-muted uppercase tracking-wider">Fecha</th>
                            <th className="px-5 py-2 text-left text-2xs font-bold text-muted uppercase tracking-wider">Cliente</th>
                            <th className="px-5 py-2 text-left text-2xs font-bold text-muted uppercase tracking-wider">Provincia</th>
                            <th className="px-5 py-2 text-right text-2xs font-bold text-muted uppercase tracking-wider">Cajas</th>
                            <th className="px-5 py-2 text-right text-2xs font-bold text-muted uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                          {prodSales.map(s => {
                            const unitsPerBox = s.product.unitsPerBox || 100
                            return (
                              <tr key={s.id} className="hover:bg-surface-soft/50">
                                <td className="px-5 py-2.5 text-sm text-body">{formatDate(s.date)}</td>
                                <td className="px-5 py-2.5 text-sm text-body">{s.customer.name}</td>
                                <td className="px-5 py-2.5 text-sm text-muted">{s.customer.province}</td>
                                <td className="px-5 py-2.5 text-sm font-semibold text-ink text-right tabular-nums">{formatNumber(Math.floor(s.quantity / unitsPerBox))}</td>
                                <td className="px-5 py-2.5 text-sm font-semibold text-ink text-right tabular-nums">{formatCurrency(s.total)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
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
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeModal} className="px-4 py-2 bg-surface-soft text-body rounded-lg hover:bg-surface-cream-strong font-medium">Cancelar</button>
              <button type="submit" form="sale-form"
                disabled={!form.productId || !form.customerId || form.boxes < 1 || form.price <= 0 || (selectedProduct && availableBoxes === 0)}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium disabled:opacity-50 disabled:cursor-not-allowed">Registrar venta</button>
            </div>
          }
        >
          <form id="sale-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Producto</label>
              <select value={form.productId}
                onChange={(e) => {
                  const id = e.target.value
                  setForm({ ...form, productId: id, boxes: 1, price: getDefaultPrice(id) })
                }}
                required
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body">
                <option value="">Selecciona un producto</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.priceDistribution * (p.unitsPerBox || 100))}/caja ({formatNumber(getBoxesAt(p.id))} cjs disp.)
                  </option>
                ))}
              </select>
            </div>

            {form.productId && (
              <div className={`rounded-lg p-3 text-sm flex justify-between items-center ${availableBoxes > 0 ? 'bg-surface-soft' : 'bg-error/10 border border-error/30'}`}>
                <span className="text-muted">Stock disponible:</span>
                <span className={`font-semibold ${availableBoxes > 0 ? 'text-ink' : 'text-error'}`}>
                  {formatNumber(availableBoxes)} cajas ({formatNumber(selectedProduct ? getStockAt(selectedProduct.id) : 0)} uds)
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Cliente</label>
              <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body">
                <option value="">Selecciona un cliente</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.province}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Cajas vendidas</label>
                <input type="number" value={form.boxes}
                  onChange={(e) => setForm({ ...form, boxes: parseInt(e.target.value) || 0 })}
                  required min="1" max={form.productId ? availableBoxes : undefined}
                  className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
                {selectedProduct && availableBoxes > 0 && (
                  <p className="text-xs text-muted mt-1">Máx disponible: {formatNumber(availableBoxes)} cajas</p>
                )}
                {selectedProduct && availableBoxes === 0 && (
                  <p className="text-xs text-error mt-1">No hay stock disponible. Transfiere de fábrica al almacén primero.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Precio por caja (USD)</label>
                <input type="number" step="0.01" min="0" value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
              </div>
            </div>

            {form.productId && form.boxes > 0 && form.price > 0 && (
              <div className="bg-primary/10 rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm text-muted">Total de la venta:</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(form.boxes * form.price)}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Fecha</label>
                <input type="date" value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Notas (opcional)</label>
                <input type="text" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Observaciones"
                  className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
