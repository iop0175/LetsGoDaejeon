import { CITY } from '../../src/config/cities.js'
import { loadBusan, normalizeBusanParking } from '../../src/utils/busanApi.js'
export const config = { maxDuration: 60 }

const formatTime = (value) => {
  const text = String(value || '').padStart(4, '0')
  return text === '2400' ? '24:00' : `${text.slice(0, 2)}:${text.slice(2)}`
}

export const normalizeSeoulParking = (item) => ({
  name: item.PKLT_NM,
  parkingId: item.PKLT_CD,
  lat: Number(item.LAT) || 0,
  lon: Number(item.LOT) || 0,
  addr: item.ADDR,
  addrRoad: item.ADDR,
  divideNum: '6',
  typeNum: item.PKLT_KND_NM?.includes('노외') ? '2' : '1',
  parkingType: '공영',
  parkingCategory: item.PKLT_KND_NM,
  totalLot: Number(item.TPKCT) || 0,
  weekdayOpen: formatTime(item.WD_OPER_BGNG_TM),
  weekdayClose: formatTime(item.WD_OPER_END_TM),
  satOpen: formatTime(item.WE_OPER_BGNG_TM),
  satClose: formatTime(item.WE_OPER_END_TM),
  holidayOpen: formatTime(item.LHLDY_BGNG),
  holidayClose: formatTime(item.LHLDY),
  chargeInfo: item.CHGD_FREE_NM,
  basicTime: Number(item.PRK_HM) || 0,
  basicCharge: Number(item.PRK_CRG) || 0,
  addTime: Number(item.ADD_UNIT_TM_MNT) || 0,
  addCharge: Number(item.ADD_CRG) || 0,
  dayTicket: Number(item.DLY_MAX_CRG) || 0,
  monthTicket: Number(item.MNTL_CMUT_CRG) || 0,
  phone: item.TELNO,
  referenceDate: item.LAST_DATA_SYNC_TM
})

const fetchRange = async (key, start, end) => {
  const url = `http://openapi.seoul.go.kr:8088/${key}/json/GetParkInfo/${start}/${end}/`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`서울 주차 API ${response.status}`)
  const data = await response.json()
  const service = data.GetParkInfo
  if (!service || service.RESULT?.CODE !== 'INFO-000') {
    throw new Error(service?.RESULT?.MESSAGE || data.RESULT?.MESSAGE || '서울 주차 API 응답 오류')
  }
  return service
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, items: [], totalCount: 0 })
  if (CITY.key === 'busan') {
    try {
      const rows = await loadBusan('parking')
      const items = [...new Map(rows.map(normalizeBusanParking).map(item => [item.parkingId, item])).values()]
      const pageNo = Math.max(1, Math.floor(Number(req.query.pageNo) || 1))
      const numOfRows = Math.min(3000, Math.max(1, Math.floor(Number(req.query.numOfRows) || 50)))
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
      return res.status(200).json({ success: true, totalCount: items.length, items: items.slice((pageNo - 1) * numOfRows, pageNo * numOfRows) })
    } catch (error) {
      return res.status(502).json({ success: false, items: [], totalCount: 0, error: error.message })
    }
  }
  if (CITY.key !== 'seoul') return res.status(404).json({ success: false, items: [], totalCount: 0 })

  const key = process.env.SEOUL_OPENAPI_KEY?.trim()
  if (!key) return res.status(503).json({ success: false, items: [], totalCount: 0, error: '서울 주차 API 키가 없습니다.' })

  try {
    const pageNo = Math.max(1, Number(req.query.pageNo) || 1)
    const numOfRows = Math.min(3000, Math.max(1, Number(req.query.numOfRows) || 50))
    const start = (pageNo - 1) * numOfRows + 1
    const first = await fetchRange(key, start, Math.min(start + 999, start + numOfRows - 1))
    const totalCount = Number(first.list_total_count) || 0
    const remainingStarts = []
    for (let next = start + 1000; next <= Math.min(totalCount, start + numOfRows - 1); next += 1000) {
      remainingStarts.push(next)
    }
    const remaining = await Promise.all(
      remainingStarts.map(next => fetchRange(key, next, Math.min(next + 999, start + numOfRows - 1, totalCount)))
    )
    const rows = [first, ...remaining].flatMap(service => service.row || [])
    // 노상 주차장은 구간마다 같은 PKLT_CD 행이 반복되므로 첫 행만 남긴다
    const seen = new Set()
    const items = rows.filter(row => !seen.has(row.PKLT_CD) && seen.add(row.PKLT_CD))

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json({ success: true, totalCount, items: items.map(normalizeSeoulParking) })
  } catch (error) {
    return res.status(502).json({ success: false, items: [], totalCount: 0, error: error.message })
  }
}
