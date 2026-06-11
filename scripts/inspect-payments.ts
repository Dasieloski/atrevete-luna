import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const allPayments = await prisma.debtPayment.findMany({
    orderBy: { date: 'asc' },
  })
  console.log(`Total payments: ${allPayments.length}`)
  for (const p of allPayments) {
    console.log(JSON.stringify({
      id: p.id,
      date: p.date.toISOString(),
      amount: p.amount,
      usdAmount: p.usdAmount,
      cupAmount: p.cupAmount,
      boxes: p.boxes,
      currency: p.currency,
      type: p.type,
      debtId: p.debtId,
      notes: p.notes,
    }, null, 2))
  }
  await prisma.$disconnect()
}

main().catch((e) => { console.error('Error:', e); process.exit(1) })
