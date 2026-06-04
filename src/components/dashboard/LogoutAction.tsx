'use client'

import { LogOut } from 'lucide-react'
import { logoutAction } from '@/app/(dashboard)/actions'

export function LogoutAction() {
  return (
    <form action={logoutAction} className="w-full">
      <button
        type="submit"
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-pill border border-hairline-strong bg-canvas px-4 text-sm font-medium text-ink transition-colors duration-[var(--dur-base)] ease-[var(--ease-miro)] hover:bg-coral-soft hover:text-coral-dark"
      >
        <LogOut className="h-4 w-4" />
        <span>Cerrar sesión</span>
      </button>
    </form>
  )
}
