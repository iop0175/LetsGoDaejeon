import assert from 'node:assert/strict'
import fs from 'node:fs'
import { CITIES } from '../src/config/cities.js'

for (const city of Object.values(CITIES)) {
  assert.ok(city.center.y >= city.bounds.latMin && city.center.y <= city.bounds.latMax)
  assert.ok(city.center.x >= city.bounds.lngMin && city.center.x <= city.bounds.lngMax)
  assert.ok(city.districtNames.length > 0)
  if (city.hero) {
    assert.ok(fs.existsSync(`public${city.hero.image}`))
    assert.ok(city.hero.ko.subtitle.includes(city.cityName))
    assert.ok(!city.hero.ko.description.includes('대전'))
  }
}

for (const cityKey of ['daejeon', 'seoul', 'busan', 'jeju']) {
  process.env.NEXT_PUBLIC_CITY_KEY = cityKey
  const config = await import(`../src/config/cities.js?city=${cityKey}`)
  assert.equal(config.CITY.key, cityKey)
}
process.env.NEXT_PUBLIC_CITY_KEY = 'unknown'
await assert.rejects(import('../src/config/cities.js?city=unknown'), /Unknown city/)
console.log('City configuration, regional assets, map bounds, and invalid-city guard: passed')
