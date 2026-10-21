// 대전 버스 실시간: ?stop=정류장번호(도착 예정) 또는 ?route=노선코드(운행 중인 버스 위치)
import { CITY } from '../../src/config/cities.js'
import { assertOk, callTransit, listItems, normalizeArrival, normalizePosition } from '../../src/utils/daejeonTransit.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' || CITY.key !== 'daejeon') return res.status(404).json({ success: false })
  const stop = String(req.query.stop || '')
  const route = String(req.query.route || '')
  try {
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20')
    if (/^\d{4,6}$/.test(stop)) {
      const xml = assertOk(await callTransit('arrive/getArrInfoByUid', { arsId: stop }))
      const arrivals = listItems(xml).map(normalizeArrival).sort((a, b) => a.minutes - b.minutes)
      return res.status(200).json({ success: true, arrivals })
    }
    if (/^\d{8}$/.test(route)) {
      const xml = assertOk(await callTransit('busposinfo/getBusPosByRtid', { busRouteId: route }))
      return res.status(200).json({ success: true, buses: listItems(xml).map(normalizePosition) })
    }
    return res.status(400).json({ success: false, error: 'stop 또는 route가 필요합니다.' })
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message })
  }
}
