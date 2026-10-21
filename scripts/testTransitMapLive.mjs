import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'

const [city, base] = process.argv.slice(2)
assert.ok(['daejeon', 'jeju'].includes(city) && base, 'Usage: node scripts/testTransitMapLive.mjs <daejeon|jeju> <base>')
const output = '../backups/transit-production'
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH })
try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.route(/googlesyndication|doubleclick|google-analytics/, (route) => route.abort())
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    const paths = city === 'daejeon' ? ['/kr/traffic', '/kr/bus/route/604번-30300071', '/kr/bus/stop/유성시장-42010'] : ['/kr/traffic']
    for (const pathname of paths) {
      const response = await page.goto(base + pathname, { waitUntil: 'load', timeout: 120000 })
      assert.equal(response.status(), 200)
      await page.waitForSelector('.transit-map__canvas[data-map-ready=true]', { timeout: 25000 })
      await page.waitForFunction(() => [...document.querySelectorAll('.transit-map__canvas img')].some((image) => /map_2d|map_skyview|map-tile|maptile|\/api\/v1\/tile\//.test(image.src) && image.naturalWidth > 100), null, { timeout: 20000 })
      if (pathname.includes('/bus/route')) assert.ok(await page.locator('.transit-map__pin--stop').count() > 20)
      const pin = page.locator('.transit-map__pin').last()
      if (await pin.count()) {
        await pin.click()
        await page.waitForSelector('.transit-map__selection')
      }
      const toggle = page.getByLabel('도로 소통 색상', { exact: true })
      const checked = await toggle.isChecked()
      await toggle.setChecked(!checked)
      await toggle.setChecked(checked)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      await page.evaluate(() => localStorage.setItem('theme', 'dark'))
      await page.reload({ waitUntil: 'load' })
      await page.waitForSelector('html.dark-theme .transit-map__canvas[data-map-ready=true]')
      await page.locator('.transit-map').screenshot({ path: `${output}/${city}-map-${paths.indexOf(pathname)}-${width}.png` })
      assert.deepEqual(errors, [])
      console.log(JSON.stringify({ city, pathname, width, map: 'ready', tiles: 'loaded', interaction: 'passed', dark: 'passed' }))
    }
    await page.close()
  }
} finally {
  await browser.close()
}
