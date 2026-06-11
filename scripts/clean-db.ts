import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function cleanDatabase() {
  console.log('Iniciando limpieza de base de datos...')
  console.log('Manteniendo: Users, Products, Roles, Permissions, Customers')
  console.log('Eliminando todo lo demás...\n')

  console.log('Eliminando DebtPayment...')
  await prisma.debtPayment.deleteMany()

  console.log('Eliminando Debt...')
  await prisma.debt.deleteMany()

  console.log('Eliminando Sale...')
  await prisma.sale.deleteMany()

  console.log('Eliminando Transfer...')
  await prisma.transfer.deleteMany()

  console.log('Eliminando Production...')
  await prisma.production.deleteMany()

  console.log('Eliminando WarehouseStock...')
  await prisma.warehouseStock.deleteMany()

  console.log('Eliminando Waste...')
  await prisma.waste.deleteMany()

  console.log('Eliminando Reservation...')
  await prisma.reservation.deleteMany()

  console.log('Eliminando Payment...')
  await prisma.payment.deleteMany()

  console.log('Eliminando Marketing...')
  await prisma.marketing.deleteMany()

  console.log('Eliminando Expense...')
  await prisma.expense.deleteMany()

  console.log('Eliminando Event...')
  await prisma.event.deleteMany()

  console.log('Eliminando AuditLog...')
  await prisma.auditLog.deleteMany()

  console.log('Eliminando SystemConfig...')
  await prisma.systemConfig.deleteMany()

  console.log('\n✅ Limpieza completada exitosamente!')
  console.log('Datos mantenidos:')
  const users = await prisma.user.count()
  const products = await prisma.product.count()
  const roles = await prisma.role.count()
  const permissions = await prisma.permission.count()
  const customers = await prisma.customer.count()
  console.log(`  - Users: ${users}`)
  console.log(`  - Products: ${products}`)
  console.log(`  - Roles: ${roles}`)
  console.log(`  - Permissions: ${permissions}`)
  console.log(`  - Customers: ${customers}`)
}

cleanDatabase()
  .then(() => {
    console.log('\nScript finalizado.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ Error:', err)
    process.exit(1)
  })
