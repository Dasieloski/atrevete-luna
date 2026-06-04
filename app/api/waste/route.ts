import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'

export async function GET() {
  const { error } = await requirePermission(null as any, 'produccion', 'view')
  if (error) return error

  const waste = await prisma.waste.findMany({
    include: { product: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(waste)
}

export async function POST(request: Request) {
  const { error } = await requirePermission(request, 'produccion', 'create')
  if (error) return error

  const data = await request.json()
  const record = await prisma.waste.create({ data })
  return NextResponse.json(record)
}
