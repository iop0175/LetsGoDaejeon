import { distanceKm } from './parkingFormat.js'

// 좌표에서 가까운 정류장 n곳(반경 maxKm 안). 각 정류장에 meters(10m 단위)를 붙인다.
export const nearestStops = (stops, { lat, lon }, n = 3, maxKm = 0.5) => {
  if (!(lat > 0 && lon > 0)) return []
  return stops
    .filter((stop) => stop.lat > 0 && Math.abs(stop.lat - lat) < 0.01 && Math.abs(stop.lon - lon) < 0.012)
    .map((stop) => ({ ...stop, km: distanceKm({ lat, lon }, stop) }))
    .filter((stop) => stop.km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, n)
    .map(({ km, ...stop }) => ({ ...stop, meters: Math.round(km * 100) * 10 }))
}
