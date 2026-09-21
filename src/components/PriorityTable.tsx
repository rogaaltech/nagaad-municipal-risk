import type { IdpSite } from '../cities/types'
import { formatInt } from '../lib/data'

interface PriorityTableProps {
  sites: IdpSite[]
  onSelect: (site: IdpSite) => void
}

export function PriorityTable({ sites, onSelect }: PriorityTableProps) {
  const rows = sites
    .filter((s) => s.inFlood)
    .sort((a, b) => b.individuals - a.individuals)
    .slice(0, 15)

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-900">Priority IDP sites in flood</h2>
        <p className="text-[11px] text-slate-500">
          Largest populations intersecting historical flood extent. Click to zoom.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500">No exposed IDP sites in the processed data.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-1.5 font-medium">Site</th>
                <th className="px-2 py-1.5 font-medium">People</th>
                <th className="px-3 py-1.5 font-medium">HH</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((site) => (
                <tr
                  key={`${site.name}-${site.lng}`}
                  className="cursor-pointer border-t border-slate-100 hover:bg-sky-50"
                  onClick={() => onSelect(site)}
                >
                  <td className="px-3 py-1.5">
                    <div className="font-medium text-slate-800">{site.name}</div>
                    <div className="text-[10px] text-slate-500">{site.class}</div>
                  </td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-800">{formatInt(site.individuals)}</td>
                  <td className="px-3 py-1.5 tabular-nums text-slate-600">{formatInt(site.households)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
