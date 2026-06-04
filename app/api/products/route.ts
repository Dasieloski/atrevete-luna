import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'

export async function GET() {
  const { error } = await requirePermission(null as any, 'productos', 'view')
  if (error) return error

  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(products)
}

export async function POST(request: Request) {
  const { error } = await requirePermission(request, 'productos', 'create')
  if (error) return error

  const data = await request.json()
  const product = await prisma.product.create({ data })
  return NextResponse.json(product)
}
