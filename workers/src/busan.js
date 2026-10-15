const SERVICES = {
  parking: '6260000/BusanPblcPrkngInfoService/getPblcPrkngInfo',
  themes: '6260000/RecommendedService/getRecommendedKr',
  food: '6260000/FoodService/getFoodKr',
  festivals: '6260000/FestivalService/getFestivalKr',
  medical: 'B552657/HsptlAsembySearchService/getHsptlMdcncListInfoInqire'
}

export async function fetchBusan(request, env) {
  const incoming = new URL(request.url)
  const resource = incoming.pathname.split('/').pop()
  if (!Object.hasOwn(SERVICES, resource)) return { status: 404, data: { error: 'Not Found' } }
  if (request.method !== 'GET') return { status: 405, data: { error: 'Method Not Allowed' } }
  const key = (env.BUSAN_API_KEY || env.DAEJEON_API_KEY || env.KTO_API_KEY || '').trim()
  if (!key) return { status: 503, data: { error: '공공데이터 인증키 설정이 필요합니다.' } }
  const upstream = new URL(`https://apis.data.go.kr/${SERVICES[resource]}`)
  upstream.searchParams.set('serviceKey', key)
  upstream.searchParams.set('pageNo', String(Math.min(1000, Math.max(1, Number(incoming.searchParams.get('pageNo')) || 1))))
  upstream.searchParams.set('numOfRows', String(Math.min(1000, Math.max(1, Number(incoming.searchParams.get('numOfRows')) || 100))))
  if (resource === 'medical') upstream.searchParams.set('Q0', '부산광역시')
  else upstream.searchParams.set('resultType', 'json')
  try {
    const response = await fetch(upstream, { signal: AbortSignal.timeout(20000) })
    if (!response.ok) return { status: 502, data: { error: `부산 공공데이터 API HTTP ${response.status}` } }
    const body = await response.text()
    try { return { status: 200, data: JSON.parse(body) } } catch {
      if (!body.trim().startsWith('<')) return { status: 502, data: { error: '부산 API 응답 형식 오류' } }
      return { status: 200, data: { xml: body } }
    }
  } catch {
    return { status: 502, data: { error: '부산 공공데이터 API 요청에 실패했습니다.' } }
  }
}
