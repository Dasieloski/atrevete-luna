import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET /api/users - Listar usuarios
export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user || !user.role.isSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const users = await prisma.user.findUnique({
      where: { id: user.id },
    })
    // Traemos todos los usuarios
    const allUsers = await prisma.user.findMany({
      include: {
        role: {
          select: {
            id: true,
            name: true,
            isSuperAdmin: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Remover la contraseña de la respuesta
    const safeUsers = allUsers.map(({ password, ...u }) => u)

    return NextResponse.json({ users: safeUsers })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST /api/users - Crear usuario
export async function POST(request: Request) {
  try {
    const user = await getUserFromSession()
    if (!user || !user.role.isSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { email, password, name, roleId } = await request.json()

    if (!email || !password || !name || !roleId) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        roleId,
      },
      include: { role: { select: { id: true, name: true, isSuperAdmin: true } } },
    })

    const { password: _, ...safeUser } = newUser

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'create',
      entity: 'user',
      entityId: safeUser.id,
      entityName: safeUser.name,
      details: { email: safeUser.email, role: safeUser.role.name },
    })

    return NextResponse.json({ user: safeUser })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
