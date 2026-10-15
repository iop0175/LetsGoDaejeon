import assert from 'node:assert/strict'
import { fetchBusan } from '../workers/src/busan.js'
import { parseBusanResponse, normalizeBusanParking, normalizeBusanMedical, normalizeBusanStory, festivalDates } from '../src/utils/busanApi.js'

const parking = normalizeBusanParking({ pkNam: '해운대 주차장', mgntNum: '1', pkGubun: '공영', pkFm: '노외', xCdnt: '35.16', yCdnt: '129.16', pkCnt: '35', svcSrtTe: '-', feeInfo: '-' })
assert.deepEqual([parking.lat, parking.lon, parking.totalLot, parking.divideNum, parking.weekdayOpen, parking.chargeInfo], [35.16, 129.16, 35, '6', '', ''])
assert.notEqual(normalizeBusanParking({ guNm: '중구', mgntNum: '1' }).parkingId, normalizeBusanParking({ guNm: '동구', mgntNum: '1' }).parkingId)
assert.equal(normalizeBusanParking({ jibunAddr: '-', doroAddr: '해운대구 수영강변대로' }).addr, '해운대구 수영강변대로')
const medical = normalizeBusanMedical({ dutyName: '부산의원', dutyAddr: '부산광역시 해운대구 해운대로 1 (우동)', dutyDivNam: '의원' })
assert.deepEqual([medical.hsptlNm, medical.district, medical.dong, medical.hsptlKnd], ['부산의원', '해운대구', '우동', '의원'])
const xml = '<response><header><resultCode>00</resultCode></header><body><items><item><dutyName>A &amp; B</dutyName><dutyAddr><![CDATA[부산광역시 중구]]></dutyAddr></item></items><totalCount>1</totalCount></body></response>'
assert.deepEqual(parseBusanResponse({ xml }), { totalCount: 1, items: [{ dutyName: 'A & B', dutyAddr: '부산광역시 중구' }] })
assert.throws(() => parseBusanResponse({ xml: '<resultCode>30</resultCode>' }))
assert.throws(() => parseBusanResponse({ response: { header: { resultCode: '30' } } }))
assert.equal(parseBusanResponse({ getFoodKr: { header: { code: '00' }, totalCount: 0, item: [] } }).items.length, 0)
assert.deepEqual(festivalDates('2026. 10. 15. ~ 10. 18.'), { start: '2026-10-15', end: '2026-10-18' })
assert.deepEqual(festivalDates('2026.10.15.(목) ~ 18.(일)'), { start: '2026-10-15', end: '2026-10-18' })
assert.deepEqual(festivalDates('2026-12-31 ~ 2027-01-02'), { start: '2026-12-31', end: '2027-01-02' })
for (const period of ['매년 10월', '10.15 ~ 10.18', '2026.02.30 ~ 03.02', '2026.10.18 ~ 10.15', '2026.10.01 ~ 10.31 매주 토요일']) assert.equal(festivalDates(period), null)
assert.equal(normalizeBusanStory({ UC_SEQ: 1, TITLE: '<b>부산</b>', HOMEPAGE_URL: 'javascript:alert(1)' }, 'food').url, 'https://www.visitbusan.net/')
assert.equal((await fetchBusan(new Request('https://worker.test/api/busan/__proto__'), {})).status, 404)
assert.equal((await fetchBusan(new Request('https://worker.test/api/busan/parking'), {})).status, 503)
const originalFetch = globalThis.fetch
try {
  globalThis.fetch = async url => {
    assert.equal(url.hostname, 'apis.data.go.kr')
    assert.equal(url.searchParams.get('serviceKey'), 'fake-key')
    assert.equal(url.searchParams.get('Q0'), '부산광역시')
    assert.equal(url.searchParams.get('numOfRows'), '1000')
    assert.equal(url.searchParams.get('pageNo'), '1')
    return new Response(xml)
  }
  const result = await fetchBusan(new Request('https://worker.test/api/busan/medical?numOfRows=5000&pageNo=-1&serviceKey=override&Q0=서울'), { DAEJEON_API_KEY: 'fake-key' })
  assert.equal(result.status, 200)
  assert.equal(parseBusanResponse(result.data).totalCount, 1)
} finally { globalThis.fetch = originalFetch }
console.log('Busan API normalization, dates, allowlist and key reuse: passed')
