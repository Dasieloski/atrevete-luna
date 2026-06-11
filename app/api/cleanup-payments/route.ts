import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/apiGuard'

export async function POST(request: Request) {
  const { error, user } = await requirePermission(request, 'deudas', 'delete')
  if (error) return error

  try {
    // Buscar todos los DebtPayment ordenados por fecha
    const allPayments = await prisma.debtPayment.findMany({
      orderBy: { date: 'asc' },
    })

    // Agrupar por fecha (día) + usdAmount + boxes + currency + type
    const groups = new Map<string, typeof allPayments>()
    for (const p of allPayments) {
      const key = `${p.date.toISOString().split('T')[0]}|${p.usdAmount}|${p.boxes}|${p.currency}|${p.type}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    }

    const deleted: string[] = []
    const kept: string[] = []

    for (const [key, payments] of groups) {
      if (payments.length <= 1) continue

      // Si hay múltiples pagos con los mismos valores, son duplicados
      // Mantener el primero (más antiguo), eliminar el resto
      const [first, ...rest] = payments
      kept.push(first.id)

      for (const dup of rest) {
        await prisma.debtPayment.delete({ where: { id: dup.id } })
        deleted.push(dup.id)
      }
    }

    return NextResponse.json({
      success: true,
      totalChecked: allPayments.length,
      duplicatesFound: deleted.length,
      deletedIds: deleted,
      keptIds: kept,
      message: deleted.length > 0
        ? `Se eliminaron ${deleted.length} pagos duplicados. Se mantuvieron ${kept.length} registros originales.`
        : 'No se encontraron pagos duplicados.',
    })
  } catch (err) {
    console.error('Cleanup error:', err)
    return NextResponse.json(
      { error: 'Error al limpiar duplicados', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    )
  }
}
