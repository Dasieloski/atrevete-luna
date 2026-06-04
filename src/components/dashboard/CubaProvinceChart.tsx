'use client'

import { useState, useMemo } from 'react'
import CubaMap, { type ProvinceMetric } from './CubaMap'

export type CubaSalesByProvince = {
  province: string
  total: number
  customers: number
}

const PROVINCE_COORDS: Record<string, [number, number]> = {
  'CU-01': [-83.7, 22.4],
  'CU-02': [-82.4, 23.05],
  'CU-03': [-82.35, 23.13],
  'CU-04': [-81.6, 22.65],
  'CU-05': [-79.95, 22.5],
  'CU-06': [-80.45, 22.15],
  'CU-07': [-79.45, 22.0],
  'CU-08': [-78.75, 21.85],
  'CU-09': [-77.95, 21.4],
  'CU-10': [-76.95, 21.05],
  'CU-11': [-76.25, 20.85],
  'CU-12': [-77.3, 20.35],
  'CU-13': [-75.85, 20.05],
  'CU-14': [-75.15, 20.15],
  'CU-15': [-82.75, 22.85],
  'CU-16': [-82.15, 22.85],
  'CU-99': [-82.85, 21.7],
}

const PROVINCE_ALIASES: Record<string, string> = {
  'pinar del rio': 'CU-01',
  'la habana': 'CU-02',
  'habana': 'CU-02',
  'ciudad de la habana': 'CU-03',
  'havana': 'CU-03',
  'matanzas': 'CU-04',
  'villa clara': 'CU-05',
  'cienfuegos': 'CU-06',
  'sancti spiritus': 'CU-07',
  'santi spiritus': 'CU-07',
  'ciego de avila': 'CU-08',
  'camaguey': 'CU-09',
  'las tunas': 'CU-10',
  'holguin': 'CU-11',
  'granma': 'CU-12',
  'santiago de cuba': 'CU-13',
  'guantanamo': 'CU-14',
  'artemisa': 'CU-15',
  'mayabeque': 'CU-16',
  'isla de la juventud': 'CU-99',
}

function resolveProvinceId(name: string): string | null {
  if (!name) return null
  const key = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  return PROVINCE_ALIASES[key] || null
}

export type CubaProvinceChartProps = {
  data: CubaSalesByProvince[]
  metric?: 'total' | 'customers'
  height?: number
}

export function CubaProvinceChart({
  data,
  metric = 'total',
  height = 520,
}: CubaProvinceChartProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const metrics = useMemo(() => {
    const m: Record<string, number> = {}
    for (const row of data) {
      const id = resolveProvinceId(row.province)
      if (!id) continue
      m[id] = (m[id] || 0) + (metric === 'total' ? row.total : row.customers)
    }
    return m
  }, [data, metric])

  const markers = useMemo<ProvinceMetric[]>(() => {
    return Object.entries(metrics)
      .filter(([, v]) => v > 0)
      .map(([id, value]) => ({
        id,
        name: id,
        value,
        coords: PROVINCE_COORDS[id],
      }))
  }, [metrics])

  const top = useMemo(() => {
    return Object.entries(metrics)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }, [metrics])

  const max = Math.max(1, ...Object.values(metrics))

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <CubaMap
          metrics={metrics}
          markers={markers}
          selectedId={selected}
          onSelect={(id) => setSelected((s) => (s === id ? null : id))}
          height={height}
          colorScheme="cool"
        />
        <div className="ts-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Top provincias
          </p>
          <ul className="mt-3 space-y-2">
            {top.length === 0 && (
              <li className="text-xs text-muted">Sin datos disponibles</li>
            )}
            {top.map(([id, value]) => {
              const pct = (value / max) * 100
              const isSel = selected === id
              return (
                <li
                  key={id}
                  onClick={() => setSelected((s) => (s === id ? null : id))}
                  className={`cursor-pointer rounded-md border p-2 transition-colors ${
                    isSel
                      ? 'border-primary bg-primary/5'
                      : 'border-hairline hover:border-pewter'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">{id}</span>
                    <span className="font-mono text-ink">
                      {metric === 'total'
                        ? value.toLocaleString('es-ES', { maximumFractionDigits: 0 })
                        : value}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-ash">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${pct}%`, opacity: 0.4 + (pct / 100) * 0.6 }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
          {selected && (
            <button
              onClick={() => setSelected(null)}
              className="mt-3 w-full rounded-md border border-hairline px-3 py-1.5 text-xs text-muted transition-colors hover:bg-ash hover:text-ink"
            >
              Limpiar selección
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CubaProvinceChart
