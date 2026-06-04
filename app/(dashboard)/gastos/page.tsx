'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, DollarSign, Megaphone, Trash2, Calendar } from 'lucide-react'
import { PermissionGuard } from '@/components/PermissionGuard'
import type { LucideIcon } from 'lucide-react'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { formatDate, formatCurrency, formatNumber } from '@/src/lib/format'

type Tab = 'expenses' | 'marketing' | 'waste' | 'events'

interface Expense { id: string; category: string; description: string; amount: number; date: string }
interface Marketing { id: string; title: string; description: string | null; amount: number; date: string }
interface Waste { id: string; quantity: number; reason: string | null; date: string; product: { name: string } }
interface Event { id: string; title: string; description: string | null; date: string }

const TABS: { key: Tab; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'expenses', label: 'Gastos', icon: DollarSign, color: 'text-accent-amber' },
  { key: 'marketing', label: 'Marketing', icon: Megaphone, color: 'text-accent-teal' },
  { key: 'waste', label: 'Mermas', icon: Trash2, color: 'text-warning' },
  { key: 'events', label: 'Eventos', icon: Calendar, color: 'text-primary' },
]

export default function EconomiaPage() {
  const [tab, setTab] = useState<Tab>('expenses')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [marketing, setMarketing] = useState<Marketing[]>([])
  const [waste, setWaste] = useState<Waste[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [showModal, setShowModal] = useState(false)
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])

  const [expenseForm, setExpenseForm] = useState({ category: '', description: '', amount: 0, date: new Date().toISOString().split('T')[0] })
  const [marketingForm, setMarketingForm] = useState({ title: '', description: '', amount: 0, date: new Date().toISOString().split('T')[0] })
  const [wasteForm, setWasteForm] = useState({ productId: '', quantity: 0, reason: '', date: new Date().toISOString().split('T')[0] })
  const [eventForm, setEventForm] = useState({ title: '', description: '', date: new Date().toISOString().split('T')[0] })

  useEffect(() => {
    Promise.all([
      fetch('/api/expenses').then(r => r.json()),
      fetch('/api/marketing').then(r => r.json()),
      fetch('/api/waste').then(r => r.json()),
      fetch('/api/events').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
    ]).then(([exp, mar, was, evt, prods]) => {
      setExpenses(exp)
      setMarketing(mar)
      setWaste(was)
      setEvents(evt)
      setProducts(prods)
    })
  }, [])

  const totals = useMemo(() => ({
    expenses: expenses.reduce((s, e) => s + e.amount, 0),
    marketing: marketing.reduce((s, m) => s + m.amount, 0),
    waste: waste.reduce((s, w) => s + w.quantity, 0),
    events: events.length,
  }), [expenses, marketing, waste, events])

  async function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(expenseForm) })
    setExpenseForm({ category: '', description: '', amount: 0, date: new Date().toISOString().split('T')[0] })
    setShowModal(false)
    setExpenses(await fetch('/api/expenses').then(r => r.json()))
  }

  async function handleMarketingSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/marketing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(marketingForm) })
    setMarketingForm({ title: '', description: '', amount: 0, date: new Date().toISOString().split('T')[0] })
    setShowModal(false)
    setMarketing(await fetch('/api/marketing').then(r => r.json()))
  }

  async function handleWasteSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/waste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(wasteForm) })
    setWasteForm({ productId: '', quantity: 0, reason: '', date: new Date().toISOString().split('T')[0] })
    setShowModal(false)
    setWaste(await fetch('/api/waste').then(r => r.json()))
  }

  async function handleEventSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eventForm) })
    setEventForm({ title: '', description: '', date: new Date().toISOString().split('T')[0] })
    setShowModal(false)
    setEvents(await fetch('/api/events').then(r => r.json()))
  }

  const currentList = useMemo(() => {
    switch (tab) {
      case 'expenses': return expenses
      case 'marketing': return marketing
      case 'waste': return waste
      case 'events': return events
    }
  }, [tab, expenses, marketing, waste, events])

  const modalTitle = `Nuevo ${TABS.find(t => t.key === tab)?.label.toLowerCase() || 'registro'}`

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Gastos y Eventos</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Registra gastos operativos, campañas de marketing, mermas de producción y eventos.
          </p>
        </div>
        <PermissionGuard module="gastos" action="create">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </PermissionGuard>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setShowModal(false) }}
            className={`bg-surface-card rounded-xl p-4 border border-hairline text-left hover:bg-surface-soft transition-colors ${tab === t.key ? 'ring-2 ring-primary' : ''}`}>
            <t.icon className={`w-5 h-5 ${t.color}`} />
            <p className="text-sm font-semibold text-ink mt-2">{t.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${
              t.key === 'expenses' ? 'text-accent-amber' :
              t.key === 'marketing' ? 'text-accent-teal' :
              t.key === 'waste' ? 'text-warning' :
              'text-primary'
            }`}>
              {t.key === 'expenses' && formatCurrency(totals.expenses)}
              {t.key === 'marketing' && formatCurrency(totals.marketing)}
              {t.key === 'waste' && `${formatNumber(totals.waste)} uds`}
              {t.key === 'events' && String(totals.events)}
            </p>
            <p className="text-xs text-muted mt-0.5">{tab === t.key ? currentList.length : 0} registro{tab === t.key && currentList.length !== 1 ? 's' : ''}</p>
          </button>
        ))}
      </section>

      {currentList.length === 0 ? (
        <EmptyState
          icon={TABS.find(t => t.key === tab)?.icon || DollarSign}
          title={`Sin ${TABS.find(t => t.key === tab)?.label.toLowerCase() || 'registros'}`}
          description={`Aún no hay registros de ${tab === 'expenses' ? 'gastos' : tab === 'marketing' ? 'marketing' : tab === 'waste' ? 'mermas' : 'eventos'}. Usa el botón "Agregar" para empezar.`}
          action={
            <button onClick={() => setShowModal(true)} className="text-sm text-primary font-semibold hover:underline">
              + Agregar {TABS.find(t => t.key === tab)?.label.toLowerCase() || 'registro'}
            </button>
          }
        />
      ) : (
        <section className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
          <div className="px-5 py-4 border-b border-hairline flex items-center gap-2">
            {(() => {
              const t = TABS.find(t => t.key === tab)!
              return <t.icon className={`w-4 h-4 ${t.color || 'text-muted'}`} />
            })()}
            <h2 className="text-sm font-bold text-ink">
              {tab === 'expenses' ? 'Historial de gastos' :
               tab === 'marketing' ? 'Campañas de marketing' :
               tab === 'waste' ? 'Registro de mermas' :
               'Próximos eventos'}
            </h2>
            <span className="text-xs text-muted ml-auto">{currentList.length} registro{currentList.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-soft">
                <tr>
                  {tab === 'expenses' && (
                    <><th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Categoría</th>
                    <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Descripción</th>
                    <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Monto</th>
                    <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Fecha</th></>
                  )}
                  {tab === 'marketing' && (
                    <><th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Título</th>
                    <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Descripción</th>
                    <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Monto</th>
                    <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Fecha</th></>
                  )}
                  {tab === 'waste' && (
                    <><th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Producto</th>
                    <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Cantidad</th>
                    <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Razón</th>
                    <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Fecha</th></>
                  )}
                  {tab === 'events' && (
                    <><th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Título</th>
                    <th className="px-5 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Descripción</th>
                    <th className="px-5 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Fecha</th></>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {tab === 'expenses' && (expenses as Expense[]).map(e => (
                  <tr key={e.id} className="hover:bg-surface-soft/50">
                    <td className="px-5 py-3.5 text-sm font-semibold text-ink">{e.category}</td>
                    <td className="px-5 py-3.5 text-sm text-body">{e.description}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-ink text-right">{formatCurrency(e.amount)}</td>
                    <td className="px-5 py-3.5 text-sm text-muted text-right whitespace-nowrap">{formatDate(e.date)}</td>
                  </tr>
                ))}
                {tab === 'marketing' && (marketing as Marketing[]).map(m => (
                  <tr key={m.id} className="hover:bg-surface-soft/50">
                    <td className="px-5 py-3.5 text-sm font-semibold text-ink">{m.title}</td>
                    <td className="px-5 py-3.5 text-sm text-muted max-w-[200px] truncate">{m.description || '—'}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-ink text-right">{formatCurrency(m.amount)}</td>
                    <td className="px-5 py-3.5 text-sm text-muted text-right whitespace-nowrap">{formatDate(m.date)}</td>
                  </tr>
                ))}
                {tab === 'waste' && (waste as Waste[]).map(w => (
                  <tr key={w.id} className="hover:bg-surface-soft/50">
                    <td className="px-5 py-3.5 text-sm font-semibold text-ink">{w.product.name}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-ink text-right">{formatNumber(w.quantity)}</td>
                    <td className="px-5 py-3.5 text-sm text-muted max-w-[200px] truncate">{w.reason || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-muted text-right whitespace-nowrap">{formatDate(w.date)}</td>
                  </tr>
                ))}
                {tab === 'events' && (events as Event[]).map(evt => (
                  <tr key={evt.id} className="hover:bg-surface-soft/50">
                    <td className="px-5 py-3.5 text-sm font-semibold text-ink">{evt.title}</td>
                    <td className="px-5 py-3.5 text-sm text-muted max-w-[300px] truncate">{evt.description || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-muted text-right whitespace-nowrap">{formatDate(evt.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showModal && (
        <Modal title={modalTitle} subtitle="Completa los campos para registrar." onClose={() => setShowModal(false)} size="md"
          footer={
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-surface-soft text-body rounded-lg hover:bg-surface-cream-strong font-medium">Cancelar</button>
              <button type="submit" form="entry-form" className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium">Guardar</button>
            </div>
          }
        >
          {tab === 'expenses' && (
            <form id="entry-form" onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Categoría</label>
                <input type="text" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} required placeholder="Ej: Transporte, Insumos, Servicios" className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Descripción</label>
                <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-body-strong mb-1.5">Monto (USD)</label>
                  <input type="number" step="0.01" min="0" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })} required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-body-strong mb-1.5">Fecha</label>
                  <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
                </div>
              </div>
            </form>
          )}

          {tab === 'marketing' && (
            <form id="entry-form" onSubmit={handleMarketingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Título</label>
                <input type="text" value={marketingForm.title} onChange={(e) => setMarketingForm({ ...marketingForm, title: e.target.value })} required placeholder="Nombre de la campaña" className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Descripción (opcional)</label>
                <input type="text" value={marketingForm.description} onChange={(e) => setMarketingForm({ ...marketingForm, description: e.target.value })} className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-body-strong mb-1.5">Monto (USD)</label>
                  <input type="number" step="0.01" min="0" value={marketingForm.amount} onChange={(e) => setMarketingForm({ ...marketingForm, amount: parseFloat(e.target.value) || 0 })} required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-body-strong mb-1.5">Fecha</label>
                  <input type="date" value={marketingForm.date} onChange={(e) => setMarketingForm({ ...marketingForm, date: e.target.value })} required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
                </div>
              </div>
            </form>
          )}

          {tab === 'waste' && (
            <form id="entry-form" onSubmit={handleWasteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Producto</label>
                <select value={wasteForm.productId} onChange={(e) => setWasteForm({ ...wasteForm, productId: e.target.value })} required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body">
                  <option value="">Selecciona un producto</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-body-strong mb-1.5">Cantidad (unidades)</label>
                  <input type="number" min="1" value={wasteForm.quantity} onChange={(e) => setWasteForm({ ...wasteForm, quantity: parseInt(e.target.value) || 0 })} required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-body-strong mb-1.5">Fecha</label>
                  <input type="date" value={wasteForm.date} onChange={(e) => setWasteForm({ ...wasteForm, date: e.target.value })} required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Razón (opcional)</label>
                <input type="text" value={wasteForm.reason} onChange={(e) => setWasteForm({ ...wasteForm, reason: e.target.value })} placeholder="Causa de la merma" className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
              </div>
            </form>
          )}

          {tab === 'events' && (
            <form id="entry-form" onSubmit={handleEventSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Título del evento</label>
                <input type="text" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Descripción (opcional)</label>
                <textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-body-strong mb-1.5">Fecha</label>
                <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  )
}
