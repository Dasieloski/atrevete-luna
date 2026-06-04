'use client'

import { useAuthStore } from '@/stores/authStore'
import type { AppModule, PermissionAction } from '@/lib/permissions'

interface PermissionGuardProps {
  module: AppModule
  action?: PermissionAction
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Componente que oculta su contenido si el usuario no tiene permiso.
 *
 * Uso:
 * <PermissionGuard module="ventas" action="create">
 *   <Button>Crear venta</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  module,
  action = 'view',
  children,
  fallback = null,
}: PermissionGuardProps) {
  const hasPermission = useAuthStore((state) => state.hasPermission)

  if (!hasPermission(module, action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Hook para verificar permisos desde cualquier componente cliente.
 */
export function usePermission() {
  return useAuthStore((state) => state.hasPermission)
}
