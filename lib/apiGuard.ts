import { NextResponse } from 'next/server'
import { getUserFromSession } from './auth'
import type { AppModule, PermissionAction } from './permissions'

/**
 * Helper para proteger rutas de API según permisos.
 *
 * Uso en una API route:
 * ```ts
 * export async function POST(request: Request) {
 *   const { error } = await requirePermission(request, 'ventas', 'create')
 *   if (error) return error
 *
 *   // ... lógica de la API
 * }
 * ```
 */
export async function requirePermission(
  request: Request,
  module: AppModule,
  action: PermissionAction
): Promise<{ error: NextResponse | null; user: any }> {
  const user = await getUserFromSession()
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    }
  }

  if (user.role.isSuperAdmin) {
    return { user, error: null }
  }

  const permission = user.role.permissions.find((p) => p.module === module)
  if (!permission || !permission[action]) {
    return {
      user,
      error: NextResponse.json(
        { error: 'No tienes permiso para realizar esta acción' },
        { status: 403 }
      ),
    }
  }

  return { user, error: null }
}
