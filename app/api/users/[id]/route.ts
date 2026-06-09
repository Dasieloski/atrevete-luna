import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// PUT /api/users/:id - Actualizar usuario
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession()
    if (!user || !user.role.isSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const { email, password, name, roleId } = await request.json()

    // PROTECCIÓN: No permitir que un superadmin se quite a sí mismo el rol de superadmin
    if (id === user.id) {
      const currentUser = await prisma.user.findUnique({
        where: { id },
        include: { role: true },
      })
      if (currentUser?.role.isSuperAdmin && roleId !== currentUser.roleId) {
        return NextResponse.json(
          { error: 'No puedes cambiar tu propio rol de superadministrador' },
          { status: 400 }
        )
      }
    }

    // PROTECCIÓN: No permitir degradar al último superadmin del sistema
    if (roleId) {
      const targetUser = await prisma.user.findUnique({
        where: { id },
        include: { role: true },
      })
      if (targetUser?.role.isSuperAdmin && targetUser.roleId !== roleId) {
        const newRole = await prisma.role.findUnique({ where: { id: roleId } })
        if (!newRole?.isSuperAdmin) {
          const superAdminCount = await prisma.user.count({
            where: { role: { isSuperAdmin: true } },
          })
          if (superAdminCount <= 1) {
            return NextResponse.json(
              { error: 'No puedes degradar al único superadministrador del sistema' },
              { status: 400 }
            )
          }
        }
      }
    }

    const data: { email: string; name: string; roleId: string; password?: string } = {
      email,
      name,
      roleId,
    }
    if (password && password.length > 0) {
      data.password = await bcrypt.hash(password, 10)
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      include: { role: { select: { id: true, name: true, isSuperAdmin: true } } },
    })

    const { password: _, ...safeUser } = updated

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'edit',
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

// DELETE /api/users/:id - Eliminar usuario
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession()
    if (!user || !user.role.isSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params

    // No permitir eliminarse a sí mismo
    if (id === user.id) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propio usuario' },
        { status: 400 }
      )
    }

    // PROTECCIÓN: No permitir eliminar al último superadmin
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    })
    if (targetUser?.role.isSuperAdmin) {
      const superAdminCount = await prisma.user.count({
        where: { role: { isSuperAdmin: true } },
      })
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: 'No puedes eliminar al único superadministrador del sistema' },
          { status: 400 }
        )
      }
    }

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'delete',
      entity: 'user',
      entityId: id,
      entityName: targetUser?.name || id,
    })

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
