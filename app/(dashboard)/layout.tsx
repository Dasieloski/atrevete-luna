import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUserFromSession } from '@/lib/auth'
import {
  LayoutDashboard,
  Factory,
  Warehouse,
  Package,
  Users,
  BarChart3,
  DollarSign,
  CreditCard,
  Settings,
  LogOut,
  ShoppingCart,
  Shield,
  UserCog,
} from 'lucide-react'
import type { AppModule } from '@/lib/permissions'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  hint?: string
  module: AppModule
}
type NavSection = { title: string; items: NavItem[] }

const navSections: NavSection[] = [
  {
    title: 'Resumen',
    items: [
      { href: '/', label: 'Tablero', icon: LayoutDashboard, hint: 'Vista general', module: 'dashboard' },
    ],
  },
  {
    title: 'Cadena de Suministro',
    items: [
      { href: '/produccion', label: 'Producción', icon: Factory, hint: '1. Registrar fabricación', module: 'produccion' },
      { href: '/almacen', label: 'Almacén', icon: Warehouse, hint: '2. Mover al almacén', module: 'almacen' },
      { href: '/ventas', label: 'Distribución', icon: ShoppingCart, hint: '3. Vender a clientes', module: 'ventas' },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { href: '/productos', label: 'Productos', icon: Package, hint: 'Catálogo y precios', module: 'productos' },
      { href: '/clientes', label: 'Clientes', icon: Users, hint: 'Base de clientes', module: 'clientes' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { href: '/gastos', label: 'Gastos y Eventos', icon: DollarSign, module: 'gastos' },
      { href: '/deudas', label: 'Control de Deudas', icon: CreditCard, module: 'deudas' },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { href: '/estadisticas', label: 'Estadísticas', icon: BarChart3, module: 'estadisticas' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { href: '/configuracion', label: 'Configuración', icon: Settings, module: 'configuracion' },
      { href: '/configuracion/roles', label: 'Roles y Permisos', icon: Shield, module: 'roles' },
      { href: '/configuracion/usuarios', label: 'Usuarios', icon: UserCog, module: 'usuarios' },
    ],
  },
]

async function LogoutButton() {
  'use server'
  const { cookies } = await import('next/headers')
  ;(await cookies()).delete('token')
  redirect('/login')
}

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

  // Filtrar secciones y items según los permisos del usuario
  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        hasModulePermission(user.role.isSuperAdmin, user.role.permissions, item.module)
      ),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="w-64 bg-surface-card border-r border-hairline flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-hairline">
          <h1 className="text-xl font-bold text-ink">Atrevete Luna</h1>
          <p className="text-sm text-muted mt-1">{user.name}</p>
          <p className="text-xs text-muted-soft mt-0.5">
            {user.role.isSuperAdmin ? 'Super Administrador' : user.role.name}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
          {filteredSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <h3 className="px-3 text-2xs font-bold text-muted uppercase tracking-wider">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-start gap-3 px-3 py-2 rounded-lg text-sm text-body hover:bg-surface-soft transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-muted mt-0.5 shrink-0 group-hover:text-ink" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium leading-tight">{item.label}</div>
                      {item.hint && (
                        <div className="text-2xs text-muted-soft mt-0.5 leading-tight">
                          {item.hint}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-hairline">
          <form action={LogoutButton}>
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-error hover:bg-surface-soft transition-colors w-full"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Cerrar Sesion</span>
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
