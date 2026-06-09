import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'
import { logAudit } from '@/lib/audit'

const VALID_TYPES = ['prepayment', 'partial', 'total']

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'deudas', 'view')
  if (error) return error

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  const payments = await prisma.debtPayment.findMany({
    where: type ? { type } : undefined,
    include: {
      debt: {
        include: {
          sale: {
            include: {
              product: { select: { id: true, name: true, unitsPerBox: true } },
              customer: { select: { id: true, name: true, province: true } },
            },
          },
        },
      },
    },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(payments)
}

export async function POST(request: Request) {
  const { error, user } = await requirePermission(request, 'deudas', 'create')
  if (error) return error

  try {
    const body = await request.json()
    const { debtId, amount, notes, type } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Monto requerido' }, { status: 400 })
    }

    const paymentType = VALID_TYPES.includes(type) ? type : 'partial'

    if (paymentType === 'prepayment') {
      const payment = await prisma.debtPayment.create({
        data: {
          amount,
          notes: notes || 'Pago adelantado',
          type: 'prepayment',
        },
      })

      await logAudit({
        userId: user.id,
        userName: user.name,
        action: 'create',
        entity: 'debt',
        entityId: payment.id,
        entityName: `Pago adelantado ${payment.id.slice(0, 8)}`,
        details: { amount: payment.amount, type: payment.type },
      })

      return NextResponse.json(payment)
    }

    if (!debtId) {
      return NextResponse.json({ error: 'ID de deuda requerido' }, { status: 400 })
    }

    const debt = await prisma.debt.findUnique({ where: { id: debtId } })
    if (!debt) {
      return NextResponse.json({ error: 'Deuda no encontrada' }, { status: 404 })
    }

    const remaining = debt.amount - debt.paidAmount
    if (paymentType === 'total' && amount < remaining) {
      return NextResponse.json({
        error: `Pago total requiere cubrir el saldo restante ($${remaining.toFixed(2)})`,
      }, { status: 400 })
    }
    if (amount > remaining + 0.01) {
      return NextResponse.json({
        error: `El pago ($${amount.toFixed(2)}) supera el saldo pendiente ($${remaining.toFixed(2)})`,
      }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.debtPayment.create({
        data: {
          debtId,
          amount,
          notes: notes || (paymentType === 'total' ? 'Pago total' : 'Pago parcial'),
          type: paymentType,
        },
      })

      const newPaidAmount = debt.paidAmount + amount
      await tx.debt.update({
        where: { id: debtId },
        data: {
          paidAmount: newPaidAmount,
          isActive: newPaidAmount >= debt.amount - 0.01,
        },
      })

      return payment
    })

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entity: 'debt',
      entityId: result.id,
      entityName: `Pago ${result.id.slice(0, 8)}`,
      details: { amount: result.amount, type: result.type, debtId: result.debtId },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Payment POST error:', error)
    return NextResponse.json({
      error: 'Error al registrar pago',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
