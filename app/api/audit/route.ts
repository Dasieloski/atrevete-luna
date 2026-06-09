import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import { getAuditLogs } from '@/lib/audit'

export async function GET(request: Request) {
  try {
    const user = await getUserFromSession()
    if (!user || !user.role.isSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || undefined
    const entity = searchParams.get('entity') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const { logs, total } = await getAuditLogs({
      action: action as any,
      entity: entity as any,
      limit,
      offset,
    })

    return NextResponse.json({ logs, total })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
