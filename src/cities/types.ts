export type LayerGroup = 'hazard' | 'exposure' | 'infrastructure' | 'investment'

export interface LegendItem {
  color: string
  label: string
}

export interface LayerDef {
  id: string
  label: string
  group: LayerGroup
  defaultOn: boolean
  legend: LegendItem[]
}

export interface CityConfig {
  slug: string
  label: string
  urbanName: string
  region: string
  center: [number, number]
  zoom: number
  minZoom?: number
  layers: LayerDef[]
}

export interface CitySummary {
  city: string
  urbanName: string
  generatedAt: string
  buildingsTotal: number
  buildingsInFlood: number
  idpSitesTotal: number
  idpSitesInFlood: number
  idpIndividualsTotal: number
  idpIndividualsInFlood: number
  idpHouseholdsInFlood: number
  roadsKmTotal: number
  roadsKmInFlood: number
  conflictEvents: number
  floodAreaHa: number
}

export interface IdpSite {
  name: string
  class: string
  individuals: number
  households: number
  inFlood: boolean
  lng: number
  lat: number
}
