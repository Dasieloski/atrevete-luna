'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, Package, Search, DollarSign } from 'lucide-react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { StatCard } from '@/src/components/StatCard'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table'
import { cn } from '@/src/lib/utils'
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

  useEffect(() => {
    fetchProducts()
  }, [])

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
      setForm({
        name: '',
        description: '',
        priceWarehouse: 0.49,
        priceDistribution: 0.54,
        unitsPerBox: 100,
      })
    }
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm({
      name: '',
      description: '',
      priceWarehouse: 0.49,
      priceDistribution: 0.54,
      unitsPerBox: 100,
    })
  }

  const filteredProducts = useMemo(() => {
    return products
      .filter(
        (p) =>
          !search || p.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, search])

  const stats = useMemo(
    () => ({
      total: products.length,
      active: products.filter((p) => p.isActive).length,
      avgPrice:
        products.length > 0
          ? products.reduce((s, p) => s + p.priceWarehouse, 0) /
            products.length
          : 0,
    }),
    [products]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Catálogo de productos. Define los precios de cada producto y cuántas unidades entran en cada caja. Los productos activos aparecen en las secciones de producción, almacén y ventas."
        actions={
          <PermissionGuard module="productos" action="create">
            <Button
              onClick={() => openModal()}
              leadingIcon={<Plus className="h-4 w-4" />}
            >
              Nuevo producto
            </Button>
          </PermissionGuard>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Productos activos"
          value={formatNumber(stats.active)}
          icon={Package}
          accent="primary"
        />
        <StatCard
          label="Total productos"
          value={formatNumber(stats.total)}
          icon={Package}
        />
        <StatCard
          label="Precio almacén promedio"
          value={formatCurrency(stats.avgPrice)}
          icon={DollarSign}
          accent="success"
        />
      </section>

      {products.length === 0 && !showModal ? (
        <EmptyState
          icon={Package}
          title="Aún no hay productos"
          description="Los productos son la base del sistema. Crea tu primer producto para empezar a registrar producción, ventas y stock."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openModal()}
              leadingIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Crear primer producto
            </Button>
          }
        />
      ) : (
        <section className="ts-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted" />
              <h2 className="text-sm font-medium text-ink">Catálogo</h2>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Input
                type="text"
                placeholder="Buscar producto…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leadingIcon={<Search className="h-3.5 w-3.5" />}
                className="w-56 sm:w-72"
              />
              <span className="text-xs text-muted">
                {filteredProducts.length} producto
                {filteredProducts.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="Ningún producto coincide con tu búsqueda."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Producto</TH>
                    <TH className="text-right">Precio (Almacén)</TH>
                    <TH className="text-right">Precio (Distribución)</TH>
                    <TH className="text-right">Unid. por caja</TH>
                    <TH className="text-center">Activo</TH>
                    <TH className="text-right">Acciones</TH>
                  </TR>
                </THead>
                <TBody>
                  {filteredProducts.map((p) => (
                    <TR key={p.id}>
                      <TD>
                        <div className="font-medium text-ink">{p.name}</div>
                        {p.description && (
                          <div className="mt-0.5 text-xs text-muted">
                            {p.description}
                          </div>
                        )}
                      </TD>
                      <TD className="text-right font-mono text-sm">
                        {formatCurrency(p.priceWarehouse)}{' '}
                        <span className="text-muted-soft">/ ud</span>
                      </TD>
                      <TD className="text-right font-mono text-sm">
                        {formatCurrency(p.priceDistribution)}{' '}
                        <span className="text-muted-soft">/ ud</span>
                      </TD>
                      <TD className="text-right font-mono text-sm">
                        {p.unitsPerBox}
                      </TD>
                      <TD className="text-center">
                        <span
                          className={cn(
                            'inline-block h-2 w-2 rounded-full',
                            p.isActive ? 'bg-success' : 'bg-muted-soft'
                          )}
                        />
                      </TD>
                      <TD className="text-right">
                        <div className="flex justify-end gap-1">
                          <PermissionGuard module="productos" action="edit">
                            <button
                              onClick={() => openModal(p)}
                              className="ts-btn-icon"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard module="productos" action="delete">
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
                </TBody>
              </Table>
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
            <>
              <Button variant="ghost" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" form="product-form">
                {editing ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </>
          }
        >
          <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="ts-label">Nombre del producto</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Ej: Pastel de Chocolate"
                className="ts-input"
              />
            </div>

            <div>
              <label className="ts-label">Descripción (opcional)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Breve descripción del producto"
                className="ts-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ts-label">Precio almacén</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.priceWarehouse}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priceWarehouse: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  className="ts-input"
                />
                <p className="mt-1 text-xs text-muted">
                  Costo por unidad cuando sale del almacén
                </p>
              </div>
              <div>
                <label className="ts-label">Precio distribución</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.priceDistribution}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priceDistribution: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  className="ts-input"
                />
                <p className="mt-1 text-xs text-muted">
                  Precio por unidad para distribuidores
                </p>
              </div>
            </div>

            <div>
              <label className="ts-label">Unidades por caja</label>
              <input
                type="number"
                min="1"
                value={form.unitsPerBox}
                onChange={(e) =>
                  setForm({
                    ...form,
                    unitsPerBox: parseInt(e.target.value) || 1,
                  })
                }
                required
                className="ts-input"
              />
              <p className="mt-1 text-xs text-muted">
                Cada caja contiene esta cantidad de unidades
              </p>
            </div>

            {form.name && form.unitsPerBox > 0 && (
              <div className="space-y-1 rounded-md bg-ash px-3 py-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Precio por caja (almacén):</span>
                  <span className="font-medium text-ink">
                    {formatCurrency(form.priceWarehouse * form.unitsPerBox)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Precio por caja (distribución):</span>
                  <span className="font-medium text-ink">
                    {formatCurrency(form.priceDistribution * form.unitsPerBox)}
                  </span>
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}
