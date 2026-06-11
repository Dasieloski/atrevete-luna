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
      where: { date: dateFilter, toLocation: 'main' },
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

  // Get all debts up to the end date for running balance calculation
  const endDate = new Date(to + 'T23:59:59Z')
  const allDebts = await prisma.debt.findMany({
    where: {
      date: {
        lte: endDate,
      },
    },
    select: { amount: true, paidAmount: true, date: true },
  })

  const totalDebt = allDebts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0)

  return NextResponse.json({ products, productions, transfers, sales, waste, payments, totalDebt })
}
