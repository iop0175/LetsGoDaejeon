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

import {
  parsePerformancePeriod,
  isPerformanceExpired,
  todayIsoDate
} from '../src/utils/performancePeriod.js'

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

console.log('offline(지역): ok (8 cases)')

// ---------- 오프라인: 기간 파싱 ----------

// 회귀 방어 본체. KCISA 실제 형식은 구분자가 없다.
// 구분자를 필수로 요구하던 예전 파서는 여기서 null 을 반환해
// 모든 행의 end_date 가 비었고 만료 삭제가 영구히 0건이었다.
assert.deepEqual(parsePerformancePeriod('20261001 ~ 20261017'), {
  start: '2026-10-01',
  end: '2026-10-17'
})

// 구분자가 있는 형식도 계속 받아야 한다
assert.deepEqual(parsePerformancePeriod('2026.10.01 ~ 2026.10.17'), {
  start: '2026-10-01',
  end: '2026-10-17'
})
assert.deepEqual(parsePerformancePeriod('2026-10-01 ~ 2026-10-17'), {
  start: '2026-10-01',
  end: '2026-10-17'
})

// 하루 공연: 날짜가 하나만 와도 시작일과 종료일이 모두 채워져야 한다
assert.deepEqual(parsePerformancePeriod('20261017'), { start: '2026-10-17', end: '2026-10-17' })

// 공백 없는 물결표
assert.deepEqual(parsePerformancePeriod('20261001~20261017'), {
  start: '2026-10-01',
  end: '2026-10-17'
})

// 빈 값
assert.deepEqual(parsePerformancePeriod(''), { start: null, end: null })
assert.deepEqual(parsePerformancePeriod(null), { start: null, end: null })
assert.deepEqual(parsePerformancePeriod('상시'), { start: null, end: null })

// 없는 날짜는 버려야 한다. date 컬럼에 들어가면 배치 upsert 전체가 실패한다.
assert.deepEqual(parsePerformancePeriod('20260230'), { start: null, end: null })
assert.deepEqual(parsePerformancePeriod('20261332'), { start: null, end: null })
// 뒤쪽만 깨진 경우 앞쪽 날짜는 살려서 쓴다
assert.deepEqual(parsePerformancePeriod('20261001 ~ 20260230'), {
  start: '2026-10-01',
  end: '2026-10-01'
})

// 만료 판정
assert.equal(isPerformanceExpired('20260207 ~ 20260208', '2026-10-08'), true)
assert.equal(isPerformanceExpired('20261001 ~ 20261017', '2026-10-08'), false)
// 종료일 == 오늘이면 아직 진행 중이다
assert.equal(isPerformanceExpired('20261008 ~ 20261008', '2026-10-08'), false)
// 기간을 못 읽으면 만료로 보지 않는다 (멀쩡한 공연을 버리는 쪽이 더 위험)
assert.equal(isPerformanceExpired('상시', '2026-10-08'), false)
assert.equal(isPerformanceExpired('', '2026-10-08'), false)

// 오늘 날짜는 KST 기준 YYYY-MM-DD 여야 한다 (UTC 쓰면 KST 오전에 하루 밀린다)
assert.match(todayIsoDate(), /^\d{4}-\d{2}-\d{2}$/)

console.log('offline(기간): ok (18 cases), today(KST)=' + todayIsoDate())

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

// 업스트림 eventPeriod 가 실제로 파싱되는지 확인.
// 형식이 바뀌면 end_date 가 다시 전부 null 이 되고 만료 삭제가 조용히 멈춘다.
const periods = (xml.match(/<item>[\s\S]*?<\/item>/g) || []).map((x) => tag(x, 'eventPeriod'))
const withPeriod = periods.filter(Boolean)
const parsed = withPeriod.filter((p) => parsePerformancePeriod(p).end)

assert.ok(withPeriod.length > 0, 'eventPeriod 가 비어 있다')
assert.ok(
  parsed.length / withPeriod.length > 0.95,
  `eventPeriod 파싱률 ${parsed.length}/${withPeriod.length}. 업스트림 날짜 형식이 바뀐 것 같다.`
)

const today = todayIsoDate()
const expired = withPeriod.filter((p) => isPerformanceExpired(p, today))
console.log(
  `기간: 파싱 ${parsed.length}/${withPeriod.length}건  만료 ${expired.length}건  예시="${withPeriod[0]}"`
)
