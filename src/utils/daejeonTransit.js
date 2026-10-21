// 대전 교통 API(Worker 프록시) 호출과 XML 파싱. Next API 라우트와 getStaticProps가 함께 쓴다.
const WORKER = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://letsgodaejeon-api.eoynx.workers.dev'

const tag = (xml, name) => (xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] || '').trim()

export const listItems = (xml, itemTag = 'itemList') =>
  [...xml.matchAll(new RegExp(`<${itemTag}>([\\s\\S]*?)</${itemTag}>`, 'g'))].map((match) =>
    Object.fromEntries([...match[1].matchAll(/<(\w+)>([^<]*)<\/\1>/g)].map((field) => [field[1], field[2].trim()]))
  )

export async function callTransit(operation, params = {}) {
  const url = `${WORKER}/api/daejeon-transit/${operation}?${new URLSearchParams(params)}`
  const response = await fetch(url, { headers: { Origin: 'https://www.letsgodaejeon.kr' }, signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`교통 API ${response.status}`)
  const data = await response.json()
  if (!data.xml) throw new Error(data.error || '교통 API 응답 오류')
  return data.xml
}

// 버스 API는 headerCd가 0이면 정상, 도로소통 API는 resultCode가 00이면 정상이다.
export const assertOk = (xml) => {
  const code = tag(xml, 'headerCd') || tag(xml, 'resultCode')
  if (code && code !== '0' && code !== '00') throw new Error(tag(xml, 'headerMsg') || tag(xml, 'resultMsg') || '교통 API 오류')
  return xml
}

export const normalizeArrival = (item) => ({
  routeId: item.ROUTE_CD,
  routeNo: item.ROUTE_NO,
  destination: item.DESTINATION,
  minutes: Number(item.EXTIME_MIN),
  stopsAway: Number(item.STATUS_POS),
  plate: item.CAR_REG_NO,
  updated: item.INFO_OFFER_TM
})

export const normalizePosition = (item) => ({
  plate: item.PLATE_NO,
  stopId: item.BUS_STOP_ID,
  direction: item.DIR,
  lat: Number(item.GPS_LATI) || 0,
  lon: Number(item.GPS_LONG) || 0,
  updated: item.ARR_TIME
})
