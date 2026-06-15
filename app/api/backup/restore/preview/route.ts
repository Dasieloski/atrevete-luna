import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import { validateBackup } from '@/lib/backup'

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

    const result = await validateBackup(buffer)

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ preview: result.preview })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
