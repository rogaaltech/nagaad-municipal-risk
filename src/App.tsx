import { getCity, parseRoute } from './cities'
import { Dashboard } from './components/Dashboard'

export default function App() {
  const { slug, embed } = parseRoute()
  const city = getCity(slug)
  return <Dashboard city={city} embed={embed} />
}
