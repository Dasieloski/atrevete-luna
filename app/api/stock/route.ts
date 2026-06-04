import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'

export async function GET() {
  const { error } = await requirePermission(null as any, 'almacen', 'view')
  if (error) return error

  const stock = await prisma.warehouseStock.findMany({
    include: { product: true },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(stock)
}
