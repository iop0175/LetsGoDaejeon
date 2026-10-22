import assert from 'node:assert/strict'
import { getCityFeatures, hasCityFeature } from '../src/config/cityFeatures.js'
import { normalizeArrival, groupArrivals, isSubwayStation } from '../src/utils/subway.js'
import { seaLevel, waterLevel, buildBeachRows, BEACHES } from '../src/utils/beaches.js'
import { dayMode, pickSlots, seededOrder, SLOTS } from '../src/utils/todayPlan.js'
import { nearestStops } from '../src/utils/busStops.js'

// 도시별 기능 켜짐
assert.deepEqual(getCityFeatures('seoul').map((f) => f.id), ['today', 'subway'])
assert.deepEqual(getCityFeatures('busan').map((f) => f.id), ['today', 'beaches'])
assert.deepEqual(getCityFeatures('jeju').map((f) => f.id), ['today', 'beaches', 'gas', 'ev', 'themes'])
assert.deepEqual(getCityFeatures('daejeon').map((f) => f.id), ['today'])
assert.equal(hasCityFeature('daejeon', 'subway'), false)

// 지하철
assert.equal(isSubwayStation('서울'), true)
assert.equal(isSubwayStation('../etc'), false)
const rows = [
  { subwayId: '1001', updnLine: '상행', trainLineNm: 'A행', barvlDt: '300', arvlMsg2: '5분', arvlMsg3: '용산' },
  { subwayId: '1001', updnLine: '상행', trainLineNm: 'B행', barvlDt: '0', arvlMsg2: '전역 도착', arvlMsg3: '' },
  { subwayId: '1001', updnLine: '상행', trainLineNm: 'C행', barvlDt: '60', arvlMsg2: '1분', arvlMsg3: '' },
  { subwayId: '1004', updnLine: '하행', trainLineNm: 'D행', barvlDt: '120', arvlMsg2: '2분', arvlMsg3: '' }
].map(normalizeArrival)
const groups = groupArrivals(rows)
assert.equal(groups.length, 2)
assert.equal(groups[0].trains.length, 2)
assert.equal(groups[0].trains[0].destination, 'C행')
assert.equal(groups[0].line, '1호선')
assert.equal(normalizeArrival({ subwayId: '9999' }).line, '지하철')

// 해수욕장
assert.equal(seaLevel({ wave: 0.3, wind: 10 }), 0)
assert.equal(seaLevel({ wave: 0.8, wind: 10 }), 1)
assert.equal(seaLevel({ wave: 1.4, wind: 10 }), 2)
assert.equal(seaLevel({ wave: 0.3, wind: 40 }), 2)
assert.equal(seaLevel({ wave: null, wind: 10 }), null)
assert.equal(waterLevel(22), 0); assert.equal(waterLevel(18), 1); assert.equal(waterLevel(10), 2); assert.equal(waterLevel(null), null)
const built = buildBeachRows(BEACHES.busan.slice(0, 1), [{ current: { wave_height: 0.2, wave_period: 5, sea_surface_temperature: 22 } }], [{ current: { temperature_2m: 20, wind_speed_10m: 8, weather_code: 0 }, daily: { uv_index_max: [4] } }])
assert.equal(built[0].level, 0); assert.equal(built[0].uv, 4)
assert.equal(buildBeachRows(BEACHES.jeju.slice(0, 1), undefined, undefined)[0].level, null)
assert.equal(BEACHES.busan.length, 7); assert.equal(BEACHES.jeju.length, 8)

// 오늘 코스
assert.equal(dayMode({ code: 0, rainChance: 10, temperature: 20, pm25: 10 }), 'clear')
assert.equal(dayMode({ code: 63, rainChance: 20, temperature: 20, pm25: 10 }), 'rainy')
assert.equal(dayMode({ code: 0, rainChance: 80, temperature: 20, pm25: 10 }), 'rainy')
assert.equal(dayMode({ code: 0, rainChance: 0, temperature: 20, pm25: 50 }), 'dusty')
assert.equal(dayMode({ code: 0, rainChance: 0, temperature: 33, pm25: 10 }), 'hot')
assert.equal(dayMode({ code: 0, rainChance: 0, temperature: 0, pm25: 10 }), 'cold')
assert.equal(dayMode({}), 'clear')
const spots = Array.from({ length: 40 }, (_, i) => ({ contentId: String(i), contentTypeId: [12, 14, 28, 38, 39][i % 5], name: 'S' + i }))
for (const mode of Object.keys(SLOTS)) {
  const plan = pickSlots(mode, spots, 'seoul2026-10-16')
  assert.equal(plan.length, 4)
  const ids = plan.map((s) => s.spot?.contentId).filter(Boolean)
  assert.equal(new Set(ids).size, ids.length)
  plan.forEach((slot) => assert.ok(slot.spot && slot.types.includes(slot.spot.contentTypeId)))
}
assert.deepEqual(pickSlots('clear', spots, 'x').map((s) => s.spot.contentId), pickSlots('clear', spots, 'x').map((s) => s.spot.contentId))
assert.notDeepEqual(seededOrder(spots, 'a').map((s) => s.contentId), seededOrder(spots, 'b').map((s) => s.contentId))
assert.equal(pickSlots('rainy', [], 'x').every((slot) => slot.spot === null), true)

// 근처 버스정류장: 반경 밖은 빼고 가까운 순, 10m 단위
const near = nearestStops([{ id: 'far', lat: 36.36, lon: 127.38 }, { id: 'b', lat: 36.3512, lon: 127.38 }, { id: 'a', lat: 36.3501, lon: 127.38 }], { lat: 36.35, lon: 127.38 }, 3, 0.5)
assert.deepEqual(near.map((s) => [s.id, s.meters]), [['a', 10], ['b', 130]])
assert.deepEqual(nearestStops([{ id: 'a', lat: 36.35, lon: 127.38 }], { lat: 0, lon: 0 }), [])
console.log('feature page tests passed')
