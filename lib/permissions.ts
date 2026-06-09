// Listado de todos los módulos de la aplicación
export const APP_MODULES = [
  'dashboard',
  'ventas',
  'productos',
  'almacen',
  'produccion',
  'clientes',
  'deudas',
  'gastos',
  'marketing',
  'estadisticas',
  'configuracion',
  'roles',
  'usuarios',
  'auditoria',
] as const;

export type AppModule = (typeof APP_MODULES)[number];
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface PermissionData {
  module: AppModule;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

// Helper para verificar si un usuario tiene permiso para una acción y módulo específicos
export function checkPermission(
  permissions: PermissionData[],
  module: AppModule,
  action: PermissionAction
): boolean {
  const permission = permissions.find((p) => p.module === module);
  if (!permission) return false;
  return permission[action];
}
