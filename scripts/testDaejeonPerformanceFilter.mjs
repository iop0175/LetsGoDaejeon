/**
 * 대전 공연 판정 필터 자체 점검
 *
 * 실행: node scripts/testDaejeonPerformanceFilter.mjs
 *       KCISA_API_KEY=... node scripts/testDaejeonPerformanceFilter.mjs   (라이브 검증까지)
 *
 * 판정식은 src/services/api.js 의 isDaejeonPerformance 와 같아야 한다.
 * api.js 는 확장자 없는 상대 import 때문에 node 에서 그대로 못 불러오므로
 * 여기 복제해 둔다. 한쪽을 고치면 다른 쪽도 고쳐야 한다.
 */

import assert from 'node:assert/strict'
import https from 'node:https'

const isDaejeonPerformance = (item) =>
  (item.eventSite || '').includes('대전') || (item.title || '').includes('[대전]')

// ---------- 오프라인: 고정 케이스 ----------

// 장소명에 대전이 들어가는 가장 흔한 참 케이스
assert.equal(isDaejeonPerformance({ title: '유벨톤 작곡가 시리즈3', eventSite: '대전예술의전당 아트홀' }), true)

// 장소명에 대전이 없는 대전 소극장. KCISA 가 제목에 [대전] 으로 태깅한다.
// eventSite 만 보던 기존 로직이 놓치던 부류다.
assert.equal(isDaejeonPerformance({ title: '[대전] 어쩌다보니', eventSite: '소극장 고도' }), true)
assert.equal(isDaejeonPerformance({ title: '[대전] 소보로', eventSite: '작은극장 다함' }), true)

// 핵심 회귀 방어: "초대전" 의 부분 문자열 '대전' 에 걸려선 안 된다.
// title 에 괄호 없는 '대전' 부분일치를 쓰면 전국 전시가 대전으로 섞여 들어온다.
assert.equal(isDaejeonPerformance({ title: '정미옥 초대전 2026 In-between', eventSite: '갤러리제이원' }), false)
assert.equal(isDaejeonPerformance({ title: '제8회 기획초대전', eventSite: '서울 인사아트센터' }), false)

// 지역 무관 공연은 제외
assert.equal(isDaejeonPerformance({ title: 'Songs Echo Memories', eventSite: '예술의전당 콘서트홀' }), false)

// 필드 누락에도 터지지 않아야 한다 (업스트림이 태그를 비워 보내는 경우가 있다)
assert.equal(isDaejeonPerformance({}), false)
assert.equal(isDaejeonPerformance({ title: null, eventSite: undefined }), false)

console.log('offline: ok (8 cases)')

// ---------- 라이브: 업스트림 규약 검증 ----------

const apiKey = (process.env.KCISA_API_KEY || '').trim()
if (!apiKey) {
  console.log('live: skipped (KCISA_API_KEY 없음)')
  process.exit(0)
}

const PAGE_SIZE = 1000
const url =
  `https://api.kcisa.kr/openapi/CNV_060/request` +
  `?serviceKey=${encodeURIComponent(apiKey)}&numOfRows=${PAGE_SIZE}&pageNo=1`

const xml = await new Promise((resolve, reject) => {
  const req = https.get(url, { timeout: 30000 }, (res) => {
    let body = ''
    res.setEncoding('utf8')
    res.on('data', (c) => (body += c))
    res.on('end', () => resolve(body))
  })
  req.on('timeout', () => req.destroy(new Error('timeout')))
  req.on('error', reject)
})

const tag = (s, name) => {
  const m = s.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))
  return m ? m[1].trim() : ''
}

assert.equal(tag(xml, 'resultCode'), '0000', `업스트림 실패: ${tag(xml, 'resultMsg')}`)

// 라우트가 되돌려주는 전체 건수. 페이지 크기와 달라야 페이징 종료 조건이 성립한다.
const upstreamTotal = parseInt(tag(xml, 'totalCount') || '0')
assert.ok(
  upstreamTotal > PAGE_SIZE,
  `totalCount(${upstreamTotal})가 페이지 크기 이하다. 전체 건수가 아니라 페이지 건수를 보고 있을 수 있다.`
)

const items = (xml.match(/<item>[\s\S]*?<\/item>/g) || []).map((x) => ({
  title: tag(x, 'title'),
  eventSite: tag(x, 'eventSite')
}))
assert.ok(items.length > 0, 'item 파싱 실패')

const bySite = items.filter((i) => (i.eventSite || '').includes('대전'))
const byTitleTag = items.filter((i) => (i.title || '').includes('[대전]'))
const union = items.filter(isDaejeonPerformance)
const naiveTitle = items.filter((i) => (i.title || '').includes('대전'))

// 제목 태그가 장소명만으로는 못 잡는 건을 실제로 보태고 있는지 확인.
// KCISA 가 [대전] 태깅을 그만두면 여기서 깨지고, 그때 판정식을 다시 봐야 한다.
assert.ok(
  union.length > bySite.length,
  `[대전] 제목 태그가 추가로 잡아내는 건이 없다 (union=${union.length}, eventSite=${bySite.length}). 태깅 규약이 바뀐 것일 수 있다.`
)

// 괄호 없는 부분일치가 왜 위험한지 실데이터로 재확인
const falsePositives = naiveTitle.filter((i) => !isDaejeonPerformance(i))
assert.ok(
  naiveTitle.length >= byTitleTag.length,
  '부분일치가 괄호 태그보다 적게 잡혔다. 전제가 바뀌었다.'
)

console.log(
  `live: ok  전체=${upstreamTotal}  표본=${items.length}  ` +
    `eventSite=${bySite.length}  [대전]태그=${byTitleTag.length}  합집합=${union.length}  ` +
    `괄호없는부분일치 오탐=${falsePositives.length}`
)
console.log(`추정 대전 공연 = ${Math.round((union.length / items.length) * upstreamTotal)}건`)
