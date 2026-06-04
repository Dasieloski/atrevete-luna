'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Users, Search, MapPin, Phone, Mail, ShoppingCart } from 'lucide-react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { StatCard } from '@/src/components/StatCard'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { CubaMapGADM } from '@/src/components/dashboard/CubaMapGADM'
import { formatNumber, formatCurrency } from '@/src/lib/format'

interface Customer {
  id: string
  name: string
  province: string
  phone: string | null
  email: string | null
  notes: string | null
  isActive: boolean
  sales: { id: string }[]
  reservations: { id: string; quantity: number; status: string }[]
}

interface Sale {
  id: string
  total: number
  quantity: number
  date: string
  product: { id: string; name: string; unitsPerBox: number }
  customer: { id: string; name: string; province: string }
}

const provinces = [
  'Pinar del Rio', 'Artemisa', 'La Habana', 'Mayabeque', 'Matanzas',
  'Villa Clara', 'Cienfuegos', 'Sancti Spiritus', 'Ciego de Avila',
  'Camaguey', 'Las Tunas', 'Granma', 'Holguin', 'Santiago de Cuba',
  'Guantanamo', 'Isla de la Juventud',
]

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    province: '',
    phone: '',
    email: '',
    notes: '',
  })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [customersRes, salesRes] = await Promise.all([
      fetch('/api/customers'),
      fetch('/api/sales'),
    ])
    setCustomers(await customersRes.json())
    setSales(await salesRes.json())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm({ name: '', province: '', phone: '', email: '', notes: '' })
    setShowModal(false)
    fetchData()
  }

  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => {
        if (!search) return true
        const t = search.toLowerCase()
        return c.name.toLowerCase().includes(t)
          || c.province.toLowerCase().includes(t)
          || (c.phone && c.phone.includes(search))
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [customers, search])

  const provinceStats = useMemo(() => {
    const map = new Map<string, { count: number; salesCount: number; salesTotal: number; boxes: number }>()
    for (const c of customers) {
      const cur = map.get(c.province) || { count: 0, salesCount: 0, salesTotal: 0, boxes: 0 }
      cur.count++
      cur.salesCount += c.sales.length
      map.set(c.province, cur)
    }
    for (const s of sales) {
      const cur = map.get(s.customer.province)
      if (cur) {
        cur.salesTotal += s.total
        cur.boxes += Math.floor(s.quantity / (s.product.unitsPerBox || 100))
      }
    }
    return Array.from(map.entries())
      .map(([province, data]) => ({ province, ...data }))
      .sort((a, b) => b.salesTotal - a.salesTotal)
  }, [customers, sales])

  const totalSales = sales.reduce((s, sale) => s + sale.total, 0)
  const activeCustomers = customers.filter(c => c.isActive).length

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Clientes</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Base de datos de clientes. Cada cliente pertenece a una provincia y puede tener múltiples ventas y reservas asociadas.
          </p>
        </div>
        <PermissionGuard module="clientes" action="create">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo cliente
          </button>
        </PermissionGuard>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Clientes activos" value={formatNumber(activeCustomers)} icon={Users} accent="primary" />
        <StatCard label="Total clientes" value={formatNumber(customers.length)} icon={Users} />
        <StatCard label="Ventas totales" value={formatCurrency(totalSales)} icon={ShoppingCart} />
      </section>

      {provinceStats.length > 0 && (
        <>
          <section className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
            <div className="px-5 py-4 border-b border-hairline flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-ink">Mapa de ventas por provincia</h2>
            </div>
            <div className="p-5">
              <CubaMapGADM
                provinceStats={provinceStats}
                selectedProvince={selectedProvince}
                onSelectProvince={setSelectedProvince}
                metric="salesTotal"
                height={560}
              />
            </div>
          </section>

          <section className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
            <div className="px-5 py-4 border-b border-hairline flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-ink">
                {selectedProvince ? `Detalle: ${selectedProvince}` : 'Provincias'}
              </h2>
              {selectedProvince && (
                <button onClick={() => setSelectedProvince(null)}
                  className="text-xs text-primary hover:underline ml-2">
                  Mostrar todas
                </button>
              )}
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {(selectedProvince
                ? provinceStats.filter(p => p.province === selectedProvince)
                : provinceStats
              ).map(({ province, count, salesCount, salesTotal, boxes }) => {
                const maxTotal = Math.max(...provinceStats.map(p => p.salesTotal))
                const intensity = maxTotal > 0 ? salesTotal / maxTotal : 0
                return (
                  <button key={province} onClick={() => setSelectedProvince(province)}
                    className={`text-left bg-surface-soft rounded-lg p-3 border transition-all ${
                      selectedProvince === province ? 'border-primary ring-2 ring-primary/20' : 'border-hairline/50 hover:border-primary/50'
                    }`}>
                    <p className="text-xs text-muted font-semibold truncate">{province}</p>
                    <p className="text-lg font-bold text-ink mt-0.5">{count}</p>
                    <p className="text-2xs text-muted">{salesCount} venta{salesCount !== 1 ? 's' : ''}</p>
                    <p className="text-xs font-semibold text-primary mt-1">{formatCurrency(salesTotal)}</p>
                    <p className="text-2xs text-muted">{formatNumber(boxes)} cajas</p>
                  </button>
                )
              })}
            </div>
          </section>
        </>
      )}

      {customers.length === 0 && !showModal ? (
        <EmptyState
          icon={Users}
          title="Aún no hay clientes"
          description="Registra tu primer cliente para empezar a asociar ventas y reservas."
          action={
            <button onClick={() => setShowModal(true)} className="text-sm text-primary font-semibold hover:underline">
              + Crear primer cliente
            </button>
          }
        />
      ) : (
        <section className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
          <div className="px-5 py-4 border-b border-hairline flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted" />
              <h2 className="text-sm font-bold text-ink">Directorio</h2>
            </div>
            <div className="flex-1 min-w-[180px] relative">
              <input
                type="text"
                placeholder="Buscar por nombre, provincia o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-3 pr-3 py-1.5 border border-hairline rounded-lg bg-canvas text-body text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <span className="text-xs text-muted">{filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''}</span>
          </div>

          {filteredCustomers.length === 0 ? (
            <EmptyState icon={Search} title="Sin resultados" description="Ningún cliente coincide con tu búsqueda." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-soft">
                  <tr>
                    <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Nombre</th>
                    <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Provincia</th>
                    <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Contacto</th>
                    <th className="px-5 py-3 text-center text-2xs font-bold text-muted uppercase tracking-wider">Ventas</th>
                    <th className="px-5 py-3 text-center text-2xs font-bold text-muted uppercase tracking-wider">Reservas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-surface-soft/50">
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-semibold text-ink">{c.name}</div>
                        {c.notes && <div className="text-xs text-muted mt-0.5">{c.notes}</div>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-body">{c.province}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          {c.phone && (
                            <span className="text-xs text-body flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted" />
                              {c.phone}
                            </span>
                          )}
                          {c.email && (
                            <span className="text-xs text-body flex items-center gap-1">
                              <Mail className="w-3 h-3 text-muted" />
                              {c.email}
                            </span>
                          )}
                          {!c.phone && !c.email && (
                            <span className="text-xs text-muted">Sin contacto</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-body text-center">{c.sales.length}</td>
                      <td className="px-5 py-3.5 text-sm text-body text-center">{c.reservations.length}</td>
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
          title="Nuevo cliente"
          subtitle="Registra un cliente para asociarlo a ventas y reservas."
          onClose={() => setShowModal(false)}
          size="md"
          footer={
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-surface-soft text-body rounded-lg hover:bg-surface-cream-strong font-medium">
                Cancelar
              </button>
              <button
                type="submit"
                form="customer-form"
                className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium"
              >
                Crear cliente
              </button>
            </div>
          }
        >
          <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Nombre del cliente</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Ej: María García"
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Provincia</label>
              <select
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
              >
                <option value="">Selecciona una provincia</option>
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Teléfono (opcional)</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+53 5 123 4567"
                  className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Email (opcional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="cliente@ejemplo.com"
                  className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Notas (opcional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Dirección, preferencias, observaciones..."
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body resize-none"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
