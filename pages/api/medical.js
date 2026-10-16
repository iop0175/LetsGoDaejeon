import { CITY } from '../../src/config/cities.js'
import { loadBusan, normalizeBusanMedical } from '../../src/utils/busanApi.js'

const SERVICES = ['TbHospitalInfo', 'TbPharmacyOperateInfo']
const CACHE_TTL = 24 * 60 * 60 * 1000
export const config = { maxDuration: 60 }

export const normalizeSeoulMedical = (item) => ({
  hsptlNm: item.DUTYNAME,
  hsptlKnd: item.DUTYDIVNAM || '약국',
  locplc: item.DUTYADDR,
  telno: item.DUTYTEL1,
  lat: Number(item.WGS84LAT) || 0,
  lon: Number(item.WGS84LON) || 0,
  district: item.DUTYADDR?.split(' ')[1] || null,
  // 도로명 주소 괄호 안 법정동만 쓴다. 본문에서 찾으면 '영동대로', '상가동' 같은 오탐이 난다
  dong: item.DUTYADDR?.match(/\(([가-힣0-9.]+동(?:\d+가)?)[,)]/)?.[1] || null
})

export const filterMedical = (items, { q = '', type = 'all', district = 'all', dong = 'all' }) => {
  const query = q.trim().toLowerCase()
  return items.filter(item =>
    (!query || item.hsptlNm?.toLowerCase().includes(query) || item.locplc?.toLowerCase().includes(query)) &&
    (type === 'all' || item.hsptlKnd?.includes(type)) &&
    (district === 'all' || item.district === district) &&
    (dong === 'all' || item.dong === dong)
  )
}

const fetchRange = async (key, service, start, end) => {
  const response = await fetch(`http://openapi.seoul.go.kr:8088/${key}/json/${service}/${start}/${end}/`)
  if (!response.ok) throw new Error(`서울 의료 API ${response.status}`)
  const data = await response.json()
  if (data[service]?.RESULT?.CODE !== 'INFO-000') {
    throw new Error(data[service]?.RESULT?.MESSAGE || data.RESULT?.MESSAGE || '서울 의료 API 응답 오류')
  }
  return data[service]
}

const fetchService = async (key, service) => {
  const first = await fetchRange(key, service, 1, 1000)
  const total = Number(first.list_total_count) || 0
  const rest = []
  for (let start = 1001; start <= total; start += 1000) {
    rest.push(fetchRange(key, service, start, Math.min(start + 999, total)))
  }
  return [first, ...await Promise.all(rest)].flatMap(page => page.row || [])
}

// 전체가 약 2만 9천 곳, 4.7MB라 응답 한도를 넘으므로 인스턴스 메모리에 두고 서버에서 거른다
let cache = { at: 0, items: null }
const loadAll = async (key) => {
  if (cache.items && Date.now() - cache.at < CACHE_TTL) return cache.items
  const rows = (await Promise.all(SERVICES.map(service => fetchService(key, service)))).flat()
  cache = { at: Date.now(), items: rows.map(normalizeSeoulMedical) }
  return cache.items
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, items: [], totalCount: 0 })
  if (!['seoul', 'busan', 'jeju'].includes(CITY.key)) return res.status(404).json({ success: false, items: [], totalCount: 0 })

  const key = process.env.SEOUL_OPENAPI_KEY?.trim()
  if (CITY.key === 'seoul' && !key) return res.status(503).json({ success: false, items: [], totalCount: 0, error: '서울 의료 API 키가 없습니다.' })

  try {
    const all = CITY.key !== 'seoul' ? (await loadBusan('medical', CITY.key)).map(normalizeBusanMedical) : await loadAll(key)
    const filters = {
      q: String(req.query.q || ''),
      type: String(req.query.type || 'all'),
      district: String(req.query.district || 'all'),
      dong: String(req.query.dong || 'all')
    }
    const filtered = filterMedical(all, filters)
    const pageNo = Math.max(1, Number(req.query.pageNo) || 1)
    const numOfRows = Math.min(100, Math.max(1, Number(req.query.numOfRows) || 12))
    const dongs = filters.district === 'all'
      ? []
      : [...new Set(all.filter(item => item.district === filters.district).map(item => item.dong).filter(Boolean))].sort()

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json({
      success: true,
      totalCount: filtered.length,
      items: filtered.slice((pageNo - 1) * numOfRows, pageNo * numOfRows),
      dongs
    })
  } catch (error) {
    return res.status(502).json({ success: false, items: [], totalCount: 0, error: error.message })
  }
}
