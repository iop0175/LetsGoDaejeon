// 서버 전용: scripts/buildSeoulBusStops.mjs가 만든 서울 버스정류장 위치. 실시간 도착은 아직 없다.
import data from '../data/seoulBusStops.json'
import { nearestStops as nearest } from '../utils/busStops'

const stops = data.stops.map(([id, no, name, lat, lon]) => ({ id, no, name, lat, lon, routes: [] }))

export const nearestStops = (point, n = 3, maxKm = 0.5) => nearest(stops, point, n, maxKm)
