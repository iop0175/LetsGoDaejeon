// 대전광역시 교통 공공데이터(apis.data.go.kr/6300000) 프록시. 허용 목록에 있는 서비스/오퍼레이션만 전달한다.
const OPERATIONS = new Set([
  'rest/getTrafficInfoAll',
  'rest/getTrafficInfo',
  'stationinfo/getStationByStopID',
  'stationinfo/getStationByUid',
  'busRouteInfo/getStaionByRouteAll',
  'busRouteInfo/getStaionByRoute',
  'busRouteInfo/getRouteInfoAll',
  'busRouteInfo/getRouteInfo',
  'busposinfo/getBusPosByRtid',
  'arrive/getArrInfoByStopID',
  'arrive/getArrInfoByUid'
])

const BLOCKED_PARAMS = new Set(['serviceKey', 'ServiceKey', 'service_key'])

export async function fetchDaejeonTransit(request, env) {
  const incoming = new URL(request.url)
  const operation = incoming.pathname.replace('/api/daejeon-transit/', '')
  if (!OPERATIONS.has(operation)) return { status: 404, data: { error: 'Not Found' } }
  if (request.method !== 'GET') return { status: 405, data: { error: 'Method Not Allowed' } }
  const key = (env.DAEJEON_API_KEY || '').trim()
  if (!key) return { status: 503, data: { error: '공공데이터 인증키 설정이 필요합니다.' } }

  const upstream = new URL(`https://apis.data.go.kr/6300000/${operation}`)
  upstream.searchParams.set('serviceKey', key)
  for (const [name, value] of incoming.searchParams) {
    if (BLOCKED_PARAMS.has(name) || !/^\w{1,30}$/.test(name) || value.length > 40) continue
    upstream.searchParams.set(name, value)
  }
  // 도로소통 API만 쪽 번호를 쓴다. 버스 API는 모르는 변수가 오면 HTTP_ERROR를 낸다.
  if (operation.startsWith('rest/')) {
    if (!upstream.searchParams.has('numOfRows')) upstream.searchParams.set('numOfRows', '100')
    if (!upstream.searchParams.has('pageNo')) upstream.searchParams.set('pageNo', '1')
  }

  try {
    const response = await fetch(upstream, { signal: AbortSignal.timeout(20000) })
    if (!response.ok) return { status: 502, data: { error: `대전 교통 API HTTP ${response.status}` } }
    const body = await response.text()
    try { return { status: 200, data: JSON.parse(body) } } catch {
      if (!body.trim().startsWith('<')) return { status: 502, data: { error: '대전 교통 API 응답 형식 오류' } }
      return { status: 200, data: { xml: body } }
    }
  } catch {
    return { status: 502, data: { error: '대전 교통 API 요청에 실패했습니다.' } }
  }
}
