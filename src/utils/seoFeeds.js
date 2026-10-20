import { CITY, SITE_URL } from '../config/cities'
import { getPageSeo } from '../config/pageSeo'

const escapeXml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 도시별 robots.txt: 사이트맵 주소가 항상 이 도시의 주소를 가리키게 한다.
export const buildRobots = () => {
  return `User-agent: *
Allow: /

# 로그인이 필요하거나 색인할 필요가 없는 주소
Disallow: /admin
Disallow: /api/
Disallow: /_next/
Disallow: /kr/admin
Disallow: /en/admin
Disallow: /kr/profile
Disallow: /en/profile
Disallow: /kr/my-trip
Disallow: /en/my-trip
Disallow: /kr/search
Disallow: /en/search
Disallow: /kr/dev-cities
Disallow: /en/dev-cities

Sitemap: ${SITE_URL}/sitemap.xml
`
}

// 도시별 RSS: 주요 페이지 목록 (한국어 기준)
export const buildRss = () => {
  const pages = ['travel', 'food', 'festival', 'culture', 'leisure', 'accommodation', 'shopping', 'map']
  const date = new Date().toUTCString()
  const items = pages.map((page) => {
    const seo = getPageSeo(page, 'kr')
    const url = `${SITE_URL}/kr/${page}`
    return `    <item>
      <title>${escapeXml(seo.title)}</title>
      <link>${url}</link>
      <description>${escapeXml(seo.description)}</description>
      <pubDate>${date}</pubDate>
      <guid>${url}</guid>
    </item>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(CITY.name)} - ${escapeXml(CITY.cityName)} 여행 가이드</title>
    <link>${SITE_URL}/kr</link>
    <description>${escapeXml(getPageSeo('home', 'kr').description)}</description>
    <language>ko</language>
    <lastBuildDate>${date}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
    <item>
      <title>${escapeXml(`${CITY.cityName} 테마별 여행 코스`)}</title>
      <link>${SITE_URL}/kr/guides</link>
      <description>${escapeXml(`${CITY.cityName} 당일치기, 가족 여행, 비 오는 날 추천 코스를 확인하세요.`)}</description>
      <pubDate>${date}</pubDate>
      <guid>${SITE_URL}/kr/guides</guid>
    </item>
  </channel>
</rss>`
}
