import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'produccion', 'view')
  if (error) return error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const production = await prisma.production.findMany({
    where: status ? { status } : undefined,
    include: { product: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(production)
}

export async function POST(request: Request) {
  const { error } = await requirePermission(request, 'produccion', 'create')
  if (error) return error

  try {
    const data = await request.json()

    if (!data.productId) {
      return NextResponse.json({ error: 'Producto requerido' }, { status: 400 })
    }

    const quantity = data.boxes * data.unitsPerBox

    const record = await prisma.production.create({
      data: {
        product: {
          connect: { id: data.productId }
        },
        boxes: data.boxes,
        unitsPerBox: data.unitsPerBox,
        quantity,
        status: data.status || null,
        date: new Date(data.date),
        notes: data.notes || null,
      },
    })

    await prisma.warehouseStock.upsert({
      where: { productId_location: { productId: data.productId, location: 'factory' } },
      update: { quantity: { increment: quantity } },
      create: { productId: data.productId, location: 'factory', quantity },
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error('Production POST error:', error)
    return NextResponse.json({
      error: 'Error al crear producción',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { error } = await requirePermission(request, 'produccion', 'edit')
  if (error) return error

  const data = await request.json()
  const quantity = data.boxes * data.unitsPerBox

  const record = await prisma.production.update({
    where: { id: data.id },
    data: {
      boxes: data.boxes,
      unitsPerBox: data.unitsPerBox,
      quantity,
      status: data.status,
      date: data.date,
      notes: data.notes,
      editedBy: data.editedBy || 'admin',
      editedAt: new Date(),
    },
  })

  return NextResponse.json(record)
}

export async function DELETE(request: Request) {
  const { error } = await requirePermission(request, 'produccion', 'delete')
  if (error) return error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  await prisma.production.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
