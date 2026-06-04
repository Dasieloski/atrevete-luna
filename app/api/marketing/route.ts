import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'

export async function GET() {
  const { error } = await requirePermission(null as any, 'gastos', 'view')
  if (error) return error

  const marketing = await prisma.marketing.findMany({ orderBy: { date: 'desc' } })
  return NextResponse.json(marketing)
}

export async function POST(request: Request) {
  const { error } = await requirePermission(request, 'gastos', 'create')
  if (error) return error

  const data = await request.json()
  const record = await prisma.marketing.create({ data })
  return NextResponse.json(record)
}
