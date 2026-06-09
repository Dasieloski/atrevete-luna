import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'
import { logAudit } from '@/lib/audit'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requirePermission(request, 'productos', 'edit')
  if (error) return error

  const { id } = await params
  const data = await request.json()
  const product = await prisma.product.update({ where: { id }, data })

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: 'edit',
    entity: 'product',
    entityId: product.id,
    entityName: product.name,
    details: data,
  })

  return NextResponse.json(product)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requirePermission(request, 'productos', 'delete')
  if (error) return error

  const { id } = await params

  const productToDelete = await prisma.product.findUnique({ where: { id }, select: { name: true } })

  await prisma.$transaction(async (tx) => {
    await tx.waste.deleteMany({ where: { productId: id } })
    await tx.transfer.deleteMany({ where: { productId: id } })
    await tx.reservation.deleteMany({ where: { productId: id } })
    await tx.warehouseStock.deleteMany({ where: { productId: id } })
    await tx.production.deleteMany({ where: { productId: id } })

    const sales = await tx.sale.findMany({ where: { productId: id }, select: { id: true } })
    const saleIds = sales.map((s) => s.id)

    if (saleIds.length > 0) {
      const debts = await tx.debt.findMany({ where: { saleId: { in: saleIds } }, select: { id: true } })
      const debtIds = debts.map((d) => d.id)

      if (debtIds.length > 0) {
        await tx.debtPayment.deleteMany({ where: { debtId: { in: debtIds } } })
        await tx.debt.deleteMany({ where: { id: { in: debtIds } } })
      }

      await tx.sale.deleteMany({ where: { id: { in: saleIds } } })
    }

    await tx.product.delete({ where: { id } })
  })

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: 'delete',
    entity: 'product',
    entityId: id,
    entityName: productToDelete?.name || id,
  })

  return NextResponse.json({ success: true })
}
