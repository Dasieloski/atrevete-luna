declare module 'react-simple-maps' {
  import { Component, ReactNode } from 'react'

  export interface ZoomableGroupProps {
    center?: [number, number]
    zoom?: number
    minZoom?: number
    maxZoom?: number
    onMoveEnd?: (position: { coordinates: [number, number]; zoom: number }) => void
    children?: ReactNode
  }
  export const ZoomableGroup: React.FC<ZoomableGroupProps>

  export interface MarkerProps {
    coordinates: [number, number]
    children?: ReactNode
    onClick?: (e: any) => void
    style?: any
  }
  export const Marker: React.FC<MarkerProps>

  export interface ComposableMapProps {
    width?: number | string
    height?: number | string
    projection?: string
    projectionConfig?: any
    style?: any
    children?: ReactNode
  }
  export const ComposableMap: React.FC<ComposableMapProps>

  export interface GeographiesProps {
    geography?: string | object
    children?: (data: { geographies: any[] }) => ReactNode
  }
  export const Geographies: React.FC<GeographiesProps>

  export interface GeographyProps {
    geography: any
    onClick?: (e: any) => void
    onMouseEnter?: (e: any) => void
    onMouseMove?: (e: any) => void
    onMouseLeave?: (e: any) => void
    style?: any
    fill?: string
    stroke?: string
    children?: ReactNode
  }
  export const Geography: React.FC<GeographyProps>
}

declare module 'geojson' {
  export type Geometry = any
  export interface Feature<G = any, P = Record<string, any>> {
    type?: string
    id?: string | number
    properties: P
    geometry?: G
    rsmKey?: string
  }
  export interface FeatureCollection<G = any, P = Record<string, any>> {
    type?: string
    features: Feature<G, P>[]
  }
}
