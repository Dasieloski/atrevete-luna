import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const { error } = await requirePermission(null as any, 'gastos', 'view')
  if (error) return error

  const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } })
  return NextResponse.json(expenses)
}

export async function POST(request: Request) {
  const { error, user } = await requirePermission(request, 'gastos', 'create')
  if (error) return error

  const data = await request.json()
  const expense = await prisma.expense.create({ data })

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: 'create',
    entity: 'expense',
    entityId: expense.id,
    entityName: `${expense.category}: ${expense.description}`,
    details: { amount: expense.amount },
  })

  return NextResponse.json(expense)
}
