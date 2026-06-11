import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const { error } = await requirePermission(null as any, 'gastos', 'view')
  if (error) return error

  const marketing = await prisma.marketing.findMany({ orderBy: { date: 'desc' } })
  return NextResponse.json(marketing)
}

export async function POST(request: Request) {
  const { error, user } = await requirePermission(request, 'gastos', 'create')
  if (error) return error

  const data = await request.json()
  const record = await prisma.marketing.create({
    data: {
      ...data,
      date: data.date ? new Date(data.date + 'T00:00:00') : undefined,
    },
  })

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: 'create',
    entity: 'expense',
    entityId: record.id,
    entityName: record.title,
    details: {
      title: record.title,
      description: record.description,
      amount: record.amount,
    },
  })

  return NextResponse.json(record)
}
