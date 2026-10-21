// 서버 전용: scripts/buildDaejeonBus.mjs가 만든 노선·정류장 목록. 화면(브라우저)으로는 보내지 않는다.
import data from '../data/daejeonBus.json'
import { generateSlug } from '../utils/slugUtils'
import { distanceKm } from '../utils/parkingFormat'

export const routes = data.routes
export const stops = Object.values(data.stops)
export const builtAt = data.builtAt

const routeById = new Map(routes.map((route) => [route.id, route]))
const stopById = new Map(stops.map((stop) => [stop.id, stop]))

export const routeSlug = (route) => generateSlug(`${route.no}번`, route.id)
export const stopSlug = (stop) => generateSlug(stop.name, stop.id)
export const routePath = (route) => `/bus/route/${routeSlug(route)}`
export const stopPath = (stop) => `/bus/stop/${stopSlug(stop)}`

const idOf = (slug) => String(slug).match(/-(\d+)$/)?.[1] || (/^\d+$/.test(slug) ? slug : null)
export const findRoute = (slug) => routeById.get(idOf(slug)) || null
export const findStop = (slug) => stopById.get(idOf(slug)) || null
export const getStop = (id) => stopById.get(id) || null
export const stopName = (id) => stopById.get(id)?.name || ''

// 노선번호 순(숫자 먼저, 그 안에서 자연 정렬)
export const sortedRoutes = [...routes].sort((a, b) => a.no.localeCompare(b.no, 'ko', { numeric: true }))

// 좌표에서 가까운 정류장 n곳. 반경 밖이면 비운다.
export const nearestStops = ({ lat, lon }, n = 3, maxKm = 0.5) => {
  if (!(lat > 0 && lon > 0)) return []
  return stops
    .filter((stop) => stop.lat > 0 && Math.abs(stop.lat - lat) < 0.01 && Math.abs(stop.lon - lon) < 0.012)
    .map((stop) => ({ stop, km: distanceKm({ lat, lon }, stop) }))
    .filter((item) => item.km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, n)
    .map(({ stop, km }) => ({ id: stop.id, name: stop.name, slug: stopSlug(stop), meters: Math.round(km * 1000 / 10) * 10, routeCount: stop.routes.length }))
}

export const routeNos = (stop) => stop.routes.map((id) => routeById.get(id)).filter(Boolean).sort((a, b) => a.no.localeCompare(b.no, 'ko', { numeric: true }))
