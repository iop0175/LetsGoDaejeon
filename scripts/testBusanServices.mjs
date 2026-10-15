import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://localhost:3002'
const output = '/tmp/letsgo-busan-services-qa'
fs.mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  for (const [endpoint, minimum] of [['/api/parking?numOfRows=3000', 500], ['/api/medical', 5000], ['/api/busan-guides?type=themes', 200], ['/api/busan-guides?type=food', 400]]) {
    const response = await page.request.get(`${base}${endpoint}`, { timeout: 60000 })
    assert.equal(response.status(), 200)
    const data = await response.json()
    assert.equal(data.success, true)
    assert.ok(data.totalCount >= minimum, `${endpoint}: unexpected count ${data.totalCount}`)
  }
  await page.goto(`${base}/parking`)
  await page.locator('.parking-card').first().waitFor({ timeout: 60000 })
  assert.ok((await page.locator('.parking-page').innerText()).includes('실시간 잔여 주차면이 아니며'))
  await page.locator('.parking-page select').first().selectOption('사하구')
  await page.waitForFunction(() => [...document.querySelectorAll('.parking-card')].length > 0)
  assert.ok((await page.locator('.parking-card').first().innerText()).includes('사하'))
  await page.goto(`${base}/medical`)
  await page.locator('.medical-card').first().waitFor({ timeout: 60000 })
  await page.getByRole('button', { name: '해운대구', exact: true }).click()
  await page.waitForFunction(() => [...document.querySelectorAll('.medical-card')].length > 0 && [...document.querySelectorAll('.medical-card')].every(card => card.textContent.includes('해운대구')))
  await page.locator('.medical-search input').fill('일치하는기관없음xyz')
  await page.locator('.no-results').waitFor()
  await page.goto(`${base}/busan-guide`)
  await page.locator('.busan-guides__card').first().waitFor({ timeout: 60000 })
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.busan-guides__pagination span')?.textContent.startsWith('2 /'))
  await page.getByRole('button', { name: '부산 미식', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.busan-guides__pagination span')?.textContent.startsWith('1 /'))
  await page.getByRole('textbox', { name: '추천 콘텐츠 검색' }).fill('해운대')
  await page.waitForFunction(() => [...document.querySelectorAll('.busan-guides__card')].length > 0 && [...document.querySelectorAll('.busan-guides__card')].every(card => card.textContent.includes('해운대')))
  await page.locator('.busan-guides__card summary').first().click()
  assert.equal(await page.locator('.busan-guides__card details').first().getAttribute('open'), '')
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.locator('.busan-guides__card img').first().scrollIntoViewIfNeeded()
    await page.locator('.busan-guides__card img').first().evaluate(image => image.decode())
    assert.ok(await page.locator('.busan-guides__card img').first().evaluate(image => image.naturalWidth > 0))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`)
    await page.screenshot({ path: `${output}/${width}.png`, fullPage: true })
  }
  const events = await (await page.request.get(`${base}/api/events`, { timeout: 60000 })).json()
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10)
  assert.ok(events.success)
  assert.ok(events.items.every(item => item.start_date <= today && item.end_date >= today))
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ parking: 'passed', medicalSearch: 'passed', guidesTabsSearchPaging: 'passed', images: 'passed', mobile: 'passed', ongoingEvents: events.items.length, errors, screenshots: output }))
} finally { await browser.close() }
