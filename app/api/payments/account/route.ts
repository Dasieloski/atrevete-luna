import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'

export async function POST(request: Request) {
  const { error } = await requirePermission(request, 'deudas', 'create')
  if (error) return error

  try {
    const body = await request.json()
    const { amount, date, notes, currency, usdAmount, cupAmount, boxes, exchangeRate } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Monto requerido y mayor que cero' },
        { status: 400 }
      )
    }

    const paymentCurrency = currency === 'CUP' ? 'CUP' : 'USD'

    // Todas las deudas pendientes, ordenadas por fecha (más antiguas primero)
    const pendingDebts = await prisma.debt.findMany({
      where: { isActive: true },
      orderBy: { date: 'asc' },
    })

    if (pendingDebts.length === 0) {
      return NextResponse.json(
        { error: 'No hay deudas pendientes' },
        { status: 400 }
      )
    }

    let remainingAmount = +amount
    const debtsToUpdate: Array<{ id: string; newPaidAmount: number; amount: number }> = []

    for (const debt of pendingDebts) {
      if (remainingAmount <= 0) break

      const debtRemaining = +(debt.amount - debt.paidAmount).toFixed(2)
      if (debtRemaining <= 0) continue

      const paymentAmount = Math.min(remainingAmount, debtRemaining)
      const newPaidAmount = +(debt.paidAmount + paymentAmount).toFixed(2)

      debtsToUpdate.push({ id: debt.id, newPaidAmount, amount: debt.amount })
      remainingAmount = +(remainingAmount - paymentAmount).toFixed(2)
    }

    const totalApplied = +(amount - remainingAmount).toFixed(2)

    if (totalApplied <= 0) {
      return NextResponse.json(
        { error: 'No hay deuda que cubrir' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Crear UN SOLO DebtPayment para el pago total (sin debtId — es un pago a cuenta global)
      const payment = await tx.debtPayment.create({
        data: {
          amount: totalApplied,
          currency: paymentCurrency,
          usdAmount: usdAmount ?? (paymentCurrency === 'USD' ? totalApplied : null),
          cupAmount: cupAmount ?? (paymentCurrency === 'CUP' ? totalApplied : null),
          boxes: boxes ?? null,
          exchangeRate: exchangeRate ?? null,
          date: new Date(date),
          notes: notes || 'Pago a cuenta',
          type: 'account',
        },
      })

      // Actualizar los paidAmount de los debts individuales
      for (const d of debtsToUpdate) {
        await tx.debt.update({
          where: { id: d.id },
          data: {
            paidAmount: d.newPaidAmount,
            isActive: d.newPaidAmount < d.amount - 0.01,
          },
        })
      }

      return payment
    })

    return NextResponse.json({
      payment: result,
      totalApplied,
      remainingUnapplied: remainingAmount,
      debtsPaid: debtsToUpdate.length,
      message:
        remainingAmount > 0
          ? `Se aplicaron $${totalApplied.toFixed(2)} a ${debtsToUpdate.length} deuda(s). Sobran $${remainingAmount.toFixed(2)} sin deuda que cubrir.`
          : `Se aplicaron $${totalApplied.toFixed(2)} a ${debtsToUpdate.length} deuda(s).`,
    })
  } catch (err) {
    console.error('Account payment error:', err)
    return NextResponse.json(
      {
        error: 'Error al registrar pago',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
