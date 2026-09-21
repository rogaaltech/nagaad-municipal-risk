import type { CityConfig } from './types'

export const beledweyne: CityConfig = {
  slug: 'beledweyne',
  label: 'Beledweyne',
  urbanName: 'Belet Weyne',
  region: 'Hiraan',
  center: [45.204, 4.736],
  zoom: 13,
  minZoom: 11,
  layers: [
    {
      id: 'flood',
      label: 'Historical flood extent',
      group: 'hazard',
      defaultOn: true,
      legend: [{ color: '#2563eb', label: 'Ever flooded (Juba–Shabelle events)' }],
    },
    {
      id: 'conflict',
      label: 'Conflict events',
      group: 'hazard',
      defaultOn: false,
      legend: [{ color: '#ca8a04', label: 'ACLED events (clipped to city)' }],
    },
    {
      id: 'buildings',
      label: 'Buildings',
      group: 'exposure',
      defaultOn: true,
      legend: [
        { color: '#dc2626', label: 'In flood extent' },
        { color: '#a8a29e', label: 'Outside flood extent' },
      ],
    },
    {
      id: 'idps',
      label: 'IDP and host sites',
      group: 'exposure',
      defaultOn: true,
      legend: [
        { color: '#c026d3', label: 'Site in flood extent' },
        { color: '#7c3aed', label: 'Site outside flood extent' },
      ],
    },
    {
      id: 'roads',
      label: 'Roads',
      group: 'infrastructure',
      defaultOn: true,
      legend: [{ color: '#44403c', label: 'OSM / SURP II roads' }],
    },
    {
      id: 'river',
      label: 'Shabelle river',
      group: 'infrastructure',
      defaultOn: true,
      legend: [{ color: '#0284c7', label: 'River centreline' }],
    },
    {
      id: 'boundary',
      label: 'City boundary',
      group: 'infrastructure',
      defaultOn: true,
      legend: [{ color: '#0f172a', label: 'Beledweyne urban extent' }],
    },
    {
      id: 'investments',
      label: 'Project investments',
      group: 'investment',
      defaultOn: true,
      legend: [{ color: '#059669', label: 'Nagaad / municipal works (when provided)' }],
    },
  ],
}
