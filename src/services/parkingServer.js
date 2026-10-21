// 서버 전용: 도시별 주차장 목록을 같은 모양으로 맞춰 읽는다. getStaticProps와 사이트맵에서만 쓴다.
import { CITY } from '../config/cities'
import { generateSlug } from '../utils/slugUtils'
import { loadBusan, normalizeBusanParking } from '../utils/busanApi'

const WORKER = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://letsgodaejeon-api.eoynx.workers.dev'
const TTL = 3600000

const num = (value) => Number(value) || 0
// "0:00", "23:59:00", "0900", "09:00" -> "HH:MM"
const hhmm = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):?(\d{2})/)
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : ''
}
const hash = (text) => {
  let h = 5381
  for (const char of text) h = ((h * 33) ^ char.charCodeAt(0)) >>> 0
  return String(h)
}

const districtOf = (...addresses) => {
  for (const addr of addresses) {
    const token = String(addr || '').split(/\s+/).find((part) => CITY.districtNames.includes(part))
    if (token) return token
  }
  return ''
}

const toLot = (raw) => {
  const name = String(raw.name || '').trim()
  if (!name) return null
  const rawId = String(raw.parkingId ?? '')
  const id = /^[\w-]{1,40}$/.test(rawId) ? rawId : hash(rawId || name)
  const open = hhmm(raw.weekdayOpen)
  const close = hhmm(raw.weekdayClose)
  const chargeInfo = String(raw.chargeInfo || '')
  return {
    id,
    slug: generateSlug(name, id),
    name,
    district: districtOf(raw.addrRoad, raw.addr),
    addr: raw.addrRoad || raw.addr || '',
    lat: num(raw.lat),
    lon: num(raw.lon),
    isPublic: raw.divideNum === '6',
    category: raw.typeNum === '2' ? '노외' : raw.typeNum === '1' ? '노상' : '',
    totalLot: num(raw.totalLot),
    open,
    close,
    allDay: open === '00:00' && (close === '23:59' || close === '24:00'),
    free: /무료/.test(chargeInfo) && !/유료/.test(chargeInfo),
    basicTime: num(raw.basicTime),
    basicCharge: num(raw.basicCharge),
    addTime: num(raw.addTime),
    addCharge: num(raw.addCharge),
    dayTicket: num(raw.dayTicket),
    monthTicket: num(raw.monthTicket),
    phone: raw.phone || '',
    updated: String(raw.referenceDate || '').slice(0, 10)
  }
}

const readDaejeon = async () => {
  const response = await fetch(`${WORKER}/api/daejeon/parking?numOfRows=3000&pageNo=1`, {
    headers: { Origin: 'https://www.letsgodaejeon.kr' },
    signal: AbortSignal.timeout(25000)
  })
  if (!response.ok) throw new Error(`대전 주차장 API ${response.status}`)
  const data = await response.json()
  if (!data.success) throw new Error('대전 주차장 API 응답 오류')
  return data.items
}

const readSeoul = async () => {
  const key = process.env.SEOUL_OPENAPI_KEY?.trim()
  if (!key) throw new Error('SEOUL_OPENAPI_KEY가 없습니다.')
  const { normalizeSeoulParking } = await import('../../pages/api/parking')
  const rows = []
  for (let start = 1; ; start += 1000) {
    const response = await fetch(`http://openapi.seoul.go.kr:8088/${key}/json/GetParkInfo/${start}/${start + 999}/`, {
      signal: AbortSignal.timeout(25000)
    })
    if (!response.ok) throw new Error(`서울 주차 API ${response.status}`)
    const service = (await response.json()).GetParkInfo
    if (service?.RESULT?.CODE !== 'INFO-000') throw new Error(service?.RESULT?.MESSAGE || '서울 주차 API 응답 오류')
    rows.push(...(service.row || []))
    if (start + 999 >= Number(service.list_total_count)) break
  }
  // 노상 주차장은 구간마다 같은 PKLT_CD 행이 반복된다
  const seen = new Set()
  return rows.filter((row) => !seen.has(row.PKLT_CD) && seen.add(row.PKLT_CD)).map(normalizeSeoulParking)
}

const readBusan = async () => (await loadBusan('parking')).map(normalizeBusanParking)

const READERS = { daejeon: readDaejeon, seoul: readSeoul, busan: readBusan }

let cached = null

// 1시간 동안 같은 목록을 재사용한다. 실패하면 던져서 ISR이 마지막 정상 페이지를 유지하게 한다.
export async function loadParkingLots() {
  if (!CITY.parkingReady || !READERS[CITY.key]) return []
  if (cached && Date.now() - cached.at < TTL) return cached.lots
  const raw = await READERS[CITY.key]()
  const byId = new Map()
  for (const item of raw) {
    const lot = toLot(item)
    if (lot && !byId.has(lot.id)) byId.set(lot.id, lot)
  }
  const lots = [...byId.values()]
  if (!lots.length) throw new Error('주차장 목록이 비어 있습니다.')
  cached = { at: Date.now(), lots }
  return lots
}

const THEME_FILTER = { free: (lot) => lot.free, '24h': (lot) => lot.allDay }

// 무료·24시간 주차장 모아보기 페이지의 getStaticProps 결과
export async function themeProps(kind) {
  if (!CITY.parkingReady || !THEME_FILTER[kind]) return { notFound: true }
  const matched = (await loadParkingLots()).filter(THEME_FILTER[kind])
  if (!matched.length) return { notFound: true, revalidate: 3600 }
  const byDistrict = {}
  for (const lot of matched) if (lot.district) byDistrict[lot.district] = (byDistrict[lot.district] || 0) + 1
  const lots = [...matched]
    .sort((a, b) => Number(b.isPublic) - Number(a.isPublic) || b.totalLot - a.totalLot)
    .slice(0, 200)
    .map(({ id, slug, name, addr, category, isPublic, totalLot, open, close, allDay, free, basicTime, basicCharge, addTime, addCharge, dayTicket, monthTicket }) =>
      ({ id, slug, name, addr, category, isPublic, totalLot, open, close, allDay, free, basicTime, basicCharge, addTime, addCharge, dayTicket, monthTicket }))
  return { props: { total: matched.length, lots, byDistrict }, revalidate: 21600 }
}

// 정확히 같은 slug를 먼저 찾고, 없으면 끝의 id로 찾는다(이름만 바뀐 옛 주소 대응)
export const findLot = (lots, slug) =>
  lots.find((lot) => lot.slug === slug)
  || lots.filter((lot) => slug.endsWith(`-${lot.id}`)).sort((a, b) => b.id.length - a.id.length)[0]
  || null
