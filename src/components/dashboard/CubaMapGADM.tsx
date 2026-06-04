'use client'

import { useMemo, useState } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps'
import type { Feature, Geometry } from 'geojson'

const GEOJSON_URL = '/maps/gadm41_CUB_1.json'

export type ProvinceStat = {
  province: string
  count: number
  salesCount: number
  salesTotal: number
  boxes: number
}

export type CubaMapGADMProps = {
  provinceStats: ProvinceStat[]
  selectedProvince: string | null
  onSelectProvince: (p: string | null) => void
  height?: number
  showLegend?: boolean
  metric?: 'salesTotal' | 'count' | 'salesCount' | 'boxes'
}

type GadmProps = {
  GID_1: string
  GID_0: string
  COUNTRY: string
  NAME_1: string
  VARNAME_1: string
  NL_NAME_1: string
  TYPE_1: string
  ENGTYPE_1: string
  HASC_1: string
}

const NEUTRAL = '#e7e2d6'
const NEUTRAL_BORDER = '#ffffff'
const HOVER = '#cc785c'
const SELECTED = '#a85a3f'
const SCALE = ['#f3e2c5', '#ecc79a', '#dca96b', '#cf8a3e', '#b76b1c', '#8c4d10']

const DISPLAY_NAMES: Record<string, string> = {
  'CUB.1_1': 'Camagüey',
  'CUB.2_1': 'Ciego de Ávila',
  'CUB.3_1': 'Cienfuegos',
  'CUB.4_1': 'La Habana',
  'CUB.5_1': 'Granma',
  'CUB.6_1': 'Guantánamo',
  'CUB.7_1': 'Holguín',
  'CUB.8_1': 'Isla de la Juventud',
  'CUB.9_1': 'Artemisa',
  'CUB.10_1': 'Las Tunas',
  'CUB.11_1': 'Matanzas',
  'CUB.12_1': 'Mayabeque',
  'CUB.13_1': 'Pinar del Río',
  'CUB.14_1': 'Sancti Spíritus',
  'CUB.15_1': 'Santiago de Cuba',
  'CUB.16_1': 'Villa Clara',
}

const ALIAS_TO_GID: Record<string, string> = {
  'pinar del rio': 'CUB.13_1',
  'pinardelrio': 'CUB.13_1',
  'artemisa': 'CUB.9_1',
  'la habana': 'CUB.4_1',
  'lahabana': 'CUB.4_1',
  'ciudad de la habana': 'CUB.4_1',
  'habana': 'CUB.4_1',
  'havana': 'CUB.4_1',
  'mayabeque': 'CUB.12_1',
  'matanzas': 'CUB.11_1',
  'villa clara': 'CUB.16_1',
  'cienfuegos': 'CUB.3_1',
  'sancti spiritus': 'CUB.14_1',
  'santi spiritus': 'CUB.14_1',
  'ciego de avila': 'CUB.2_1',
  'camaguey': 'CUB.1_1',
  'las tunas': 'CUB.10_1',
  'holguin': 'CUB.7_1',
  'granma': 'CUB.5_1',
  'santiago de cuba': 'CUB.15_1',
  'guantanamo': 'CUB.6_1',
  'isla de la juventud': 'CUB.8_1',
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function resolveProvinceKey(name: string): string {
  if (!name) return ''
  const norm = normalize(name)
  if (ALIAS_TO_GID[norm]) return ALIAS_TO_GID[norm]
  const compact = norm.replace(/\s+/g, '')
  if (ALIAS_TO_GID[compact]) return ALIAS_TO_GID[compact]
  return norm
}

function displayNameFor(gid: string): string {
  if (DISPLAY_NAMES[gid]) return DISPLAY_NAMES[gid]
  const compact = gid.replace(/[._]/g, '_')
  if (DISPLAY_NAMES[compact]) return DISPLAY_NAMES[compact]
  return gid
}

function valueToColor(value: number, max: number, isHover: boolean, isSelected: boolean): string {
  if (isSelected) return SELECTED
  if (isHover) return HOVER
  if (value <= 0 || max === 0) return NEUTRAL
  const ratio = value / max
  const idx = Math.min(SCALE.length - 1, Math.max(0, Math.floor(ratio * SCALE.length)))
  return SCALE[idx]
}

export function CubaMapGADM({
  provinceStats,
  selectedProvince,
  onSelectProvince,
  height = 560,
  showLegend = true,
  metric = 'salesTotal',
}: CubaMapGADMProps) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    name: string
    stat: ProvinceStat | null
  } | null>(null)
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [-79.5, 21.6],
    zoom: 1.5,
  })

  const statsByGid = useMemo(() => {
    const m: Record<string, ProvinceStat> = {}
    for (const s of provinceStats) {
      m[resolveProvinceKey(s.province)] = s
    }
    return m
  }, [provinceStats])

  const max = useMemo(() => {
    const vals = provinceStats.map((s) => s[metric] || 0)
    return Math.max(1, ...vals)
  }, [provinceStats, metric])

  const handleMove = (pos: { coordinates: [number, number]; zoom: number }) => {
    if (pos.zoom < 0.6) return
    setPosition(pos)
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-hairline bg-canvas"
      style={{ height }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 2200 }}
        width={520}
        height={height}
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <filter id="cuba-province-shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" />
            <feOffset dx="0" dy="0.5" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.18" />
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
          maxZoom={8}
          minZoom={0.6}
        >
          <Geographies geography={GEOJSON_URL}>
            {({
              geographies,
            }: {
              geographies: Array<Feature<Geometry, GadmProps>>
            }) => (
              <>
                {geographies.map((geo) => {
                  const props = geo.properties
                  const gid = props.GID_1
                  const name = displayNameFor(gid)
                  const stat = statsByGid[gid] || null
                  const value = stat ? stat[metric] || 0 : 0
                  const isHover = hoverId === gid
                  const isSelected = selectedProvince
                    ? resolveProvinceKey(selectedProvince) === gid
                    : false
                  const fill = valueToColor(value, max, isHover, isSelected)

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(evt) => {
                        setHoverId(gid)
                        setTooltip({
                          x: evt.clientX,
                          y: evt.clientY,
                          name,
                          stat,
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
                      onClick={() => {
                        const cur = selectedProvince === gid
                        onSelectProvince(cur ? null : gid)
                      }}
                      style={{
                        default: {
                          fill,
                          stroke: isSelected ? '#7a3a26' : NEUTRAL_BORDER,
                          strokeWidth: isSelected ? 1.4 : 0.5,
                          outline: 'none',
                          transition: 'fill 180ms ease, stroke 180ms ease',
                          filter: 'url(#cuba-province-shadow)',
                        },
                        hover: {
                          fill: HOVER,
                          stroke: '#ffffff',
                          strokeWidth: 1,
                          outline: 'none',
                          cursor: 'pointer',
                        },
                        pressed: {
                          fill: SELECTED,
                          stroke: '#ffffff',
                          strokeWidth: 1.2,
                          outline: 'none',
                        },
                      }}
                    />
                  )
                })}

                {provinceStats
                  .filter((s) => (s[metric] || 0) > 0)
                  .map((s) => {
                    const ratio = (s[metric] || 0) / max
                    const r = 1.6 + ratio * 4
                    return null
                  })}
              </>
            )}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-hairline bg-surface-card px-3 py-2 text-xs shadow-md"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12, minWidth: 170 }}
        >
          <p className="font-semibold text-ink">{tooltip.name}</p>
          {tooltip.stat ? (
            <div className="mt-1 space-y-0.5 text-muted">
              <p>
                Clientes:{' '}
                <span className="font-mono text-ink">{tooltip.stat.count}</span>
              </p>
              <p>
                Ventas:{' '}
                <span className="font-mono text-ink">{tooltip.stat.salesCount}</span>
              </p>
              <p>
                Total:{' '}
                <span className="font-mono text-ink">
                  {tooltip.stat.salesTotal.toLocaleString('es-ES', {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-muted">Sin clientes</p>
          )}
        </div>
      )}

      {showLegend && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-hairline bg-surface-card/95 px-3 py-1.5 text-[10px] backdrop-blur">
          <span className="text-muted font-medium">Bajo</span>
          <div className="flex h-2 overflow-hidden rounded">
            {SCALE.map((c, i) => (
              <span key={i} style={{ backgroundColor: c, width: 14, height: '100%' }} />
            ))}
          </div>
          <span className="text-muted font-medium">Alto</span>
        </div>
      )}

      {selectedProvince && (
        <div className="absolute right-3 top-3 flex items-center gap-2 rounded-md border border-hairline bg-surface-card/95 px-3 py-1.5 text-[10px] backdrop-blur">
          <span className="text-muted">Selección:</span>
          <span className="font-semibold text-accent-coral">
            {displayNameFor(selectedProvince)}
          </span>
        </div>
      )}
    </div>
  )
}

export default CubaMapGADM
