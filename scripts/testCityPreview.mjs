import assert from 'node:assert/strict'
import fs from 'node:fs'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const [cityKey, baseUrl] = process.argv.slice(2)
const cityName = { seoul: '서울', busan: '부산', jeju: '제주' }[cityKey]
assert.ok(cityName && baseUrl, 'Usage: testCityPreview.mjs seoul|busan|jeju http://localhost:PORT')
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const outputDirectory = `/tmp/letsgo-${cityKey}-qa`
fs.mkdirSync(outputDirectory, { recursive: true })

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('.hero-title').waitFor()
  await page.waitForFunction(() => document.querySelectorAll('a[href^="/spot/"]').length > 0)
  assert.equal(await page.locator('[data-city]').getAttribute('data-city'), cityKey)
  assert.equal(await page.locator('.city-select').inputValue(), cityKey)
  assert.deepEqual(await page.locator('.city-select option').allTextContents(), ['대전', '서울', '부산', '제주'])
  assert.ok((await page.title()).includes(cityName))
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow')
  const pageText = await page.evaluate(() => {
    const body = document.body.cloneNode(true)
    body.querySelector('.city-select')?.remove()
    return body.innerText
  })
  assert.ok(!pageText.includes('대전'), 'Other city text leaked into landing page')
  const hero = page.locator('.hero-slide.active img')
  await hero.evaluate(image => image.decode())
  assert.ok(await hero.evaluate(image => image.naturalWidth > 0), 'Hero image failed')
  await page.screenshot({ path: `${outputDirectory}/desktop.png`, fullPage: true })
  const detailPath = await page.locator('a[href^="/spot/"]').first().getAttribute('href')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForFunction(() => document.querySelector('.nav').getBoundingClientRect().left >= window.innerWidth - 1)
  await page.locator('.mobile-menu-btn').click()
  await page.waitForFunction(() => Math.abs(document.querySelector('.nav').getBoundingClientRect().left) < 1)
  await page.locator('.mobile-menu-btn').click()
  await page.waitForFunction(() => document.querySelector('.nav').getBoundingClientRect().left >= window.innerWidth - 1)
  await page.screenshot({ path: `${outputDirectory}/mobile.png`, fullPage: true })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Mobile horizontal overflow')
  const response = await page.goto(`${baseUrl}${detailPath}`, { waitUntil: 'domcontentloaded' })
  assert.equal(response.status(), 200, 'Own city detail failed')
  assert.ok(!(await page.title()).includes('대전'), 'Detail SEO leaked another city')
  if (cityKey === 'busan') {
    await page.goto(`${baseUrl}/travel?district=${encodeURIComponent('해운대구')}`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.querySelector('.district-btn.active')?.textContent.includes('해운대구'))
  }
  const wrongCity = await page.goto(`${baseUrl}/spot/한빛탑-2779504`, { waitUntil: 'domcontentloaded' })
  assert.equal(wrongCity.status(), 404, 'Other city detail was exposed')
  // 서울은 주차가 연결됐으므로 미연결 도시만 확인한다
  if (cityKey === 'jeju') {
    await page.goto(`${baseUrl}/parking`, { waitUntil: 'domcontentloaded' })
    assert.ok((await page.locator('h1').innerText()).includes('준비 중'), 'Unconnected regional service exposed')
  }
  assert.deepEqual(errors, [], 'Browser JavaScript errors')
  console.log(JSON.stringify({ cityKey, desktop: 'passed', mobile: 'passed', hero: 'loaded', ownDetail: 200, crossCityDetail: 404, pageErrors: errors, screenshots: outputDirectory }))
} finally {
  await browser.close()
}
