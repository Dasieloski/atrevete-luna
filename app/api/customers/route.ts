import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'

export async function GET() {
  const { error } = await requirePermission(null as any, 'clientes', 'view')
  if (error) return error

  const customers = await prisma.customer.findMany({
    include: { sales: true, reservations: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(customers)
}

export async function POST(request: Request) {
  const { error } = await requirePermission(request, 'clientes', 'create')
  if (error) return error

  const data = await request.json()
  const customer = await prisma.customer.create({ data })
  return NextResponse.json(customer)
}
