// 대전 버스 실시간: ?stop=정류장번호(도착 예정)
import { CITY } from '../../src/config/cities.js'
import { assertOk, callTransit, listItems, normalizeArrival } from '../../src/utils/daejeonTransit.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' || CITY.key !== 'daejeon') return res.status(404).json({ success: false })
  const stop = String(req.query.stop || '')
  try {
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20')
    if (/^\d{4,6}$/.test(stop)) {
      const xml = assertOk(await callTransit('arrive/getArrInfoByUid', { arsId: stop }))
      const arrivals = listItems(xml).map(normalizeArrival).sort((a, b) => a.minutes - b.minutes)
      return res.status(200).json({ success: true, arrivals })
    }
    return res.status(400).json({ success: false, error: 'stop이 필요합니다.' })
  } catch (error) {
    // 심야처럼 도착 예정 버스가 없으면 API가 '결과가 없습니다'를 오류로 돌려준다.
    if (/결과가 없습니다/.test(error.message)) return res.status(200).json({ success: true, arrivals: [] })
    return res.status(502).json({ success: false, error: error.message })
  }
}
