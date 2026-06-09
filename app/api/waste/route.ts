import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'
import { logAudit } from '@/lib/audit'

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
  const { error, user } = await requirePermission(request, 'produccion', 'create')
  if (error) return error

  const data = await request.json()
  const record = await prisma.waste.create({ data })

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: 'create',
    entity: 'production',
    entityId: record.id,
    entityName: `Merma ${record.id.slice(0, 8)}`,
    details: {
      quantity: record.quantity,
      reason: record.reason,
      date: record.date?.toISOString(),
    },
  })

  return NextResponse.json(record)
}
