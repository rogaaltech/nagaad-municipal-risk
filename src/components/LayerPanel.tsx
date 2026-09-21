import type { CityConfig, LayerGroup } from '../cities/types'

const GROUP_LABEL: Record<LayerGroup, string> = {
  hazard: 'Hazard',
  exposure: 'Exposure',
  infrastructure: 'Infrastructure',
  investment: 'Investment',
}

interface LayerPanelProps {
  city: CityConfig
  layerOn: Record<string, boolean>
  onToggle: (id: string) => void
}

export function LayerPanel({ city, layerOn, onToggle }: LayerPanelProps) {
  const groups: LayerGroup[] = ['hazard', 'exposure', 'infrastructure', 'investment']

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-slate-900">Layers</h2>
      {groups.map((group) => {
        const layers = city.layers.filter((l) => l.group === group)
        if (!layers.length) return null
        return (
          <div key={group} className="mb-3 last:mb-0">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {GROUP_LABEL[group]}
            </div>
            <ul className="space-y-1.5">
              {layers.map((layer) => (
                <li key={layer.id}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={layerOn[layer.id] !== false}
                      onChange={() => onToggle(layer.id)}
                    />
                    <span>
                      <span className="text-slate-800">{layer.label}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                        {layer.legend.map((item) => (
                          <span
                            key={item.label}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-500"
                          >
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-sm"
                              style={{ background: item.color }}
                            />
                            {item.label}
                          </span>
                        ))}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
