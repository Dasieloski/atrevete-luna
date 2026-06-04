import clsx, { type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat('es-ES').format(n)
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'CUP',
    maximumFractionDigits: 0,
  }).format(n)
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
