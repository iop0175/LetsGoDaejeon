// KCISA 문화예술 공연 정보 프록시
// GET /api/kcisa/CNV_060?numOfRows=20&pageNo=1
//
// Cloudflare Workers 프록시를 쓰지 않는 이유: Cloudflare 엣지 내부 리졸버가
// api.kcisa.kr 을 해석하지 못해서(530 / error code 1016) 호출이 거의 항상 실패한다.
// 공개 리졸버(1.1.1.1, 8.8.8.8, 9.9.9.9)와 권위 서버(ns.kcis.or.kr)는 모두
// 175.125.91.8 을 정상 응답하므로, Cloudflare를 거치지 않는 Vercel 런타임에서
// 직접 호출한다. dev(next dev)에서도 같은 코드가 돈다.

const KCISA_BASE = 'https://api.kcisa.kr/openapi'
const TIMEOUT_MS = 15000

// 프록시를 허용하는 오퍼레이션. 임의 경로가 들어와 KCISA로 중계되는 걸 막는다.
const ALLOWED_OPS = new Set(['CNV_060'])

// 업스트림으로 넘길 쿼리 파라미터만 통과시킨다.
const ALLOWED_PARAMS = new Set(['numOfRows', 'pageNo', 'dtype', 'title'])

const getTagValue = (xml, tag) => {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return match ? match[1].trim() : ''
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, items: [], totalCount: 0, message: 'Method Not Allowed' })
  }

  const { op, ...query } = req.query

  if (!ALLOWED_OPS.has(op)) {
    return res.status(404).json({ success: false, items: [], totalCount: 0, message: 'Unknown operation' })
  }

  const apiKey = (process.env.KCISA_API_KEY || '').trim()
  if (!apiKey) {
    return res.status(500).json({ success: false, items: [], totalCount: 0, message: 'KCISA_API_KEY missing' })
  }

  const kcisaUrl = new URL(`${KCISA_BASE}/${op}/request`)
  kcisaUrl.searchParams.set('serviceKey', apiKey)
  for (const [key, value] of Object.entries(query)) {
    if (ALLOWED_PARAMS.has(key) && value) {
      kcisaUrl.searchParams.set(key, Array.isArray(value) ? value[0] : value)
    }
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let text
    try {
      const upstream = await fetch(kcisaUrl.toString(), { signal: controller.signal })
      text = await upstream.text()
    } finally {
      clearTimeout(timer)
    }

    const resultCode = getTagValue(text, 'resultCode')
    const resultMsg = getTagValue(text, 'resultMsg')

    if (resultCode !== '0000' && resultCode !== '0') {
      return res.status(200).json({
        success: false,
        resultCode,
        resultMsg,
        items: [],
        totalCount: 0,
        // 업스트림이 XML이 아닐 때(차단/에러 페이지 등) 원인을 버리지 않도록 남김
        upstreamBody: text.slice(0, 300)
      })
    }

    const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g) || []
    const items = itemMatches.map((itemXml) => ({
      title: getTagValue(itemXml, 'title'),
      type: getTagValue(itemXml, 'type'),
      period: getTagValue(itemXml, 'period'),
      eventPeriod: getTagValue(itemXml, 'eventPeriod'),
      eventSite: getTagValue(itemXml, 'eventSite'),
      charge: getTagValue(itemXml, 'charge'),
      contactPoint: getTagValue(itemXml, 'contactPoint'),
      url: getTagValue(itemXml, 'url'),
      imageObject: getTagValue(itemXml, 'imageObject'),
      description: getTagValue(itemXml, 'description'),
      viewCount: parseInt(getTagValue(itemXml, 'viewCount') || '0')
    }))

    // 공연 목록은 자주 바뀌지 않으므로 엣지에 캐시해 업스트림 호출을 줄인다.
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400')
    return res.status(200).json({
      success: true,
      resultCode,
      resultMsg,
      totalCount: items.length,
      items
    })
  } catch (error) {
    return res.status(200).json({
      success: false,
      items: [],
      totalCount: 0,
      message: error.name === 'AbortError' ? 'KCISA 응답 시간 초과' : error.message
    })
  }
}
