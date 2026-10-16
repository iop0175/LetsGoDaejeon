// 대전 버스 노선 검색. ODsay 프록시(Worker)를 서버에서 호출해 브라우저 CORS와 키 노출 문제를 피한다.
import { CITY } from '../../src/config/cities.js'
import { normalizeLane, normalizeRoute } from '../../src/utils/busRoutes.js'

const WORKER = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://letsgodaejeon-api.eoynx.workers.dev'
const DAEJEON_CID = 3000

const call = async (path) => {
  const response = await fetch(WORKER + '/api/odsay/' + path, {
    headers: { Origin: 'https://www.letsgodaejeon.kr' },
    signal: AbortSignal.timeout(15000)
  })
  if (!response.ok) throw new Error('버스 API ' + response.status)
  const data = await response.json()
  if (data.error) throw new Error(data.error.msg || data.error.message || '버스 API 오류')
  return data.result
}

export default async function handler(req, res) {
  if (req.method !== 'GET' || CITY.key !== 'daejeon') return res.status(404).json({ success: false })
  try {
    const id = String(req.query.id || '')
    if (id) {
      if (!/^\d{1,8}$/.test(id)) return res.status(400).json({ success: false, error: '노선 번호가 올바르지 않습니다.' })
      const detail = await call('busLaneDetail?busID=' + id)
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
      return res.status(200).json({ success: true, route: normalizeRoute(detail) })
    }
    const query = String(req.query.q || '').trim()
    if (!/^[0-9A-Za-z가-힣\-]{1,12}$/.test(query)) return res.status(400).json({ success: false, error: '버스 번호를 1~12자로 입력해 주세요.' })
    const result = await call('searchBusLane?busNo=' + encodeURIComponent(query) + '&CID=' + DAEJEON_CID)
    const lanes = (result?.lane || []).map(normalizeLane).filter((lane) => lane.city === '대전')
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json({ success: true, lanes })
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message })
  }
}
