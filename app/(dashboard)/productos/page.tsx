'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, Package, Search, DollarSign } from 'lucide-react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { StatCard } from '@/src/components/StatCard'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { formatNumber, formatCurrency } from '@/src/lib/format'

interface Product {
  id: string
  name: string
  description: string | null
  priceWarehouse: number
  priceDistribution: number
  unitsPerBox: number
  isActive: boolean
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    priceWarehouse: 0.49,
    priceDistribution: 0.54,
    unitsPerBox: 100,
  })

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    const res = await fetch('/api/products')
    setProducts(await res.json())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing) {
      await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...form }),
      })
    } else {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }
    closeModal()
    fetchProducts()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    fetchProducts()
  }

  function openModal(product?: Product) {
    if (product) {
      setEditing(product)
      setForm({
        name: product.name,
        description: product.description || '',
        priceWarehouse: product.priceWarehouse,
        priceDistribution: product.priceDistribution,
        unitsPerBox: product.unitsPerBox,
      })
    } else {
      setEditing(null)
      setForm({ name: '', description: '', priceWarehouse: 0.49, priceDistribution: 0.54, unitsPerBox: 100 })
    }
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm({ name: '', description: '', priceWarehouse: 0.49, priceDistribution: 0.54, unitsPerBox: 100 })
  }

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, search])

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => p.isActive).length,
    avgPrice: products.length > 0
      ? products.reduce((s, p) => s + p.priceWarehouse, 0) / products.length
      : 0,
  }), [products])

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Productos</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Catálogo de productos. Define los precios de cada producto y cuántas unidades entran en cada caja.
            Los productos activos aparecen en las secciones de producción, almacén y ventas.
          </p>
        </div>
        <PermissionGuard module="productos" action="create">
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo producto
          </button>
        </PermissionGuard>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Productos activos" value={formatNumber(stats.active)} icon={Package} accent="primary" />
        <StatCard label="Total productos" value={formatNumber(stats.total)} icon={Package} />
        <StatCard label="Precio almacén promedio" value={formatCurrency(stats.avgPrice)} icon={DollarSign} accent="accent-teal" />
      </section>

      {products.length === 0 && !showModal ? (
        <EmptyState
          icon={Package}
          title="Aún no hay productos"
          description="Los productos son la base del sistema. Crea tu primer producto para empezar a registrar producción, ventas y stock."
          action={
            <button onClick={() => openModal()} className="text-sm text-primary font-semibold hover:underline">
              + Crear primer producto
            </button>
          }
        />
      ) : (
        <section className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
          <div className="px-5 py-4 border-b border-hairline flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted" />
              <h2 className="text-sm font-bold text-ink">Catálogo</h2>
            </div>
            <div className="flex-1 min-w-[180px] relative">
              <input
                type="text"
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-3 pr-3 py-1.5 border border-hairline rounded-lg bg-canvas text-body text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <span className="text-xs text-muted">{filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}</span>
          </div>

          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="Ningún producto coincide con tu búsqueda."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-soft">
                  <tr>
                    <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Producto</th>
                    <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Precio (Almacén)</th>
                    <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Precio (Distribución)</th>
                    <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Unid. por caja</th>
                    <th className="px-5 py-3 text-center text-2xs font-bold text-muted uppercase tracking-wider">Activo</th>
                    <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-surface-soft/50">
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-semibold text-ink">{p.name}</div>
                        {p.description && (
                          <div className="text-xs text-muted mt-0.5">{p.description}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-body text-right tabular-nums">
                        {formatCurrency(p.priceWarehouse)} / ud
                      </td>
                      <td className="px-5 py-3.5 text-sm text-body text-right tabular-nums">
                        {formatCurrency(p.priceDistribution)} / ud
                      </td>
                      <td className="px-5 py-3.5 text-sm text-body text-right tabular-nums">
                        {p.unitsPerBox}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${p.isActive ? 'bg-success' : 'bg-muted-soft'}`} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1">
                          <PermissionGuard module="productos" action="edit">
                            <button onClick={() => openModal(p)} className="p-1.5 text-muted hover:text-ink hover:bg-surface-soft rounded" title="Editar">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard module="productos" action="delete">
                            <button onClick={() => handleDelete(p.id)} className="p-1.5 text-muted hover:text-error hover:bg-surface-soft rounded" title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {showModal && (
        <Modal
          title={editing ? 'Editar producto' : 'Nuevo producto'}
          subtitle="Define el nombre, precios y empaque del producto."
          onClose={closeModal}
          size="md"
          footer={
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeModal} className="px-4 py-2 bg-surface-soft text-body rounded-lg hover:bg-surface-cream-strong font-medium">
                Cancelar
              </button>
              <button
                type="submit"
                form="product-form"
                className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium"
              >
                {editing ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          }
        >
          <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Nombre del producto</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Ej: Pastel de Chocolate"
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Descripción (opcional)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Breve descripción del producto"
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">
                  Precio almacén (USD/ud)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.priceWarehouse}
                  onChange={(e) => setForm({ ...form, priceWarehouse: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
                />
                <p className="text-xs text-muted mt-1">Costo por unidad cuando sale del almacén</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">
                  Precio distribución (USD/ud)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.priceDistribution}
                  onChange={(e) => setForm({ ...form, priceDistribution: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
                />
                <p className="text-xs text-muted mt-1">Precio por unidad para distribuidores</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Unidades por caja</label>
              <input
                type="number"
                min="1"
                value={form.unitsPerBox}
                onChange={(e) => setForm({ ...form, unitsPerBox: parseInt(e.target.value) || 1 })}
                required
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
              />
              <p className="text-xs text-muted mt-1">Cada caja contiene esta cantidad de unidades</p>
            </div>

            {form.name && form.unitsPerBox > 0 && (
              <div className="bg-surface-soft rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted">Precio por caja (almacén):</span>
                  <span className="font-semibold text-ink">{formatCurrency(form.priceWarehouse * form.unitsPerBox)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Precio por caja (distribución):</span>
                  <span className="font-semibold text-ink">{formatCurrency(form.priceDistribution * form.unitsPerBox)}</span>
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}
