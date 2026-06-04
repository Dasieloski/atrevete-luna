'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  resolved: ResolvedTheme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const STORAGE_KEY = 'al-theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore */
  }
  return 'system'
}

function resolveSystem(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyResolved(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (resolved === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  root.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolved, setResolved] = useState<ResolvedTheme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const initial = readStoredTheme()
    const initialResolved =
      initial === 'system' ? resolveSystem() : initial
    setThemeState(initial)
    setResolved(initialResolved)
    applyResolved(initialResolved)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const next: ResolvedTheme = mq.matches ? 'dark' : 'light'
      setResolved(next)
      applyResolved(next)
    }
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, mounted])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    const nextResolved = next === 'system' ? resolveSystem() : next
    setResolved(nextResolved)
    applyResolved(nextResolved)
  }, [])

  const toggle = useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved, setTheme])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolved, setTheme, toggle }),
    [theme, resolved, setTheme, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}

/**
 * Reads CSS custom properties from the document root.
 * Returns null during SSR / before mount, callers must guard.
 */
export function useThemeColors<T extends Record<string, string>>(
  names: readonly (keyof T & string)[],
): T | null {
  const [colors, setColors] = useState<T | null>(null)
  const { resolved } = useTheme()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const styles = getComputedStyle(document.documentElement)
    const result = {} as T
    for (const name of names) {
      const v = styles.getPropertyValue(name).trim()
      ;(result as Record<string, string>)[name] = v
    }
    setColors(result)
  }, [resolved, names])

  return colors
}
