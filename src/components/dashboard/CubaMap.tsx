'use client'

import { useMemo, useState } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from 'react-simple-maps'
import type { Feature, Geometry } from 'geojson'

export type ProvinceMetric = {
  id: string
  name: string
  value: number
  coords?: [number, number]
  meta?: Record<string, string | number>
}

export type CubaMapProps = {
  metrics?: Record<string, number>
  markers?: ProvinceMetric[]
  selectedId?: string | null
  onSelect?: (id: string, name: string) => void
  height?: number
  showLegend?: boolean
  colorScheme?: 'teal' | 'coral' | 'warm' | 'cool'
}

const SCALE: Record<string, { base: string; stroke: string; levels: string[] }> = {
  teal: {
    base: '#efe9de',
    stroke: '#ffffff',
    levels: ['#d6ece6', '#a7d3c8', '#79baaa', '#4da18d', '#2a8a72'],
  },
  coral: {
    base: '#efe9de',
    stroke: '#ffffff',
    levels: ['#f4d8cf', '#ecb3a3', '#e08d77', '#d46a4d', '#c64545'],
  },
  warm: {
    base: '#efe9de',
    stroke: '#ffffff',
    levels: ['#f1e0c8', '#e8c79a', '#dca96b', '#cf8a3e', '#b76b1c'],
  },
  cool: {
    base: '#efe9de',
    stroke: '#ffffff',
    levels: ['#dde4ec', '#b8c6d8', '#92a8c4', '#6c8ab0', '#466c9c'],
  },
}

function valueToColor(
  value: number | undefined,
  max: number,
  scheme: keyof typeof SCALE,
  isHover: boolean,
  isSelected: boolean,
): string {
  const palette = SCALE[scheme] || SCALE.teal
  if (isSelected) return '#cc785c'
  if (value === undefined || max === 0) return palette.base
  if (isHover) return palette.levels[Math.min(palette.levels.length - 1, Math.max(0, Math.ceil((value / max) * palette.levels.length - 1)))]
  if (value === 0) return palette.base
  const idx = Math.min(
    palette.levels.length - 1,
    Math.max(0, Math.ceil((value / max) * palette.levels.length) - 1),
  )
  return palette.levels[idx]
}

export function CubaMap({
  metrics = {},
  markers = [],
  selectedId = null,
  onSelect,
  height = 520,
  showLegend = true,
  colorScheme = 'coral',
}: CubaMapProps) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; value: number } | null>(null)
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [-79.0, 21.5],
    zoom: 1.4,
  })

  const max = useMemo(
    () => Math.max(1, ...Object.values(metrics).filter((v): v is number => typeof v === 'number')),
    [metrics],
  )

  const palette = SCALE[colorScheme] || SCALE.coral

  const handleMove = (pos: { coordinates: [number, number]; zoom: number }) => {
    if (pos.zoom < 0.7) return
    setPosition(pos)
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-hairline bg-surface-card" style={{ height }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 1900 }}
        width={500}
        height={height}
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <filter id="province-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
            <feOffset dx="0" dy="0.5" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.25" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMove}
          maxZoom={6}
          minZoom={1}
        >
          <Geographies geography="/maps/cuba-provinces.geojson">
            {({ geographies }: { geographies: Array<Feature<Geometry, { id: string; name: string; iso: string }>> }) => {
              return geographies.map((geo) => {
                const id = String((geo.properties as { iso?: string }).iso || (geo.properties as { id?: string }).id || geo.id || '')
                const name = geo.properties.name
                const value = metrics[id]
                const isHover = hoverId === id
                const isSelected = selectedId === id
                const fill = valueToColor(value, max, colorScheme, isHover, isSelected)

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={(evt) => {
                      setHoverId(id)
                      setTooltip({
                        x: evt.clientX,
                        y: evt.clientY,
                        name,
                        value: value ?? 0,
                      })
                    }}
                    onMouseMove={(evt) => {
                      if (tooltip) {
                        setTooltip((t) => (t ? { ...t, x: evt.clientX, y: evt.clientY } : null))
                      }
                    }}
                    onMouseLeave={() => {
                      setHoverId(null)
                      setTooltip(null)
                    }}
                    onClick={() => onSelect?.(id, name)}
                    style={{
                      default: {
                        fill,
                        stroke: palette.stroke,
                        strokeWidth: 0.6,
                        outline: 'none',
                        transition: 'fill 180ms ease',
                        filter: 'url(#province-shadow)',
                      },
                      hover: {
                        fill: valueToColor(value, max, colorScheme, true, isSelected),
                        stroke: '#ffffff',
                        strokeWidth: 0.9,
                        outline: 'none',
                        cursor: 'pointer',
                      },
                      pressed: {
                        fill: '#cc785c',
                        stroke: '#ffffff',
                        strokeWidth: 0.9,
                        outline: 'none',
                      },
                    }}
                  />
                )
              })
            }}
          </Geographies>

          {markers.map((m) => {
            const v = m.value
            const r = 2.5 + (max > 0 ? (v / max) * 5 : 0)
            return (
              <Marker key={m.id} coordinates={m.coords || [0, 0]}>
                <circle
                  r={r}
                  fill="#cc785c"
                  fillOpacity={0.85}
                  stroke="#ffffff"
                  strokeWidth={1}
                />
                <circle
                  r={r + 3}
                  fill="#cc785c"
                  fillOpacity={0.18}
                />
              </Marker>
            )
          })}
        </ZoomableGroup>
      </ComposableMap>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-hairline bg-surface-card px-3 py-2 text-xs shadow-md"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            minWidth: 140,
          }}
        >
          <p className="font-semibold text-ink">{tooltip.name}</p>
          <p className="text-muted">
            {tooltip.value > 0 ? tooltip.value.toLocaleString('es-ES') : 'Sin datos'}
          </p>
        </div>
      )}

      {showLegend && max > 0 && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-hairline bg-surface-card/95 px-3 py-2 text-[10px] backdrop-blur">
          <span className="text-muted font-medium">Menos</span>
          <div className="flex h-2 overflow-hidden rounded">
            {palette.levels.map((c, i) => (
              <span key={i} style={{ backgroundColor: c, width: 14, height: '100%' }} />
            ))}
          </div>
          <span className="text-muted font-medium">Más</span>
        </div>
      )}

      {showLegend && (
        <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-md border border-hairline bg-surface-card/95 px-3 py-2 text-[10px] backdrop-blur">
          <span className="text-muted">Provincias: {Object.keys(metrics).length || 16}</span>
          {selectedId && (
            <span className="font-semibold text-accent-coral">
              Selec.: {selectedId}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default CubaMap
