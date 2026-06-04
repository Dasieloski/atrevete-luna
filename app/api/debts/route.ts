import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'deudas', 'view')
  if (error) return error

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  const debts = await prisma.debt.findMany({
    where: type ? { type } : undefined,
    include: {
      payments: true,
      sale: {
        include: {
          product: { select: { id: true, name: true, priceWarehouse: true, unitsPerBox: true } },
          customer: { select: { id: true, name: true, province: true } },
        },
      },
    },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(debts)
}

export async function POST(request: Request) {
  const { error } = await requirePermission(request, 'deudas', 'create')
  if (error) return error

  const data = await request.json()
  const debt = await prisma.debt.create({ data })
  return NextResponse.json(debt)
}
