import 'dotenv/config'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

const APP_MODULES_LIST = [
  'dashboard', 'ventas', 'productos', 'almacen', 'produccion',
  'clientes', 'deudas', 'gastos', 'marketing', 'estadisticas',
  'configuracion', 'roles', 'usuarios'
]

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL)

  const existingRole = await prisma.role.findFirst({
    where: { isSuperAdmin: true },
  })

  if (existingRole) {
    console.log(' SuperAdmin role already exists')
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

  // Crear rol de Admin por defecto
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

  console.log(' Seed applied successfully!')
  console.log('User: admin@atrevete.com')
  console.log('Password: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
