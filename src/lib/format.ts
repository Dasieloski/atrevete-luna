export function formatDate(value: string | Date): string {
  const d = typeof value === 'string'
    ? new Date(value.includes('T') ? value.split('T')[0] + 'T12:00:00' : value + 'T12:00:00')
    : value
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' })
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatBoxes(units: number, unitsPerBox: number): string {
  if (!unitsPerBox || unitsPerBox <= 0) return `${formatNumber(units)} uds`
  const boxes = Math.floor(units / unitsPerBox)
  return `${formatNumber(boxes)} cjs`
}

export function formatBoxesAndUnits(units: number, unitsPerBox: number): string {
  if (!unitsPerBox || unitsPerBox <= 0) return `${formatNumber(units)} uds`
  const boxes = Math.floor(units / unitsPerBox)
  const remainder = units - boxes * unitsPerBox
  if (remainder === 0) return `${formatNumber(boxes)} cjs`
  return `${formatNumber(boxes)} cjs · ${formatNumber(remainder)} uds`
}

export function toInputDate(value: Date | string | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') {
    // Extract YYYY-MM-DD directly from ISO strings or plain date strings
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/)
    return m ? m[1] : ''
  }
  if (isNaN(value.getTime())) return ''
  return value.toLocaleDateString('en-CA')
}

export function todayInputDate(): string {
  return new Date().toLocaleDateString('en-CA')
}

export function monthStartInputDate(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA')
}

export function yearStartInputDate(): string {
  const y = new Date().getFullYear()
  return `${y}-01-01`
}

export function daysBetween(from: string, to: string): number {
  if (!from || !to) return 0
  const a = new Date(from + 'T12:00:00').getTime()
  const b = new Date(to + 'T12:00:00').getTime()
  const diff = Math.max(0, b - a)
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1)
}
