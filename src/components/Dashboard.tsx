import { useEffect, useMemo, useRef, useState } from 'react'
import type { CityConfig, CitySummary, IdpSite } from '../cities/types'
import {
  idpSitesFromGeoJSON,
  loadGeoJSON,
  loadInvestments,
  loadSummary,
  type InvestmentPoint,
} from '../lib/data'
import { KpiStrip } from './KpiStrip'
import { LayerPanel } from './LayerPanel'
import { MapView, type MapHandle } from './MapView'
import { PriorityTable } from './PriorityTable'
import { SourcesFooter } from './SourcesFooter'

interface DashboardProps {
  city: CityConfig
  embed: boolean
}

export function Dashboard({ city, embed }: DashboardProps) {
  const mapRef = useRef<MapHandle>(null)
  const [summary, setSummary] = useState<CitySummary | null>(null)
  const [sites, setSites] = useState<IdpSite[]>([])
  const [investments, setInvestments] = useState<InvestmentPoint[]>([])
  const [missingData, setMissingData] = useState(false)

  const [layerOn, setLayerOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(city.layers.map((l) => [l.id, l.defaultOn])),
  )

  useEffect(() => {
    setLayerOn(Object.fromEntries(city.layers.map((l) => [l.id, l.defaultOn])))
    let cancelled = false
    ;(async () => {
      const [nextSummary, idps, nextInvestments] = await Promise.all([
        loadSummary(city.slug),
        loadGeoJSON(city.slug, 'idps.geojson'),
        loadInvestments(city.slug),
      ])
      if (cancelled) return
      setSummary(nextSummary)
      setSites(idpSitesFromGeoJSON(idps))
      setInvestments(nextInvestments)
      setMissingData(!nextSummary)
    })()
    return () => {
      cancelled = true
    }
  }, [city])

  const layerOnStable = useMemo(() => layerOn, [layerOn])

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
      {!embed && (
        <header className="border-b border-slate-200 bg-[#1e4d7b] px-4 py-3 text-white">
          <div className="text-[11px] font-medium uppercase tracking-wider text-sky-100">
            Nagaad Municipal Risk Dashboard
          </div>
          <h1 className="text-xl font-semibold">
            {city.label}
            <span className="ml-2 text-sm font-normal text-sky-100">
              {city.region} · hazard, exposure, infrastructure
            </span>
          </h1>
        </header>
      )}
      {embed && (
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5">
          <div className="text-sm font-semibold text-slate-900">
            {city.label} municipal risk
          </div>
          <div className="text-[11px] text-slate-500">Nagaad · indicative MVP</div>
        </header>
      )}

      <div className={`flex min-h-0 flex-1 flex-col ${embed ? 'gap-2 p-2' : 'gap-3 p-3'}`}>
        <KpiStrip summary={summary} embed={embed} />
        {missingData && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Processed city data is not in this build yet. Run the ETL (see README) to generate
            GeoJSON, PMTiles, and summary.json.
          </div>
        )}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-h-[280px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <MapView
              ref={mapRef}
              city={city}
              layerOn={layerOnStable}
              investments={investments}
            />
          </div>
          <aside className="flex min-h-0 flex-col gap-2 overflow-hidden">
            <LayerPanel
              city={city}
              layerOn={layerOn}
              onToggle={(id) => setLayerOn((prev) => ({ ...prev, [id]: !prev[id] }))}
            />
            <PriorityTable
              sites={sites}
              onSelect={(site) => mapRef.current?.flyTo(site.lng, site.lat)}
            />
          </aside>
        </div>
      </div>
      <SourcesFooter generatedAt={summary?.generatedAt} embed={embed} />
    </div>
  )
}
