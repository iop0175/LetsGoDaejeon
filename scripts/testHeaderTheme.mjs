import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'

const [base, city, mode] = process.argv.slice(2)
assert.ok(base && city, 'Usage: node scripts/testHeaderTheme.mjs <base> <city> [preview]')
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH })
try {
  for (const width of [360, 390, 769, 1000, 1280, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await context.addInitScript(() => localStorage.setItem('theme', 'dark'))
    await context.route(/googlesyndication|doubleclick|google-analytics/, route => route.abort())
    const page = await context.newPage()
    await page.goto(`${base}/kr/travel`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('html.dark-theme .header')
    await page.addStyleTag({ content: '.header, .header * { transition: none !important; }' })
    if (mode === 'preview') await page.addStyleTag({ content: await fs.readFile('src/components/Header/Header.css', 'utf8') })
    assert.equal(await page.locator('.app').getAttribute('data-city'), city)
    if (width <= 768) await page.locator('.mobile-menu-btn').click()
    await page.mouse.move(0, 890)
    const colors = await page.locator('.header').evaluate(header => {
      const style = element => getComputedStyle(element)
      const selectors = ['.nav-link:not(.active)', '.search-btn', '.mobile-menu-btn', '.theme-btn', '.lang-btn', '.city-select', '.mobile-tool-row > button']
      const visible = element => element.getClientRects().length > 0
      return {
        text: style(header).getPropertyValue('--text-secondary').trim(),
        normal: selectors.flatMap(selector => [...header.querySelectorAll(selector)].filter(visible).map(element => style(element).color)),
        selected: [...header.querySelectorAll('.nav-link.active')].filter(visible).map(element => ({ color: style(element).color, background: style(element).backgroundColor })),
        logo: style(header.querySelector('.logo-main')).color,
        background: style(header).backgroundColor,
        login: style(header.querySelector(visible(header.querySelector('.login-btn')) ? '.login-btn' : '.mobile-login')).color,
        overflow: header.getBoundingClientRect().right > innerWidth + 1 || header.querySelector('.header-actions').getBoundingClientRect().right > innerWidth + 1,
      }
    })
    assert.ok(colors.normal.length >= 3)
    assert.equal(new Set(colors.normal).size, 1, JSON.stringify(colors))
    assert.ok(colors.selected.length > 0)
    for (const selected of colors.selected) assert.equal(selected.color, colors.logo)
    const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
    for (const foreground of [colors.logo, ...colors.normal]) {
      const ratio = (luminance(foreground) + 0.05) / (luminance(colors.background) + 0.05)
      assert.ok(ratio >= 4.5, `Header text contrast ${ratio} at ${width}`)
    }
    assert.equal(colors.login, 'rgb(25, 25, 25)')
    assert.equal(colors.overflow, false, `Header overflow at ${width}`)
    await page.locator('.search-btn').hover()
    assert.equal(await page.locator('.search-btn').evaluate(element => getComputedStyle(element).color), colors.logo)
    await page.mouse.move(0, 890)
    if (width === 390) {
      await fs.mkdir('../backups/header-dark', { recursive: true })
      await page.screenshot({ path: `../backups/header-dark/${city}-${mode || 'live'}.png` })
    }
    const toggle = page.locator(width <= 768 ? '.mobile-tool-row > button' : '.theme-btn').filter({ has: page.locator('svg') })
    await (width <= 768 ? toggle.nth(1) : toggle).click()
    await page.waitForSelector('html.light-theme')
    await (width <= 768 ? toggle.nth(1) : toggle).click()
    await page.waitForSelector('html.dark-theme')
    console.log(`${city} ${width}: button colors, active state, Kakao contrast, theme toggle, header bounds PASS`)
    await context.close()
  }
} finally {
  await browser.close()
}
