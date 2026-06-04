import { redirect } from 'next/navigation'
import { getUserFromSession } from '@/lib/auth'
import type { AppModule } from '@/lib/permissions'
import {
  DashboardShell,
  type NavItem,
  type NavSection,
} from '@/src/components/dashboard/DashboardShell'
import { LogoutAction } from '@/src/components/dashboard/LogoutAction'

type IconName =
  | 'dashboard'
  | 'produccion'
  | 'almacen'
  | 'ventas'
  | 'productos'
  | 'clientes'
  | 'gastos'
  | 'deudas'
  | 'estadisticas'
  | 'configuracion'
  | 'roles'
  | 'usuarios'

const navSections: { title: string; items: Array<Omit<NavItem, 'icon' | 'module'> & { icon: IconName; module: AppModule }> }[] = [
  {
    title: 'Resumen',
    items: [
      { href: '/', label: 'Tablero', icon: 'dashboard', hint: 'Vista general', module: 'dashboard' },
    ],
  },
  {
    title: 'Cadena de Suministro',
    items: [
      { href: '/produccion', label: 'Producción', icon: 'produccion', hint: '1. Registrar fabricación', module: 'produccion' },
      { href: '/almacen', label: 'Almacén', icon: 'almacen', hint: '2. Mover al almacén', module: 'almacen' },
      { href: '/ventas', label: 'Distribución', icon: 'ventas', hint: '3. Vender a clientes', module: 'ventas' },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { href: '/productos', label: 'Productos', icon: 'productos', hint: 'Catálogo y precios', module: 'productos' },
      { href: '/clientes', label: 'Clientes', icon: 'clientes', hint: 'Base de clientes', module: 'clientes' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { href: '/gastos', label: 'Gastos y Eventos', icon: 'gastos', module: 'gastos' },
      { href: '/deudas', label: 'Control de Deudas', icon: 'deudas', module: 'deudas' },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { href: '/estadisticas', label: 'Estadísticas', icon: 'estadisticas', module: 'estadisticas' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { href: '/configuracion', label: 'Configuración', icon: 'configuracion', module: 'configuracion' },
      { href: '/configuracion/roles', label: 'Roles y Permisos', icon: 'roles', module: 'roles' },
      { href: '/configuracion/usuarios', label: 'Usuarios', icon: 'usuarios', module: 'usuarios' },
    ],
  },
]

function hasModulePermission(
  isSuperAdmin: boolean,
  permissions: { module: string; view: boolean }[],
  module: AppModule
) {
  if (isSuperAdmin) return true
  const perm = permissions.find((p) => p.module === module)
  return perm?.view ?? false
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserFromSession()

  if (!user) redirect('/login')

  const filteredSections: NavSection[] = navSections
    .map((section) => ({
      title: section.title,
      items: section.items
        .filter((item) =>
          hasModulePermission(user.role.isSuperAdmin, user.role.permissions, item.module)
        )
        .map(({ icon, ...rest }) => ({ ...rest, icon })),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <DashboardShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.isSuperAdmin ? 'Super Administrador' : user.role.name,
      }}
      sections={filteredSections}
      logoutAction={<LogoutAction />}
    >
      {children}
    </DashboardShell>
  )
}
