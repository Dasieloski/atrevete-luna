'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, DollarSign, Megaphone, Trash2, Calendar } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PermissionGuard } from '@/components/PermissionGuard'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Button } from '@/src/components/ui/Button'
import { Tabs } from '@/src/components/ui/Tabs'
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table'
import { cn } from '@/src/lib/utils'
import { formatDate, formatCurrency, formatNumber } from '@/src/lib/format'

type Tab = 'expenses' | 'marketing' | 'waste' | 'events'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
}
interface Marketing {
  id: string
  title: string
  description: string | null
  amount: number
  date: string
}
interface Waste {
  id: string
  quantity: number
  reason: string | null
  date: string
  product: { name: string }
}
interface Event {
  id: string
  title: string
  description: string | null
  date: string
}

const TABS: {
  key: Tab
  label: string
  icon: LucideIcon
}[] = [
  { key: 'expenses', label: 'Gastos', icon: DollarSign },
  { key: 'marketing', label: 'Marketing', icon: Megaphone },
  { key: 'waste', label: 'Mermas', icon: Trash2 },
  { key: 'events', label: 'Eventos', icon: Calendar },
]

export default function EconomiaPage() {
  const [tab, setTab] = useState<Tab>('expenses')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [marketing, setMarketing] = useState<Marketing[]>([])
  const [waste, setWaste] = useState<Waste[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [showModal, setShowModal] = useState(false)
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])

  const [expenseForm, setExpenseForm] = useState({
    category: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
  })
  const [marketingForm, setMarketingForm] = useState({
    title: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
  })
  const [wasteForm, setWasteForm] = useState({
    productId: '',
    quantity: 0,
    reason: '',
    date: new Date().toISOString().split('T')[0],
  })
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/expenses').then((r) => r.json()),
      fetch('/api/marketing').then((r) => r.json()),
      fetch('/api/waste').then((r) => r.json()),
      fetch('/api/events').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
    ]).then(([exp, mar, was, evt, prods]) => {
      setExpenses(exp)
      setMarketing(mar)
      setWaste(was)
      setEvents(evt)
      setProducts(prods)
    })
  }, [])

  const totals = useMemo(
    () => ({
      expenses: expenses.reduce((s, e) => s + e.amount, 0),
      marketing: marketing.reduce((s, m) => s + m.amount, 0),
      waste: waste.reduce((s, w) => s + w.quantity, 0),
      events: events.length,
    }),
    [expenses, marketing, waste, events]
  )

  async function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseForm),
    })
    setExpenseForm({
      category: '',
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
    })
    setShowModal(false)
    setExpenses(await fetch('/api/expenses').then((r) => r.json()))
  }

  async function handleMarketingSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/marketing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(marketingForm),
    })
    setMarketingForm({
      title: '',
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
    })
    setShowModal(false)
    setMarketing(await fetch('/api/marketing').then((r) => r.json()))
  }

  async function handleWasteSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/waste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wasteForm),
    })
    setWasteForm({
      productId: '',
      quantity: 0,
      reason: '',
      date: new Date().toISOString().split('T')[0],
    })
    setShowModal(false)
    setWaste(await fetch('/api/waste').then((r) => r.json()))
  }

  async function handleEventSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventForm),
    })
    setEventForm({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    })
    setShowModal(false)
    setEvents(await fetch('/api/events').then((r) => r.json()))
  }

  const currentList = useMemo(() => {
    switch (tab) {
      case 'expenses':
        return expenses
      case 'marketing':
        return marketing
      case 'waste':
        return waste
      case 'events':
        return events
    }
  }, [tab, expenses, marketing, waste, events])

  const currentTotal = useMemo(() => {
    switch (tab) {
      case 'expenses':
        return formatCurrency(totals.expenses)
      case 'marketing':
        return formatCurrency(totals.marketing)
      case 'waste':
        return `${formatNumber(totals.waste)} uds`
      case 'events':
        return String(totals.events)
    }
  }, [tab, totals])

  const modalTitle = useMemo(() => {
    const labels: Record<Tab, string> = {
      expenses: 'Nuevo gasto',
      marketing: 'Nueva campaña de marketing',
      waste: 'Nueva merma',
      events: 'Nuevo evento',
    }
    return labels[tab]
  }, [tab])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Gastos y eventos"
        description="Registra gastos operativos, campañas de marketing, mermas de producción y eventos."
        actions={
          <PermissionGuard module="gastos" action="create">
            <Button
              onClick={() => setShowModal(true)}
              leadingIcon={<Plus className="h-4 w-4" />}
            >
              Agregar
            </Button>
          </PermissionGuard>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key)
                setShowModal(false)
              }}
              className={cn(
                'rounded-xl border p-4 text-left transition-all duration-[var(--dur-base)]',
                active
                  ? 'border-primary bg-canvas ring-2 ring-primary/20'
                  : 'border-hairline bg-canvas hover:border-hairline-strong hover:bg-ash'
              )}
            >
              <t.icon
                className={cn(
                  'h-5 w-5',
                  active ? 'text-primary' : 'text-pewter'
                )}
              />
              <p className="mt-2 text-sm font-medium text-ink">{t.label}</p>
              <p
                className={cn(
                  'mt-0.5 font-mono text-lg font-semibold',
                  active ? 'text-ink' : 'text-graphite'
                )}
              >
                {tab === t.key ? currentTotal : '—'}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-soft">
                {active ? `${currentList.length} registros` : '0 registros'}
              </p>
            </button>
          )
        })}
      </section>

      {currentList.length === 0 ? (
        <EmptyState
          icon={TABS.find((t) => t.key === tab)?.icon || DollarSign}
          title={`Sin ${TABS.find((t) => t.key === tab)?.label.toLowerCase() || 'registros'}`}
          description={`Aún no hay registros de ${tab === 'expenses' ? 'gastos' : tab === 'marketing' ? 'marketing' : tab === 'waste' ? 'mermas' : 'eventos'}. Usa el botón "Agregar" para empezar.`}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowModal(true)}
              leadingIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Agregar {TABS.find((t) => t.key === tab)?.label.toLowerCase() || 'registro'}
            </Button>
          }
        />
      ) : (
        <section className="ts-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-hairline px-5 py-4 sm:px-6">
            {(() => {
              const t = TABS.find((t) => t.key === tab)!
              return <t.icon className="h-4 w-4 text-muted" />
            })()}
            <h2 className="text-sm font-medium text-ink">
              {tab === 'expenses'
                ? 'Historial de gastos'
                : tab === 'marketing'
                ? 'Campañas de marketing'
                : tab === 'waste'
                ? 'Registro de mermas'
                : 'Próximos eventos'}
            </h2>
            <span className="ml-auto text-xs text-muted-soft">
              {currentList.length} registro
              {currentList.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  {tab === 'expenses' && (
                    <>
                      <TH>Categoría</TH>
                      <TH>Descripción</TH>
                      <TH className="text-right">Monto</TH>
                      <TH className="text-right">Fecha</TH>
                    </>
                  )}
                  {tab === 'marketing' && (
                    <>
                      <TH>Título</TH>
                      <TH>Descripción</TH>
                      <TH className="text-right">Monto</TH>
                      <TH className="text-right">Fecha</TH>
                    </>
                  )}
                  {tab === 'waste' && (
                    <>
                      <TH>Producto</TH>
                      <TH className="text-right">Cantidad</TH>
                      <TH>Razón</TH>
                      <TH className="text-right">Fecha</TH>
                    </>
                  )}
                  {tab === 'events' && (
                    <>
                      <TH>Título</TH>
                      <TH>Descripción</TH>
                      <TH className="text-right">Fecha</TH>
                    </>
                  )}
                </TR>
              </THead>
              <TBody>
                {tab === 'expenses' &&
                  (expenses as Expense[]).map((e) => (
                    <TR key={e.id}>
                      <TD className="font-medium text-ink">{e.category}</TD>
                      <TD>{e.description}</TD>
                      <TD className="text-right font-mono font-medium text-ink">
                        {formatCurrency(e.amount)}
                      </TD>
                      <TD className="text-right font-mono text-[13px] text-muted">
                        {formatDate(e.date)}
                      </TD>
                    </TR>
                  ))}
                {tab === 'marketing' &&
                  (marketing as Marketing[]).map((m) => (
                    <TR key={m.id}>
                      <TD className="font-medium text-ink">{m.title}</TD>
                      <TD className="max-w-[200px] truncate text-muted">
                        {m.description || '—'}
                      </TD>
                      <TD className="text-right font-mono font-medium text-ink">
                        {formatCurrency(m.amount)}
                      </TD>
                      <TD className="text-right font-mono text-[13px] text-muted">
                        {formatDate(m.date)}
                      </TD>
                    </TR>
                  ))}
                {tab === 'waste' &&
                  (waste as Waste[]).map((w) => (
                    <TR key={w.id}>
                      <TD className="font-medium text-ink">{w.product.name}</TD>
                      <TD className="text-right font-mono font-medium text-ink">
                        {formatNumber(w.quantity)}
                      </TD>
                      <TD className="max-w-[200px] truncate text-muted">
                        {w.reason || '—'}
                      </TD>
                      <TD className="text-right font-mono text-[13px] text-muted">
                        {formatDate(w.date)}
                      </TD>
                    </TR>
                  ))}
                {tab === 'events' &&
                  (events as Event[]).map((evt) => (
                    <TR key={evt.id}>
                      <TD className="font-medium text-ink">{evt.title}</TD>
                      <TD className="max-w-[300px] truncate text-muted">
                        {evt.description || '—'}
                      </TD>
                      <TD className="text-right font-mono text-[13px] text-muted">
                        {formatDate(evt.date)}
                      </TD>
                    </TR>
                  ))}
              </TBody>
            </Table>
          </div>
        </section>
      )}

      {showModal && (
        <Modal
          title={modalTitle}
          subtitle="Completa los campos para registrar."
          onClose={() => setShowModal(false)}
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="entry-form">
                Guardar
              </Button>
            </>
          }
        >
          {tab === 'expenses' && (
            <form id="entry-form" onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="ts-label">Categoría</label>
                <input
                  type="text"
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, category: e.target.value })
                  }
                  required
                  placeholder="Ej: Transporte, Insumos, Servicios"
                  className="ts-input"
                />
              </div>
              <div>
                <label className="ts-label">Descripción</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, description: e.target.value })
                  }
                  required
                  className="ts-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ts-label">Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                    className="ts-input"
                  />
                </div>
                <div>
                  <label className="ts-label">Fecha</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, date: e.target.value })
                    }
                    required
                    className="ts-input"
                  />
                </div>
              </div>
            </form>
          )}

          {tab === 'marketing' && (
            <form id="entry-form" onSubmit={handleMarketingSubmit} className="space-y-4">
              <div>
                <label className="ts-label">Título</label>
                <input
                  type="text"
                  value={marketingForm.title}
                  onChange={(e) =>
                    setMarketingForm({ ...marketingForm, title: e.target.value })
                  }
                  required
                  placeholder="Nombre de la campaña"
                  className="ts-input"
                />
              </div>
              <div>
                <label className="ts-label">Descripción (opcional)</label>
                <input
                  type="text"
                  value={marketingForm.description}
                  onChange={(e) =>
                    setMarketingForm({
                      ...marketingForm,
                      description: e.target.value,
                    })
                  }
                  className="ts-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ts-label">Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={marketingForm.amount}
                    onChange={(e) =>
                      setMarketingForm({
                        ...marketingForm,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                    className="ts-input"
                  />
                </div>
                <div>
                  <label className="ts-label">Fecha</label>
                  <input
                    type="date"
                    value={marketingForm.date}
                    onChange={(e) =>
                      setMarketingForm({ ...marketingForm, date: e.target.value })
                    }
                    required
                    className="ts-input"
                  />
                </div>
              </div>
            </form>
          )}

          {tab === 'waste' && (
            <form id="entry-form" onSubmit={handleWasteSubmit} className="space-y-4">
              <div>
                <label className="ts-label">Producto</label>
                <select
                  value={wasteForm.productId}
                  onChange={(e) =>
                    setWasteForm({ ...wasteForm, productId: e.target.value })
                  }
                  required
                  className="ts-input"
                >
                  <option value="">Selecciona un producto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ts-label">Cantidad (unidades)</label>
                  <input
                    type="number"
                    min="1"
                    value={wasteForm.quantity}
                    onChange={(e) =>
                      setWasteForm({
                        ...wasteForm,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                    className="ts-input"
                  />
                </div>
                <div>
                  <label className="ts-label">Fecha</label>
                  <input
                    type="date"
                    value={wasteForm.date}
                    onChange={(e) =>
                      setWasteForm({ ...wasteForm, date: e.target.value })
                    }
                    required
                    className="ts-input"
                  />
                </div>
              </div>
              <div>
                <label className="ts-label">Razón (opcional)</label>
                <input
                  type="text"
                  value={wasteForm.reason}
                  onChange={(e) =>
                    setWasteForm({ ...wasteForm, reason: e.target.value })
                  }
                  placeholder="Causa de la merma"
                  className="ts-input"
                />
              </div>
            </form>
          )}

          {tab === 'events' && (
            <form id="entry-form" onSubmit={handleEventSubmit} className="space-y-4">
              <div>
                <label className="ts-label">Título del evento</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, title: e.target.value })
                  }
                  required
                  className="ts-input"
                />
              </div>
              <div>
                <label className="ts-label">Descripción (opcional)</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                  rows={2}
                  className="w-full resize-none rounded-md border border-hairline-strong bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-muted-soft transition-colors hover:border-pewter focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="ts-label">Fecha</label>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, date: e.target.value })
                  }
                  required
                  className="ts-input"
                />
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  )
}
