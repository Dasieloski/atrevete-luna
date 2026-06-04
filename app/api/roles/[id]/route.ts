import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

// PUT /api/roles/:id - Actualizar un rol
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
    const { name, description, permissions } = await request.json()

    // Primero eliminamos los permisos existentes
    await prisma.permission.deleteMany({
      where: { roleId: id },
    })

    // Luego actualizamos el rol y creamos los nuevos permisos
    const role = await prisma.role.update({
      where: { id },
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

    return NextResponse.json({ role })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// DELETE /api/roles/:id - Eliminar un rol
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

    // Verificar que no haya usuarios con este rol
    const usersWithRole = await prisma.user.count({
      where: { roleId: id },
    })

    if (usersWithRole > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un rol que tiene usuarios asignados' },
        { status: 400 }
      )
    }

    await prisma.role.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
