import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const { error } = await requirePermission(null as any, 'gastos', 'view')
  if (error) return error

  const events = await prisma.event.findMany({ orderBy: { date: 'desc' } })
  return NextResponse.json(events)
}

export async function POST(request: Request) {
  const { error, user } = await requirePermission(request, 'gastos', 'create')
  if (error) return error

  const data = await request.json()
  const event = await prisma.event.create({
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
    entityId: event.id,
    entityName: event.title,
    details: {
      title: event.title,
      description: event.description,
      date: event.date?.toISOString(),
    },
  })

  return NextResponse.json(event)
}
