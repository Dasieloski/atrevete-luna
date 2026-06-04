import { create } from 'zustand'
import type { PermissionData } from '@/lib/permissions'

interface User {
  id: string
  name: string
  email: string
  role: {
    id: string
    name: string
    isSuperAdmin: boolean
    permissions: PermissionData[]
  }
}

interface AuthState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  hasPermission: (module: string, action: 'view' | 'create' | 'edit' | 'delete') => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  hasPermission: (module, action) => {
    const { user } = get()
    if (!user) return false
    if (user.role.isSuperAdmin) return true

    const permission = user.role.permissions.find((p) => p.module === module)
    if (!permission) return false
    return permission[action]
  },
}))
