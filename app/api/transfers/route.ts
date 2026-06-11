import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const { error } = await requirePermission(null as any, 'almacen', 'view')
  if (error) return error

  const transfers = await prisma.transfer.findMany({
    include: { product: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(transfers)
}

export async function POST(request: Request) {
  const { error, user } = await requirePermission(request, 'almacen', 'create')
  if (error) return error

  try {
    const data = await request.json()

    if (!data.productId) {
      return NextResponse.json({ error: 'Producto requerido' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id: data.productId } })
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const unitsPerBox = product.unitsPerBox || 100
    const boxes = parseInt(data.boxes) || 0
    const quantity = boxes * unitsPerBox

    if (quantity <= 0) {
      return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 })
    }

    const transfer = await prisma.transfer.create({
      data: {
        product: { connect: { id: data.productId } },
        fromLocation: data.fromLocation,
        toLocation: data.toLocation,
        quantity,
        date: new Date(data.date + 'T00:00:00'),
        notes: data.notes || null,
      }
    })

    const sourceStock = await prisma.warehouseStock.findUnique({
      where: { productId_location: { productId: data.productId, location: data.fromLocation } },
    })
    if (!sourceStock || sourceStock.quantity < quantity) {
      await prisma.transfer.delete({ where: { id: transfer.id } })
      return NextResponse.json({ error: 'Stock insuficiente en origen' }, { status: 400 })
    }

    await prisma.warehouseStock.update({
      where: { productId_location: { productId: data.productId, location: data.fromLocation } },
      data: { quantity: { decrement: quantity } },
    })

    await prisma.warehouseStock.upsert({
      where: { productId_location: { productId: data.productId, location: data.toLocation } },
      update: { quantity: { increment: quantity } },
      create: { productId: data.productId, location: data.toLocation, quantity },
    })

    // Crear deuda automática cuando se recoge de la fábrica
    const debtAmount = +(boxes * product.priceWarehouse * unitsPerBox).toFixed(2)
    await prisma.debt.create({
      data: {
        type: 'transfer',
        amount: debtAmount,
        date: new Date(data.date + 'T00:00:00'),
        notes: `Recogida — ${product.name} — ${boxes} caja(s) de ${data.fromLocation} a ${data.toLocation}`,
        transferId: transfer.id,
      },
    })

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entity: 'transfer',
      entityId: transfer.id,
      entityName: `Transferencia ${transfer.id.slice(0, 8)}`,
      details: {
        from: transfer.fromLocation,
        to: transfer.toLocation,
        quantity: transfer.quantity,
        productName: product?.name,
      },
    })

    return NextResponse.json(transfer)
  } catch (error) {
    console.error('Transfer POST error:', error)
    return NextResponse.json({
      error: 'Error al crear transferencia',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { error, user } = await requirePermission(request, 'almacen', 'edit')
  if (error) return error

  try {
    const data = await request.json()

    const oldTransfer = await prisma.transfer.findUnique({ where: { id: data.id } })
    if (!oldTransfer) {
      return NextResponse.json({ error: 'Transferencia no encontrada' }, { status: 404 })
    }

    const product = await prisma.product.findUnique({ where: { id: oldTransfer.productId } })
    const unitsPerBox = product?.unitsPerBox || 100
    const boxes = parseInt(data.boxes) || 0
    const quantity = boxes * unitsPerBox

    if (quantity <= 0) {
      return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 })
    }

    await prisma.warehouseStock.updateMany({
      where: { productId: oldTransfer.productId, location: oldTransfer.fromLocation },
      data: { quantity: { increment: oldTransfer.quantity } },
    })

    await prisma.warehouseStock.updateMany({
      where: { productId: oldTransfer.productId, location: oldTransfer.toLocation },
      data: { quantity: { decrement: oldTransfer.quantity } },
    })

    const transfer = await prisma.transfer.update({
      where: { id: data.id },
      data: {
        fromLocation: data.fromLocation || oldTransfer.fromLocation,
        toLocation: data.toLocation || oldTransfer.toLocation,
        quantity,
        date: data.date ? new Date(data.date + 'T00:00:00') : oldTransfer.date,
        notes: data.notes !== undefined ? data.notes : oldTransfer.notes,
      }
    })

    const sourceStock = await prisma.warehouseStock.findUnique({
      where: { productId_location: { productId: transfer.productId, location: transfer.fromLocation } },
    })
    if (!sourceStock || sourceStock.quantity < quantity) {
      await prisma.warehouseStock.upsert({
        where: { productId_location: { productId: oldTransfer.productId, location: oldTransfer.fromLocation } },
        update: { quantity: { decrement: oldTransfer.quantity } },
        create: { productId: oldTransfer.productId, location: oldTransfer.fromLocation, quantity: 0 },
      })
      await prisma.warehouseStock.upsert({
        where: { productId_location: { productId: oldTransfer.productId, location: oldTransfer.toLocation } },
        update: { quantity: { increment: oldTransfer.quantity } },
        create: { productId: oldTransfer.productId, location: oldTransfer.toLocation, quantity: oldTransfer.quantity },
      })
      await prisma.transfer.update({
        where: { id: data.id },
        data: { quantity: oldTransfer.quantity },
      })
      return NextResponse.json({ error: 'Stock insuficiente en origen para la nueva cantidad' }, { status: 400 })
    }

    await prisma.warehouseStock.update({
      where: { productId_location: { productId: transfer.productId, location: transfer.fromLocation } },
      data: { quantity: { decrement: quantity } },
    })

    await prisma.warehouseStock.upsert({
      where: { productId_location: { productId: transfer.productId, location: transfer.toLocation } },
      update: { quantity: { increment: quantity } },
      create: { productId: transfer.productId, location: transfer.toLocation, quantity },
    })

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'edit',
      entity: 'transfer',
      entityId: transfer.id,
      entityName: `Transferencia ${transfer.id.slice(0, 8)}`,
      details: {
        from: transfer.fromLocation,
        to: transfer.toLocation,
        quantity: transfer.quantity,
        productName: product?.name,
      },
    })

    return NextResponse.json(transfer)
  } catch (error) {
    console.error('Transfer PUT error:', error)
    return NextResponse.json({
      error: 'Error al actualizar transferencia',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { error, user } = await requirePermission(request, 'almacen', 'delete')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const transfer = await prisma.transfer.findUnique({ where: { id } })
    if (!transfer) {
      return NextResponse.json({ error: 'Transferencia no encontrada' }, { status: 404 })
    }

    await prisma.warehouseStock.updateMany({
      where: { productId: transfer.productId, location: transfer.fromLocation },
      data: { quantity: { increment: transfer.quantity } },
    })

    await prisma.warehouseStock.updateMany({
      where: { productId: transfer.productId, location: transfer.toLocation },
      data: { quantity: { decrement: transfer.quantity } },
    })

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'delete',
      entity: 'transfer',
      entityId: id,
      entityName: `Transferencia ${id.slice(0, 8)}`,
      details: {
        from: transfer.fromLocation,
        to: transfer.toLocation,
        quantity: transfer.quantity,
      },
    })

    await prisma.transfer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Transfer DELETE error:', error)
    return NextResponse.json({
      error: 'Error al eliminar transferencia',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
