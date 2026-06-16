import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'dashboard', 'view')
  if (error) return error

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to params required' }, { status: 400 })
  }

  const dateFilter = {
    gte: new Date(from + 'T00:00:00Z'),
    lte: new Date(to + 'T23:59:59Z'),
  }

  const [products, productions, transfers, sales, waste, payments] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true } }),
    prisma.production.findMany({
      where: { date: dateFilter },
      include: { product: true },
      orderBy: { date: 'asc' },
    }),
    prisma.transfer.findMany({
      where: { date: dateFilter, fromLocation: 'factory', toLocation: 'main' },
      include: { product: true },
      orderBy: { date: 'asc' },
    }),
    prisma.sale.findMany({
      where: { date: dateFilter },
      include: { product: true, customer: true },
      orderBy: { date: 'asc' },
    }),
    prisma.waste.findMany({
      where: { date: dateFilter },
      include: { product: true },
      orderBy: { date: 'asc' },
    }),
    prisma.debtPayment.findMany({
      where: { date: dateFilter },
      orderBy: { date: 'asc' },
    }),
  ])

  // Compute running debt exactly like the pagos page:
  // debt = sum of transfers (factory→main) value
  // payments = sum of (usdAmount ?? amount) from debt payments
  const allTransfers = await prisma.transfer.findMany({
    where: { date: { lte: new Date(to + 'T23:59:59Z') }, fromLocation: 'factory', toLocation: 'main' },
    include: { product: true },
    orderBy: { date: 'asc' },
  })
  const allPayments = await prisma.debtPayment.findMany({
    where: { date: { lte: new Date(to + 'T23:59:59Z') } },
    orderBy: { date: 'asc' },
  })

  let cumulativeDebt = 0
  let cumulativePaid = 0
  for (const t of allTransfers) {
    const price = t.product?.priceWarehouse ?? 0.49
    cumulativeDebt += t.quantity * price
  }
  for (const p of allPayments) {
    cumulativePaid += p.usdAmount ?? p.amount
  }

  const totalDebt = Math.max(0, +(cumulativeDebt - cumulativePaid).toFixed(2))

  return NextResponse.json({ products, productions, transfers, sales, waste, payments, totalDebt })
}
