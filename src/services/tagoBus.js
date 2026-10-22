// 서버 전용: 국토교통부 TAGO 버스 API(부산·제주). 서울은 TAGO에 없다.
import { nearestStops as nearest } from '../utils/busStops.js'

const BASE = 'https://apis.data.go.kr/1613000'
export const TAGO_CITY = { busan: 21, jeju: 39 }

// 응답은 결과가 없으면 items가 '', 한 건이면 배열이 아닌 객체로 온다. 가끔 'HTTP 에러'가 나서 한 번 다시 부른다.
async function call(path, params, retry = 1) {
  const url = `${BASE}/${path}?${new URLSearchParams({ serviceKey: process.env.DATA_GO_KR_KEY || '', _type: 'json', ...params })}`
  const data = await fetch(url, { signal: AbortSignal.timeout(15000) }).then((response) => response.json()).catch(() => null)
  if (data?.response?.header?.resultCode !== '00') {
    if (retry > 0) return call(path, params, retry - 1)
    throw new Error('TAGO API 오류')
  }
  const item = data.response.body?.items?.item
  return item ? [].concat(item) : []
}

export async function nearestStops(point, cityKey, n = 3, maxKm = 0.5) {
  const cityCode = TAGO_CITY[cityKey]
  if (!cityCode || !(point.lat > 0 && point.lon > 0)) return []
  const items = await call('BusSttnInfoInqireService/getCrdntPrxmtSttnList', { gpsLati: point.lat, gpsLong: point.lon, numOfRows: 30 })
  const stops = items
    .filter((item) => Number(item.citycode) === cityCode)
    .map((item) => ({ id: item.nodeid, no: item.nodeno ? String(item.nodeno) : '', name: item.nodenm, lat: Number(item.gpslati), lon: Number(item.gpslong), routes: [] }))
  return nearest(stops, point, n, maxKm)
}

export async function arrivals(cityKey, nodeId) {
  const items = await call('ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList', { cityCode: TAGO_CITY[cityKey], nodeId, numOfRows: 50 })
  return items
    .map((item) => ({ routeId: item.routeid, routeNo: String(item.routeno), minutes: Math.round(Number(item.arrtime) / 60), stopsAway: Number(item.arrprevstationcnt) }))
    .sort((a, b) => a.minutes - b.minutes)
}
