import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { verifyToken } from './auth.edge'
import type { PermissionData } from './permissions'

export { createToken, verifyToken } from './auth.edge'

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  return verifyToken(token)
}

// Obtiene el usuario completo con su rol y permisos
export async function getUserFromSession() {
  const userId = await getSession()
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: true,
        },
      },
    },
  })

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: {
      id: user.role.id,
      name: user.role.name,
      isSuperAdmin: user.role.isSuperAdmin,
      permissions: user.role.permissions.map((p) => ({
        module: p.module,
        view: p.view,
        create: p.create,
        edit: p.edit,
        delete: p.delete,
      })) as PermissionData[],
    },
  }
}
