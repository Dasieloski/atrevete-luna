'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from 'react-simple-maps'
import type { Feature, Geometry } from 'geojson'
import { useTheme } from '@/src/lib/theme'

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

const SCALE: Record<string, string[]> = {
  teal: ['#d6f1e3', '#9fd9bd', '#69c19a', '#3ca978', '#128e58'],
  coral: ['#fde0dc', '#fbb1a4', '#f4816a', '#e8523c', '#d33a23'],
  warm: ['#fdecd0', '#fbd293', '#f7b558', '#f29427', '#d67506'],
  cool: ['#dbe5fb', '#a8b8f1', '#7790e6', '#4a6bdc', '#2a4cbf'],
}

const SCALE_DARK: Record<string, string[]> = {
  teal: ['#0f2a1c', '#1c4a2f', '#2d6b46', '#3f8c5d', '#56ad75'],
  coral: ['#2c1816', '#5a241c', '#893324', '#b8452e', '#d85a3a'],
  warm: ['#2e2210', '#5a3e1a', '#875c28', '#b47938', '#d89548'],
  cool: ['#1a2747', '#1f3070', '#2a4099', '#3a52c2', '#5a73d1'],
}

type MapPalette = {
  base: string
  stroke: string
  levels: string[]
  hover: string
  selected: string
  selectedStroke: string
}

function readMapPalette(scheme: keyof typeof SCALE, isDark: boolean): MapPalette {
  if (typeof window === 'undefined') {
    return {
      base: '#f4f4f4',
      stroke: '#ffffff',
      levels: SCALE[scheme] || SCALE.cool,
      hover: '#3E6AE1',
      selected: '#3E6AE1',
      selectedStroke: '#1a3a8a',
    }
  }
  const styles = getComputedStyle(document.documentElement)
  const base = styles.getPropertyValue('--map-base').trim() || '#f4f4f4'
  const stroke = styles.getPropertyValue('--map-border').trim() || '#ffffff'
  const levels = isDark
    ? SCALE_DARK[scheme] || SCALE_DARK.cool
    : SCALE[scheme] || SCALE.cool
  return {
    base,
    stroke,
    levels,
    hover: styles.getPropertyValue('--map-hover').trim() || '#3E6AE1',
    selected: styles.getPropertyValue('--map-selected').trim() || '#234aa8',
    selectedStroke: styles.getPropertyValue('--map-stroke-selected').trim() || '#1a3a8a',
  }
}

function valueToColor(
  value: number | undefined,
  max: number,
  palette: MapPalette,
  isHover: boolean,
  isSelected: boolean,
): string {
  if (isSelected) return palette.selected
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
  colorScheme = 'cool',
}: CubaMapProps) {
  const { resolved } = useTheme()
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; value: number } | null>(null)
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [-79.0, 21.5],
    zoom: 1.4,
  })
  const [palette, setPalette] = useState<MapPalette | null>(null)

  useEffect(() => {
    setPalette(readMapPalette(colorScheme, resolved === 'dark'))
  }, [resolved, colorScheme])

  const max = useMemo(
    () => Math.max(1, ...Object.values(metrics).filter((v): v is number => typeof v === 'number')),
    [metrics],
  )

  const effectivePalette: MapPalette = palette ?? {
    base: '#f4f4f4',
    stroke: '#ffffff',
    levels: SCALE[colorScheme] || SCALE.cool,
    hover: '#3E6AE1',
    selected: '#3E6AE1',
    selectedStroke: '#1a3a8a',
  }

  const handleMove = (pos: { coordinates: [number, number]; zoom: number }) => {
    if (pos.zoom < 0.7) return
    setPosition(pos)
  }

  return (
    <div
      className="ts-card relative w-full overflow-hidden"
      style={{ height }}
    >
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
                const fill = valueToColor(value, max, effectivePalette, isHover, isSelected)

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
                        stroke: effectivePalette.stroke,
                        strokeWidth: 0.6,
                        outline: 'none',
                        transition: 'fill 180ms ease',
                        filter: 'url(#province-shadow)',
                      },
                      hover: {
                        fill: valueToColor(value, max, effectivePalette, true, isSelected),
                        stroke: '#ffffff',
                        strokeWidth: 0.9,
                        outline: 'none',
                        cursor: 'pointer',
                      },
                      pressed: {
                        fill: effectivePalette.selected,
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
                  fill={effectivePalette.hover}
                  fillOpacity={0.85}
                  stroke="#ffffff"
                  strokeWidth={1}
                />
                <circle
                  r={r + 3}
                  fill={effectivePalette.hover}
                  fillOpacity={0.18}
                />
              </Marker>
            )
          })}
        </ZoomableGroup>
      </ComposableMap>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-hairline bg-canvas px-3 py-2 text-xs shadow-md"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            minWidth: 140,
          }}
        >
          <p className="font-medium text-ink">{tooltip.name}</p>
          <p className="text-muted">
            {tooltip.value > 0 ? tooltip.value.toLocaleString('es-ES') : 'Sin datos'}
          </p>
        </div>
      )}

      {showLegend && max > 0 && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-hairline bg-canvas/95 px-3 py-2 text-[10px] backdrop-blur">
          <span className="font-medium text-muted">Menos</span>
          <div className="flex h-2 overflow-hidden rounded">
            {effectivePalette.levels.map((c, i) => (
              <span key={i} style={{ backgroundColor: c, width: 14, height: '100%' }} />
            ))}
          </div>
          <span className="font-medium text-muted">Más</span>
        </div>
      )}

      {showLegend && (
        <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-md border border-hairline bg-canvas/95 px-3 py-2 text-[10px] backdrop-blur">
          <span className="text-muted">Provincias: {Object.keys(metrics).length || 16}</span>
          {selectedId && (
            <span className="font-medium text-primary">
              Selec.: {selectedId}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default CubaMap
