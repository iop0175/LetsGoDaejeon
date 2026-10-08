// KCISA 문화예술 공연 정보 프록시
// GET /api/kcisa/CNV_060?numOfRows=20&pageNo=1
//
// api.kcisa.kr 의 권위 서버(ns1.uhost.co.kr)가 리졸버에 따라 NXDOMAIN을 준다.
// Google 리졸버는 NXDOMAIN, Cloudflare 는 175.125.91.8 을 정상 응답한다. 그래서
// Cloudflare Workers 프록시는 530(error code 1016)으로, Vercel 기본 리졸버는
// ENOTFOUND로 실패했다. 아래처럼 Cloudflare DoH로 받은 주소에 직접 붙고 TLS SNI와
// 인증서 검증은 api.kcisa.kr 로 유지한다. dev에서도 같은 코드가 돈다.
// node:dns Resolver로 1.1.1.1 에 UDP 질의하는 방법은 dig는 되는데도 ENOTFOUND가
// 떠서 쓰지 않는다.

import https from 'node:https'

const KCISA_BASE = 'https://api.kcisa.kr/openapi'
const KCISA_HOST = 'api.kcisa.kr'
const TIMEOUT_MS = 15000
const DOH_URL = `https://cloudflare-dns.com/dns-query?name=${KCISA_HOST}&type=A`

// DoH까지 막히는 환경을 위한 최후 수단. 주소가 바뀌면 여기만 고치면 된다.
const FALLBACK_IP = '175.125.91.8'

let cachedIp = null

const resolveKcisaIp = async () => {
  if (cachedIp) return cachedIp
  try {
    const res = await fetch(DOH_URL, {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(3000)
    })
    const json = await res.json()
    cachedIp = json.Answer?.find((a) => a.type === 1)?.data || FALLBACK_IP
  } catch {
    cachedIp = FALLBACK_IP
  }
  return cachedIp
}

// fetch는 DNS lookup을 바꿀 수 없어서 node:https 로 직접 요청한다.
// autoSelectFamily가 켜진 Node는 lookup 결과를 배열로 기대하므로 둘 다 지원한다.
const requestKcisa = (url, ip) =>
  new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        lookup: (host, opts, cb) =>
          opts.all ? cb(null, [{ address: ip, family: 4 }]) : cb(null, ip, 4),
        timeout: TIMEOUT_MS
      },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => resolve(body))
      }
    )
    req.on('timeout', () => req.destroy(new Error('KCISA 응답 시간 초과')))
    req.on('error', reject)
  })

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
    const ip = await resolveKcisaIp()
    const text = await requestKcisa(kcisaUrl.toString(), ip)

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

    // 업스트림 전체 건수를 페이지 건수와 구분해 돌려준다.
    // 이게 없으면 호출부가 마지막 페이지를 판단할 수 없어 끝까지 페이징하지 못한다.
    const upstreamTotal = parseInt(getTagValue(text, 'totalCount') || '0')

    // 공연 목록은 자주 바뀌지 않으므로 엣지에 캐시해 업스트림 호출을 줄인다.
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400')
    return res.status(200).json({
      success: true,
      resultCode,
      resultMsg,
      totalCount: upstreamTotal || items.length,
      pageCount: items.length,
      items
    })
  } catch (error) {
    // DNS/TLS/타임아웃을 구분할 수 있게 원인 코드를 같이 돌려준다.
    return res.status(200).json({
      success: false,
      items: [],
      totalCount: 0,
      message: error.message,
      cause: error.code || ''
    })
  }
}
