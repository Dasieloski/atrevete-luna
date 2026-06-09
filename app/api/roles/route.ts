import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET /api/roles - Obtener todos los roles
export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user || !user.role.isSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: { users: true },
        },
      },
    })

    return NextResponse.json({ roles })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST /api/roles - Crear un nuevo rol
export async function POST(request: Request) {
  try {
    const user = await getUserFromSession()
    if (!user || !user.role.isSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { name, description, permissions } = await request.json()

    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: {
          create: permissions.map((p: any) => ({
            module: p.module,
            view: p.view,
            create: p.create,
            edit: p.edit,
            delete: p.delete,
          })),
        },
      },
      include: {
        permissions: true,
      },
    })

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entity: 'role',
      entityId: role.id,
      entityName: role.name,
      details: {
        name: role.name,
        description: role.description,
      },
    })

    return NextResponse.json({ role })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
