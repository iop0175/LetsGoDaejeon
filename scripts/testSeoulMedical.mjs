import assert from 'node:assert/strict'
import { normalizeSeoulMedical, filterMedical } from '../pages/api/medical.js'

const clinic = normalizeSeoulMedical({
  DUTYNAME: '테스트치과의원',
  DUTYDIVNAM: '치과의원',
  DUTYADDR: '서울특별시 금천구 벚꽃로 286, 101동 111호 (가산동)',
  DUTYTEL1: '02-000-0000',
  WGS84LAT: '37.47',
  WGS84LON: '126.88'
})
const pharmacy = normalizeSeoulMedical({ DUTYNAME: '서초약국', DUTYADDR: '서울특별시 서초구 서초대로 233 (서초동, 영동대로빌딩)' })
const dongs = ['서울특별시 중구 남대문시장길 73-3 (회현동1가)', '서울특별시 강남구 테헤란로 1 (영동대로빌딩)', '서울특별시 광진구 뚝섬로 558 상가동']
  .map(addr => normalizeSeoulMedical({ DUTYADDR: addr }).dong)

assert.deepEqual(
  [clinic.hsptlKnd, clinic.district, clinic.dong, clinic.lat, pharmacy.hsptlKnd, pharmacy.dong],
  ['치과의원', '금천구', '가산동', 37.47, '약국', '서초동']
)
assert.deepEqual(dongs, ['회현동1가', null, null])
const items = [clinic, pharmacy]
assert.deepEqual(filterMedical(items, { type: '의원' }), [clinic])
assert.deepEqual(filterMedical(items, { type: '약국' }), [pharmacy])
assert.deepEqual(filterMedical(items, { district: '금천구', dong: '가산동' }), [clinic])
assert.deepEqual(filterMedical(items, { q: '서초' }), [pharmacy])

console.log('Seoul medical normalization: passed')
