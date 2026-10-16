import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = (process.argv[2] || 'http://localhost:3011').replace(/\/$/, '')
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH })
const pages = ['/kr/guides', '/en/guides', '/kr/live']
const report = []

try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    for (const path of pages) {
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      const response = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 120000 })
      await page.waitForTimeout(1500)
      assert.equal(response.status(), 200, `${path}: ${response.status()}`)
      const state = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent?.trim(), overflow: document.documentElement.scrollWidth > innerWidth, canonical: document.querySelector('link[rel=canonical]')?.href }))
      assert.ok(state.h1, `${path}: h1 missing`)
      assert.ok(!state.overflow, `${path}: horizontal overflow`)
      assert.ok(state.canonical, `${path}: canonical missing`)
      assert.deepEqual(errors, [], `${path} page errors: ${errors.join(' | ')}`)
      report.push(`${viewport.width}px ${path} ok`)
      await page.close()
    }
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${base}/kr/guides`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForTimeout(1000)
    const guideHref = await page.locator('.content-hub__guide').first().getAttribute('href')
    assert.ok(guideHref?.includes('/guides/'), 'guide link missing')
    const guideResponse = await page.goto(new URL(guideHref, base).toString(), { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForTimeout(1500)
    assert.equal(guideResponse.status(), 200, 'guide detail status')
    assert.ok(await page.locator('.content-hub__place').count(), 'guide places missing')
    assert.ok(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'guide detail overflow')
    assert.deepEqual(errors, [], `guide detail page errors: ${errors.join(' | ')}`)
    await context.close()
  }
  console.log(report.join('\n'))
} finally {
  await browser.close()
}
