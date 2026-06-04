'use client'

import { useEffect, useState, type ReactNode, type ComponentType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import {
  Menu,
  X,
  ChevronRight,
  LayoutDashboard,
  Factory,
  Warehouse,
  Package,
  Users,
  BarChart3,
  DollarSign,
  CreditCard,
  Settings,
  ShoppingCart,
  Shield,
  UserCog,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { useTheme, type Theme } from '@/src/lib/theme'

export type NavIconName =
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

const ICONS: Record<NavIconName, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  produccion: Factory,
  almacen: Warehouse,
  ventas: ShoppingCart,
  productos: Package,
  clientes: Users,
  gastos: DollarSign,
  deudas: CreditCard,
  estadisticas: BarChart3,
  configuracion: Settings,
  roles: Shield,
  usuarios: UserCog,
}

export type NavItem = {
  href: string
  label: string
  icon: NavIconName
  hint?: string
  module: string
}

export type NavSection = { title: string; items: NavItem[] }

export type DashboardUser = {
  id: string
  name: string
  email: string
  role: string
}

type Props = {
  user: DashboardUser
  sections: NavSection[]
  children: ReactNode
  logoutAction: ReactNode
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  onNavigate?: () => void
}) {
  const Icon = ICONS[item.icon]
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'group relative flex min-w-0 items-center gap-2.5 rounded-pill px-3 py-2.5 text-sm font-medium transition-colors duration-[var(--dur-base)] ease-[var(--ease-miro)]',
        active
          ? 'bg-primary text-on-primary'
          : 'text-charcoal hover:bg-surface hover:text-ink'
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          active ? 'text-canary' : 'text-steel group-hover:text-ink'
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate leading-tight">{item.label}</div>
        {item.hint && (
          <div
            className={cn(
              'truncate text-[11px] font-normal leading-tight',
              active ? 'text-on-dark-muted' : 'text-stone'
            )}
          >
            {item.hint}
          </div>
        )}
      </div>
      {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-canary" />}
    </Link>
  )
}

function Brand() {
  return (
    <Link
      href="/"
      className="flex min-w-0 items-center gap-2.5 group"
      aria-label="Atrévete Luna — Inicio"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
        style={{
          background: 'var(--brand-bg)',
          color: 'var(--brand-fg)',
        }}
      >
        <span className="text-[15px] font-semibold leading-none tracking-[-0.5px]">
          AL
        </span>
      </div>
      <div className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-[15px] font-semibold tracking-[-0.3px] text-ink">
          Atrévete Luna
        </span>
        <span className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-stone">
          Gestión
        </span>
      </div>
    </Link>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const options: Array<{
    value: Theme
    icon: ComponentType<{ className?: string }>
    label: string
  }> = [
    { value: 'light', icon: Sun, label: 'Claro' },
    { value: 'system', icon: Monitor, label: 'Sistema' },
    { value: 'dark', icon: Moon, label: 'Oscuro' },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="flex w-full min-w-0 items-center gap-1 rounded-pill bg-surface p-1"
    >
      {options.map(({ value, icon: Icon, label }) => {
        const active = mounted ? theme === value : value === 'system'
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-pill px-1.5 py-1.5 text-[11px] font-medium transition-colors duration-[var(--dur-base)] ease-[var(--ease-miro)]',
              active
                ? 'bg-canvas text-ink shadow-[0_1px_2px_0_rgba(5,0,56,0.06)]'
                : 'text-steel hover:text-ink'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden truncate xl:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

function UserBlock({
  user,
  logoutAction,
}: {
  user: DashboardUser
  logoutAction: ReactNode
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="flex w-full min-w-0 items-center gap-3 rounded-md px-2 py-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{ background: 'var(--color-canary)', color: 'var(--color-primary)' }}
        >
          {user.name
            .split(' ')
            .slice(0, 2)
            .map((p) => p[0])
            .join('')
            .toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-medium text-ink">
            {user.name}
          </div>
          <div className="truncate text-[11px] text-slate">{user.role}</div>
        </div>
      </div>
      <ThemeToggle />
      {logoutAction}
    </div>
  )
}

function SidebarContent({
  user,
  sections,
  pathname,
  onNavigate,
  logoutAction,
  header,
}: {
  user: DashboardUser
  sections: NavSection[]
  pathname: string
  onNavigate?: () => void
  logoutAction: ReactNode
  header?: ReactNode
}) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      {header}

      <nav className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
        {sections.map((section, idx) => (
          <div key={section.title} className={cn(idx > 0 && 'mt-7')}>
            <h3 className="mb-2 truncate px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone">
              {section.title}
            </h3>
            <div className="min-w-0 space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-hairline p-4">
        <UserBlock user={user} logoutAction={logoutAction} />
      </div>
    </div>
  )
}

export function DashboardShell({
  user,
  sections,
  children,
  logoutAction,
}: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { resolved } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.style.colorScheme = resolved
  }, [resolved, mounted])

  return (
    <div className="min-h-screen bg-canvas">
      {/* Mobile top bar */}
      <header
        className={cn(
          'sticky top-0 z-40 lg:hidden',
          'border-b border-hairline',
          scrolled ? 'backdrop-blur' : 'bg-canvas'
        )}
        style={{
          backgroundColor: scrolled
            ? 'var(--bg-frost-strong)'
            : 'var(--color-canvas)',
        }}
      >
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <Brand />
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setOpen(true)}
            className="ts-btn-icon-circular shrink-0"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden w-[272px] overflow-hidden lg:flex',
          'border-r border-hairline-soft bg-canvas'
        )}
      >
        <SidebarContent
          user={user}
          sections={sections}
          pathname={pathname}
          logoutAction={logoutAction}
          header={
            <div className="flex h-[68px] min-w-0 items-center border-b border-hairline-soft px-5">
              <Brand />
            </div>
          }
        />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-[rgba(5,0,56,0.4)] lg:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[300px] overflow-hidden border-r border-hairline-soft bg-canvas shadow-[0_16px_48px_-8px_rgba(5,0,56,0.12)] lg:hidden"
            >
              <SidebarContent
                user={user}
                sections={sections}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
                logoutAction={logoutAction}
                header={
                  <div className="flex h-16 min-w-0 items-center justify-between gap-3 border-b border-hairline-soft px-4">
                    <Brand />
                    <button
                      type="button"
                      aria-label="Cerrar menú"
                      onClick={() => setOpen(false)}
                      className="ts-btn-icon-circular shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                }
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="lg:pl-[272px]">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
