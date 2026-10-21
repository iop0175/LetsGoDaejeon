// 대전 시내버스 노선·정류장 목록을 만들어 src/data/daejeonBus.json에 저장한다.
// 전체 목록 API(getRouteInfoAll 등)가 HTTP_ERROR라서 노선 코드(303000NN)를 하나씩 조회해 모은다.
// 실행: node scripts/buildDaejeonBus.mjs [시작코드] [끝코드]   (Worker 한도가 분당 100회라 천천히 돈다)
import { writeFileSync, mkdirSync } from 'node:fs'

const WORKER = 'https://letsgodaejeon-api.eoynx.workers.dev/api/daejeon-transit'
const FIRST = Number(process.argv[2]) || 30300001
const LAST = Number(process.argv[3]) || 30300320
const PAUSE_MS = 750

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const tag = (xml, name) => (xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] || '').trim()
const items = (xml) => [...xml.matchAll(/<itemList>([\s\S]*?)<\/itemList>/g)].map((match) => match[1])

async function call(operation, params) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const url = `${WORKER}/${operation}?${new URLSearchParams(params)}`
    const response = await fetch(url, { headers: { Origin: 'https://www.letsgodaejeon.kr' } })
    await sleep(PAUSE_MS)
    if (response.status === 429) { await sleep(30000); continue }
    if (!response.ok) continue
    const data = await response.json()
    if (data.xml) return data.xml
  }
  return ''
}

const hhmm = (value) => (/^\d{4}$/.test(value) ? `${value.slice(0, 2)}:${value.slice(2)}` : '')
const minutes = (value) => Number(value) || 0

const routes = []
const stops = {}

for (let code = FIRST; code <= LAST; code++) {
  const info = await call('busRouteInfo/getRouteInfo', { busRouteId: String(code) })
  const row = items(info)[0]
  if (!row || tag(row, 'ROUTE_NO') === '') continue

  const stopXml = await call('busRouteInfo/getStaionByRoute', { busRouteId: String(code) })
  const route = {
    id: String(code),
    no: tag(row, 'ROUTE_NO'),
    type: tag(row, 'ROUTE_TP'),
    stopCount: minutes(tag(row, 'BUSSTOP_CNT')),
    distanceKm: Number(tag(row, 'RUN_DIST_HALF')) || 0,
    runMinutes: minutes(tag(row, 'RUN_TM')),
    intervalMin: { weekday: minutes(tag(row, 'ALLO_INTERVAL')), sat: minutes(tag(row, 'ALLO_INTERVAL_SAT')), sun: minutes(tag(row, 'ALLO_INTERVAL_SUN')) },
    // 기점 출발 / 종점(회차) 막차. 요일별로 다르다.
    startFirst: { weekday: hhmm(tag(row, 'ORIGIN_START')), sat: hhmm(tag(row, 'ORIGIN_START_SAT')), sun: hhmm(tag(row, 'ORIGIN_START_SUN')) },
    startLast: { weekday: hhmm(tag(row, 'ORIGIN_END')), sat: hhmm(tag(row, 'ORIGIN_END_SAT')), sun: hhmm(tag(row, 'ORIGIN_END_SUN')) },
    turnFirst: { weekday: hhmm(tag(row, 'TURN_START')), sat: hhmm(tag(row, 'TURN_START_SAT')), sun: hhmm(tag(row, 'TURN_START_SUN')) },
    turnLast: { weekday: hhmm(tag(row, 'TURN_END')), sat: hhmm(tag(row, 'TURN_END_SAT')), sun: hhmm(tag(row, 'TURN_END_SUN')) },
    startStopId: tag(row, 'START_STOP_ID'),
    turnStopId: tag(row, 'TURN_STOP_ID'),
    endStopId: tag(row, 'END_STOP_ID'),
    stops: []
  }

  for (const stop of items(stopXml)) {
    const id = tag(stop, 'BUS_STOP_ID')
    if (!id) continue
    route.stops.push(id)
    if (!stops[id]) {
      stops[id] = {
        id,
        name: tag(stop, 'BUSSTOP_NM'),
        nameEn: tag(stop, 'BUSSTOP_ENG_NM'),
        lat: Number(tag(stop, 'GPS_LATI')) || 0,
        lon: Number(tag(stop, 'GPS_LONG')) || 0,
        road: tag(stop, 'ROAD_NM_ADDR') || tag(stop, 'ROAD_NM'),
        routes: []
      }
    }
    if (!stops[id].routes.includes(route.id)) stops[id].routes.push(route.id)
  }
  routes.push(route)
  console.log(`${code} ${route.no}번 정류장 ${route.stops.length}개 (노선 ${routes.length}개 / 정류장 ${Object.keys(stops).length}개)`)
}

if (!routes.length) throw new Error('노선을 하나도 찾지 못했습니다.')
mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true })
writeFileSync(new URL('../src/data/daejeonBus.json', import.meta.url), JSON.stringify({ builtAt: new Date().toISOString().slice(0, 10), routes, stops }))
console.log(`저장 완료: 노선 ${routes.length}개, 정류장 ${Object.keys(stops).length}개`)
