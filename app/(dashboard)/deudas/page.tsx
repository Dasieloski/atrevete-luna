'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
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
  ArrowUpRight,
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
import { ExportDropdown } from '@/src/components/ExportDropdown'

interface Debt {
  id: string
  type: string
  amount: number
  paidAmount: number
  date: string
  isActive: boolean
  saleId: string | null
  transferId: string | null
  notes: string | null
  payments: {
    id: string
    amount: number
    currency: string
    usdAmount: number | null
    cupAmount: number | null
    boxes: number | null
    date: string
    type: string
    notes: string | null
  }[]
  sale?: {
    quantity: number
    product?: { name: string; priceWarehouse: number; unitsPerBox: number }
  }
  transfer?: {
    quantity: number
    fromLocation: string
    toLocation: string
    product?: { name: string; priceWarehouse: number; unitsPerBox: number }
  }
}

interface Payment {
  id: string
  amount: number
  currency: string
  usdAmount: number | null
  cupAmount: number | null
  boxes: number | null
  exchangeRate: number | null
  date: string
  type: string
  notes: string | null
  debtId: string | null
  createdAt?: string
}

type ModalKind = null | 'account' | 'prepayment' | 'manual'

function defaultYearRange(): DateRange {
  return { from: yearStartInputDate(), to: todayInputDate() }
}

export default function DeudasPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [range, setRange] = useState<DateRange>(defaultYearRange)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [modal, setModal] = useState<ModalKind>(null)
  const [accountForm, setAccountForm] = useState({
    amount: 0,
    currency: 'USD' as 'USD' | 'CUP',
    boxes: 0,
    usdAmount: 0,
    cupAmount: 0,
    exchangeRate: 120,
    date: todayInputDate(),
    notes: '',
  })
  const [prepaymentForm, setPrepaymentForm] = useState({
    amount: 0,
    date: todayInputDate(),
    notes: '',
  })
  const [manualForm, setManualForm] = useState({
    amount: 0,
    date: todayInputDate(),
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
      const [debtsRes, paymentsRes] = await Promise.all([
        fetch('/api/debts'),
        fetch('/api/payments'),
      ])

      if (!debtsRes.ok) throw new Error('Error cargando deudas')
      if (!paymentsRes.ok) throw new Error('Error cargando pagos')

      setDebts(await debtsRes.json())
      setPayments(await paymentsRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

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

    const debtRows = debts
      .filter(
        (d) =>
          new Date(d.date).getTime() >= fromTs &&
          new Date(d.date).getTime() <= toTs
      )
      .map((d) => {
        const upb = d.transfer?.product?.unitsPerBox ?? d.sale?.product?.unitsPerBox ?? 100
        const price = d.transfer?.product?.priceWarehouse ?? d.sale?.product?.priceWarehouse ?? 0.49
        const units = d.transfer?.quantity ?? d.sale?.quantity ?? 0
        const boxes = units > 0 ? Math.floor(units / upb) : 0
        const remaining = +(d.amount - d.paidAmount).toFixed(2)
        const productName = d.transfer?.product?.name ?? d.sale?.product?.name ?? '—'
        const isActive = d.isActive
        const paymentCount = d.payments?.length ?? 0
        const debtPayments = d.payments ?? []
        const paidUSD = debtPayments.reduce((s, p) => s + (p.usdAmount ?? p.amount), 0)
        const paidCUP = debtPayments.reduce((s, p) => s + (p.cupAmount ?? 0), 0)
        const paidBoxes = debtPayments.reduce((s, p) => s + (p.boxes ?? 0), 0)
        // remaining boxes: si tenemos paidBoxes, restamos; si no, calculamos desde remaining USD
        const remainingBoxes = paidBoxes > 0
          ? +(boxes - paidBoxes).toFixed(2)
          : remaining > 0 ? +(remaining / (upb * price)).toFixed(2) : 0
        return {
          id: d.id,
          date: d.date,
          product: productName,
          type: d.type,
          notes: d.notes,
          units,
          boxes,
          debtAmount: d.amount,
          paidAmount: d.paidAmount,
          paidUSD,
          paidCUP,
          paidBoxes,
          remaining,
          remainingBoxes,
          isActive,
          debtId: d.id,
          paymentCount,
          payments: debtPayments,
        }
      })

    return debtRows
      .filter((r) => {
        if (!search) return true
        const t = search.toLowerCase()
        return (
          r.product.toLowerCase().includes(t) ||
          (r.notes?.toLowerCase().includes(t) ?? false)
        )
      })
      .filter((r) => {
        if (statusFilter === 'pending') return r.isActive
        if (statusFilter === 'paid') return !r.isActive
        return true
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [debts, range, search, statusFilter])

  const totals = useMemo(() => {
    let deuda = 0,
      pagado = 0,
      restante = 0,
      totalBoxes = 0,
      totalPaidBoxes = 0,
      totalRemainingBoxes = 0,
      totalPaidCUP = 0
    for (const r of rows) {
      deuda += r.debtAmount
      pagado += r.paidAmount
      restante += r.remaining
      totalBoxes += r.boxes
      totalPaidBoxes += r.paidBoxes
      totalRemainingBoxes += r.remainingBoxes
      totalPaidCUP += r.paidCUP
    }
    return { deuda, pagado, restante, count: rows.length, totalBoxes, totalPaidBoxes, totalRemainingBoxes, totalPaidCUP }
  }, [rows])

  const balanceNeto = +(totals.restante - prepaymentTotal).toFixed(2)
  const pendingCount = rows.filter((r) => r.isActive).length

  const avgPricePerBox = useMemo(() => {
    const pending = rows.filter((r) => r.isActive)
    const totalDebt = pending.reduce((s, r) => s + r.debtAmount, 0)
    const totalBoxes = pending.reduce((s, r) => s + r.boxes, 0)
    return totalBoxes > 0 ? totalDebt / totalBoxes : 0
  }, [rows])

  // Historial de pagos con balance corriente global
  const paymentHistory = useMemo(() => {
    // Sort ALL payments chronologically (ascending) for running balance
    const sortedPayments = [...payments].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (dateDiff !== 0) return dateDiff
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return aCreated - bCreated
    })

    // Calculate running global balance for each payment
    const enriched = sortedPayments.map((p, index) => {
      // All debts created on or before this payment's date
      const debtsUpToNow = debts.filter(
        (d) => new Date(d.date).getTime() <= new Date(p.date).getTime()
      )
      const totalDebtUpToNow = debtsUpToNow.reduce((s, d) => s + d.amount, 0)

      // All payments strictly before this one
      const previousPayments = sortedPayments.slice(0, index)
      const totalPaidBefore = previousPayments.reduce((s, pp) => s + (pp.usdAmount ?? pp.amount), 0)

      const deudaOriginal = +(totalDebtUpToNow - totalPaidBefore).toFixed(2)
      const saldoRestante = +(deudaOriginal - (p.usdAmount ?? p.amount)).toFixed(2)

      // Product from associated debt (if any)
      const debt = p.debtId ? debtById.get(p.debtId) : undefined
      const productName =
        debt?.transfer?.product?.name ?? debt?.sale?.product?.name ?? (p.type === 'prepayment' ? 'Adelanto' : p.type === 'account' ? 'Pago a cuenta' : '—')

      return {
        ...p,
        deudaOriginal,
        saldoRestante,
        productName,
      }
    })

    // Filter by date range and sort descending for display
    const fromTs = new Date(range.from + 'T00:00:00').getTime()
    const toTs = new Date(range.to + 'T23:59:59').getTime()

    return enriched
      .filter((p) => {
        const ts = new Date(p.date).getTime()
        return ts >= fromTs && ts <= toTs
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [payments, debts, debtById, range])

  async function handleAccountPayment(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/payments/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: accountForm.amount,
          currency: accountForm.currency,
          usdAmount: accountForm.currency === 'USD' ? accountForm.usdAmount : accountForm.cupAmount / accountForm.exchangeRate,
          cupAmount: accountForm.currency === 'CUP' ? accountForm.cupAmount : accountForm.usdAmount * accountForm.exchangeRate,
          boxes: accountForm.boxes || null,
          exchangeRate: accountForm.exchangeRate || null,
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
      setAccountForm({ amount: 0, currency: 'USD', boxes: 0, usdAmount: 0, cupAmount: 0, exchangeRate: 120, date: new Date().toISOString().split('T')[0], notes: '' })
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
      date: todayInputDate(),
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
      date: todayInputDate(),
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
      case 'account':
        return <Badge tone="primary">A cuenta</Badge>
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
        <div className="ts-card flex flex-col gap-1 p-4">
          <span className="text-xs text-stone">Recogidas (cajas)</span>
          <span className="text-2xl font-semibold text-ink">{formatNumber(totals.totalBoxes)}</span>
          <span className="text-xs text-muted">{formatCurrency(totals.deuda)} USD</span>
        </div>
        <div className="ts-card flex flex-col gap-1 p-4">
          <span className="text-xs text-stone">Pagado USD</span>
          <span className="text-2xl font-semibold text-success">{formatCurrency(totals.pagado)}</span>
          <span className="text-xs text-muted">{formatNumber(totals.totalPaidBoxes)} cajas</span>
        </div>
        <div className="ts-card flex flex-col gap-1 p-4">
          <span className="text-xs text-stone">Pagado CUP</span>
          <span className="text-2xl font-semibold text-primary">{totals.totalPaidCUP > 0 ? formatNumber(totals.totalPaidCUP) : '—'}</span>
          <span className="text-xs text-muted">{totals.totalPaidCUP > 0 ? 'Total trimestre' : 'Sin pagos CUP'}</span>
        </div>
        <div className="ts-card flex flex-col gap-1 p-4">
          <span className="text-xs text-stone">Pendiente</span>
          <span className="text-2xl font-semibold text-error">{formatCurrency(Math.abs(totals.restante))}</span>
          <span className="text-xs text-muted">{formatNumber(totals.totalRemainingBoxes)} cajas</span>
        </div>
      </section>

      {/* Alerta: deuda negativa (saldo a favor) */}
      {totals.restante < -0.01 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft px-4 py-3"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div className="text-sm">
            <p className="font-medium text-success">Saldo a favor con la fábrica</p>
            <p className="text-graphite">
              Has pagado{' '}
              <strong className="font-semibold text-ink">
                {formatCurrency(Math.abs(totals.restante))}
              </strong>{' '}
              de más. La fábrica te debe este monto.
            </p>
          </div>
        </motion.div>
      )}

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

      {/* Tab: Deudas por recogida */}
      {activeTab === 'debts' && (
        <section className="ts-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted" />
              <h2 className="text-sm font-medium text-ink">Deudas por recogida</h2>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Input
                type="text"
                placeholder="Buscar producto, notas…"
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
              <ExportDropdown
                rows={rows.map((r) => ({
                  Fecha: formatDate(r.date),
                  Producto: r.product,
                  Tipo: r.type,
                  Notas: r.notes || '',
                  'Recogida (cajas)': r.boxes,
                  'Recogida (unidades)': r.units,
                  'Deuda total (USD)': r.debtAmount,
                  'Pagado USD': r.paidUSD,
                  'Pagado CUP': r.paidCUP,
                  'Pagado cajas': r.paidBoxes,
                  'Restante USD': r.remaining,
                  'Restante cajas': r.remainingBoxes,
                  Estado: r.remaining < -0.01 ? 'A favor' : r.isActive ? 'Pendiente' : 'Pagado',
                  Pagos: r.paymentCount,
                }))}
                headers={['Fecha', 'Producto', 'Tipo', 'Notas', 'Recogida (cajas)', 'Recogida (unidades)', 'Deuda total (USD)', 'Pagado USD', 'Pagado CUP', 'Pagado cajas', 'Restante USD', 'Restante cajas', 'Estado', 'Pagos']}
                filename={`deudas_${range.from}_${range.to}`}
                pdfTitle="Deudas por Recogida"
                pdfSubtitle={`Período: ${range.from} a ${range.to}`}
                disabled={rows.length === 0}
              />
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Sin recogidas en este período"
              description="No hay recogidas que generen deuda en el rango de fechas seleccionado."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {/* ========== HEADER ROW 1: Main groups ========== */}
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      className="border border-hairline px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-steel align-bottom"
                    >
                      Fecha
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-hairline px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-steel align-bottom"
                    >
                      Producto
                    </th>
                    <th
                      colSpan={2}
                      className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-blue bg-blue-soft/30"
                    >
                      Recogida
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-steel align-bottom"
                    >
                      Deuda (USD)
                    </th>
                    <th
                      colSpan={3}
                      className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-success bg-success-soft/30"
                    >
                      Pagos
                    </th>
                    <th
                      colSpan={2}
                      className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-error bg-error-soft/30"
                    >
                      Restante
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-hairline px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-steel align-bottom"
                    >
                      Estado
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-hairline px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-steel align-bottom w-10"
                    >
                      &nbsp;
                    </th>
                  </tr>

                  {/* ========== HEADER ROW 2: Sub-columns ========== */}
                  <tr>
                    {/* Recogida sub-columns */}
                    <th className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-blue-soft/20">
                      Cajas
                    </th>
                    <th className="border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-blue-soft/20">
                      Unidades
                    </th>

                    {/* Pagos sub-columns */}
                    <th className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-success-soft/20">
                      USD
                    </th>
                    <th className="border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-success-soft/20">
                      CUP
                    </th>
                    <th className="border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-success-soft/20">
                      Cajas
                    </th>

                    {/* Restante sub-columns */}
                    <th className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-error-soft/20">
                      USD
                    </th>
                    <th className="border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-error-soft/20">
                      Cajas
                    </th>
                  </tr>
                </thead>

                {/* ========== BODY ========== */}
                <tbody>
                  {rows.map((r, idx) => (
                    <>
                      <tr
                        key={r.id}
                        className={cn(
                          'cursor-pointer transition-colors',
                          idx % 2 === 0 ? 'bg-canvas' : 'bg-surface/30',
                          r.isActive ? '' : 'bg-success-soft/40',
                          expandedDebtId === r.debtId ? 'bg-surface' : ''
                        )}
                        onClick={() => r.debtId && toggleExpand(r.debtId)}
                      >
                        <td className="border border-hairline px-4 py-3 whitespace-nowrap font-mono text-[13px] text-ink">
                          {formatDate(r.date)}
                        </td>
                        <td className="border border-hairline px-4 py-3 font-medium text-ink">
                          {r.product}
                        </td>

                        {/* Recogida */}
                        <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono text-charcoal bg-blue-soft/10">
                          {formatNumber(r.boxes)}
                        </td>
                        <td className="border border-hairline px-4 py-3 text-right font-mono text-charcoal bg-blue-soft/10">
                          {formatNumber(r.units)}
                        </td>

                        {/* Deuda */}
                        <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono font-semibold text-ink">
                          {formatCurrency(r.debtAmount)}
                        </td>

                        {/* Pagos */}
                        <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono text-success bg-success-soft/10">
                          {formatCurrency(r.paidUSD)}
                        </td>
                        <td className="border border-hairline px-4 py-3 text-right font-mono text-primary bg-success-soft/10">
                          {r.paidCUP > 0 ? formatNumber(r.paidCUP) : '—'}
                        </td>
                        <td className="border border-hairline px-4 py-3 text-right font-mono text-charcoal bg-success-soft/10">
                          {r.paidBoxes > 0 ? formatNumber(r.paidBoxes) : '—'}
                        </td>

                        {/* Restante */}
                        <td className={cn(
                          'border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono font-semibold bg-error-soft/10',
                          r.remaining < -0.01 ? 'text-success' : r.remaining > 0.01 ? 'text-error' : 'text-ink'
                        )}>
                          {r.remaining < -0.01 ? (
                            <span className="inline-flex items-center gap-1">
                              <ArrowUpRight className="h-3 w-3" />
                              {formatCurrency(Math.abs(r.remaining))}
                            </span>
                          ) : (
                            formatCurrency(r.remaining)
                          )}
                        </td>
                        <td className="border border-hairline px-4 py-3 text-right font-mono text-charcoal bg-error-soft/10">
                          {r.remainingBoxes > 0 ? formatNumber(r.remainingBoxes) : '—'}
                        </td>

                        {/* Estado */}
                        <td className="border border-hairline px-4 py-3 text-center">
                          {r.remaining < -0.01 ? (
                            <Badge tone="success" dot>A favor</Badge>
                          ) : r.isActive ? (
                            <Badge tone="warning" dot>Pendiente</Badge>
                          ) : (
                            <Badge tone="success" dot>Pagado</Badge>
                          )}
                        </td>

                        {/* Expand */}
                        <td className="border border-hairline px-4 py-3 text-center">
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
                        </td>
                      </tr>

                      {/* Expanded payment history */}
                      {expandedDebtId === r.debtId && r.debtId && r.payments.length > 0 && (
                        <tr className="bg-surface/60">
                          <td colSpan={11} className="px-0 py-0">
                            <div className="border-t border-hairline-soft px-6 py-4">
                              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
                                <Receipt className="h-4 w-4 text-blue" />
                                Historial de pagos — {r.product}
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
                                        USD
                                      </th>
                                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-steel">
                                        CUP
                                      </th>
                                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-steel">
                                        Cajas
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
                                        runningTotal -= (payment.usdAmount ?? payment.amount)
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
                                              {formatCurrency(payment.usdAmount ?? payment.amount)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-primary">
                                              {payment.cupAmount ? formatNumber(payment.cupAmount) : '—'}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-charcoal">
                                              {payment.boxes ? formatNumber(payment.boxes) : '—'}
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
                                      <td colSpan={2} className="px-3 py-2 text-right text-xs uppercase tracking-wider text-ink">
                                        Total pagado
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono text-success">
                                        {formatCurrency(r.paidUSD)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono text-primary">
                                        {r.paidCUP > 0 ? formatNumber(r.paidCUP) : '—'}
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono text-charcoal">
                                        {r.paidBoxes > 0 ? formatNumber(r.paidBoxes) : '—'}
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
                          </td>
                        </tr>
                      )}
                    </>
                  ))}

                  {/* ========== TOTALS ROW ========== */}
                  <tr className="bg-surface font-semibold">
                    <td className="border border-hairline px-4 py-3 text-right text-sm uppercase tracking-wider text-ink">
                      Total
                    </td>
                    <td className="border border-hairline px-4 py-3" />

                    {/* Recogida totals */}
                    <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono text-sm text-ink bg-blue-soft/20">
                      {formatNumber(totals.totalBoxes)}
                    </td>
                    <td className="border border-hairline px-4 py-3 text-right font-mono text-sm text-ink bg-blue-soft/20" />

                    {/* Deuda total */}
                    <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono text-sm text-ink bg-blue-soft/20">
                      {formatCurrency(totals.deuda)}
                    </td>

                    {/* Pagos totals */}
                    <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono text-sm text-success bg-success-soft/20">
                      {formatCurrency(totals.pagado)}
                    </td>
                    <td className="border border-hairline px-4 py-3 text-right font-mono text-sm text-primary bg-success-soft/20">
                      {totals.totalPaidCUP > 0 ? formatNumber(totals.totalPaidCUP) : '—'}
                    </td>
                    <td className="border border-hairline px-4 py-3 text-right font-mono text-sm text-ink bg-success-soft/20">
                      {formatNumber(totals.totalPaidBoxes)}
                    </td>

                    {/* Restante totals */}
                    <td className={cn(
                      'border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono text-sm bg-error-soft/20',
                      totals.restante < -0.01 ? 'text-success' : 'text-error'
                    )}>
                      {totals.restante < -0.01 ? (
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3" />
                          {formatCurrency(Math.abs(totals.restante))}
                        </span>
                      ) : (
                        formatCurrency(totals.restante)
                      )}
                    </td>
                    <td className="border border-hairline px-4 py-3 text-right font-mono text-sm text-ink bg-error-soft/20">
                      {formatNumber(totals.totalRemainingBoxes)}
                    </td>

                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
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
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th rowSpan={2} className="border border-hairline px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-steel align-bottom">
                      Fecha
                    </th>
                    <th rowSpan={2} className="border border-hairline px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-steel align-bottom">
                      Tipo
                    </th>
                    <th rowSpan={2} className="border border-hairline px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-steel align-bottom">
                      Producto
                    </th>
                    <th colSpan={3} className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-success bg-success-soft/30">
                      Pago
                    </th>
                    <th rowSpan={2} className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-steel align-bottom">
                      Deuda original
                    </th>
                    <th rowSpan={2} className="border border-hairline px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-steel align-bottom">
                      Saldo restante
                    </th>
                    <th rowSpan={2} className="border border-hairline px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-steel align-bottom">
                      Notas
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-hairline border-l-2 border-l-steel/30 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-success-soft/20">
                      USD
                    </th>
                    <th className="border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-success-soft/20">
                      CUP
                    </th>
                    <th className="border border-hairline px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-steel bg-success-soft/20">
                      Cajas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((p, idx) => (
                    <tr
                      key={p.id}
                      className={idx % 2 === 0 ? 'bg-canvas' : 'bg-surface/30'}
                    >
                      <td className="border border-hairline px-4 py-3 whitespace-nowrap font-mono text-[13px] text-ink">
                        {formatDate(p.date)}
                      </td>
                      <td className="border border-hairline px-4 py-3">
                        {getPaymentTypeBadge(p.type)}
                      </td>
                      <td className="border border-hairline px-4 py-3 text-ink">
                        {p.productName}
                      </td>
                      <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono font-medium text-success bg-success-soft/10">
                        {formatCurrency(p.usdAmount ?? p.amount)}
                      </td>
                      <td className="border border-hairline px-4 py-3 text-right font-mono text-primary bg-success-soft/10">
                        {p.cupAmount ? formatNumber(p.cupAmount) : '—'}
                      </td>
                      <td className="border border-hairline px-4 py-3 text-right font-mono text-charcoal bg-success-soft/10">
                        {p.boxes ? formatNumber(p.boxes) : '—'}
                      </td>
                      <td className="border border-hairline border-l-2 border-l-steel/30 px-4 py-3 text-right font-mono text-ink">
                        {formatCurrency(p.deudaOriginal)}
                      </td>
                      <td className={cn(
                        'border border-hairline px-4 py-3 text-right font-mono font-semibold',
                        p.saldoRestante <= 0.01 ? 'text-success' : 'text-error'
                      )}>
                        {formatCurrency(Math.max(0, p.saldoRestante))}
                      </td>
                      <td className="border border-hairline px-4 py-3 text-muted">
                        {p.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

            {/* Moneda */}
            <div>
              <label className="ts-label">Moneda</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAccountForm({ ...accountForm, currency: 'USD' })}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    accountForm.currency === 'USD'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-hairline bg-canvas text-charcoal hover:bg-surface'
                  )}
                >
                  USD
                </button>
                <button
                  type="button"
                  onClick={() => setAccountForm({ ...accountForm, currency: 'CUP' })}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    accountForm.currency === 'CUP'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-hairline bg-canvas text-charcoal hover:bg-surface'
                  )}
                >
                  CUP
                </button>
              </div>
            </div>

            {/* Tasa de cambio (solo CUP) */}
            {accountForm.currency === 'CUP' && (
              <div>
                <label className="ts-label">Tasa CUP/USD</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={accountForm.exchangeRate || ''}
                  onChange={(e) => {
                    const rate = parseFloat(e.target.value) || 0
                    const usd = rate > 0 ? accountForm.cupAmount / rate : 0
                    const boxes = usd > 0 ? usd / 0.49 / 100 : 0
                    setAccountForm({
                      ...accountForm,
                      exchangeRate: rate,
                      usdAmount: +usd.toFixed(2),
                      amount: +usd.toFixed(2),
                      boxes: +boxes.toFixed(2),
                    })
                  }}
                  className="ts-input"
                  placeholder="120.00"
                />
              </div>
            )}

            {/* Cajas */}
            <div>
              <label className="ts-label">Cajas pagadas</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={accountForm.boxes || ''}
                onChange={(e) => {
                  const boxes = parseFloat(e.target.value) || 0
                  const usd = boxes * 100 * 0.49
                  const cup = accountForm.currency === 'CUP' && accountForm.exchangeRate > 0
                    ? usd * accountForm.exchangeRate
                    : 0
                  setAccountForm({
                    ...accountForm,
                    boxes,
                    usdAmount: +usd.toFixed(2),
                    amount: +usd.toFixed(2),
                    cupAmount: cup > 0 ? +cup.toFixed(2) : accountForm.cupAmount,
                  })
                }}
                className="ts-input"
                placeholder="0"
              />
              <p className="mt-1 text-xs text-muted">
                1 caja = 100 unidades × $0.49 = $49.00
              </p>
            </div>

            {/* USD */}
            <div>
              <label className="ts-label">Equivalente en USD</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={accountForm.usdAmount || ''}
                  onChange={(e) => {
                    const usd = parseFloat(e.target.value) || 0
                    const boxes = usd > 0 ? usd / 0.49 / 100 : 0
                    const cup = accountForm.currency === 'CUP' && accountForm.exchangeRate > 0
                      ? usd * accountForm.exchangeRate
                      : 0
                    setAccountForm({
                      ...accountForm,
                      usdAmount: usd,
                      amount: usd,
                      boxes: +boxes.toFixed(2),
                      cupAmount: cup > 0 ? +cup.toFixed(2) : accountForm.cupAmount,
                    })
                  }}
                  className="ts-input pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* CUP (solo si CUP) */}
            {accountForm.currency === 'CUP' && (
              <div>
                <label className="ts-label">Monto en CUP</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={accountForm.cupAmount || ''}
                    onChange={(e) => {
                      const cup = parseFloat(e.target.value) || 0
                      const usd = accountForm.exchangeRate > 0 ? cup / accountForm.exchangeRate : 0
                      const boxes = usd > 0 ? usd / 0.49 / 100 : 0
                      setAccountForm({
                        ...accountForm,
                        cupAmount: cup,
                        usdAmount: +usd.toFixed(2),
                        amount: +usd.toFixed(2),
                        boxes: +boxes.toFixed(2),
                      })
                    }}
                    className="ts-input pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            {/* Resumen del pago */}
            {accountForm.amount > 0 && (
              <div className="space-y-1 rounded-xl border border-hairline-soft bg-surface p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate">Cajas:</span>
                  <span className="font-medium text-ink">{formatNumber(accountForm.boxes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate">USD:</span>
                  <span className="font-medium text-ink">{formatCurrency(accountForm.usdAmount)}</span>
                </div>
                {accountForm.currency === 'CUP' && (
                  <div className="flex justify-between">
                    <span className="text-slate">CUP:</span>
                    <span className="font-medium text-ink">{formatNumber(accountForm.cupAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-hairline pt-1">
                  <span className="text-slate">Total a pagar:</span>
                  <span className="font-semibold text-primary">{formatCurrency(accountForm.amount)}</span>
                </div>
                {accountForm.amount < totals.restante - 0.01 && (
                  <p className="text-xs text-warning">
                    Quedarán {formatCurrency(+(totals.restante - accountForm.amount).toFixed(2))} pendientes
                  </p>
                )}
                {accountForm.amount >= totals.restante - 0.01 && (
                  <p className="text-xs text-success">
                    Este pago cubre o excede el saldo pendiente
                  </p>
                )}
              </div>
            )}

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
          subtitle="Crea una deuda que no está vinculada a una recogida existente."
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
