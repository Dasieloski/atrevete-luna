import { daysBetween } from './format'

export interface DateRange {
  from: string
  to: string
}

export interface InRangeOptions {
  inclusiveEnd?: boolean
}

export function inRange(date: string | Date, range: DateRange, opts: InRangeOptions = {}): boolean {
  if (!range.from && !range.to) return true
  const ts = typeof date === 'string' ? new Date(date).getTime() : date.getTime()
  if (isNaN(ts)) return false
  if (range.from) {
    const start = new Date(range.from + 'T00:00:00').getTime()
    if (ts < start) return false
  }
  if (range.to) {
    const end = new Date(range.to + (opts.inclusiveEnd === false ? 'T00:00:00' : 'T23:59:59')).getTime()
    if (ts > end) return false
  }
  return true
}

export function perDay(total: number, range: DateRange): number {
  const days = daysBetween(range.from, range.to)
  return days > 0 ? total / days : total
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null
  return ((current - previous) / previous) * 100
}

export function previousRange(range: DateRange): DateRange {
  const days = daysBetween(range.from, range.to)
  const toTs = new Date(range.to + 'T00:00:00').getTime()
  const prevTo = new Date(toTs - 1000 * 60 * 60 * 24)
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * 1000 * 60 * 60 * 24)
  return {
    from: prevFrom.toISOString().split('T')[0],
    to: prevTo.toISOString().split('T')[0],
  }
}

export function groupBy<T, K extends string | number>(
  items: T[],
  key: (item: T) => K
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const k = key(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<K, T[]>)
}

export function sumBy<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((acc, item) => acc + selector(item), 0)
}
