// 서울 지하철 실시간 도착. 20초 캐시한다.
import { CITY } from '../../src/config/cities.js'
import { isSubwayStation, normalizeArrival, groupArrivals } from '../../src/utils/subway.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' || CITY.key !== 'seoul') return res.status(404).json({ success: false, groups: [] })
  const station = String(req.query.station || '서울')
  if (!isSubwayStation(station)) return res.status(400).json({ success: false, groups: [], error: '지원하지 않는 역입니다.' })
  const key = process.env.SEOUL_SUBWAY_API_KEY?.trim()
  if (!key) return res.status(503).json({ success: false, groups: [], error: '지하철 API 키가 없습니다.' })
  try {
    const response = await fetch('http://swopenAPI.seoul.go.kr/api/subway/' + key + '/json/realtimeStationArrival/0/40/' + encodeURIComponent(station), { signal: AbortSignal.timeout(10000) })
    const data = await response.json()
    const code = data.errorMessage?.code
    // INFO-200은 도착 정보가 없는 시간대(막차 이후 등)라서 오류가 아니다
    if (code !== 'INFO-000' && code !== 'INFO-200') return res.status(502).json({ success: false, groups: [], error: data.errorMessage?.message || '지하철 API 오류' })
    const items = (data.realtimeArrivalList || []).filter((row) => row.statnNm === station).map(normalizeArrival)
    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40')
    return res.status(200).json({ success: true, station, updatedAt: new Date().toISOString(), groups: groupArrivals(items) })
  } catch (error) {
    return res.status(502).json({ success: false, groups: [], error: error.message })
  }
}
