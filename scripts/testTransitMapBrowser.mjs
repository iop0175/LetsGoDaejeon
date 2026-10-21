import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = process.argv[2]
assert.ok(base, 'Usage: node scripts/testTransitMapBrowser.mjs <base>')
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH })
const sdk = `
(() => {
window.mapTrace = { traffic: false, fitted: 0 };
class LatLng { constructor(lat, lon) { this.lat = lat; this.lon = lon; } }
class LatLngBounds { extend() {} }
class Map { constructor(element) { this.element = element; } addControl() {} relayout() {} setLevel() {} setBounds() { window.mapTrace.fitted++; } addOverlayMapTypeId() { window.mapTrace.traffic = true; } removeOverlayMapTypeId() { window.mapTrace.traffic = false; } }
class CustomOverlay { constructor(options) { this.content = options.content; options.map.element.append(this.content); } setMap(map) { if (!map) this.content.remove(); } }
window.kakao = { maps: { Map, LatLng, LatLngBounds, CustomOverlay, ZoomControl: class {}, ControlPosition: { RIGHT: 1 }, MapTypeId: { TRAFFIC: 1 }, load: (callback) => callback() } };
})();
`
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route(/googlesyndication|doubleclick|google-analytics/, (route) => route.abort())
  await page.route('**/v2/maps/sdk.js?*', (route) => route.fulfill({ contentType: 'application/javascript', body: sdk }))
  let liveCalls = 0
  await page.route('**/api/bus-live?route=*', (route) => {
    liveCalls += 1
    return route.fulfill({ json: { success: true, buses: [{ plate: '대전75자1234', stopId: '42010', direction: '1', lat: 36.36, lon: 127.34 }] } })
  })
  await page.goto(`${base}/kr/bus/route/604번-30300071`, { waitUntil: 'load', timeout: 120000 })
  await page.waitForSelector('.transit-map__canvas[data-map-ready=true]')
  await page.waitForSelector('.transit-map__pin--bus')
  assert.ok(await page.locator('.transit-map__pin--stop').count() > 20)
  await page.locator('.transit-map__pin--bus').click()
  assert.ok((await page.locator('.transit-map__selection').innerText()).includes('1234'))
  await page.getByLabel('도로 소통 색상', { exact: true }).check()
  assert.equal(await page.evaluate(() => window.mapTrace.traffic), true)
  await page.waitForTimeout(21000)
  assert.ok(liveCalls >= 2, 'Bus locations refresh')
  assert.equal(await page.locator('.transit-map__pin--bus').count(), 1, 'Old markers removed on refresh')
  assert.equal(await page.evaluate(() => window.mapTrace.fitted), 1, 'Live updates preserve user viewport')
  assert.deepEqual(errors, [])
  console.log('SDK mock: stops, bus selection, traffic toggle, polling and marker cleanup passed')
  await page.unroute('**/v2/maps/sdk.js?*')
  await page.route('**/v2/maps/sdk.js?*', (route) => route.abort())
  await page.reload({ waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('.transit-map')?.textContent.includes('지도를 불러오지 못했습니다'), null, { timeout: 20000 })
  assert.ok(await page.locator('.bt-stops li').count() > 20, 'Map failure keeps stop list')
  console.log('SDK failure: fallback message and stop list passed')
} finally {
  await browser.close()
}
