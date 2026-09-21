import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import {
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  ScaleControl,
  addProtocol,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import type { CityConfig } from '../cities/types'
import type { InvestmentPoint } from '../lib/data'
import { dataUrl, pmtilesUrl } from '../lib/data'

let protocolRegistered = false

function ensurePmtilesProtocol() {
  if (protocolRegistered) return
  const protocol = new Protocol({ metadata: true })
  addProtocol('pmtiles', (request, abortController) => protocol.tilev4(request, abortController))
  protocolRegistered = true
}

function absDataUrl(slug: string, file: string) {
  return new URL(dataUrl(slug, file), window.location.href).href
}

const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles © Esri — Esri, HERE, Garmin, FAO, NOAA, USGS',
      maxzoom: 16,
    },
  },
  layers: [{ id: 'esri', type: 'raster', source: 'esri' }],
}

export interface MapHandle {
  flyTo: (lng: number, lat: number) => void
}

interface MapViewProps {
  city: CityConfig
  layerOn: Record<string, boolean>
  investments: InvestmentPoint[]
}

function popupHtml(title: string, rows: [string, string][]): string {
  const body = rows
    .filter(([, v]) => v && v !== 'undefined' && v !== 'null')
    .map(([k, v]) => `<div><span style="color:#64748b">${k}:</span> ${v}</div>`)
    .join('')
  return `<strong>${title}</strong>${body}`
}

export const MapView = forwardRef<MapHandle, MapViewProps>(function MapView(
  { city, layerOn, investments },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const popupRef = useRef<Popup | null>(null)
  const readyRef = useRef(false)

  useImperativeHandle(ref, () => ({
    flyTo(lng: number, lat: number) {
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, essential: true })
    },
  }))

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    ensurePmtilesProtocol()

    const map = new MapLibreMap({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: city.center,
      zoom: city.zoom,
      minZoom: city.minZoom ?? 10,
    })
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right')
    map.addControl(new ScaleControl({ maxWidth: 120 }), 'bottom-left')
    mapRef.current = map
    popupRef.current = new Popup({ closeButton: true, maxWidth: '280px' })
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(containerRef.current)

    const bindClick = (
      layerId: string,
      titleFrom: (p: Record<string, unknown>) => string,
      rowsFrom: (p: Record<string, unknown>) => [string, string][],
    ) => {
      map.on('click', layerId, (e: MapLayerMouseEvent) => {
        const f = e.features?.[0]
        if (!f || !e.lngLat) return
        const p = (f.properties ?? {}) as Record<string, unknown>
        popupRef.current
          ?.setLngLat(e.lngLat)
          .setHTML(popupHtml(titleFrom(p), rowsFrom(p)))
          .addTo(map)
      })
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
      })
    }

    map.on('error', (e) => {
      console.warn('Map error', e.error ?? e)
    })

    map.on('load', () => {
      const slug = city.slug
      const pmtilesSource = (file: string, minzoom: number, maxzoom: number) => ({
        type: 'vector' as const,
        tiles: [`${pmtilesUrl(absDataUrl(slug, file))}/{z}/{x}/{y}`],
        minzoom,
        maxzoom,
      })

      map.addSource('flood', pmtilesSource('flood.pmtiles', 0, 10))
      map.addSource('buildings', pmtilesSource('buildings.pmtiles', 12, 16))
      map.addSource('roads', pmtilesSource('roads.pmtiles', 10, 16))
      map.addSource('boundary', { type: 'geojson', data: absDataUrl(slug, 'boundary.geojson') })
      map.addSource('river', { type: 'geojson', data: absDataUrl(slug, 'river.geojson') })
      map.addSource('idps', { type: 'geojson', data: absDataUrl(slug, 'idps.geojson') })
      map.addSource('conflict', { type: 'geojson', data: absDataUrl(slug, 'conflict.geojson') })
      map.addSource('investments', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'flood-fill',
        type: 'fill',
        source: 'flood',
        'source-layer': 'flood',
        paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.32 },
      })
      map.addLayer({
        id: 'buildings-fill',
        type: 'fill',
        source: 'buildings',
        'source-layer': 'buildings',
        minzoom: 13,
        paint: {
          'fill-color': ['case', ['==', ['get', 'inFlood'], 1], '#dc2626', '#a8a29e'],
          'fill-opacity': 0.75,
        },
      })
      map.addLayer({
        id: 'buildings-line',
        type: 'line',
        source: 'buildings',
        'source-layer': 'buildings',
        minzoom: 15,
        paint: { 'line-color': '#44403c', 'line-width': 0.4, 'line-opacity': 0.5 },
      })
      map.addLayer({
        id: 'roads-line',
        type: 'line',
        source: 'roads',
        'source-layer': 'roads',
        paint: {
          'line-color': ['case', ['==', ['get', 'inFlood'], 1], '#b45309', '#57534e'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.4, 16, 2.2],
          'line-opacity': 0.85,
        },
      })
      map.addLayer({
        id: 'river-line',
        type: 'line',
        source: 'river',
        paint: { 'line-color': '#0284c7', 'line-width': 2.4 },
      })
      map.addLayer({
        id: 'boundary-line',
        type: 'line',
        source: 'boundary',
        paint: { 'line-color': '#0f172a', 'line-width': 2, 'line-dasharray': [2, 1] },
      })
      map.addLayer({
        id: 'conflict-circle',
        type: 'circle',
        source: 'conflict',
        paint: {
          'circle-radius': 5,
          'circle-color': '#ca8a04',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.9,
        },
      })
      map.addLayer({
        id: 'idps-circle',
        type: 'circle',
        source: 'idps',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['coalesce', ['to-number', ['get', 'idpIndividuals']], 0],
            0,
            4,
            500,
            7,
            2000,
            12,
            6000,
            18,
          ],
          'circle-color': [
            'case',
            ['==', ['to-number', ['get', 'inFlood']], 1],
            '#c026d3',
            '#7c3aed',
          ],
          'circle-stroke-width': 1.2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.92,
        },
      })
      map.addLayer({
        id: 'investments-circle',
        type: 'circle',
        source: 'investments',
        paint: {
          'circle-radius': 7,
          'circle-color': '#059669',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#fff',
        },
      })

      bindClick(
        'buildings-fill',
        () => 'Building',
        (p) => [
          ['Flood exposure', Number(p.inFlood) === 1 ? 'In flood extent' : 'Outside'],
          ['Area m²', String(p.areaM2 ?? '')],
        ],
      )
      bindClick(
        'roads-line',
        (p) => String(p.name || p.highway || 'Road'),
        (p) => [
          ['Class', String(p.highway ?? '')],
          ['Flood exposure', Number(p.inFlood) === 1 ? 'In flood extent' : 'Outside'],
        ],
      )
      bindClick(
        'idps-circle',
        (p) => String(p.settlementName ?? 'Settlement'),
        (p) => [
          ['Type', String(p.settlementClass ?? '')],
          ['IDP individuals', String(p.idpIndividuals ?? 0)],
          ['Households', String(p.idpHouseholds ?? 0)],
          ['Flood exposure', Number(p.inFlood) === 1 ? 'In flood extent' : 'Outside'],
        ],
      )
      bindClick(
        'conflict-circle',
        (p) => String(p.event_type ?? p.eventType ?? 'Conflict event'),
        (p) => [
          ['Date', String(p.event_date ?? p.eventDate ?? '')],
          ['Location', String(p.location ?? '')],
          ['Fatalities', String(p.fatalities ?? '')],
        ],
      )
      bindClick(
        'investments-circle',
        (p) => String(p.name ?? 'Investment'),
        (p) => [
          ['Type', String(p.type ?? '')],
          ['Status', String(p.status ?? '')],
          ['Cost', String(p.cost ?? '')],
        ],
      )

      readyRef.current = true
      for (const [id, on] of Object.entries(layerOn)) {
        setLayerVisibility(map, id, on)
      }
      map.resize()
    })

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      readyRef.current = false
    }
    // city.slug is the identity of this map instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.slug])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    for (const layer of city.layers) {
      setLayerVisibility(map, layer.id, layerOn[layer.id] !== false)
    }
  }, [layerOn, city.layers])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const source = map.getSource('investments') as GeoJSONSource | undefined
    source?.setData({
      type: 'FeatureCollection',
      features: investments.map((item) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
        properties: { name: item.name, type: item.type, status: item.status, cost: item.cost },
      })),
    })
  }, [investments])

  return <div ref={containerRef} className="h-full w-full" />
})

function setLayerVisibility(map: MapLibreMap, id: string, on: boolean) {
  const visibility = on ? 'visible' : 'none'
  const suffixes =
    id === 'buildings'
      ? ['-fill', '-line']
      : id === 'flood'
        ? ['-fill']
        : id === 'roads' || id === 'river' || id === 'boundary'
          ? ['-line']
          : ['-circle']
  for (const suffix of suffixes) {
    const layerId = `${id}${suffix}`
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visibility)
    }
  }
}
