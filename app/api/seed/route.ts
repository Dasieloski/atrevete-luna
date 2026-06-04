import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const APP_MODULES_LIST = [
  'dashboard', 'ventas', 'productos', 'almacen', 'produccion',
  'clientes', 'deudas', 'gastos', 'marketing', 'estadisticas',
  'configuracion', 'roles', 'usuarios'
]

/**
 * Endpoint de setup inicial.
 * Crea el superadmin por defecto SOLO si no existe.
 * Útil para el primer deploy en Vercel.
 *
 * Uso: POST /api/seed (sin autenticación, idempotente)
 */
export async function POST() {
  try {
    const existingRole = await prisma.role.findFirst({
      where: { isSuperAdmin: true },
    })

    if (existingRole) {
      return NextResponse.json({
        success: false,
        message: 'El superadmin ya existe. No se hizo nada.',
      })
    }

    // Crear rol de SuperAdmin
    const superAdminRole = await prisma.role.create({
      data: {
        name: 'SuperAdmin',
        description: 'Acceso total a todas las funciones del sistema',
        isSuperAdmin: true,
      },
    })

    // Crear rol de Admin por defecto con todos los permisos
    await prisma.role.create({
      data: {
        name: 'Admin',
        description: 'Administrador con permisos completos',
        permissions: {
          create: APP_MODULES_LIST.map((module) => ({
            module,
            view: true,
            create: true,
            edit: true,
            delete: true,
          })),
        },
      },
    })

    // Crear usuario superadmin por defecto
    const hashedPassword = await bcrypt.hash('admin123', 10)

    await prisma.user.create({
      data: {
        email: 'admin@atrevete.com',
        password: hashedPassword,
        name: 'Super Administrador',
        roleId: superAdminRole.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'SuperAdmin creado correctamente. Email: admin@atrevete.com / Contraseña: admin123',
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({
      error: 'Error ejecutando el seed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
