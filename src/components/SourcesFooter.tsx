interface SourcesFooterProps {
  generatedAt?: string
  embed: boolean
}

export function SourcesFooter({ generatedAt, embed }: SourcesFooterProps) {
  return (
    <footer
      className={`border-t border-slate-200 bg-slate-50 text-[11px] leading-snug text-slate-600 ${
        embed ? 'px-3 py-1.5' : 'px-4 py-2'
      }`}
    >
      <p>
        Indicative screening only — not a full probabilistic risk model. Flood is a historical
        Juba–Shabelle extent clipped to the city, intersected with buildings, roads, and IDP sites.
        Conflict events from ACLED (Raleigh, Linke, Hegre & Karlsen); attribution required.
        Buildings from SURP II footprints; roads from OSM/SURP II; IDP sites from IOM DTM / SURP II.
        Basemap © OpenStreetMap © CARTO.
        {generatedAt ? ` Data processed ${generatedAt.slice(0, 10)}.` : ''}
      </p>
    </footer>
  )
}
