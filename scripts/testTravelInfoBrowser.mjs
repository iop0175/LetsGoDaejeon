import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'

const [city, base, output] = process.argv.slice(2)
assert.ok(city && base, 'Usage: node scripts/testTravelInfoBrowser.mjs <city> <base> [screenshot directory]')
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH })
const paths = ['/kr/parking', '/kr/parking/free']
if (city === 'busan') paths.pop()
if (city === 'daejeon') paths.push('/kr/bus/route/604번-30300071', '/kr/traffic')
if (city === 'jeju') paths.push('/kr/gas', '/kr/ev', '/kr/themes', '/kr/traffic')
const results = []
if (output) await fs.mkdir(output, { recursive: true })

try {
  for (const width of [360, 390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await context.route(/googlesyndication|doubleclick|google-analytics/, (route) => route.abort())
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    const check = async (pathname) => {
      errors.length = 0
      const response = await page.goto(base + pathname, { waitUntil: 'load', timeout: 90000 })
      assert.equal(response.status(), 200, `${pathname} HTTP status`)
      await page.waitForSelector('.info-navigation', { timeout: 30000 })
      assert.equal(await page.locator('h1').count(), 1, `${pathname} h1`)
      assert.equal(await page.locator('.info-navigation__links [aria-current=page]').count(), 1, `${pathname} active navigation`)
      assert.deepEqual(errors, [], `${pathname} JS errors`)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${pathname} horizontal overflow at ${width}`)
      assert.equal(await page.locator('.app').getAttribute('data-city'), city)
      const table = page.locator('.info-table__scroll').first()
      if (await table.count()) {
        await table.focus()
        assert.equal(await table.getAttribute('tabindex'), '0')
        if (width < 640) assert.ok(await table.evaluate((element) => element.scrollWidth > element.clientWidth), 'Table scrolls independently')
      }
      if (output && width !== 360) await page.screenshot({ path: `${output}/${city}-${pathname.split('/').filter(Boolean).join('-')}-${width}.png` })
      results.push({ city, pathname, width, status: 'passed' })
    }
    for (const pathname of paths) await check(pathname)
    await page.goto(base + '/kr/parking/free', { waitUntil: 'load' })
    if (city === 'busan') await page.goto(base + '/kr/parking', { waitUntil: 'load' })
    const district = await page.locator('.pk-district-links a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href')).find((href) => !/\/(free|24h)$/.test(href)))
    assert.ok(district, `${city} district link`)
    await check(district)
    const lot = await page.locator('.pk-list a').first().getAttribute('href')
    assert.ok(lot, `${city} parking detail link`)
    await check(lot)
    if (city === 'daejeon') {
      await page.goto(base + '/kr/bus/route/604번-30300071', { waitUntil: 'load' })
      await check(await page.locator('.bt-stops a').first().getAttribute('href'))
    }
    if (city === 'jeju') {
      for (const [source, selector] of [['gas', '.bt-table a'], ['ev', '.bt-nearby a'], ['themes', '.bt-nearby a'], ['ev', '.bt-links a']]) {
        await page.goto(`${base}/kr/${source}`, { waitUntil: 'load', timeout: 90000 })
        const detail = await page.locator(selector).first().getAttribute('href')
        assert.ok(detail, `${source} detail link`)
        await check(detail)
      }
    }
    await page.goto(base + lot, { waitUntil: 'load' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'load' })
    await page.waitForSelector('html.dark-theme .pk-page')
    const colors = await page.locator('.pk-page').evaluate((element) => {
      const reference = document.createElement('span')
      reference.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary')
      element.append(reference)
      const expected = getComputedStyle(reference).backgroundColor
      reference.remove()
      return { background: getComputedStyle(element).backgroundColor, expected }
    })
    assert.equal(colors.background, colors.expected, 'Dark background follows the active theme')
    await context.close()
  }
  console.log(JSON.stringify(results))
} finally {
  await browser.close()
}
