import type { CitySummary } from '../cities/types'
import { formatHa, formatInt, formatKm } from '../lib/data'

interface KpiStripProps {
  summary: CitySummary | null
  embed: boolean
}

export function KpiStrip({ summary, embed }: KpiStripProps) {
  const items = [
    {
      label: 'Buildings in flood',
      value: summary ? formatInt(summary.buildingsInFlood) : '—',
      hint: summary ? `of ${formatInt(summary.buildingsTotal)} footprints` : 'Run ETL to populate',
    },
    {
      label: 'IDP people exposed',
      value: summary ? formatInt(summary.idpIndividualsInFlood) : '—',
      hint: summary
        ? `${formatInt(summary.idpSitesInFlood)} of ${formatInt(summary.idpSitesTotal)} sites`
        : 'Sites intersecting flood',
    },
    {
      label: 'Roads in flood',
      value: summary ? formatKm(summary.roadsKmInFlood) : '—',
      hint: summary ? `of ${formatKm(summary.roadsKmTotal)} mapped` : 'Intersected length',
    },
    {
      label: 'Conflict events',
      value: summary ? formatInt(summary.conflictEvents) : '—',
      hint: summary ? `${formatHa(summary.floodAreaHa)} flood area` : 'ACLED in city extent',
    },
  ]

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 ${embed ? 'gap-2' : 'gap-3'}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {item.label}
          </div>
          <div className={`font-semibold text-slate-900 ${embed ? 'text-lg' : 'text-2xl'}`}>
            {item.value}
          </div>
          <div className="text-[11px] text-slate-500">{item.hint}</div>
        </div>
      ))}
    </div>
  )
}
