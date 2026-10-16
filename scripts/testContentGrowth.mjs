import assert from 'node:assert/strict'
import { CITIES } from '../src/config/cities.js'
import { CITY_GUIDES } from '../src/config/cityGuides.js'
import { eventSlug } from '../src/utils/eventSlug.js'

for (const city of Object.values(CITIES)) {
  const guides = CITY_GUIDES[city.key]
  assert.ok(guides?.length >= 4, `${city.key}: four guides required`)
  assert.equal(new Set(guides.map((item) => item.slug)).size, guides.length, `${city.key}: duplicate guide slug`)
  assert.ok(city.districtNames.length >= 2, `${city.key}: districts missing`)
  for (const item of guides) {
    assert.ok(item.kr?.title && item.kr?.description && item.kr?.intro, `${city.key}/${item.slug}: Korean copy missing`)
    assert.ok(item.en?.title && item.en?.description && item.en?.intro, `${city.key}/${item.slug}: English copy missing`)
    assert.ok(item.types?.length && item.keywords?.length, `${city.key}/${item.slug}: selectors missing`)
  }
}

assert.equal(eventSlug({ title: '테스트 행사', start_date: '2026-10-16' }), '테스트-행사-20261016')
console.log(`content growth checks passed: ${Object.values(CITY_GUIDES).flat().length} guides, ${Object.values(CITIES).reduce((sum, city) => sum + city.districtNames.length, 0)} districts`)
