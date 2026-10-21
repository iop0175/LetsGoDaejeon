import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'

const [city, base, output = '../backups/transit-contrast'] = process.argv.slice(2)
assert.ok(city && base, 'Usage: node scripts/testTransitContrast.mjs <city> <base> [screenshots]')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH })
const fixtures = ['대전광역시복합문화체육센터부설제2공영주차장(장애인전용구역포함)', 'InternationalConventionCenterUndergroundParkingEntranceB', '역'].map((name, index) => ({ name, addr: '대전광역시 유성구 대학로 291 한국과학기술원 부설 연구동 지하주차장', divideNum: '6', typeNum: '2', chargeInfo: index ? '유료' : '무료', totalLot: 100, basicCharge: 1000, basicTime: 30, weekdayOpen: '09:00', weekdayClose: '22:00' }))
try {
  for (const width of [360, 1280]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } })
      await context.addInitScript((value) => localStorage.setItem('theme', value), theme)
      await context.route(/googlesyndication|doubleclick|google-analytics/, (route) => route.abort())
      await context.route(/\/api\/(?:daejeon\/)?parking\?/, (route) => route.fulfill({ json: { success: true, items: fixtures, totalCount: fixtures.length } }))
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      const contrast = async (selector) => page.locator(selector).evaluateAll((elements) => {
        const rgb = (value) => value.match(/[\d.]+/g).map(Number)
        const luminance = (values) => values.slice(0, 3).map((value) => value / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
        return elements.filter((element) => element.getClientRects().length && element.textContent.trim()).map((element) => {
          const foreground = luminance(rgb(getComputedStyle(element).color))
          let parent = element
          while (parent && rgb(getComputedStyle(parent).backgroundColor)[3] === 0) parent = parent.parentElement
          const background = luminance(parent ? rgb(getComputedStyle(parent).backgroundColor) : [255, 255, 255])
          return { text: element.textContent.slice(0, 50), ratio: (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05) }
        })
      })
      await page.goto(`${base}/kr/parking`, { waitUntil: 'load' })
      await page.waitForSelector('.parking-card h3')
      assert.equal(await page.locator('.parking-card').count(), fixtures.length)
      assert.equal(await page.locator('.parking-header').first().evaluate((element) => getComputedStyle(element).display), 'block')
      assert.ok(await page.locator('.parking-header h3, .parking-info > span').evaluateAll((elements) => elements.every((element) => element.scrollWidth <= element.clientWidth + 1)), 'Long names and addresses wrap within cards')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      for (const item of await contrast('.parking-header h3, .parking-info strong, .parking-info > span, .parking-type, .parking-category, .charge-badge, .parking-nav-btn, .filter-btn, .stat-label, .info-navigation__links a')) assert.ok(item.ratio >= 4.5, `${city} ${theme} contrast ${JSON.stringify(item)}`)
      await page.screenshot({ path: `${output}/${city}-parking-${theme}-${width}.png`, fullPage: true })
      if (['daejeon', 'jeju'].includes(city)) {
        await page.goto(`${base}/kr/traffic`, { waitUntil: 'load', timeout: 120000 })
        await page.waitForSelector('.transit-map__canvas')
        for (const item of await contrast('.bt-note, .bt-intro, .bt-table th, .bt-table td, .bt-level')) assert.ok(item.ratio >= 4.5, `${city} traffic ${theme} contrast ${JSON.stringify(item)}`)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
        await page.screenshot({ path: `${output}/${city}-traffic-${theme}-${width}.png`, fullPage: true })
      }
      assert.deepEqual(errors, [])
      console.log(`${city} ${width} ${theme}: contrast and long-name cards passed`)
      await context.close()
    }
  }
} finally {
  await browser.close()
}
