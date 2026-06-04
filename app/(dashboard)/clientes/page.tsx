'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Users, Search, MapPin, Phone, Mail, ShoppingCart } from 'lucide-react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { StatCard } from '@/src/components/StatCard'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table'
import { Badge } from '@/src/components/ui/Badge'
import { CubaMapGADM } from '@/src/components/dashboard/CubaMapGADM'
import { cn } from '@/src/lib/utils'
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

  useEffect(() => {
    fetchData()
  }, [])

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
      .filter((c) => {
        if (!search) return true
        const t = search.toLowerCase()
        return (
          c.name.toLowerCase().includes(t) ||
          c.province.toLowerCase().includes(t) ||
          (c.phone && c.phone.includes(search))
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [customers, search])

  const provinceStats = useMemo(() => {
    const map = new Map<
      string,
      { count: number; salesCount: number; salesTotal: number; boxes: number }
    >()
    for (const c of customers) {
      const cur = map.get(c.province) || {
        count: 0,
        salesCount: 0,
        salesTotal: 0,
        boxes: 0,
      }
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
  const activeCustomers = customers.filter((c) => c.isActive).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Clientes"
        description="Base de datos de clientes. Cada cliente pertenece a una provincia y puede tener múltiples ventas y reservas asociadas."
        actions={
          <PermissionGuard module="clientes" action="create">
            <Button
              onClick={() => setShowModal(true)}
              leadingIcon={<Plus className="h-4 w-4" />}
            >
              Nuevo cliente
            </Button>
          </PermissionGuard>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Clientes activos"
          value={formatNumber(activeCustomers)}
          icon={Users}
          accent="primary"
        />
        <StatCard
          label="Total clientes"
          value={formatNumber(customers.length)}
          icon={Users}
        />
        <StatCard
          label="Ventas totales"
          value={formatCurrency(totalSales)}
          icon={ShoppingCart}
          accent="success"
        />
      </section>

      {provinceStats.length > 0 && (
        <>
          <section className="ts-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-hairline px-5 py-4 sm:px-6">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium text-ink">
                Mapa de ventas por provincia
              </h2>
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

          <section className="ts-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-5 py-4 sm:px-6">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium text-ink">
                {selectedProvince
                  ? `Detalle: ${selectedProvince}`
                  : 'Provincias'}
              </h2>
              {selectedProvince && (
                <button
                  onClick={() => setSelectedProvince(null)}
                  className="ts-link ml-2 text-primary"
                >
                  Mostrar todas
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {(selectedProvince
                ? provinceStats.filter((p) => p.province === selectedProvince)
                : provinceStats
              ).map(({ province, count, salesCount, salesTotal, boxes }) => {
                const maxTotal = Math.max(
                  ...provinceStats.map((p) => p.salesTotal)
                )
                const intensity = maxTotal > 0 ? salesTotal / maxTotal : 0
                const active = selectedProvince === province
                return (
                  <button
                    key={province}
                    onClick={() => setSelectedProvince(province)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-all duration-[var(--dur-base)]',
                      active
                        ? 'border-primary bg-ash ring-2 ring-primary/20'
                        : 'border-hairline hover:border-hairline-strong hover:bg-ash'
                    )}
                  >
                    <p className="truncate text-xs font-medium text-muted">
                      {province}
                    </p>
                    <p className="mt-0.5 font-mono text-lg font-semibold text-ink">
                      {count}
                    </p>
                    <p className="text-[11px] text-muted-soft">
                      {salesCount} venta{salesCount !== 1 ? 's' : ''}
                    </p>
                    <p className="mt-1 font-mono text-xs font-semibold text-primary">
                      {formatCurrency(salesTotal)}
                    </p>
                    <p className="text-[11px] text-muted-soft">
                      {formatNumber(boxes)} cajas
                    </p>
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowModal(true)}
              leadingIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Crear primer cliente
            </Button>
          }
        />
      ) : (
        <section className="ts-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted" />
              <h2 className="text-sm font-medium text-ink">Directorio</h2>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Input
                type="text"
                placeholder="Buscar por nombre, provincia o teléfono…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leadingIcon={<Search className="h-3.5 w-3.5" />}
                className="w-56 sm:w-72"
              />
              <span className="text-xs text-muted">
                {filteredCustomers.length} cliente
                {filteredCustomers.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="Ningún cliente coincide con tu búsqueda."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Nombre</TH>
                    <TH>Provincia</TH>
                    <TH>Contacto</TH>
                    <TH className="text-center">Ventas</TH>
                    <TH className="text-center">Reservas</TH>
                  </TR>
                </THead>
                <TBody>
                  {filteredCustomers.map((c) => (
                    <TR key={c.id}>
                      <TD>
                        <div className="font-medium text-ink">{c.name}</div>
                        {c.notes && (
                          <div className="mt-0.5 text-xs text-muted">
                            {c.notes}
                          </div>
                        )}
                      </TD>
                      <TD>{c.province}</TD>
                      <TD>
                        <div className="flex flex-col gap-0.5">
                          {c.phone && (
                            <span className="inline-flex items-center gap-1 text-xs text-graphite">
                              <Phone className="h-3 w-3 text-muted" />
                              {c.phone}
                            </span>
                          )}
                          {c.email && (
                            <span className="inline-flex items-center gap-1 text-xs text-graphite">
                              <Mail className="h-3 w-3 text-muted" />
                              {c.email}
                            </span>
                          )}
                          {!c.phone && !c.email && (
                            <span className="text-xs text-muted-soft">
                              Sin contacto
                            </span>
                          )}
                        </div>
                      </TD>
                      <TD className="text-center font-mono text-sm">
                        {c.sales.length}
                      </TD>
                      <TD className="text-center font-mono text-sm">
                        {c.reservations.length}
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
          title="Nuevo cliente"
          subtitle="Registra un cliente para asociarlo a ventas y reservas."
          onClose={() => setShowModal(false)}
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="customer-form">
                Crear cliente
              </Button>
            </>
          }
        >
          <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="ts-label">Nombre del cliente</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Ej: María García"
                className="ts-input"
              />
            </div>

            <div>
              <label className="ts-label">Provincia</label>
              <select
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                required
                className="ts-input"
              >
                <option value="">Selecciona una provincia</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ts-label">Teléfono (opcional)</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+53 5 123 4567"
                  className="ts-input"
                />
              </div>
              <div>
                <label className="ts-label">Email (opcional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="cliente@ejemplo.com"
                  className="ts-input"
                />
              </div>
            </div>

            <div>
              <label className="ts-label">Notas (opcional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Dirección, preferencias, observaciones…"
                className="w-full resize-none rounded-md border border-hairline-strong bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-muted-soft transition-colors hover:border-pewter focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
