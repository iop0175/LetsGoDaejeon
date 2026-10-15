import assert from 'node:assert/strict'
import { getDirectionsUrl } from '../src/utils/mapLinks.js'

assert.equal(
  getDirectionsUrl('ko', { address: '부산 해운대구' }),
  'https://map.kakao.com/link/search/%EB%B6%80%EC%82%B0%20%ED%95%B4%EC%9A%B4%EB%8C%80%EA%B5%AC'
)
assert.equal(
  getDirectionsUrl('en', { address: '부산 해운대구' }),
  'https://www.google.com/maps/dir/?api=1&destination=%EB%B6%80%EC%82%B0%20%ED%95%B4%EC%9A%B4%EB%8C%80%EA%B5%AC'
)
assert.equal(
  getDirectionsUrl('ko', { name: '해운대', lat: '35.1587', lng: '129.1604' }),
  'https://map.kakao.com/link/to/%ED%95%B4%EC%9A%B4%EB%8C%80,35.1587,129.1604'
)
assert.equal(
  getDirectionsUrl('en', { name: 'Haeundae', lat: 35.1587, lng: 129.1604 }),
  'https://www.google.com/maps/dir/?api=1&destination=35.1587%2C129.1604'
)

console.log('Language-aware map links: passed')
