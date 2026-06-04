'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { AlertCircle, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'
import { loginSchema } from '@/src/lib/validation/authSchema'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function LoginPage() {
  const [status, setStatus] = useState<Status>('idle')
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

      if (result.user) setUser(result.user)

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
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      {/* Background — pastel feature blocks (Miro signature) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: [
            'radial-gradient(60% 50% at 12% 20%, rgba(255, 208, 47, 0.18), transparent 60%)',
            'radial-gradient(50% 45% at 88% 18%, rgba(255, 153, 153, 0.18), transparent 60%)',
            'radial-gradient(45% 40% at 78% 88%, rgba(195, 250, 245, 0.6), transparent 60%)',
            'radial-gradient(40% 35% at 18% 78%, rgba(253, 224, 240, 0.5), transparent 60%)',
          ].join(','),
        }}
      />

      {/* Centered card on canvas */}
      <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="w-full max-w-md"
        >
          {/* Brand mark */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: 'var(--brand-bg)', color: 'var(--brand-fg)' }}
            >
              <span className="text-lg font-semibold tracking-[-0.5px]">AL</span>
            </div>
            <div className="text-[15px] font-semibold tracking-[-0.3px] text-ink">
              Atrévete Luna
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone">
              Sistema de Gestión
            </div>
          </div>

          {/* Login card */}
          <div className="rounded-3xl border border-hairline-soft bg-canvas p-8 shadow-[0_4px_12px_0_rgba(5,0,56,0.06)] sm:p-10">
            <div className="mb-7">
              <span className="ts-chip-tag-yellow mb-4">
                <Sparkles className="h-3 w-3" />
                Acceso seguro
              </span>
              <h1 className="text-3xl font-medium leading-[1.1] tracking-[-0.5px] text-ink">
                Iniciar sesión
              </h1>
              <p className="mt-2 text-sm text-slate">
                Accede al sistema para gestionar tu operación.
              </p>
            </div>

            <form action={handleSubmit} className="space-y-4">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 rounded-md border border-coral/30 bg-coral-soft px-3 py-2.5 text-sm text-coral-dark"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              <div>
                <label htmlFor="email" className="ts-label">
                  Correo electrónico
                </label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="admin@atrevete.com"
                  leadingIcon={<Mail className="h-4 w-4" />}
                  disabled={status === 'loading' || status === 'success'}
                />
              </div>

              <div>
                <label htmlFor="password" className="ts-label">
                  Contraseña
                </label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  leadingIcon={<Lock className="h-4 w-4" />}
                  disabled={status === 'loading' || status === 'success'}
                />
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={status === 'loading' || status === 'success'}
                loading={status === 'loading' || status === 'success'}
                trailingIcon={
                  status === 'idle' || status === 'error' ? (
                    <ArrowRight className="h-4 w-4" />
                  ) : undefined
                }
                className="mt-3"
              >
                {status === 'loading'
                  ? 'Iniciando sesión…'
                  : status === 'success'
                  ? 'Redirigiendo…'
                  : 'Iniciar sesión'}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-stone">
            Sistema de Gestión Atrévete Luna · v1.0
          </p>
        </motion.div>
      </div>
    </div>
  )
}
