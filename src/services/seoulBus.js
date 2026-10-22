// 서버 전용: scripts/buildSeoulBusStops.mjs가 만든 서울 버스정류장 위치. 실시간 도착은 표지판 번호(ARS)로 조회한다.
import data from '../data/seoulBusStops.json'
import { nearestStops as nearest } from '../utils/busStops'

// ARS 번호가 없는 정류장(가상 정류장 등)은 도착 조회가 안 돼서 뺀다.
const stops = data.stops.filter(([, no]) => /^\d{5}$/.test(no)).map(([, no, name, lat, lon]) => ({ id: no, no, name, lat, lon, routes: [] }))

export const nearestStops = (point, n = 3, maxKm = 0.5) => nearest(stops, point, n, maxKm)
