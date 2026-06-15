import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import { restoreBackup, validateBackup } from '@/lib/backup'
import { logAudit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const user = await getUserFromSession()
    if (!user || !user.role.isSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'El archivo debe tener extensión .zip' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const validation = await validateBackup(buffer)
    if (!validation.valid || !validation.preview) {
      return NextResponse.json(
        { error: validation.error || 'El archivo de backup no es válido' },
        { status: 400 }
      )
    }

    const result = await restoreBackup(buffer)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error durante la restauración' },
        { status: 500 }
      )
    }

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entity: 'user',
      entityName: 'Restauración',
      details: {
        type: 'backup_restore',
        tables: result.restoredTables,
        totalRecords: result.totalRecords,
        backupDate: validation.preview.metadata.createdAt,
      },
      ipAddress: 'server',
    })

    return NextResponse.json({
      success: true,
      restoredTables: result.restoredTables,
      totalRecords: result.totalRecords,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
