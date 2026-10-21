// 서버 전용: scripts/buildDaejeonBus.mjs가 만든 노선·정류장 목록. 화면(브라우저)으로는 보내지 않는다.
import data from '../data/daejeonBus.json'
import { distanceKm } from '../utils/parkingFormat'

const stops = Object.values(data.stops)
const routeById = new Map(data.routes.map((route) => [route.id, route]))

const routeNos = (stop) => stop.routes.map((id) => routeById.get(id)?.no).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }))

// 좌표에서 가까운 정류장 n곳과 그 정류장에 서는 노선 번호. 반경 밖이면 비운다.
export const nearestStops = ({ lat, lon }, n = 3, maxKm = 0.5) => {
  if (!(lat > 0 && lon > 0)) return []
  return stops
    .filter((stop) => stop.lat > 0 && Math.abs(stop.lat - lat) < 0.01 && Math.abs(stop.lon - lon) < 0.012)
    .map((stop) => ({ stop, km: distanceKm({ lat, lon }, stop) }))
    .filter((item) => item.km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, n)
    .map(({ stop, km }) => ({ id: stop.id, name: stop.name, lat: stop.lat, lon: stop.lon, meters: Math.round(km * 1000 / 10) * 10, routes: [...new Set(routeNos(stop))] }))
}
