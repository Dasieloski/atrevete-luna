import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const { error } = await requirePermission(null as any, 'productos', 'view')
  if (error) return error

  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(products)
}

export async function POST(request: Request) {
  const { error, user } = await requirePermission(request, 'productos', 'create')
  if (error) return error

  const data = await request.json()
  const product = await prisma.product.create({ data })

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: 'create',
    entity: 'product',
    entityId: product.id,
    entityName: product.name,
  })

  return NextResponse.json(product)
}
