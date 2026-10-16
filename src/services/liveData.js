import { CITY } from '../config/cities'

const fetchJson = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.json()
}

export async function fetchLiveData() {
  const { y: lat, x: lng } = CITY.center
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=sunrise,sunset,precipitation_probability_max&timezone=Asia%2FSeoul&forecast_days=2`
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5&timezone=Asia%2FSeoul`
  const seaPoint = CITY.key === 'busan' ? { lat: 35.15, lng: 129.16 } : CITY.key === 'jeju' ? { lat: 33.48, lng: 126.49 } : null
  const seaUrl = seaPoint ? `https://marine-api.open-meteo.com/v1/marine?latitude=${seaPoint.lat}&longitude=${seaPoint.lng}&current=wave_height,sea_surface_temperature&timezone=Asia%2FSeoul` : null

  const [weatherResult, airResult, seaResult] = await Promise.allSettled([
    fetchJson(weatherUrl),
    fetchJson(airUrl),
    seaUrl ? fetchJson(seaUrl) : Promise.resolve(null)
  ])
  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null
  const air = airResult.status === 'fulfilled' ? airResult.value : null
  const sea = seaResult.status === 'fulfilled' ? seaResult.value : null

  return {
    updatedAt: new Date().toISOString(),
    weather: weather?.current || null,
    daily: weather?.daily ? {
      sunrise: weather.daily.sunrise?.[0] || null,
      sunset: weather.daily.sunset?.[0] || null,
      rainChance: weather.daily.precipitation_probability_max?.[0] ?? null
    } : null,
    air: air?.current || null,
    sea: sea?.current || null
  }
}
