import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const { error } = await requirePermission(null as any, 'ventas', 'view')
  if (error) return error

  const sales = await prisma.sale.findMany({
    include: { product: true, customer: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(sales)
}

export async function POST(request: Request) {
  const { error, user } = await requirePermission(request, 'ventas', 'create')
  if (error) return error

  try {
    const data = await request.json()

    if (!data.productId || !data.customerId) {
      return NextResponse.json({ error: 'Producto y cliente requeridos' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id: data.productId } })
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const unitsPerBox = product.unitsPerBox || 100
    const boxes = data.boxes || Math.floor(data.quantity / unitsPerBox)
    const quantity = boxes * unitsPerBox
    const price = data.price ?? (data.seller === 'alex' ? product.priceDistribution : product.priceWarehouse)
    const total = boxes * price

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          product: { connect: { id: data.productId } },
          customer: { connect: { id: data.customerId } },
          quantity,
          total,
          date: new Date(data.date),
          seller: data.seller || 'alex',
          notes: data.notes || null,
        },
      })

      const stock = await tx.warehouseStock.findUnique({
        where: { productId_location: { productId: data.productId, location: 'main' } },
      })
      if (!stock || stock.quantity < quantity) {
        throw new Error('STOCK_INSUFICIENTE')
      }
      await tx.warehouseStock.update({
        where: { productId_location: { productId: data.productId, location: 'main' } },
        data: { quantity: { decrement: quantity } },
      })

      const debtAmount = +(boxes * product.priceWarehouse * product.unitsPerBox).toFixed(2)
      await tx.debt.create({
        data: {
          type: 'sale',
          amount: debtAmount,
          date: new Date(data.date),
          notes: `Venta #${sale.id.slice(0, 8)} — ${product.name} — ${boxes} caja(s)`,
          saleId: sale.id,
        },
      })

      return sale
    })

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entity: 'sale',
      entityId: result.id,
      entityName: `Venta ${result.id.slice(0, 8)}`,
      details: { total: result.total, quantity: result.quantity },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Sale POST error:', error)
    if (error instanceof Error && error.message === 'STOCK_INSUFICIENTE') {
      return NextResponse.json({ error: 'Stock insuficiente en almacén' }, { status: 400 })
    }
    return NextResponse.json({
      error: 'Error al crear venta',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
