import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import { generateBackupZip } from '@/lib/backup'
import { logAudit } from '@/lib/audit'

export async function POST() {
  try {
    const user = await getUserFromSession()
    if (!user || !user.role.isSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { buffer, filename } = await generateBackupZip(user.name)

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entity: 'user',
      entityName: 'Backup',
      details: { type: 'backup_generate', filename },
      ipAddress: 'server',
    })

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
