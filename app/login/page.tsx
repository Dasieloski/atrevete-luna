'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginSchema } from '@/src/lib/validation/authSchema'
import { useAuthStore } from '@/stores/authStore'
import { LogIn, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)

  async function handleSubmit(formData: FormData) {
    setStatus('loading')
    setErrorMessage('')

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const validationResult = loginSchema.safeParse({ email, password })

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      setErrorMessage(firstError.message)
      setStatus('error')
      return
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: validationResult.data.email,
          password: validationResult.data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setErrorMessage(result.error || 'Error al iniciar sesión')
        setStatus('error')
        return
      }

      // Sincronizar el store de Zustand con el usuario recién autenticado
      if (result.user) {
        setUser(result.user)
      }

      setStatus('success')
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 600)
    } catch {
      setErrorMessage('Error de conexión')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-ink">Atrevete Luna</h1>
          <p className="text-muted mt-1 text-sm">Inicia sesión para continuar</p>
        </div>

        <div className="bg-surface-card rounded-2xl p-6 border border-hairline">
          <form action={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm flex items-start gap-2">
                <span>⚠</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 border border-hairline rounded-lg bg-canvas text-body focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="admin@atrevete.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-body-strong mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 border border-hairline rounded-lg bg-canvas text-body focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="w-full py-2.5 bg-primary hover:bg-primary-active disabled:bg-primary-disabled text-on-primary font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando sesión...</>
              ) : status === 'success' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo...</>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          Sistema de Gestión Atrevete Luna
        </p>
      </div>
    </div>
  )
}
