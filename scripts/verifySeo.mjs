// 운영/로컬 사이트의 SEO 상태를 점검한다: robots, 사이트맵, 샘플 페이지의 canonical·hreflang·JSON-LD·색인 여부
// 사용: node scripts/verifySeo.mjs https://letsgoseoul.vercel.app
import assert from 'node:assert/strict'

const base = (process.argv[2] || 'http://localhost:3011').replace(/\/$/, '')
const get = async (path) => {
  const response = await fetch(path.startsWith('http') ? path : base + path, { redirect: 'manual', signal: AbortSignal.timeout(90000) })
  return { status: response.status, headers: response.headers, text: await response.text() }
}
const tag = (html, re) => [...html.matchAll(re)].map((m) => m[1])
const report = { base }

const robots = await get('/robots.txt')
assert.equal(robots.status, 200, 'robots status')
report.robotsDisallowAll = /Disallow:\s*\/\s*$/m.test(robots.text)
report.robotsSitemap = (robots.text.match(/Sitemap:\s*(\S+)/) || [])[1]
assert.ok(!report.robotsSitemap || report.robotsSitemap.startsWith(base), `sitemap host mismatch: ${report.robotsSitemap}`)

const index = await get('/sitemap.xml')
assert.equal(index.status, 200, 'sitemap index status')
const children = tag(index.text, /<loc>([^<]+)<\/loc>/g)
report.sitemaps = {}
const sampleUrls = []
for (const child of children) {
  const res = await get(child)
  assert.equal(res.status, 200, `${child} status`)
  const locs = tag(res.text, /<url>\s*<loc>([^<]+)<\/loc>/g)
  assert.ok(locs.every((loc) => loc.startsWith(base + '/kr') || loc.startsWith(base + '/en')), `${child} has foreign host`)
  report.sitemaps[child.split('/').pop()] = locs.length
  if (locs.length) sampleUrls.push(locs[0], locs[Math.floor(locs.length / 2)], locs[locs.length - 1])
}

const problems = []
for (const url of [...new Set(sampleUrls)]) {
  const res = await get(url)
  if (res.status !== 200) { problems.push({ url, status: res.status }); continue }
  const html = res.text
  const canonical = tag(html, /<link rel="canonical" href="([^"]+)"/g)
  const robotsMeta = tag(html, /<meta name="robots" content="([^"]+)"/g)
  const hreflang = tag(html, /<link rel="alternate" hrefLang="([^"]+)"/g)
  const h1 = (html.match(/<h1[\s>]/g) || []).length
  const lang = (html.match(/<html lang="([^"]+)"/) || [])[1]
  const ld = tag(html, /<script type="application\/ld\+json">([^<]+)<\/script>/g)
  const entry = { url, canonical: canonical.length, robots: robotsMeta[0]?.split(',')[0], hreflang: hreflang.length, h1, lang }
  try { ld.forEach((item) => JSON.parse(item.replace(/&quot;/g, '"'))) } catch { entry.ldInvalid = true }
  const locale = url.includes('/en/') || url.endsWith('/en') ? 'en' : 'kr'
  if (canonical.length !== 1) entry.problem = 'canonical count'
  else if (decodeURI(canonical[0]) !== decodeURI(url)) entry.problem = `canonical differs: ${canonical[0]}`
  if (lang !== (locale === 'en' ? 'en' : 'ko')) entry.problem = `lang ${lang}`
  if (entry.ldInvalid) entry.problem = 'invalid JSON-LD'
  if (entry.problem) problems.push(entry)
}
report.checkedPages = new Set(sampleUrls).size
report.problems = problems
console.log(JSON.stringify(report, null, 1))
