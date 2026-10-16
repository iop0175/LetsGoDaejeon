// 해수욕장 바다 컨디션. Open-Meteo 해양·기상 예보를 해수욕장 좌표로 조회한다. 공식 입수 가능 여부가 아니라 참고 정보다.
export const BEACHES = {
  busan: [
    { id: 'haeundae', ko: '해운대해수욕장', en: 'Haeundae Beach', lat: 35.1587, lng: 129.1604 },
    { id: 'gwangalli', ko: '광안리해수욕장', en: 'Gwangalli Beach', lat: 35.1532, lng: 129.1186 },
    { id: 'songjeong', ko: '송정해수욕장', en: 'Songjeong Beach', lat: 35.1789, lng: 129.1999 },
    { id: 'songdo', ko: '송도해수욕장', en: 'Songdo Beach', lat: 35.0759, lng: 129.017 },
    { id: 'dadaepo', ko: '다대포해수욕장', en: 'Dadaepo Beach', lat: 35.0466, lng: 128.966 },
    { id: 'ilgwang', ko: '일광해수욕장', en: 'Ilgwang Beach', lat: 35.2612, lng: 129.2339 },
    { id: 'imrang', ko: '임랑해수욕장', en: 'Imrang Beach', lat: 35.3185, lng: 129.2587 }
  ],
  jeju: [
    { id: 'hyeopjae', ko: '협재해수욕장', en: 'Hyeopjae Beach', lat: 33.3939, lng: 126.2398 },
    { id: 'hamdeok', ko: '함덕해수욕장', en: 'Hamdeok Beach', lat: 33.5434, lng: 126.67 },
    { id: 'iho', ko: '이호테우해변', en: 'Iho Tewoo Beach', lat: 33.4983, lng: 126.4527 },
    { id: 'gwakji', ko: '곽지해수욕장', en: 'Gwakji Beach', lat: 33.4501, lng: 126.305 },
    { id: 'jungmun', ko: '중문색달해변', en: 'Jungmun Saekdal Beach', lat: 33.2453, lng: 126.4122 },
    { id: 'gimnyeong', ko: '김녕해수욕장', en: 'Gimnyeong Beach', lat: 33.558, lng: 126.7619 },
    { id: 'pyoseon', ko: '표선해수욕장', en: 'Pyoseon Beach', lat: 33.3258, lng: 126.8319 },
    { id: 'samyang', ko: '삼양검은모래해변', en: 'Samyang Black Sand Beach', lat: 33.5237, lng: 126.587 }
  ]
}

// 파고와 바람으로 3단계를 매긴다. 0 잔잔함, 1 주의, 2 높음, null 정보 없음
export const seaLevel = ({ wave, wind }) => {
  if (wave == null || wind == null) return null
  if (wave <= 0.5 && wind <= 25) return 0
  if (wave <= 1 && wind <= 35) return 1
  return 2
}

// 수온 구간: 0 따뜻함, 1 서늘함, 2 차가움
export const waterLevel = (temp) => temp == null ? null : temp >= 21 ? 0 : temp >= 17 ? 1 : 2

export const buildBeachRows = (beaches, marine, weather) => beaches.map((beach, index) => {
  const sea = marine?.[index]?.current || {}
  const sky = weather?.[index]?.current || {}
  const uv = weather?.[index]?.daily?.uv_index_max?.[0]
  const row = {
    ...beach,
    wave: sea.wave_height ?? null,
    period: sea.wave_period ?? null,
    water: sea.sea_surface_temperature ?? null,
    air: sky.temperature_2m ?? null,
    wind: sky.wind_speed_10m ?? null,
    code: sky.weather_code ?? null,
    uv: uv ?? null
  }
  return { ...row, level: seaLevel(row), waterGrade: waterLevel(row.water) }
})

const fetchJson = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw new Error(response.status + ' ' + response.statusText)
  const data = await response.json()
  return Array.isArray(data) ? data : [data]
}

export async function fetchBeachConditions(cityKey) {
  const beaches = BEACHES[cityKey] || []
  if (!beaches.length) return { updatedAt: null, rows: [] }
  const lat = beaches.map((beach) => beach.lat).join(',')
  const lng = beaches.map((beach) => beach.lng).join(',')
  const [marine, weather] = await Promise.allSettled([
    fetchJson('https://marine-api.open-meteo.com/v1/marine?latitude=' + lat + '&longitude=' + lng + '&current=wave_height,wave_period,sea_surface_temperature&timezone=Asia%2FSeoul'),
    fetchJson('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng + '&current=temperature_2m,wind_speed_10m,weather_code&daily=uv_index_max&forecast_days=1&timezone=Asia%2FSeoul')
  ])
  const rows = buildBeachRows(beaches, marine.value, weather.value)
  return { updatedAt: new Date().toISOString(), rows }
}
