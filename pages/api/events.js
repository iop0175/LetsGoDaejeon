// 축제·행사 자동 게시. 도시별 출처에서 행사를 실시간으로 모아 오늘 진행 중인 것만 돌려준다.
// performances 테이블은 관리용이다. 관리자가 숨긴 행사(is_active=false)는 빠지고,
// 관리자가 예전에 직접 넣은 활성 행사는 합쳐진다. 익명 키로는 쓰기가 막혀(RLS) 수집 결과를 저장하지 않는다.
// GET /api/events          공개 화면용, 오늘 진행 중 + 숨김 제외, 1시간 캐시
// GET /api/events?all=1    관리자용, 종료 전 전체 + hidden 표시, 캐시 없음
import { createClient } from '@supabase/supabase-js'
import { CITY } from '../../src/config/cities.js'
import { fetchKcisa } from './kcisa/[op].js'
import { loadBusan, normalizeBusanStory } from '../../src/utils/busanApi.js'

export const config = { maxDuration: 60 }

const WORKERS_API_URL = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://letsgodaejeon-api.eoynx.workers.dev'
const WORKER_HEADERS = { Origin: 'https://www.letsgodaejeon.kr' }

export const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)

const compact = (date) => (date || '').slice(0, 10).replace(/-/g, '')
const iso = (yyyymmdd) => yyyymmdd?.length === 8 ? `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}` : null
const decode = (text) => (text || '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&lsquo;|&rsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, '&')
  .trim()

export const toRow = ({ title, type, start, end, site, charge, contact, url, image, description }) => ({
  title: decode(title),
  type: type || null,
  event_period: `${compact(start)} ~ ${compact(end || start)}`,
  start_date: start,
  end_date: end || start,
  event_site: decode(site) || null,
  charge: decode(charge) || null,
  contact_point: decode(contact) || null,
  url: url || null,
  image_url: image || null,
  description: decode(description) || null,
  view_count: 0,
  is_active: true,
  city_key: CITY.key
})

// CNV_060은 지역 필드가 없어 장소명과 "[도시명]" 태그로 거른다(api.js isCityPerformance와 같은 규칙).
export const isCityKcisa = (item, names = [CITY.cityName, ...(CITY.aliases || [])]) =>
  names.some(name => (item.eventSite || '').includes(name) || (item.title || '').includes(`[${name}]`))

// 최신 등록순이라 앞쪽 몇 페이지만 보면 된다. 매일 돌면서 쌓이므로 오래된 장기 전시도 결국 들어온다.
const fromKcisa = async () => {
  const pages = await Promise.all([1, 2, 3].map(pageNo => fetchKcisa('CNV_060', { numOfRows: '1000', pageNo: String(pageNo) })))
  return pages.flatMap(page => page.items || []).filter(item => isCityKcisa(item)).map(item => {
    const [start, end] = (item.eventPeriod || '').split('~').map(part => iso(part.trim()))
    return start && toRow({
      title: item.title, type: item.type || '공연·전시', start, end, site: item.eventSite, charge: item.charge,
      contact: item.contactPoint, url: item.url, image: item.imageObject, description: item.description
    })
  })
}

const fromTourApi = async (today) => {
  const params = new URLSearchParams({
    areaCode: CITY.tourApiAreaCode, eventStartDate: `${Number(today.slice(0, 4)) - 1}${today.slice(5, 7)}${today.slice(8, 10)}`,
    numOfRows: '500', pageNo: '1', arrange: 'A'
  })
  const data = await (await fetch(`${WORKERS_API_URL}/api/tour/searchFestival2?${params}`, { headers: WORKER_HEADERS })).json()
  const items = data.response?.body?.items?.item || []
  return (Array.isArray(items) ? items : [items]).map(item => toRow({
    title: item.title, type: '축제', start: iso(item.eventstartdate), end: iso(item.eventenddate),
    site: item.addr1, contact: item.tel, image: item.firstimage
  }))
}

const fromSeoul = async () => {
  const key = process.env.SEOUL_OPENAPI_KEY?.trim()
  if (!key) return []
  const pages = await Promise.all([1, 1001].map(async start => {
    const data = await (await fetch(`http://openapi.seoul.go.kr:8088/${key}/json/culturalEventInfo/${start}/${start + 999}/`)).json()
    return data.culturalEventInfo?.row || []
  }))
  return pages.flat().map(item => toRow({
    title: item.TITLE, type: item.CODENAME, start: item.STRTDATE?.slice(0, 10), end: item.END_DATE?.slice(0, 10),
    site: [item.GUNAME, item.PLACE].filter(Boolean).join(' '), charge: item.USE_FEE || item.IS_FREE,
    contact: item.INQUIRY, url: item.ORG_LINK || item.HMPG_ADDR, image: item.MAIN_IMG, description: item.PROGRAM
  }))
}

const fromDaejeon = async () => {
  const pages = await Promise.all([1, 2, 3].map(async pageNo => {
    const data = await (await fetch(`${WORKERS_API_URL}/api/daejeon/eventDataService/eventDataListJson?pageNo=${pageNo}&numOfRows=100`, { headers: WORKER_HEADERS })).json()
    return data.msgBody || []
  }))
  return pages.flat().map(item => toRow({
    title: item.title, type: item.themeCdNm, start: item.beginDt, end: item.endDt,
    site: item.placeDetail || item.placeCdNm, contact: item.managementCdNm
  }))
}

const fromBusan = async () => (await loadBusan('festivals'))
  .map(item => normalizeBusanStory(item, 'festivals'))
  .filter(item => item.dates)
  .map(item => toRow({
    title: item.title, type: '축제', start: item.dates.start, end: item.dates.end,
    site: item.address || item.district, contact: item.phone,
    url: item.url, image: item.image, description: item.description
  }))

const CITY_SOURCES = { seoul: [fromSeoul], daejeon: [fromDaejeon], busan: [fromBusan], jeju: [] }

export const collectEvents = async (today = todayKst()) => {
  const sources = [fromKcisa, () => fromTourApi(today), ...(CITY_SOURCES[CITY.key] || [])]
  const settled = await Promise.allSettled(sources.map(source => source()))
  const seen = new Set()
  const rows = settled.flatMap(result => result.status === 'fulfilled' ? result.value : [])
    .filter(row => row?.title && row.start_date && row.end_date >= today)
    .filter(row => !seen.has(row.title) && seen.add(row.title))
  return { rows, failed: settled.filter(result => result.status === 'rejected').map(result => result.reason?.message) }
}

// 관리 행과 수집 행을 제목으로 합친다. 관리 행이 우선이고, 숨긴 제목은 수집 결과에서도 뺀다.
export const mergeEvents = (collected, managed, today, includeAll = false) => {
  const hidden = new Set(managed.filter(row => !row.is_active).map(row => row.title))
  const byTitle = new Map(collected.map(row => [row.title, row]))
  for (const row of managed) byTitle.set(row.title, row)
  return [...byTitle.values()]
    .map(row => ({ ...row, hidden: hidden.has(row.title) }))
    .filter(row => row.end_date >= today && (includeAll || (!row.hidden && row.start_date <= today)))
    .sort((a, b) => a.end_date.localeCompare(b.end_date))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, items: [] })

  const today = todayKst()
  const includeAll = req.query.all === '1'
  const database = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const [{ rows, failed }, managed] = await Promise.all([
    collectEvents(today),
    database.from('performances').select('*').eq('city_key', CITY.key)
  ])
  if (managed.error) return res.status(502).json({ success: false, items: [], error: managed.error.message })

  const items = mergeEvents(rows, managed.data || [], today, includeAll)
  res.setHeader('Cache-Control', includeAll ? 'no-store' : 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).json({ success: true, today, totalCount: items.length, items, failed })
}
