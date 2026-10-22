// 서버 전용: scripts/buildDaejeonBus.mjs가 만든 노선·정류장 목록. 화면(브라우저)으로는 보내지 않는다.
import data from '../data/daejeonBus.json'
import { nearestStops as nearest } from '../utils/busStops'

const stops = Object.values(data.stops)
const routeById = new Map(data.routes.map((route) => [route.id, route]))

const routeNos = (stop) => stop.routes.map((id) => routeById.get(id)?.no).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }))

// 좌표에서 가까운 정류장과 그 정류장에 서는 노선 번호. 대전은 정류장 번호(id)로 실시간 도착을 조회한다.
export const nearestStops = (point, n = 3, maxKm = 0.5) =>
  nearest(stops, point, n, maxKm).map((stop) => ({ id: stop.id, no: stop.id, name: stop.name, lat: stop.lat, lon: stop.lon, meters: stop.meters, routes: [...new Set(routeNos(stop))] }))
