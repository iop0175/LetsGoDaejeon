// 버스 실시간 도착: ?stop=정류장. 대전은 대전시 버스정보(정류장 번호), 부산·제주는 국토교통부 TAGO(정류소 ID).
import { CITY } from '../../src/config/cities.js'
import { assertOk, callTransit, listItems, normalizeArrival } from '../../src/utils/daejeonTransit.js'
import { TAGO_CITY, arrivals as tagoArrivals } from '../../src/services/tagoBus.js'

export default async function handler(req, res) {
  const daejeon = CITY.key === 'daejeon'
  if (req.method !== 'GET' || (!daejeon && !TAGO_CITY[CITY.key])) return res.status(404).json({ success: false })
  const stop = String(req.query.stop || '')
  if (!(daejeon ? /^\d{4,6}$/ : /^[A-Z]{3}\d{5,12}$/).test(stop)) return res.status(400).json({ success: false, error: 'stop이 필요합니다.' })
  try {
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20')
    if (!daejeon) return res.status(200).json({ success: true, arrivals: await tagoArrivals(CITY.key, stop) })
    const xml = assertOk(await callTransit('arrive/getArrInfoByUid', { arsId: stop }))
    const arrivals = listItems(xml).map(normalizeArrival).sort((a, b) => a.minutes - b.minutes)
    return res.status(200).json({ success: true, arrivals })
  } catch (error) {
    // 심야처럼 도착 예정 버스가 없으면 API가 '결과가 없습니다'를 오류로 돌려준다.
    if (/결과가 없습니다/.test(error.message)) return res.status(200).json({ success: true, arrivals: [] })
    return res.status(502).json({ success: false, error: error.message })
  }
}
