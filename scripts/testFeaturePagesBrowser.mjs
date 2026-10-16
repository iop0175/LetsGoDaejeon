// 사용법: node scripts/testFeaturePagesBrowser.mjs <city> <baseUrl>
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const [city, base] = process.argv.slice(2)
const expected = { seoul: 'subway', busan: 'beaches', jeju: 'beaches', daejeon: 'bus' }[city]
const all = ['subway', 'beaches', 'bus']
const status = async (path) => (await fetch(base + path, { redirect: 'manual' })).status

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH })
const errors = []
const open = async (width, path) => {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  page.on('pageerror', (e) => errors.push(path + ' ' + e.message))
  await page.goto(base + path, { waitUntil: 'networkidle' })
  return page
}
const noOverflow = async (page, label) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, label + ' overflow')

// 다른 도시 기능은 404
for (const id of all.filter((id) => id !== expected)) assert.equal(await status('/kr/' + id), 404, city + ' /' + id + ' should be 404')
assert.equal(await status('/api/subway?station=' + encodeURIComponent('서울')), city === 'seoul' ? 200 : 404)
assert.equal(await status('/api/bus?q=604'), city === 'daejeon' ? 200 : 404)

// 오늘의 코스
for (const width of [1280, 390]) {
  for (const locale of ['kr', 'en']) {
    const page = await open(width, '/' + locale + '/today')
    assert.equal(await page.locator('.today-plan > li').count(), 4, 'today slots')
    assert.ok(await page.locator('.today-plan__card').count() >= 3, city + ' today cards')
    assert.ok((await page.locator('h1').innerText()).length > 4)
    assert.equal(await page.locator('link[rel=canonical]').count(), 1)
    await noOverflow(page, city + ' today ' + width + locale)
    await page.close()
  }
}

if (expected === 'subway') {
  const api = await (await fetch(base + '/api/subway?station=' + encodeURIComponent('서울'))).json()
  assert.equal(api.success, true); assert.ok(api.groups.length > 0, 'subway groups')
  assert.equal(await status('/api/subway?station=' + encodeURIComponent('../x')), 400)
  for (const width of [1280, 390]) {
    const page = await open(width, '/kr/subway')
    await page.waitForSelector('.subway-card', { timeout: 15000 })
    await page.getByRole('tab', { name: '강남' }).click()
    await page.waitForFunction(() => document.querySelector('.feature-heading')?.textContent === '강남')
    await page.waitForSelector('.subway-card', { timeout: 15000 })
    await noOverflow(page, 'subway ' + width)
    await page.close()
  }
}
if (expected === 'beaches') {
  for (const width of [1280, 390]) {
    const page = await open(width, '/kr/beaches')
    const cards = await page.locator('.beach-card').count()
    assert.equal(cards, city === 'busan' ? 7 : 8)
    const text = await page.locator('.beach-grid').innerText()
    assert.ok(!text.includes('NaN') && !text.includes('undefined'))
    const dash = (text.match(/^-$/gm) || []).length
    assert.ok(dash < cards * 2, 'too many empty values: ' + dash)
    await noOverflow(page, 'beaches ' + width)
    console.log(city, 'beach sample:', (await page.locator('.beach-card').first().innerText()).replace(/\n+/g, ' ').slice(0, 120))
    await page.close()
  }
}
if (expected === 'bus') {
  assert.equal(await status('/api/bus?q=' + encodeURIComponent('<script>')), 400)
  for (const width of [1280, 390]) {
    const page = await open(width, '/kr/bus')
    await page.fill('input[aria-label="버스 번호"]', '604')
    await page.locator('.bus-search button[type=submit]').click()
    await page.waitForSelector('.bus-lanes button', { timeout: 20000 })
    await page.locator('.bus-lanes button').first().click()
    await page.waitForSelector('.bus-stops li', { timeout: 20000 })
    assert.ok(await page.locator('.bus-stops li').count() > 30, 'bus stops')
    await noOverflow(page, 'bus ' + width)
    await page.close()
  }
}

// 메뉴·푸터·사이트맵 노출
const sitemap = await (await fetch(base + '/sitemap-main.xml')).text()
for (const path of ['today', expected]) assert.ok(sitemap.includes('/kr/' + path + '</loc>'), city + ' sitemap /' + path)
for (const id of all.filter((id) => id !== expected)) assert.ok(!sitemap.includes('/kr/' + id + '</loc>'), city + ' sitemap should not list /' + id)
const home = await open(1280, '/kr')
assert.ok(await home.locator('footer a[href="/kr/today"], footer a[href="/today"]').count() >= 1, 'footer link')
await home.close()

await browser.close()
assert.equal(errors.length, 0, errors.join('\n'))
console.log(city, 'feature browser tests passed')
