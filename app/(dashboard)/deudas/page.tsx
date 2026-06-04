'use client'

import { useState, useEffect, useMemo } from 'react'
import { HandCoins, FileText, CreditCard, TrendingUp, Search, Wallet, Banknote } from 'lucide-react'
import { Modal } from '@/src/components/Modal'
import { EmptyState } from '@/src/components/EmptyState'
import { PageHeader } from '@/src/components/ui/PageHeader'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table'
import { Badge } from '@/src/components/ui/Badge'
import { Tabs } from '@/src/components/ui/Tabs'
import { StatCard } from '@/src/components/StatCard'
import { cn } from '@/src/lib/utils'
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

type ModalKind = null | 'pay' | 'prepayment' | 'manual'

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

  useEffect(() => {
    fetchAll()
  }, [])

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
    for (const d of debts) {
      if (d.saleId) m.set(d.saleId, d)
    }
    return m
  }, [debts])

  const prepaymentTotal = useMemo(
    () =>
      payments
        .filter((p) => p.type === 'prepayment')
        .reduce((s, p) => s + p.amount, 0),
    [payments]
  )

  const rows = useMemo(() => {
    const fromTs = new Date(range.from + 'T00:00:00').getTime()
    const toTs = new Date(range.to + 'T23:59:59').getTime()

    const saleRows = sales
      .filter(
        (s) =>
          new Date(s.date).getTime() >= fromTs &&
          new Date(s.date).getTime() <= toTs
      )
      .map((s) => {
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
          debtAmount,
          paidAmount,
          remaining,
          isActive,
          debtId: debt?.id ?? null,
        }
      })

    return saleRows
      .filter((r) => {
        if (!search) return true
        const t = search.toLowerCase()
        return (
          r.product.toLowerCase().includes(t) ||
          r.customer.toLowerCase().includes(t) ||
          r.province.toLowerCase().includes(t)
        )
      })
      .filter((r) => {
        if (statusFilter === 'pending') return r.isActive
        if (statusFilter === 'paid') return !r.isActive
        return true
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [sales, debtBySaleId, range, search, statusFilter])

  const totals = useMemo(() => {
    let deuda = 0,
      pagado = 0,
      restante = 0
    for (const r of rows) {
      deuda += r.debtAmount
      pagado += r.paidAmount
      restante += r.remaining
    }
    return { deuda, pagado, restante, count: rows.length }
  }, [rows])

  const balanceNeto = +(totals.restante - prepaymentTotal).toFixed(2)
  const pendingCount = rows.filter((r) => r.isActive).length

  async function handlePayOne(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDebtId) return
    const debt = debts.find((d) => d.id === selectedDebtId)
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
    const pendingDebtIds = rows
      .filter((r) => r.debtId && r.isActive)
      .map((r) => r.debtId!)
    if (pendingDebtIds.length === 0) {
      alert('No hay deudas pendientes en el rango')
      return
    }
    if (!confirm(`¿Liquidar ${pendingDebtIds.length} deuda(s) pendiente(s) del rango?`)) return

    let ok = 0
    for (const id of pendingDebtIds) {
      const debt = debts.find((d) => d.id === id)
      if (!debt) continue
      const remaining = +(debt.amount - debt.paidAmount).toFixed(2)
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'total',
          debtId: id,
          amount: remaining,
          notes: `Liquidación por rango ${range.from} a ${range.to}`,
        }),
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
      body: JSON.stringify({
        type: 'prepayment',
        amount: prepaymentForm.amount,
        date: prepaymentForm.date,
        notes: prepaymentForm.notes || 'Pago adelantado',
      }),
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
      body: JSON.stringify({
        type: 'manual',
        amount: manualForm.amount,
        date: manualForm.date,
        notes: manualForm.notes || null,
      }),
    })
    setManualForm({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' })
    setModal(null)
    fetchAll()
  }

  function openPayForRow(debtId: string) {
    const debt = debts.find((d) => d.id === debtId)
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Control de deudas"
        description="Cada venta a distribuidor genera una deuda a precio de almacén. Aquí puedes ver el estado de cada deuda, registrar pagos y llevar el balance general."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setModal('prepayment')}
              leadingIcon={<HandCoins className="h-4 w-4" />}
            >
              Pago adelantado
            </Button>
            <Button
              variant="secondary"
              onClick={() => setModal('manual')}
              leadingIcon={<FileText className="h-4 w-4" />}
            >
              Deuda manual
            </Button>
          </>
        }
      />

      <DateRangeFilter value={range} onChange={setRange} />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="ts-card-pad">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-soft">
            Deuda pendiente
          </p>
          <p
            className={cn(
              'mt-2 font-mono text-[clamp(1.5rem,1.2rem+1vw,1.875rem)] font-medium leading-none tracking-tight',
              totals.restante > 0 ? 'text-error' : 'text-ink'
            )}
          >
            {formatCurrency(totals.restante)}
          </p>
          <p className="mt-1.5 text-xs text-muted">
            {pendingCount} deuda{pendingCount !== 1 ? 's' : ''} pendiente
            {pendingCount !== 1 ? 's' : ''}
          </p>
          <Button
            fullWidth
            size="sm"
            variant="primary"
            className="mt-4"
            onClick={handleBulkPay}
            disabled={totals.restante === 0}
            leadingIcon={<Banknote className="h-4 w-4" />}
          >
            Liquidar todo el rango
          </Button>
        </div>

        <div className="ts-card-pad">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-soft">
            Pagado (período)
          </p>
          <p
            className={cn(
              'mt-2 font-mono text-[clamp(1.5rem,1.2rem+1vw,1.875rem)] font-medium leading-none tracking-tight',
              totals.pagado > 0 ? 'text-success' : 'text-ink'
            )}
          >
            {formatCurrency(totals.pagado)}
          </p>
          <p className="mt-1.5 text-xs text-muted">
            {totals.count} venta{totals.count !== 1 ? 's' : ''} en el período
          </p>
        </div>

        <div className="ts-card-pad">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-soft">
            Balance neto
          </p>
          <p
            className={cn(
              'mt-2 flex items-center gap-2 font-mono text-[clamp(1.5rem,1.2rem+1vw,1.875rem)] font-medium leading-none tracking-tight',
              balanceNeto > 0
                ? 'text-error'
                : balanceNeto < 0
                ? 'text-success'
                : 'text-ink'
            )}
          >
            <Wallet className="h-5 w-5" />
            {formatCurrency(balanceNeto)}
          </p>
          <p className="mt-1.5 text-xs text-muted">
            Deuda − Adelantos ({formatCurrency(prepaymentTotal)})
          </p>
        </div>
      </section>

      <section className="ts-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-medium text-ink">Deudas por venta</h2>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input
              type="text"
              placeholder="Buscar producto, cliente, provincia…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leadingIcon={<Search className="h-3.5 w-3.5" />}
              className="w-56 sm:w-72"
            />
            <Tabs
              size="sm"
              variant="pill"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as 'all' | 'pending' | 'paid')}
              tabs={[
                { id: 'all', label: 'Todos' },
                { id: 'pending', label: 'Pendientes' },
                { id: 'paid', label: 'Pagados' },
              ]}
            />
            <span className="text-xs text-muted">
              {rows.length} registro{rows.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Sin ventas en este período"
            description="No hay ventas que generen deuda en el rango de fechas seleccionado."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Producto</TH>
                  <TH>Cliente</TH>
                  <TH className="text-center">Cajas</TH>
                  <TH className="text-right">Deuda total</TH>
                  <TH className="text-right">Pagado</TH>
                  <TH className="text-right">Restante</TH>
                  <TH className="text-center">Estado</TH>
                  <TH className="text-right">Acción</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id} className={r.isActive ? '' : 'bg-success-soft/40'}>
                    <TD className="whitespace-nowrap font-mono text-[13px]">
                      {formatDate(r.date)}
                    </TD>
                    <TD className="font-medium text-ink">{r.product}</TD>
                    <TD>
                      {r.customer}
                      <span className="ml-1 text-xs text-muted">· {r.province}</span>
                    </TD>
                    <TD className="text-center font-mono">{formatNumber(r.boxes)}</TD>
                    <TD className="text-right font-mono font-medium text-ink">
                      {formatCurrency(r.debtAmount)}
                    </TD>
                    <TD className="text-right font-mono text-success">
                      {formatCurrency(r.paidAmount)}
                    </TD>
                    <TD className="text-right font-mono font-semibold">
                      {formatCurrency(r.remaining)}
                    </TD>
                    <TD className="text-center">
                      {r.isActive ? (
                        <Badge tone="warning" dot>
                          Pendiente
                        </Badge>
                      ) : (
                        <Badge tone="success" dot>
                          Pagado
                        </Badge>
                      )}
                    </TD>
                    <TD className="text-right">
                      {r.isActive && r.debtId ? (
                        <Button
                          size="sm"
                          onClick={() => openPayForRow(r.debtId!)}
                        >
                          Pagar
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-soft">—</span>
                      )}
                    </TD>
                  </TR>
                ))}
                <TR className="bg-ash/40 font-medium hover:bg-ash/40">
                  <TD colSpan={4} className="text-right uppercase tracking-wider text-ink">
                    Total
                  </TD>
                  <TD className="text-right font-mono text-primary">
                    {formatCurrency(totals.deuda)}
                  </TD>
                  <TD className="text-right font-mono text-success">
                    {formatCurrency(totals.pagado)}
                  </TD>
                  <TD className="text-right font-mono text-error">
                    {formatCurrency(totals.restante)}
                  </TD>
                  <TD colSpan={2} />
                </TR>
              </TBody>
            </Table>
          </div>
        )}
      </section>

      {modal === 'pay' && (
        <Modal title="Pagar deuda" onClose={closePayModal}>
          {(() => {
            const debt = debts.find((d) => d.id === selectedDebtId)
            if (!debt) return null
            const remaining = +(debt.amount - debt.paidAmount).toFixed(2)
            return (
              <form onSubmit={handlePayOne} className="space-y-4">
                <div className="space-y-1.5 rounded-md bg-ash px-3 py-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Deuda total:</span>
                    <span className="font-medium text-ink">
                      {formatCurrency(debt.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Ya pagado:</span>
                    <span className="font-medium text-success">
                      {formatCurrency(debt.paidAmount)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex justify-between border-t border-hairline pt-1.5">
                    <span className="font-medium text-muted">Saldo pendiente:</span>
                    <span className="font-semibold text-ink">
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="ts-label">Monto a pagar</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={payAmount}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="ts-input"
                  />
                  <button
                    type="button"
                    onClick={() => setPayAmount(remaining)}
                    className="ts-link mt-1.5 text-primary"
                  >
                    Pagar saldo completo ({formatCurrency(remaining)})
                  </button>
                </div>
                <div>
                  <label className="ts-label">Notas (opcional)</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder={
                      payAmount >= remaining - 0.01
                        ? 'Pago total de la deuda'
                        : 'Pago parcial'
                    }
                    className="ts-input"
                  />
                </div>
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closePayModal}
                    fullWidth
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" fullWidth>
                    {payAmount >= remaining - 0.01
                      ? 'Pagar deuda completa'
                      : 'Registrar pago parcial'}
                  </Button>
                </div>
              </form>
            )
          })()}
        </Modal>
      )}

      {modal === 'prepayment' && (
        <Modal
          title="Pago adelantado"
          subtitle="Registra un pago que no está asociado a una venta específica. Se descuenta automáticamente del balance neto."
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" form="prepayment-form">
                Registrar adelanto
              </Button>
            </>
          }
        >
          <form id="prepayment-form" onSubmit={handlePrepayment} className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-primary">
              <HandCoins className="mt-0.5 h-4 w-4 shrink-0" />
              Este monto se descuenta del balance neto final.
            </div>
            <div>
              <label className="ts-label">Monto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={prepaymentForm.amount}
                onChange={(e) =>
                  setPrepaymentForm({
                    ...prepaymentForm,
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
                value={prepaymentForm.date}
                onChange={(e) =>
                  setPrepaymentForm({ ...prepaymentForm, date: e.target.value })
                }
                required
                className="ts-input"
              />
            </div>
            <div>
              <label className="ts-label">Notas (opcional)</label>
              <input
                type="text"
                value={prepaymentForm.notes}
                onChange={(e) =>
                  setPrepaymentForm({ ...prepaymentForm, notes: e.target.value })
                }
                placeholder="Cliente, motivo…"
                className="ts-input"
              />
            </div>
          </form>
        </Modal>
      )}

      {modal === 'manual' && (
        <Modal
          title="Registrar deuda manual"
          subtitle="Crea una deuda que no está vinculada a una venta existente."
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" form="manual-form">
                Registrar deuda
              </Button>
            </>
          }
        >
          <form id="manual-form" onSubmit={handleManualDebt} className="space-y-4">
            <div>
              <label className="ts-label">Monto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={manualForm.amount}
                onChange={(e) =>
                  setManualForm({
                    ...manualForm,
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
                value={manualForm.date}
                onChange={(e) =>
                  setManualForm({ ...manualForm, date: e.target.value })
                }
                required
                className="ts-input"
              />
            </div>
            <div>
              <label className="ts-label">Notas</label>
              <input
                type="text"
                value={manualForm.notes}
                onChange={(e) =>
                  setManualForm({ ...manualForm, notes: e.target.value })
                }
                placeholder="Razón de la deuda, cliente, etc."
                className="ts-input"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
