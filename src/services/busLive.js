// 서버 전용: 서울·부산·제주 정류장의 실시간 도착과 정차 노선.
// 서울: 서울시 버스정보(ws.bus.go.kr, http만 된다) / 부산: 부산버스정보시스템(BIMS) / 제주: 제주 버스정보시스템.
// 정류장 id는 서울은 표지판 번호(ARS), 부산·제주는 TAGO 정류소 ID(BSB…, JEB…)이고 앞 세 글자를 떼면 각 시스템의 정류장 ID다.
import https from 'node:https'
import tls from 'node:tls'
import { listItems } from '../utils/daejeonTransit.js'
import SECTIGO_R36 from '../utils/sectigoR36.js'

const KEY = () => process.env.DATA_GO_KR_KEY || ''
// 가끔 연결이 한 번 끊겨서('fetch failed') 한 번만 다시 부른다.
const get = (url, type = 'json', retry = 1) => fetch(url, { signal: AbortSignal.timeout(15000) }).then((response) => {
  if (!response.ok) throw new Error(`버스 API ${response.status}`)
  return type === 'json' ? response.json() : response.text()
}).catch((error) => (retry > 0 ? get(url, type, retry - 1) : Promise.reject(error)))

export const STOP_ID = { seoul: /^\d{5}$/, busan: /^BSB\d{5,12}$/, jeju: /^JEB\d{5,12}$/ }

const byNumber = (list) => [...new Set(list.filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }))

// "13분후[3번째 전]", "곧 도착", "운행종료", "출발대기"
export const parseSeoulMessage = (message = '') => {
  if (message.includes('곧 도착')) return { minutes: 0, stopsAway: 0 }
  const minutes = message.match(/(\d+)분/)?.[1]
  const stops = message.match(/(\d+)번째 전/)?.[1]
  return minutes ? { minutes: Number(minutes), stopsAway: stops ? Number(stops) : null } : null
}

async function seoulItems(ars) {
  const data = await get(`http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?${new URLSearchParams({ serviceKey: KEY(), arsId: ars, resultType: 'json' })}`)
  const code = data?.msgHeader?.headerCd
  if (code !== '0' && code !== '4') throw new Error(data?.msgHeader?.headerMsg || '서울 버스 API 오류')
  return data.msgBody?.itemList || []
}

async function busanItems(id) {
  const xml = await get(`https://apis.data.go.kr/6260000/BusanBIMS/stopArrByBstopid?${new URLSearchParams({ serviceKey: KEY(), bstopid: id.slice(3) })}`, 'text')
  if (!xml.includes('<resultCode>00</resultCode>')) throw new Error('부산 버스 API 오류')
  return listItems(xml, 'item')
}

// 제주 서버는 중간 인증서를 보내지 않아 fetch가 실패한다. 검증은 그대로 하고 중간 인증서만 더해 https로 부른다.
const JEJU_CA = [...tls.rootCertificates, SECTIGO_R36]
const jeju = (path, id) => new Promise((resolve, reject) => {
  const request = https.get(`https://bus.jeju.go.kr/api/${path}?station_id=${id.slice(3)}`, { ca: JEJU_CA, timeout: 15000 }, (response) => {
    let body = ''
    response.setEncoding('utf8')
    response.on('data', (chunk) => { body += chunk })
    response.on('end', () => {
      try {
        const list = JSON.parse(body)
        resolve(Array.isArray(list) ? list : [])
      } catch {
        reject(new Error(`제주 버스 API ${response.statusCode}`))
      }
    })
  })
  request.on('timeout', () => request.destroy(new Error('제주 버스 API 시간 초과')))
  request.on('error', reject)
})

export async function arrivals(cityKey, id) {
  let list = []
  if (cityKey === 'seoul') {
    list = (await seoulItems(id)).map((item) => ({ routeId: item.busRouteId, routeNo: item.rtNm, destination: item.adirection, ...parseSeoulMessage(item.arrmsg1) }))
  } else if (cityKey === 'busan') {
    list = (await busanItems(id)).filter((item) => item.min1).map((item) => ({ routeId: item.lineid || item.lineno, routeNo: item.lineno, minutes: Number(item.min1), stopsAway: Number(item.station1), plate: item.carno1 }))
  } else if (cityKey === 'jeju') {
    list = (await jeju('searchArrivalInfoList.do', id)).map((item) => ({ routeId: item.ROUTE_ID, routeNo: item.ROUTE_NUM, destination: item.ROUTE_SUB_NM, minutes: Number(item.PREDICT_TRAV_TM), stopsAway: Number(item.REMAIN_STATION), plate: item.PLATE_NO }))
  }
  return list.filter((bus) => Number.isFinite(bus.minutes)).sort((a, b) => a.minutes - b.minutes)
}

// 정류장 표지판 번호(부산)와 정차 노선을 붙인다. 한 정류장이 실패해도 나머지는 그대로 둔다.
export const withRoutes = (cityKey, stops) => Promise.all(stops.map(async (stop) => {
  try {
    if (cityKey === 'seoul') return { ...stop, routes: byNumber((await seoulItems(stop.id)).map((item) => item.rtNm)) }
    if (cityKey === 'busan') {
      const items = await busanItems(stop.id)
      return { ...stop, no: stop.no || items.find((item) => item.arsno)?.arsno || '', routes: byNumber(items.map((item) => item.lineno)) }
    }
    if (cityKey === 'jeju') return { ...stop, routes: byNumber((await jeju('searchRouteByStationList.do', stop.id)).map((item) => item.ROUTE_NUM)) }
  } catch (error) {
    console.error('Bus routes error:', cityKey, stop.id, error.message)
  }
  return stop
}))
