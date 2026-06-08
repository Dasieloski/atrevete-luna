'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  HandCoins,
  FileText,
  CreditCard,
  Search,
  Wallet,
  Banknote,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  Receipt,
  Plus,
} from 'lucide-react'
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
import { DateRangeFilter } from '@/src/components/DateRangeFilter'
import { yearStartInputDate, todayInputDate } from '@/src/lib/format'
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
  payments: { id: string; amount: number; date: string; type: string; notes: string | null }[]
}

interface Payment {
  id: string
  amount: number
  date: string
  type: string
  notes: string | null
  debtId: string | null
}

type ModalKind = null | 'account' | 'prepayment' | 'manual'

function defaultYearRange(): DateRange {
  return { from: yearStartInputDate(), to: todayInputDate() }
}

export default function DeudasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [range, setRange] = useState<DateRange>(defaultYearRange)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [modal, setModal] = useState<ModalKind>(null)
  const [accountForm, setAccountForm] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [prepaymentForm, setPrepaymentForm] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [manualForm, setManualForm] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [activeTab, setActiveTab] = useState<'debts' | 'history'>('debts')
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payMsg, setPayMsg] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    setError('')
    try {
      const [salesRes, debtsRes, paymentsRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/debts'),
        fetch('/api/payments'),
      ])

      if (!salesRes.ok) throw new Error('Error cargando ventas')
      if (!debtsRes.ok) throw new Error('Error cargando deudas')
      if (!paymentsRes.ok) throw new Error('Error cargando pagos')

      setSales(await salesRes.json())
      setDebts(await debtsRes.json())
      setPayments(await paymentsRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const debtBySaleId = useMemo(() => {
    const m = new Map<string, Debt>()
    for (const d of debts) {
      if (d.saleId) m.set(d.saleId, d)
    }
    return m
  }, [debts])

  const debtById = useMemo(() => {
    const m = new Map<string, Debt>()
    for (const d of debts) {
      m.set(d.id, d)
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
        const paymentCount = debt?.payments?.length ?? 0
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
          paymentCount,
          payments: debt?.payments ?? [],
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

  const avgPricePerBox = useMemo(() => {
    const pending = rows.filter((r) => r.isActive)
    const totalDebt = pending.reduce((s, r) => s + r.debtAmount, 0)
    const totalBoxes = pending.reduce((s, r) => s + r.boxes, 0)
    return totalBoxes > 0 ? totalDebt / totalBoxes : 0
  }, [rows])

  // Historial de pagos — todos los pagos ordenados por fecha
  const paymentHistory = useMemo(() => {
    const fromTs = new Date(range.from + 'T00:00:00').getTime()
    const toTs = new Date(range.to + 'T23:59:59').getTime()

    return payments
      .filter((p) => {
        const ts = new Date(p.date).getTime()
        return ts >= fromTs && ts <= toTs
      })
      .map((p) => {
        const debt = p.debtId ? debtById.get(p.debtId) : undefined
        const sale = debt?.saleId ? sales.find((s) => s.id === debt.saleId) : undefined
        const originalAmount = debt?.amount ?? 0
        const remaining = debt ? +(debt.amount - debt.paidAmount).toFixed(2) : 0
        return {
          ...p,
          debt,
          sale,
          originalAmount,
          remaining,
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [payments, debtById, sales, range])

  async function handleAccountPayment(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/payments/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: accountForm.amount,
          date: accountForm.date,
          notes: accountForm.notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Error al registrar pago')
        return
      }
      setPayMsg(data.message || 'Pago registrado')
      setTimeout(() => setPayMsg(''), 4000)
      setAccountForm({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' })
      setModal(null)
      fetchAll()
    } finally {
      setLoading(false)
    }
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
    setPrepaymentForm({
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    })
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
    setManualForm({
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setModal(null)
    fetchAll()
  }

  function toggleExpand(debtId: string) {
    setExpandedDebtId((prev) => (prev === debtId ? null : debtId))
  }

  function getPaymentTypeBadge(type: string) {
    switch (type) {
      case 'total':
        return <Badge tone="success">Total</Badge>
      case 'partial':
        return <Badge tone="warning">Parcial</Badge>
      case 'prepayment':
        return <Badge tone="info">Adelanto</Badge>
      default:
        return <Badge tone="neutral">{type}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Control de deudas"
        description="El total de deudas acumuladas con la fábrica se paga poco a poco. Registra un pago y se distribuye automáticamente entre las deudas más antiguas."
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => setModal('account')}
              leadingIcon={<Banknote className="h-4 w-4" />}
            >
              Registrar pago
            </Button>
            <Button
              variant="secondary"
              onClick={() => setModal('prepayment')}
              leadingIcon={<HandCoins className="h-4 w-4" />}
            >
              Adelanto
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

      {payMsg && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {payMsg}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-coral/30 bg-coral-soft px-4 py-3 text-sm text-coral-dark">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <DateRangeFilter value={range} onChange={setRange} />

      {/* Stats cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Deuda total"
          value={formatCurrency(totals.deuda)}
          icon={CreditCard}
          accent="primary"
        />
        <StatCard
          label="Pagado"
          value={formatCurrency(totals.pagado)}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label="Pendiente"
          value={formatCurrency(totals.restante)}
          icon={Clock}
          accent={totals.restante > 0 ? 'warning' : 'success'}
          hint={pendingCount > 0 ? `${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}` : undefined}
        />
        <StatCard
          label="Balance neto"
          value={formatCurrency(balanceNeto)}
          icon={Wallet}
          accent={balanceNeto > 0 ? 'error' : balanceNeto < 0 ? 'success' : 'primary'}
          hint={prepaymentTotal > 0 ? `− ${formatCurrency(prepaymentTotal)} adelantos` : undefined}
        />
      </section>

      {/* Tabs */}
      <Tabs
        variant="underline"
        size="md"
        value={activeTab}
        onChange={(v) => setActiveTab(v as 'debts' | 'history')}
        tabs={[
          {
            id: 'debts',
            label: 'Deudas por venta',
            count: rows.length,
          },
          {
            id: 'history',
            label: 'Historial de pagos',
            count: paymentHistory.length,
          },
        ]}
      />

      {/* Tab: Deudas por venta */}
      {activeTab === 'debts' && (
        <section className="ts-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted" />
              <h2 className="text-sm font-medium text-ink">Deudas por venta</h2>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
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
                    <TH className="w-8" />
                    <TH>Fecha</TH>
                    <TH>Producto</TH>
                    <TH>Cliente</TH>
                    <TH className="text-center">Cajas</TH>
                    <TH className="text-right">Deuda total</TH>
                    <TH className="text-right">Pagado</TH>
                    <TH className="text-right">Restante</TH>
                    <TH className="text-center">Estado</TH>
                    <TH className="text-center">Pagos</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((r) => (
                    <>
                      <TR
                        key={r.id}
                        className={cn(
                          'cursor-pointer transition-colors',
                          r.isActive ? '' : 'bg-success-soft/40',
                          expandedDebtId === r.debtId ? 'bg-surface' : ''
                        )}
                        onClick={() => r.debtId && toggleExpand(r.debtId)}
                      >
                        <TD className="w-8">
                          {r.debtId && r.payments.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpand(r.debtId!)
                              }}
                              className="inline-flex items-center justify-center rounded-md p-0.5 text-muted hover:bg-surface hover:text-ink"
                            >
                              {expandedDebtId === r.debtId ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </TD>
                        <TD className="whitespace-nowrap font-mono text-[13px]">
                          {formatDate(r.date)}
                        </TD>
                        <TD className="font-medium text-ink">{r.product}</TD>
                        <TD>
                          {r.customer}
                          <span className="ml-1 text-xs text-muted">
                            · {r.province}
                          </span>
                        </TD>
                        <TD className="text-center font-mono">
                          {formatNumber(r.boxes)}
                        </TD>
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
                        <TD className="text-center text-xs text-muted">
                          {r.paymentCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-2 py-0.5 font-mono">
                              <History className="h-3 w-3" />
                              {r.paymentCount}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TD>
                      </TR>

                      {/* Expanded payment history */}
                      {expandedDebtId === r.debtId && r.debtId && r.payments.length > 0 && (
                        <TR className="bg-surface/60">
                          <TD colSpan={10} className="px-0 py-0">
                            <div className="border-t border-hairline-soft px-6 py-4">
                              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
                                <Receipt className="h-4 w-4 text-blue" />
                                Historial de pagos — {r.product} · {r.customer}
                              </h4>
                              <div className="overflow-x-auto rounded-lg border border-hairline-soft">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-hairline-soft bg-surface">
                                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-steel">
                                        Fecha
                                      </th>
                                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-steel">
                                        Tipo
                                      </th>
                                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-steel">
                                        Monto
                                      </th>
                                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-steel">
                                        Saldo después
                                      </th>
                                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-steel">
                                        Notas
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(() => {
                                      let runningTotal = r.debtAmount
                                      const sortedPayments = [...r.payments].sort(
                                        (a, b) =>
                                          new Date(a.date).getTime() -
                                          new Date(b.date).getTime()
                                      )
                                      return sortedPayments.map((payment, idx) => {
                                        runningTotal -= payment.amount
                                        return (
                                          <tr
                                            key={payment.id}
                                            className={cn(
                                              'border-b border-hairline-soft last:border-0',
                                              idx % 2 === 0 ? 'bg-canvas' : 'bg-surface/40'
                                            )}
                                          >
                                            <td className="whitespace-nowrap px-3 py-2 font-mono text-[13px] text-ink">
                                              {formatDate(payment.date)}
                                            </td>
                                            <td className="px-3 py-2">
                                              {getPaymentTypeBadge(payment.type)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono font-medium text-success">
                                              {formatCurrency(payment.amount)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono font-semibold">
                                              {formatCurrency(Math.max(0, runningTotal))}
                                            </td>
                                            <td className="px-3 py-2 text-muted">
                                              {payment.notes || '—'}
                                            </td>
                                          </tr>
                                        )
                                      })
                                    })()}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t border-hairline bg-surface font-medium">
                                      <td
                                        colSpan={2}
                                        className="px-3 py-2 text-right text-xs uppercase tracking-wider text-ink"
                                      >
                                        Total pagado
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono text-success">
                                        {formatCurrency(r.paidAmount)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono">
                                        {formatCurrency(r.remaining)}
                                      </td>
                                      <td />
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </TD>
                        </TR>
                      )}
                    </>
                  ))}
                  {/* Totals row */}
                  <TR className="bg-surface font-medium hover:bg-surface">
                    <TD colSpan={5} className="text-right uppercase tracking-wider text-ink">
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
      )}

      {/* Tab: Historial de pagos */}
      {activeTab === 'history' && (
        <section className="ts-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-hairline px-5 py-4 sm:px-6">
            <History className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-medium text-ink">Historial de pagos</h2>
            <span className="ml-auto text-xs text-muted">
              {paymentHistory.length} pago{paymentHistory.length !== 1 ? 's' : ''}
            </span>
          </div>

          {paymentHistory.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Sin pagos en este período"
              description="No hay pagos registrados en el rango de fechas seleccionado."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Fecha</TH>
                    <TH>Tipo</TH>
                    <TH>Producto</TH>
                    <TH>Cliente</TH>
                    <TH className="text-right">Monto</TH>
                    <TH className="text-right">Deuda original</TH>
                    <TH className="text-right">Saldo restante</TH>
                    <TH>Notas</TH>
                  </TR>
                </THead>
                <TBody>
                  {paymentHistory.map((p) => (
                    <TR key={p.id}>
                      <TD className="whitespace-nowrap font-mono text-[13px]">
                        {formatDate(p.date)}
                      </TD>
                      <TD>{getPaymentTypeBadge(p.type)}</TD>
                      <TD className="text-ink">
                        {p.sale?.product?.name || '—'}
                      </TD>
                      <TD>
                        {p.sale?.customer?.name || '—'}
                        {p.sale?.customer?.province && (
                          <span className="ml-1 text-xs text-muted">
                            · {p.sale.customer.province}
                          </span>
                        )}
                      </TD>
                      <TD className="text-right font-mono font-medium text-success">
                        {formatCurrency(p.amount)}
                      </TD>
                      <TD className="text-right font-mono text-ink">
                        {formatCurrency(p.originalAmount)}
                      </TD>
                      <TD className="text-right font-mono font-semibold">
                        {formatCurrency(p.remaining)}
                      </TD>
                      <TD className="text-muted">{p.notes || '—'}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </section>
      )}

      {/* Modal: Registrar pago (a cuenta / global) */}
      {modal === 'account' && (
        <Modal title="Registrar pago a cuenta" onClose={() => setModal(null)}>
          <form onSubmit={handleAccountPayment} className="space-y-5">
            {/* Resumen del total pendiente */}
            <div className="space-y-2 rounded-xl border border-hairline-soft bg-surface p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate">Deuda total acumulada:</span>
                <span className="font-medium text-ink">
                  {formatCurrency(totals.deuda)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate">Ya pagado:</span>
                <span className="font-medium text-success">
                  {formatCurrency(totals.pagado)}
                </span>
              </div>
              <div className="mt-2 flex justify-between border-t border-hairline pt-2">
                <span className="font-medium text-slate">Saldo pendiente:</span>
                <span className="text-lg font-semibold text-error">
                  {formatCurrency(totals.restante)}
                </span>
              </div>
              {pendingCount > 0 && (
                <p className="text-xs text-muted">
                  Se distribuirá entre {pendingCount} deuda{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}, empezando por las más antiguas.
                </p>
              )}
            </div>

            {/* Monto */}
            <div>
              <label className="ts-label">Monto a pagar</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={accountForm.amount || ''}
                  onChange={(e) =>
                    setAccountForm({
                      ...accountForm,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  className="ts-input pl-7"
                  placeholder="0.00"
                />
              </div>
              {accountForm.amount > 0 && avgPricePerBox > 0 && (
                <p className="mt-1.5 text-xs text-muted">
                  Equivale a aprox.{' '}
                  <span className="font-semibold text-ink">
                    {formatNumber(Math.round(accountForm.amount / avgPricePerBox))} cajas
                  </span>{' '}
                  (a ${formatCurrency(avgPricePerBox)} / caja)
                </p>
              )}
              {accountForm.amount > 0 && accountForm.amount < totals.restante - 0.01 && (
                <p className="mt-1.5 text-xs text-warning">
                  Después de este pago quedarán{' '}
                  <span className="font-semibold">
                    {formatCurrency(+(totals.restante - accountForm.amount).toFixed(2))}
                  </span>{' '}
                  pendientes
                </p>
              )}
              {accountForm.amount >= totals.restante - 0.01 && accountForm.amount > 0 && (
                <p className="mt-1.5 text-xs text-success">
                  Este pago cubre o excede el saldo pendiente total
                </p>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="ts-label">Fecha del pago</label>
              <input
                type="date"
                value={accountForm.date}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, date: e.target.value })
                }
                required
                className="ts-input"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="ts-label">Notas (opcional)</label>
              <input
                type="text"
                value={accountForm.notes}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, notes: e.target.value })
                }
                placeholder="Referencia, banco, nota…"
                className="ts-input"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModal(null)}
                fullWidth
              >
                Cancelar
              </Button>
              <Button type="submit" fullWidth loading={loading}>
                {accountForm.amount > 0
                  ? `Registrar pago (${formatCurrency(accountForm.amount)})`
                  : 'Registrar pago'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Pago adelantado */}
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
          <form
            id="prepayment-form"
            onSubmit={handlePrepayment}
            className="space-y-4"
          >
            <div className="flex items-start gap-2 rounded-md border border-blue/20 bg-blue-soft px-3 py-2.5 text-sm text-blue">
              <HandCoins className="mt-0.5 h-4 w-4 shrink-0" />
              Este monto se descuenta del balance neto final.
            </div>
            <div>
              <label className="ts-label">Monto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={prepaymentForm.amount || ''}
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
                  setPrepaymentForm({
                    ...prepaymentForm,
                    date: e.target.value,
                  })
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
                  setPrepaymentForm({
                    ...prepaymentForm,
                    notes: e.target.value,
                  })
                }
                placeholder="Cliente, motivo…"
                className="ts-input"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Deuda manual */}
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
          <form
            id="manual-form"
            onSubmit={handleManualDebt}
            className="space-y-4"
          >
            <div>
              <label className="ts-label">Monto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={manualForm.amount || ''}
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
