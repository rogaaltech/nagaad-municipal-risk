import type { CitySummary, IdpSite } from '../cities/types'

interface FeatureLike {
  geometry?: {
    type: string
    coordinates: number[] | number[][]
  } | null
  properties?: Record<string, unknown> | null
}

interface FeatureCollectionLike {
  features: FeatureLike[]
}

export function dataUrl(slug: string, file: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}data/${slug}/${file}`
}

export function pmtilesUrl(href: string): string {
  return `pmtiles://${new URL(href, window.location.href).href}`
}

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function flag(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true'
}

export async function loadSummary(slug: string): Promise<CitySummary | null> {
  const res = await fetch(dataUrl(slug, 'summary.json'))
  if (!res.ok) return null
  return (await res.json()) as CitySummary
}

export async function loadGeoJSON(slug: string, file: string): Promise<FeatureCollectionLike | null> {
  const res = await fetch(dataUrl(slug, file))
  if (!res.ok) return null
  return (await res.json()) as FeatureCollectionLike
}

export function idpSitesFromGeoJSON(fc: FeatureCollectionLike | null): IdpSite[] {
  if (!fc) return []
  return fc.features.flatMap((feature) => {
    const g = feature.geometry
    if (!g || (g.type !== 'Point' && g.type !== 'MultiPoint')) return []
    const coords = (g.type === 'Point' ? g.coordinates : g.coordinates[0]) as number[]
    if (!coords || coords.length < 2) return []
    const p = feature.properties ?? {}
    return [
      {
        name: String(p.settlementName ?? p.name ?? 'Unnamed site'),
        class: String(p.settlementClass ?? p.class ?? ''),
        individuals: num(p.idpIndividuals),
        households: num(p.idpHouseholds),
        inFlood: flag(p.inFlood),
        lng: coords[0],
        lat: coords[1],
      },
    ]
  })
}

export interface InvestmentPoint {
  name: string
  type: string
  status: string
  cost: string
  lng: number
  lat: number
}

export async function loadInvestments(slug: string): Promise<InvestmentPoint[]> {
  const res = await fetch(dataUrl(slug, 'investments.csv'))
  if (!res.ok) return []
  const text = await res.text()
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)
  return lines.slice(1).flatMap((line) => {
    const cols = line.split(',').map((c) => c.trim())
    const lng = Number(cols[idx('lng')])
    const lat = Number(cols[idx('lat')])
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return []
    return [
      {
        name: cols[idx('name')] || 'Investment',
        type: cols[idx('type')] || '',
        status: cols[idx('status')] || '',
        cost: cols[idx('cost')] || '',
        lng,
        lat,
      },
    ]
  })
}

export function formatInt(n: number): string {
  return new Intl.NumberFormat('en').format(Math.round(n))
}

export function formatKm(n: number): string {
  return `${n.toFixed(1)} km`
}

export function formatHa(n: number): string {
  return `${formatInt(n)} ha`
}
