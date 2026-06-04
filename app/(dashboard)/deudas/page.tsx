'use client'

import { useState, useEffect, useMemo } from 'react'
import { HandCoins, FileText, CreditCard, TrendingUp, Search } from 'lucide-react'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { formatDate, formatNumber, formatCurrency } from '@/src/lib/format'
import { DateRangeFilter, defaultRange } from '@/src/components/DateRangeFilter'
import type { DateRange } from '@/src/lib/business'

interface Sale {
  id: string
  productId: string
  customerId: string
  quantity: number
  total: number
  date: string
  seller: string
  notes: string | null
  product: { id: string; name: string; priceWarehouse: number; priceDistribution: number; unitsPerBox: number }
  customer: { id: string; name: string; province: string }
}

interface Debt {
  id: string
  type: string
  amount: number
  paidAmount: number
  date: string
  isActive: boolean
  saleId: string | null
  notes: string | null
  payments: { id: string; amount: number; date: string; type: string }[]
}

interface Payment {
  id: string
  amount: number
  date: string
  type: string
  debtId: string | null
}

type ModalKind = null | 'prepayment' | 'manual' | 'pay' | 'bulk-pay'

export default function PagosPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [modal, setModal] = useState<ModalKind>(null)
  const [selectedDebtId, setSelectedDebtId] = useState<string>('')
  const [payAmount, setPayAmount] = useState(0)
  const [payNotes, setPayNotes] = useState('')
  const [prepaymentForm, setPrepaymentForm] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' })
  const [manualForm, setManualForm] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [salesRes, debtsRes, paymentsRes] = await Promise.all([
      fetch('/api/sales'),
      fetch('/api/debts'),
      fetch('/api/payments'),
    ])
    setSales(await salesRes.json())
    setDebts(await debtsRes.json())
    setPayments(await paymentsRes.json())
  }

  const debtBySaleId = useMemo(() => {
    const m = new Map<string, Debt>()
    for (const d of debts) { if (d.saleId) m.set(d.saleId, d) }
    return m
  }, [debts])

  const prepaymentTotal = useMemo(
    () => payments.filter(p => p.type === 'prepayment').reduce((s, p) => s + p.amount, 0),
    [payments]
  )

  const rows = useMemo(() => {
    const fromTs = new Date(range.from + 'T00:00:00').getTime()
    const toTs = new Date(range.to + 'T23:59:59').getTime()

    const saleRows = sales
      .filter(s => new Date(s.date).getTime() >= fromTs && new Date(s.date).getTime() <= toTs)
      .map(s => {
        const debt = debtBySaleId.get(s.id)
        const debtAmount = debt?.amount ?? +(s.product.priceWarehouse * s.quantity).toFixed(2)
        const paidAmount = debt?.paidAmount ?? 0
        const remaining = +(debtAmount - paidAmount).toFixed(2)
        const isActive = debt ? debt.isActive : true
        return {
          id: s.id,
          date: s.date,
          product: s.product.name,
          customer: s.customer.name,
          province: s.customer.province,
          boxes: Math.floor(s.quantity / (s.product.unitsPerBox || 100)),
          units: s.quantity,
          debtAmount, paidAmount, remaining, isActive,
          debtId: debt?.id ?? null,
        }
      })

    return saleRows
      .filter(r => {
        if (!search) return true
        const t = search.toLowerCase()
        return r.product.toLowerCase().includes(t) || r.customer.toLowerCase().includes(t) || r.province.toLowerCase().includes(t)
      })
      .filter(r => {
        if (statusFilter === 'pending') return r.isActive
        if (statusFilter === 'paid') return !r.isActive
        return true
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [sales, debtBySaleId, range, search, statusFilter])

  const totals = useMemo(() => {
    let deuda = 0, pagado = 0, restante = 0
    for (const r of rows) { deuda += r.debtAmount; pagado += r.paidAmount; restante += r.remaining }
    return { deuda, pagado, restante, count: rows.length }
  }, [rows])

  const balanceNeto = +(totals.restante - prepaymentTotal).toFixed(2)

  async function handlePayOne(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDebtId) return
    const debt = debts.find(d => d.id === selectedDebtId)
    if (!debt) return
    const remaining = debt.amount - debt.paidAmount
    const type = payAmount >= remaining - 0.01 ? 'total' : 'partial'
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, debtId: selectedDebtId, amount: payAmount, notes: payNotes }),
    })
    if (!res.ok) {
      const err = await res.json()
      alert(err.error || 'Error al registrar pago')
      return
    }
    closePayModal()
    fetchAll()
  }

  async function handleBulkPay() {
    const pendingDebtIds = rows.filter(r => r.debtId && r.isActive).map(r => r.debtId!)
    if (pendingDebtIds.length === 0) { alert('No hay deudas pendientes en el rango'); return }
    if (!confirm(`¿Liquidar ${pendingDebtIds.length} deuda(s) pendiente(s) del rango?`)) return

    let ok = 0
    for (const id of pendingDebtIds) {
      const debt = debts.find(d => d.id === id)
      if (!debt) continue
      const remaining = +(debt.amount - debt.paidAmount).toFixed(2)
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'total', debtId: id, amount: remaining, notes: `Liquidación por rango ${range.from} a ${range.to}` }),
      })
      if (res.ok) ok++
    }
    alert(`${ok} deuda(s) liquidadas`)
    fetchAll()
  }

  async function handlePrepayment(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'prepayment', amount: prepaymentForm.amount, date: prepaymentForm.date, notes: prepaymentForm.notes || 'Pago adelantado' }),
    })
    setPrepaymentForm({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' })
    setModal(null)
    fetchAll()
  }

  async function handleManualDebt(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'manual', amount: manualForm.amount, date: manualForm.date, notes: manualForm.notes || null }),
    })
    setManualForm({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' })
    setModal(null)
    fetchAll()
  }

  function openPayForRow(debtId: string) {
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return
    const remaining = +(debt.amount - debt.paidAmount).toFixed(2)
    setSelectedDebtId(debtId)
    setPayAmount(remaining)
    setPayNotes('')
    setModal('pay')
  }

  function closePayModal() {
    setModal(null)
    setSelectedDebtId('')
    setPayAmount(0)
    setPayNotes('')
  }

  const pendingCount = rows.filter(r => r.isActive).length

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Control de Deudas</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Cada venta a distribuidor genera una deuda a precio de almacén. Aquí puedes ver el estado de cada deuda, registrar pagos y llevar el balance general.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('prepayment')}
            className="flex items-center gap-2 px-3 py-2.5 bg-accent-teal text-on-primary rounded-lg hover:opacity-90 font-medium text-sm shadow-sm">
            <HandCoins className="w-4 h-4" /> Pago adelantado
          </button>
          <button onClick={() => setModal('manual')}
            className="flex items-center gap-2 px-3 py-2.5 bg-surface-card text-ink border border-hairline rounded-lg hover:bg-surface-soft font-medium text-sm">
            <FileText className="w-4 h-4" /> Deuda manual
          </button>
        </div>
      </header>

      <DateRangeFilter value={range} onChange={setRange} />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface-card rounded-xl p-5 border border-hairline">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">Deuda pendiente</p>
          <p className={`text-2xl font-bold mt-1.5 ${totals.restante > 0 ? 'text-error' : 'text-ink'}`}>
            {formatCurrency(totals.restante)}
          </p>
          <p className="text-xs text-muted mt-1">{pendingCount} deuda{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}</p>
          <button onClick={handleBulkPay} disabled={totals.restante === 0}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-success text-on-primary rounded-lg hover:opacity-90 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
            Liquidar todo el rango
          </button>
        </div>

        <div className="bg-surface-card rounded-xl p-5 border border-hairline">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">Pagado (período)</p>
          <p className={`text-2xl font-bold mt-1.5 ${totals.pagado > 0 ? 'text-success' : 'text-ink'}`}>
            {formatCurrency(totals.pagado)}
          </p>
          <p className="text-xs text-muted mt-1">{totals.count} venta{totals.count !== 1 ? 's' : ''} en el período</p>
        </div>

        <div className="bg-surface-card rounded-xl p-5 border border-hairline">
          <p className="text-xs text-muted font-semibold uppercase tracking-wider">
            Balance neto
          </p>
          <p className={`text-2xl font-bold mt-1.5 flex items-center gap-2 ${
            balanceNeto > 0 ? 'text-error' : balanceNeto < 0 ? 'text-success' : 'text-ink'
          }`}>
            <TrendingUp className="w-5 h-5" />
            {formatCurrency(balanceNeto)}
          </p>
          <p className="text-xs text-muted mt-1">
            Deuda pendiente − Adelantos ({formatCurrency(prepaymentTotal)})
          </p>
        </div>
      </section>

      <section className="bg-surface-card rounded-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted" />
            <h2 className="text-sm font-bold text-ink">Deudas por venta</h2>
          </div>
          <div className="flex-1 min-w-[180px] relative">
            <input type="text" placeholder="Buscar producto, cliente, provincia..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-3 py-1.5 border border-hairline rounded-lg bg-canvas text-body text-sm focus:outline-none focus:border-primary" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'paid')}
            className="px-3 py-1.5 border border-hairline rounded-lg bg-canvas text-body text-sm">
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="paid">Pagados</option>
          </select>
          <span className="text-xs text-muted">{rows.length} registro{rows.length !== 1 ? 's' : ''}</span>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Sin ventas en este período"
            description="No hay ventas que generen deuda en el rango de fechas seleccionado."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-soft">
                <tr>
                  <th className="px-4 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-left text-2xs font-bold text-muted uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-center text-2xs font-bold text-muted uppercase tracking-wider">Cajas</th>
                  <th className="px-4 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Deuda total</th>
                  <th className="px-4 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Pagado</th>
                  <th className="px-4 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Restante</th>
                  <th className="px-4 py-3 text-center text-2xs font-bold text-muted uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right text-2xs font-bold text-muted uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map(r => (
                  <tr key={r.id} className={r.isActive ? '' : 'bg-success/5'}>
                    <td className="px-4 py-3 text-sm text-body whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-ink">{r.product}</td>
                    <td className="px-4 py-3 text-sm text-body">
                      {r.customer}
                      <span className="text-xs text-muted ml-1">· {r.province}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-body text-center">{formatNumber(r.boxes)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-ink text-right">{formatCurrency(r.debtAmount)}</td>
                    <td className="px-4 py-3 text-sm text-success text-right">{formatCurrency(r.paidAmount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">{formatCurrency(r.remaining)}</td>
                    <td className="px-4 py-3 text-center">
                      {r.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning">Pendiente</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">Pagado</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.isActive && r.debtId ? (
                        <button onClick={() => openPayForRow(r.debtId!)}
                          className="px-3 py-1.5 text-xs bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium">
                          Pagar
                        </button>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-soft border-t-2 border-hairline">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-ink text-right">TOTALES</td>
                  <td className="px-4 py-3 text-sm font-bold text-primary text-right">{formatCurrency(totals.deuda)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-success text-right">{formatCurrency(totals.pagado)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-error text-right">{formatCurrency(totals.restante)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {modal === 'pay' && (
        <Modal title="Pagar deuda" onClose={closePayModal}>
          {(() => {
            const debt = debts.find(d => d.id === selectedDebtId)
            if (!debt) return null
            const remaining = +(debt.amount - debt.paidAmount).toFixed(2)
            return (
              <form onSubmit={handlePayOne} className="space-y-4">
                <div className="bg-surface-soft rounded-lg p-4 text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted">Deuda total:</span>
                    <span className="font-medium text-ink">{formatCurrency(debt.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Ya pagado:</span>
                    <span className="font-medium text-success">{formatCurrency(debt.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-hairline pt-1.5 mt-1.5">
                    <span className="text-muted font-semibold">Saldo pendiente:</span>
                    <span className="font-bold text-ink text-base">{formatCurrency(remaining)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-body-strong mb-1.5">Monto a pagar (USD)</label>
                  <input type="number" step="0.01" min="0" value={payAmount}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
                  <button type="button" onClick={() => setPayAmount(remaining)}
                    className="text-xs text-primary hover:underline mt-1">
                    Pagar saldo completo ({formatCurrency(remaining)})
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-body-strong mb-1.5">Notas (opcional)</label>
                  <input type="text" value={payNotes} onChange={(e) => setPayNotes(e.target.value)}
                    placeholder={payAmount >= remaining - 0.01 ? 'Pago total de la deuda' : 'Pago parcial'}
                    className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium">
                    {payAmount >= remaining - 0.01 ? 'Pagar deuda completa' : 'Registrar pago parcial'}
                  </button>
                  <button type="button" onClick={closePayModal}
                    className="flex-1 px-4 py-2 bg-surface-soft text-body rounded-lg hover:bg-surface-cream-strong font-medium">
                    Cancelar
                  </button>
                </div>
              </form>
            )
          })()}
        </Modal>
      )}

      {modal === 'prepayment' && (
        <Modal title="Pago adelantado" subtitle="Registra un pago que no está asociado a una venta específica. Se descuenta automáticamente del balance neto." onClose={() => setModal(null)}>
          <form onSubmit={handlePrepayment} className="space-y-4">
            <div className="bg-accent-teal/10 border border-accent-teal/30 rounded-lg p-3 text-sm text-accent-teal flex items-center gap-2">
              <HandCoins className="w-4 h-4 shrink-0" />
              Este monto se descuenta del balance neto final.
            </div>
            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Monto (USD)</label>
              <input type="number" step="0.01" min="0" value={prepaymentForm.amount}
                onChange={(e) => setPrepaymentForm({ ...prepaymentForm, amount: parseFloat(e.target.value) || 0 })}
                required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Fecha</label>
              <input type="date" value={prepaymentForm.date}
                onChange={(e) => setPrepaymentForm({ ...prepaymentForm, date: e.target.value })}
                required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Notas (opcional)</label>
              <input type="text" value={prepaymentForm.notes}
                onChange={(e) => setPrepaymentForm({ ...prepaymentForm, notes: e.target.value })}
                placeholder="Cliente, motivo..."
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 px-4 py-2 bg-accent-teal text-on-primary rounded-lg hover:opacity-90 font-medium">Registrar adelanto</button>
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 px-4 py-2 bg-surface-soft text-body rounded-lg hover:bg-surface-cream-strong font-medium">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'manual' && (
        <Modal title="Registrar deuda manual" subtitle="Crea una deuda que no está vinculada a una venta existente." onClose={() => setModal(null)}>
          <form onSubmit={handleManualDebt} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Monto (USD)</label>
              <input type="number" step="0.01" min="0" value={manualForm.amount}
                onChange={(e) => setManualForm({ ...manualForm, amount: parseFloat(e.target.value) || 0 })}
                required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Fecha</label>
              <input type="date" value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                required className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">Notas</label>
              <input type="text" value={manualForm.notes}
                onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                placeholder="Razón de la deuda, cliente, etc."
                className="w-full px-3 py-2.5 border border-hairline rounded-lg bg-canvas text-body" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-active font-medium">Registrar deuda</button>
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 px-4 py-2 bg-surface-soft text-body rounded-lg hover:bg-surface-cream-strong font-medium">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
