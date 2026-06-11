import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  console.log('Searching for duplicate debt payments (same date + usdAmount + boxes)...')

  const allPayments = await prisma.debtPayment.findMany({
    orderBy: { date: 'asc' },
  })

  console.log(`Total payments: ${allPayments.length}`)

  // Agrupar por fecha (día) + usdAmount + boxes + currency
  // Esto detecta el bug del split donde el mismo usdAmount/boxes se duplica
  const groups = new Map<string, typeof allPayments>()
  for (const p of allPayments) {
    const key = `${p.date.toISOString().split('T')[0]}|${p.usdAmount}|${p.boxes}|${p.currency}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  for (const [key, payments] of groups) {
    if (payments.length <= 1) {
      console.log(`  OK: ${key} -> ${payments.length} payment(s)`)
      continue
    }
    console.log(`  DUP: ${key} -> ${payments.length} payments`)

    // Hay duplicados. Calcular el total real.
    const totalAmount = payments.reduce((s, p) => s + p.amount, 0)
    const first = payments[0]

    // 1. Revertir los paidAmount de cada debt
    for (const p of payments) {
      if (p.debtId) {
        const debt = await prisma.debt.findUnique({ where: { id: p.debtId } })
        if (debt) {
          const newPaid = +(debt.paidAmount - p.amount).toFixed(2)
          await prisma.debt.update({
            where: { id: p.debtId },
            data: {
              paidAmount: Math.max(0, newPaid),
              isActive: newPaid < debt.amount - 0.01,
            },
          })
          console.log(`    Reverted debt ${p.debtId.slice(0, 8)}: paidAmount ${debt.paidAmount} -> ${Math.max(0, newPaid)}`)
        }
      }
    }

    // 2. Eliminar todos los pagos duplicados
    for (const p of payments) {
      await prisma.debtPayment.delete({ where: { id: p.id } })
      console.log(`    Deleted payment ${p.id.slice(0, 8)}`)
    }

    // 3. Crear un solo pago unificado
    const unified = await prisma.debtPayment.create({
      data: {
        amount: totalAmount,
        currency: first.currency,
        usdAmount: first.usdAmount,
        cupAmount: first.cupAmount,
        boxes: first.boxes,
        exchangeRate: first.exchangeRate,
        date: first.date,
        notes: first.notes?.replace(/\(a cuenta\)/g, '').trim() || 'Pago a cuenta',
        type: 'account',
      },
    })
    console.log(`    Created unified payment ${unified.id.slice(0, 8)}: amount=${totalAmount} usd=${first.usdAmount} boxes=${first.boxes}`)

    // 4. Re-aplicar el pago total a los debts originales
    let remaining = totalAmount
    const pendingDebts = await prisma.debt.findMany({
      where: { isActive: true },
      orderBy: { date: 'asc' },
    })
    for (const debt of pendingDebts) {
      if (remaining <= 0) break
      const debtRemaining = +(debt.amount - debt.paidAmount).toFixed(2)
      if (debtRemaining <= 0) continue
      const apply = Math.min(remaining, debtRemaining)
      const newPaid = +(debt.paidAmount + apply).toFixed(2)
      await prisma.debt.update({
        where: { id: debt.id },
        data: {
          paidAmount: newPaid,
          isActive: newPaid < debt.amount - 0.01,
        },
      })
      console.log(`    Re-applied ${apply} to debt ${debt.id.slice(0, 8)}: paidAmount -> ${newPaid}`)
      remaining = +(remaining - apply).toFixed(2)
    }
  }

  console.log('\nDone.')
  await prisma.$disconnect()
}

main().catch((e) => { console.error('Error:', e); process.exit(1) })
