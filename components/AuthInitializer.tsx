'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

/**
 * Componente que inicializa el estado de autenticación al cargar la app.
 * También revalida el usuario cuando la ventana recupera el foco,
 * para mantener el store sincronizado después de un login.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { user, isLoading, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    if (isLoading) {
      void fetchUser()
    }
  }, [setUser, setLoading, isLoading])

  // Revalidar cuando la ventana recupera el foco
  useEffect(() => {
    const handleFocus = () => {
      if (!isLoading) {
        void fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) setUser(data.user)
          })
          .catch(() => {})
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [setUser, isLoading])

  return <>{children}</>
}
