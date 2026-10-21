// 도시별 사이트맵. 같은 DB를 여러 도시가 나눠 쓰므로 항상 areacode로 거르고,
// 모든 주소는 언어별(/kr, /en)로 나누어 hreflang으로 서로 연결한다.
import { createClient } from '@supabase/supabase-js'
import { CITY, SITE_URL } from '../config/cities'
import { generateLocalizedSlug, generateSlug } from './slugUtils'
import { getCityGuides } from '../config/cityGuides'
import { getCityFeatures } from '../config/cityFeatures'
import { eventSlug } from './eventSlug'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const LOCALES = ['kr', 'en']
const HREFLANG = { kr: 'ko', en: 'en' }

const encodePath = (path) => {
  try { return encodeURI(decodeURI(path)) } catch { return encodeURI(path) }
}
const escapeXml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const loc = (locale, path) => escapeXml(`${SITE_URL}/${locale}${path === '/' ? '' : encodePath(path)}`)

// 도시별로 켜져 있는 기능만 싣는다
const mainPages = () => [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/travel', changefreq: 'weekly', priority: '0.9' },
  { path: '/food', changefreq: 'weekly', priority: '0.9' },
  { path: '/festival', changefreq: 'daily', priority: '0.9' },
  { path: '/accommodation', changefreq: 'weekly', priority: '0.8' },
  { path: '/leisure', changefreq: 'weekly', priority: '0.8' },
  { path: '/culture', changefreq: 'weekly', priority: '0.8' },
  { path: '/shopping', changefreq: 'weekly', priority: '0.8' },
  { path: '/map', changefreq: 'monthly', priority: '0.7' },
  { path: '/trip-planner', changefreq: 'monthly', priority: '0.7' },
  { path: '/guides', changefreq: 'weekly', priority: '0.9' },
  { path: '/live', changefreq: 'daily', priority: '0.8' },
  ...getCityFeatures(CITY.key).map((feature) => ({ path: feature.path, changefreq: 'daily', priority: '0.8' })),
  ...getCityGuides(CITY.key).map((guide) => ({ path: `/guides/${guide.slug}`, changefreq: 'weekly', priority: '0.8' })),
  ...CITY.districtNames.map((district) => ({ path: `/area/${district}`, changefreq: 'weekly', priority: '0.8' })),
  ...(CITY.key === 'daejeon' ? [{ path: '/shared-trips', changefreq: 'weekly', priority: '0.7' }] : []),
  ...(CITY.key === 'busan' ? [{ path: '/busan-guide', changefreq: 'weekly', priority: '0.7' }] : []),
  ...(CITY.parkingReady ? [{ path: '/parking', changefreq: 'monthly', priority: '0.6' }] : []),
  ...(CITY.medicalReady ? [{ path: '/medical', changefreq: 'monthly', priority: '0.6' }] : [])
]

// 한 장소/페이지를 언어별 <url>로 만든다. 영어가 없으면 한국어만 낸다.
function urlEntries({ paths, lastmod, changefreq, priority }) {
  const available = LOCALES.filter((locale) => paths[locale])
  return available.map((locale) => {
    const alternates = available.length > 1
      ? [
          ...available.map((l) => `    <xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${loc(l, paths[l])}"/>`),
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${loc('kr', paths.kr)}"/>`
        ].join('\n')
      : ''
    return `  <url>
    <loc>${loc(locale, paths[locale])}</loc>
${alternates ? alternates + '\n' : ''}    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  }).join('\n')
}

const wrapInUrlset = (content) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${content}
</urlset>`

const today = () => new Date().toISOString().split('T')[0]

export async function generateMainSitemap() {
  const date = today()
  const entries = mainPages().map((page) =>
    urlEntries({ paths: { kr: page.path, en: page.path }, lastmod: date, changefreq: page.changefreq, priority: page.priority })
  ).join('\n')
  return wrapInUrlset(entries)
}

// 콘텐츠 유형별 장소 사이트맵 (1000건씩 끝까지 읽는다)
async function generateSpotEntries(contentTypeId, priority) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('tour_spots')
      .select('content_id, title, title_en, modified_time, updated_at')
      .eq('content_type_id', contentTypeId)
      .eq('areacode', CITY.tourApiAreaCode)
      .not('title', 'is', null)
      .order('content_id')
      .range(from, from + 999)
    if (error) {
      console.error(`Sitemap(${contentTypeId}) error:`, error)
      break
    }
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }

  return rows.map((spot) => {
    const date = (spot.updated_at || spot.modified_time || '').slice(0, 10) || today()
    const paths = { kr: `/spot/${generateLocalizedSlug({ title: spot.title, contentId: spot.content_id }, 'kr')}` }
    if (spot.title_en) {
      paths.en = `/spot/${generateLocalizedSlug({ title: spot.title, titleEn: spot.title_en, contentId: spot.content_id }, 'en')}`
    }
    return urlEntries({ paths, lastmod: date, changefreq: 'weekly', priority })
  }).join('\n')
}

async function generateSpotSitemap(contentTypeId, priority) {
  return wrapInUrlset(await generateSpotEntries(contentTypeId, priority))
}

export const generateTravelSitemap = () => generateSpotSitemap(12, '0.8')
export const generateCultureSitemap = () => generateSpotSitemap(14, '0.7')
export const generateFestivalSitemap = async () => {
  const spotEntries = await generateSpotEntries(15, '0.8')
  let eventEntries = ''
  try {
    const { collectEvents, mergeEvents, todayKst } = await import('../../pages/api/events')
    const date = todayKst()
    const { rows } = await collectEvents(date)
    eventEntries = mergeEvents(rows, [], date, true).map((event) => urlEntries({
      paths: { kr: `/event/${eventSlug(event)}` },
      lastmod: date,
      changefreq: 'daily',
      priority: '0.8'
    })).join('\n')
  } catch (error) {
    console.error('Event sitemap error:', error)
  }
  return wrapInUrlset([spotEntries, eventEntries].filter(Boolean).join('\n'))
}
export const generateLeisureSitemap = () => generateSpotSitemap(28, '0.7')
export const generateAccommodationSitemap = () => generateSpotSitemap(32, '0.7')
export const generateShoppingSitemap = () => generateSpotSitemap(38, '0.6')
export const generateFoodSitemap = () => generateSpotSitemap(39, '0.7')

// 구별 주차장 페이지와 주차장 상세. 영어판은 색인하지 않으므로 한국어 주소만 싣는다.
export async function generateParkingSitemap() {
  if (!CITY.parkingReady) return wrapInUrlset('')
  const date = today()
  let lots = []
  try {
    const { loadParkingLots } = await import('../services/parkingServer')
    lots = await loadParkingLots()
  } catch (error) {
    console.error('Parking sitemap error:', error)
  }
  const districts = CITY.districtNames.filter((district) => lots.some((lot) => lot.district === district))
  const themes = [
    lots.some((lot) => lot.free) && '/parking/free',
    lots.some((lot) => lot.allDay) && '/parking/24h'
  ].filter(Boolean)
  const entries = [
    ...themes.map((path) => urlEntries({ paths: { kr: path }, lastmod: date, changefreq: 'weekly', priority: '0.8' })),
    ...districts.map((district) => urlEntries({ paths: { kr: `/parking/${district}` }, lastmod: date, changefreq: 'weekly', priority: '0.7' })),
    ...lots.map((lot) => urlEntries({ paths: { kr: `/parking/lot/${lot.slug}` }, lastmod: /^\d{4}-\d{2}-\d{2}$/.test(lot.updated) ? lot.updated : date, changefreq: 'monthly', priority: '0.5' }))
  ]
  return wrapInUrlset(entries.join('\n'))
}

// 제주 주유소·전기차 충전소·테마 페이지. 영어판은 색인하지 않으므로 한국어 주소만 싣는다.
export async function generateJejuInfoSitemap() {
  if (CITY.key !== 'jeju') return wrapInUrlset('')
  const date = today()
  const entry = (path, changefreq, priority) => urlEntries({ paths: { kr: path }, lastmod: date, changefreq, priority })
  const entries = []
  try {
    const { loadGasStations, loadEvStations, loadTourSpots } = await import('../services/jejuIts')
    const { THEMES, spotsOf } = await import('../config/jejuThemes')
    const stations = await loadGasStations()
    entries.push(...stations.map((station) => entry(`/gas/${generateSlug(station.name, station.id)}`, 'daily', '0.6')))
    const ev = await loadEvStations()
    const areas = new Map()
    for (const station of ev) if (station.town) areas.set(station.town, (areas.get(station.town) || 0) + 1)
    entries.push(...[...areas].filter(([, count]) => count >= 3).map(([area]) => entry(`/ev/area/${area}`, 'weekly', '0.7')))
    entries.push(...ev.map((station) => entry(`/ev/${generateSlug(station.name, station.id)}`, 'weekly', '0.5')))
    const spots = await loadTourSpots()
    entries.push(...THEMES.filter((theme) => spotsOf(theme, spots).length >= 5).map((theme) => entry(`/themes/${theme.slug}`, 'weekly', '0.7')))
  } catch (error) {
    console.error('Jeju info sitemap error:', error.message)
  }
  return wrapInUrlset(entries.join('\n'))
}

export function generateSitemapIndex() {
  const date = today()
  const names = ['main', 'travel', 'food', 'accommodation', 'leisure', 'culture', 'shopping', 'festival', ...(CITY.parkingReady ? ['parking'] : []), ...(CITY.key === 'jeju' ? ['info'] : [])]
  const entries = names.map((name) => `  <sitemap>
    <loc>${SITE_URL}/sitemap-${name}.xml</loc>
    <lastmod>${date}</lastmod>
  </sitemap>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`
}
