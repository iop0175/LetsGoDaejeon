// /kr, /en 별도 주소 점검: 리다이렉트, 언어별 서버 HTML, 메타 태그, 언어 전환, 콘솔 오류
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://localhost:3011'
const paths = ['', '/travel', '/food', '/festival', '/culture', '/accommodation', '/map', '/trip-planner']
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH })
const issues = []
const report = []

try {
  const probe = await browser.newContext()
  // 접두어 없는 주소는 언어 주소로 보낸다
  for (const [headers, expected] of [[{}, '/kr'], [{ 'accept-language': 'en-US,en;q=0.9' }, '/en']]) {
    const res = await probe.request.get(`${base}/travel`, { headers, maxRedirects: 0 })
    assert.ok([307, 308].includes(res.status()), `/travel status ${res.status()}`)
    assert.ok(res.headers().location.endsWith(`${expected}/travel`), `redirect ${res.headers().location}`)
  }
  await probe.close()

  for (const locale of ['kr', 'en']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message.slice(0, 160)}`))
    page.on('console', (message) => {
      const text = message.text()
      if (message.type() === 'error' && !/Failed to load resource|kakao|googletag|adsbygoogle|favicon|403|401|net::/i.test(text)) errors.push(`console: ${text.slice(0, 160)}`)
    })

    for (const path of paths) {
      const url = `${base}/${locale}${path}`
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
      assert.equal(response.status(), 200, `${url} -> ${response.status()}`)
      await page.waitForTimeout(2500)
      const info = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        h1: document.querySelectorAll('h1').length,
        canonical: [...document.querySelectorAll('link[rel=canonical]')].map((el) => el.href),
        robots: [...document.querySelectorAll('meta[name=robots]')].map((el) => el.content),
        hreflang: [...document.querySelectorAll('link[rel=alternate][hreflang]')].map((el) => el.getAttribute('hreflang')),
        title: document.title,
        overflow: document.documentElement.scrollWidth > innerWidth
      }))
      assert.equal(info.lang, locale === 'en' ? 'en' : 'ko', `${url} lang ${info.lang}`)
      assert.equal(info.canonical.length, 1, `${url} canonical ${info.canonical.length}`)
      assert.ok(info.canonical[0].includes(`/${locale}`), `${url} canonical ${info.canonical[0]}`)
      assert.equal(info.robots.length, 1, `${url} robots ${info.robots.length}`)
      assert.deepEqual(info.hreflang.sort(), ['en', 'ko', 'x-default'], `${url} hreflang`)
      if (info.h1 !== 1) issues.push({ url, h1: info.h1 })
      if (locale === 'en') assert.ok(!/[가-힣]{2,}/.test(info.title), `${url} Korean in English title: ${info.title}`)
      report.push(`${locale}${path || '/'} ok [${info.title.slice(0, 48)}]${info.overflow ? ' OVERFLOW' : ''}`)
    }

    // 언어 전환: 같은 페이지의 다른 언어 주소로 이동
    await page.goto(`${base}/${locale}/travel`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    await page.locator('.lang-btn').first().click()
    const other = locale === 'kr' ? 'en' : 'kr'
    await page.waitForURL(`**/${other}/travel`, { timeout: 30000 })
    await page.waitForTimeout(1500)
    assert.equal(await page.evaluate(() => document.documentElement.lang), other === 'en' ? 'en' : 'ko')
    report.push(`toggle ${locale} -> ${other} ok`)

    if (errors.length) issues.push({ locale, errors: [...new Set(errors)].slice(0, 8) })
    await context.close()
  }
  console.log(report.join('\n'))
  console.log(JSON.stringify({ issues }))
} finally {
  await browser.close()
}
