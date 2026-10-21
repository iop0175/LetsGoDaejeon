// 서버 전용: 제주 교통정보센터(JejuITS) 공개 API. 키는 환경변수에만 둔다.
// C-ITS 키(JEJU_CITS_KEY): 도로 위험·공사·노면기상·주유소·충전소·관광지, ITS 키(JEJU_ITS_KEY): 구간 교통 속도.
import { CHARGER_LABEL, EVENT_LABEL, RWIS_LABEL, parseVvms } from '../utils/jejuLabels'
export { CHARGER_LABEL, EVENT_LABEL, RWIS_LABEL, parseVvms }

const BASE = 'http://api.jejuits.go.kr/api'
const TTL = 5 * 60 * 1000
const cache = new Map()

async function call(name, keyName, params = {}) {
  const key = process.env[keyName]?.trim()
  if (!key) throw new Error(`${keyName}가 없습니다.`)
  const query = new URLSearchParams({ code: key, ...params })
  const saved = cache.get(`${name}?${query}`)
  if (saved && Date.now() - saved.at < TTL) return saved.info
  const response = await fetch(`${BASE}/${name}?${query}`, { signal: AbortSignal.timeout(25000) })
  if (!response.ok) throw new Error(`제주 ITS ${name} ${response.status}`)
  const data = await response.json()
  if (data.result !== 'success') throw new Error(`제주 ITS ${name}: ${data.result}`)
  cache.set(`${name}?${query}`, { at: Date.now(), info: data.info || [] })
  return data.info || []
}

export const cits = (name, params) => call(name, 'JEJU_CITS_KEY', params)
export const its = (name, params) => call(name, 'JEJU_ITS_KEY', params)

// ---------- 주유소 ----------
const BRAND = { SKE: 'SK에너지', GSC: 'GS칼텍스', SOL: 'S-OIL', HDO: '현대오일뱅크', RTO: '알뜰주유소', RTX: '알뜰(고속도로)', NHO: 'NH알뜰', ETC: '자체상표', NCO: '자체상표', SKG: 'SK가스', E1G: 'E1' }
const TYPE = { Y: '충전소(LPG)', N: '주유소', C: '주유소·충전소' }

const regionOf = (adr) => {
  const city = /서귀포시/.test(adr) ? '서귀포시' : /제주시/.test(adr) ? '제주시' : ''
  // 읍·면은 주소 본문에, 동은 도로명 주소 뒤 괄호 또는 지번 주소 본문에 나온다 (\b는 한글에 쓸 수 없어 lookahead를 쓴다)
  const town = adr.match(/(?:제주시|서귀포시)\s+([가-힣0-9]+[읍면])(?=\s|$)/)?.[1]
    || adr.match(/\(([가-힣0-9]+동)\)/)?.[1]
    || adr.match(/(?:제주시|서귀포시)\s+([가-힣0-9]+동)(?=\s|$)/)?.[1]
    || ''
  return { city, town }
}

export async function loadGasStations() {
  const [info, prices] = await Promise.all([cits('infoGasInfoList'), cits('infoGasPriceList')])
  const priceById = new Map(prices.map((row) => [row.id, row]))
  return info
    .map((row) => {
      const price = priceById.get(row.id) || {}
      const { city, town } = regionOf(row.adr || '')
      return {
        id: row.id,
        name: String(row.osnm || '').trim(),
        brand: BRAND[String(row.poll || '').trim()] || BRAND[String(row.gpoll || '').trim()] || '',
        type: TYPE[row.lpgyn] || '주유소',
        isLpg: row.lpgyn === 'Y' || row.lpgyn === 'C',
        addr: String(row.adr || '').trim(),
        tel: String(row.tel || '').trim(),
        city,
        town,
        // 0은 가격 정보 없음
        gasoline: price.gasoline || 0,
        premium: price.premium_gasoline || 0,
        diesel: price.diesel || 0,
        lpg: price.lpg || 0
      }
    })
    .filter((station) => station.name && station.city)
}

// ---------- 전기차 충전소 ----------
const SLOW_TYPES = new Set(['02'])
const FAST_TYPES = new Set(['01', '03', '04', '05', '06', '07'])

export async function loadEvStations() {
  const rows = await cits('infoEvInfoList')
  const byId = new Map()
  for (const row of rows) {
    const addr = String(row.addr || '').trim()
    const { city, town } = regionOf(addr)
    let station = byId.get(row.id)
    if (!station) {
      station = {
        id: row.id,
        name: String(row.name || '').trim(),
        addr,
        city,
        town,
        lat: Number(row.x_crdn) || 0,
        lon: Number(row.y_crdn) || 0,
        operator: String(row.b_name || '').trim(),
        phone: String(row.b_call || '').trim(),
        hours: String(row.use_time || '').trim(),
        free: row.free === 'Y',
        memberOnly: String(row.member).trim() === 'Y',
        fee: String(row.fee || '').trim(),
        types: {},
        chargers: 0,
        fast: 0,
        slow: 0
      }
      byId.set(row.id, station)
    }
    station.chargers += 1
    station.types[row.type] = (station.types[row.type] || 0) + 1
    if (SLOW_TYPES.has(row.type)) station.slow += 1
    else if (FAST_TYPES.has(row.type)) station.fast += 1
  }
  return [...byId.values()].filter((station) => station.name && station.city)
}

// 충전 가능 대수(급속/완속). 문서 설명이 주차 API 문구를 복사한 것이라, 충전기 수를 넘지 않는 값만 쓴다.
export async function loadEvAvailability() {
  const rows = await cits('infoEvList')
  return Object.fromEntries(rows.map((row) => [row.id, { fast: Number(row.fast) || 0, slow: Number(row.slow) || 0 }]))
}

// ---------- 관광지(테마) ----------
export async function loadTourSpots() {
  const rows = await cits('infoTourList')
  return rows
    .filter((row) => row.contents_label === '관광지' && row.title)
    .map((row) => ({
      id: row.contents_id,
      title: String(row.title).trim(),
      addr: String(row.road_address || row.address || '').trim(),
      tags: String(row.tag || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      intro: String(row.introduction || '').replace(/\r/g, '').split('\n')[0].trim(),
      lat: Number(row.latitude) || 0,
      lon: Number(row.longitude) || 0,
      phone: /\d/.test(row.phone_no || '') ? String(row.phone_no).trim() : '',
      image: /^https?:\/\//.test(row.img_path || '') ? row.img_path : '',
      thumb: /^https?:\/\//.test(row.thumbnail_path || '') ? row.thumbnail_path : ''
    }))
}

// ---------- 도로 상황 ----------


export const distanceM = (a, b) => {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

export const nearestPoint = (point, candidates) => {
  let best = null
  for (const candidate of candidates) {
    const meters = distanceM(point, candidate)
    if (!best || meters < best.meters) best = { ...candidate, meters }
  }
  return best
}
