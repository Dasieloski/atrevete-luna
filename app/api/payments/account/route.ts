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
    const paymentsCreated: Array<{
      id: string
      debtId: string
      amount: number
      type: string
    }> = []

    for (const debt of pendingDebts) {
      if (remainingAmount <= 0) break

      const debtRemaining = +(debt.amount - debt.paidAmount).toFixed(2)
      if (debtRemaining <= 0) continue

      const paymentAmount = Math.min(remainingAmount, debtRemaining)
      const isTotal = paymentAmount >= debtRemaining - 0.01
      const newPaidAmount = +(debt.paidAmount + paymentAmount).toFixed(2)

      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.debtPayment.create({
          data: {
            debtId: debt.id,
            amount: paymentAmount,
            currency: paymentCurrency,
            usdAmount: usdAmount ?? (paymentCurrency === 'USD' ? paymentAmount : null),
            cupAmount: cupAmount ?? (paymentCurrency === 'CUP' ? paymentAmount : null),
            boxes: boxes ?? null,
            exchangeRate: exchangeRate ?? null,
            date: new Date(date),
            notes: notes || (isTotal ? 'Pago total (a cuenta)' : 'Pago parcial (a cuenta)'),
            type: isTotal ? 'total' : 'partial',
          },
        })

        await tx.debt.update({
          where: { id: debt.id },
          data: {
            paidAmount: newPaidAmount,
            isActive: newPaidAmount < debt.amount - 0.01,
          },
        })

        return payment
      })

      paymentsCreated.push({
        id: result.id,
        debtId: debt.id,
        amount: paymentAmount,
        type: isTotal ? 'total' : 'partial',
      })

      remainingAmount = +(remainingAmount - paymentAmount).toFixed(2)
    }

    const totalApplied = +(amount - remainingAmount).toFixed(2)

    return NextResponse.json({
      payments: paymentsCreated,
      totalApplied,
      remainingUnapplied: remainingAmount,
      debtsPaid: paymentsCreated.length,
      message:
        remainingAmount > 0
          ? `Se aplicaron $${totalApplied.toFixed(2)} a ${paymentsCreated.length} deuda(s). Sobran $${remainingAmount.toFixed(2)} sin deuda que cubrir.`
          : `Se aplicaron $${totalApplied.toFixed(2)} a ${paymentsCreated.length} deuda(s).`,
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
