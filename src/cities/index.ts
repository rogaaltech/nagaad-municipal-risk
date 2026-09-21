import { beledweyne } from './beledweyne'
import type { CityConfig } from './types'

export const cities: CityConfig[] = [beledweyne]

export function getCity(slug: string | undefined): CityConfig {
  return cities.find((c) => c.slug === slug) ?? beledweyne
}

export function parseRoute(): { slug: string; embed: boolean } {
  const params = new URLSearchParams(window.location.search)
  const embed = params.get('embed') === '1' || params.get('embed') === 'true'
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  let path = window.location.pathname
  if (base && path.startsWith(base)) {
    path = path.slice(base.length)
  }
  const slug = path.split('/').filter(Boolean)[0] ?? 'beledweyne'
  return { slug, embed }
}
