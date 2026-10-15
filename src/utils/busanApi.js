const WORKER = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://letsgodaejeon-api.eoynx.workers.dev'
const cache = new Map()
const clean = value => String(value ?? '').replace(/<[^>]*>/g, '').trim()
const available = value => clean(value) === '-' ? '' : clean(value)
const array = value => value ? (Array.isArray(value) ? value : [value]) : []
const decodeXml = value => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
const xmlTag = (xml, tag) => decodeXml(xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] || '')

export function parseBusanResponse(data) {
  if (data.error) throw new Error(data.error)
  if (data.xml) {
    if (xmlTag(data.xml, 'resultCode') !== '00') throw new Error('공공데이터 API 승인 또는 응답 오류')
    return {
      totalCount: Number(xmlTag(data.xml, 'totalCount')),
      items: [...data.xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => Object.fromEntries(
        [...match[1].matchAll(/<(\w+)>([\s\S]*?)<\/\1>/g)].map(field => [field[1], decodeXml(field[2])])
      ))
    }
  }
  const service = data.response || data.getRecommendedKr || data.getFoodKr || data.getFestivalKr
  const code = service?.header?.resultCode ?? service?.header?.code
  if (code !== '00') throw new Error('부산 공공데이터 API 승인 또는 응답 오류')
  const body = service.body || service
  return { totalCount: Number(body.totalCount), items: array(body.items?.item || body.item) }
}

export async function loadBusan(resource) {
  const saved = cache.get(resource)
  if (saved && Date.now() - saved.at < 3600000) return saved.items
  const fetchPage = async pageNo => {
    const response = await fetch(`${WORKER}/api/busan/${resource}?pageNo=${pageNo}&numOfRows=1000`, {
      headers: { Origin: 'https://letsgobusan.vercel.app' }, signal: AbortSignal.timeout(25000)
    })
    if (!response.ok) throw new Error(`부산 API 조회 실패 (${response.status})`)
    return parseBusanResponse(await response.json())
  }
  const first = await fetchPage(1)
  if (!Number.isFinite(first.totalCount) || first.totalCount > 20000) throw new Error('부산 API 건수 확인이 필요합니다.')
  const pages = []
  for (let pageNo = 2; pageNo <= Math.ceil(first.totalCount / 1000); pageNo++) pages.push(fetchPage(pageNo))
  const items = [first, ...await Promise.all(pages)].flatMap(page => page.items)
  if (items.length < first.totalCount) throw new Error('부산 API 일부 데이터가 누락됐습니다.')
  cache.set(resource, { at: Date.now(), items })
  return items
}

export const normalizeBusanParking = item => ({
  name: clean(item.pkNam), parkingId: JSON.stringify([item.guNm, item.mgntNum, item.pkNam, item.doroAddr, item.jibunAddr]),
  addr: available(item.jibunAddr) || available(item.doroAddr), addrRoad: available(item.doroAddr) || available(item.jibunAddr),
  lat: Number(item.xCdnt) || 0, lon: Number(item.yCdnt) || 0,
  divideNum: item.pkGubun === '공영' ? '6' : '1', typeNum: item.pkFm === '노외' ? '2' : '1',
  totalLot: Number(item.pkCnt) || 0,
  weekdayOpen: available(item.svcSrtTe), weekdayClose: available(item.svcEndTe),
  basicTime: Number(item.pkBascTime) || 0, basicCharge: Number(item.tenMin) || 0,
  addTime: Number(item.pkAddTime) || 0, addCharge: Number(item.feeAdd) || 0,
  chargeInfo: available(item.feeInfo), payMethod: available(item.payMtd),
  phone: available(item.tponNum), referenceDate: item.fnlDt
})

export const normalizeBusanMedical = item => ({
  hsptlNm: clean(item.dutyName), hsptlKnd: clean(item.dutyDivNam),
  locplc: clean(item.dutyAddr), telno: clean(item.dutyTel1),
  lat: Number(item.wgs84Lat) || 0, lon: Number(item.wgs84Lon) || 0,
  district: item.dutyAddr?.split(' ')[1] || null,
  dong: item.dutyAddr?.match(/\(([가-힣0-9.]+동(?:\d+가)?)[,)]/)?.[1] || null
})

export function festivalDates(text) {
  if (/매주|격주|매월/.test(clean(text))) return null
  const match = clean(text).match(/(20\d{2})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})[.일]?\s*(?:\([^)]*\))?\s*[~～–-]\s*(?:(20\d{2})[.\-/년]\s*)?(?:(\d{1,2})[.\-/월]\s*)?(\d{1,2})(?:[.일]|\b)/)
  if (!match) return null
  const date = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const start = date(match[1], match[2], match[3])
  const end = date(match[4] || match[1], match[5] || match[2], match[6])
  if ([start, end].some(value => !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) || end < start) return null
  return { start, end }
}

export const normalizeBusanStory = (item, resource) => ({
  id: String(item.UC_SEQ), title: clean(item.TITLE || item.MAIN_TITLE),
  district: clean(item.GUGUN_NM), intro: clean(item.RPRSNTV_MENU || item.SUBTITLE || item.ITEMCNTNTS).slice(0, 180),
  image: /^https?:\/\//.test(item.MAIN_IMG_NORMAL || '') ? item.MAIN_IMG_NORMAL : '',
  url: /^https?:\/\//.test(item.HOMEPAGE_URL || '') ? item.HOMEPAGE_URL : 'https://www.visitbusan.net/',
  address: clean(item.ADDR1), phone: clean(item.CNTCT_TEL), hours: clean(item.USAGE_DAY_WEEK_AND_TIME),
  description: clean(item.ITEMCNTNTS), dates: festivalDates(item.USAGE_DAY_WEEK_AND_TIME) || festivalDates(item.USAGE_DAY)
})
