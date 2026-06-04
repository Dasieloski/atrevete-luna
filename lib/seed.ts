import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { APP_MODULES } from './permissions'

export async function seedSuperAdmin() {
  const existingRole = await prisma.role.findFirst({
    where: { isSuperAdmin: true },
  })

  if (existingRole) {
    console.log('SuperAdmin role already exists')
    return
  }

  // Crear rol de SuperAdmin
  const superAdminRole = await prisma.role.create({
    data: {
      name: 'SuperAdmin',
      description: 'Acceso total a todas las funciones del sistema',
      isSuperAdmin: true,
    },
  })

  // Crear rol de Admin por defecto (sin permisos aún)
  const adminRole = await prisma.role.create({
    data: {
      name: 'Admin',
      description: 'Administrador por defecto',
      permissions: {
        create: APP_MODULES.map((module) => ({
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

  console.log('SuperAdmin and default roles seeded successfully!')
}
