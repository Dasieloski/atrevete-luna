'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'

/**
 * Hook que retorna el usuario actual desde el store global.
 *
 * Estrategia:
 * 1. Si el store tiene un usuario, lo retorna inmediatamente.
 * 2. Si el store está en loading inicial, dispara un fetch a /api/auth/me.
 * 3. Si el loading terminó SIN usuario (ej: tras un login reciente que
 *    no se reflejó en el store), NO reintenta para evitar loops infinitos.
 *
 * Para forzar reintento, exponer `refetch()` en el store.
 */
export function useAuth() {
  const { user, isLoading, setUser, setLoading } = useAuthStore()
  const fetchingRef = useRef(false)

  useEffect(() => {
    // Si ya hay usuario, no hacemos nada
    if (user) return
    // Si ya terminamos de cargar y no hay user, no reintentamos
    if (!isLoading) return
    // Si ya hay un fetch en curso, esperamos
    if (fetchingRef.current) return

    fetchingRef.current = true

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
        fetchingRef.current = false
      }
    }

    void fetchUser()
  }, [user, isLoading, setUser, setLoading])

  return { user, isLoading }
}
