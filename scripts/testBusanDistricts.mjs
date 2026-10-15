import assert from 'node:assert/strict'
import { BUSAN_SIGUNGU, summarizeDistricts } from '../pages/api/busan-districts.js'

assert.equal(Object.keys(BUSAN_SIGUNGU).length, 16)
assert.deepEqual(summarizeDistricts([]), [])
assert.deepEqual(summarizeDistricts([
  { sigungucode: '16', content_type_id: '12', firstimage: '' },
  { sigungucode: '16', content_type_id: '12', firstimage: 'https://example.com/beach.jpg' },
  { sigungucode: '3', content_type_id: '12', firstimage: '' },
  { sigungucode: '16', content_type_id: '39', firstimage: 'https://example.com/food.jpg' },
  { sigungucode: '999', content_type_id: '12', firstimage: '' }
]), [
  { name: '해운대구', count: 2, image: 'https://example.com/beach.jpg' },
  { name: '기장군', count: 1, image: '' }
])
console.log('Busan district mapping, counts, image fallback, and exclusions: passed')
