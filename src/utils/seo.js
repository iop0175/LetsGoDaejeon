import { CITY, SITE_URL } from '../config/cities'

// 주소의 언어 접두어: 한국어는 /kr, 영어는 /en
export const LOCALES = ['kr', 'en']
export const OTHER_LOCALE = { kr: 'en', en: 'kr' }
export const HREFLANG = { kr: 'ko', en: 'en' }
export const OG_LOCALE = { kr: 'ko_KR', en: 'en_US' }

// 한글 경로를 한 번만 인코딩한다 (이미 인코딩된 경로도 안전하게 처리)
const safeEncode = (path) => {
  try { return encodeURI(decodeURI(path)) } catch { return encodeURI(path) }
}

export const normalizePath = (path = '/') => {
  const clean = path.split('?')[0].split('#')[0]
  return clean === '/' ? '' : (clean.startsWith('/') ? clean : `/${clean}`)
}

export const absoluteUrl = (locale, path = '/') => `${SITE_URL}/${locale}${safeEncode(normalizePath(path))}`

export const absoluteImage = (src) => {
  if (!src) return `${SITE_URL}${CITY.hero?.image || '/images/hero/hero-1.jpg'}`
  if (/^https?:\/\//.test(src)) return src
  return `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`
}

export const siteName = (locale) => (locale === 'en' ? CITY.englishName : CITY.name)
export const cityLabel = (locale) => (locale === 'en' ? CITY.cityNameEn : CITY.cityName)

// ----- JSON-LD 빌더 -----
export const websiteLd = (locale) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName(locale),
  alternateName: siteName(locale === 'en' ? 'kr' : 'en'),
  url: absoluteUrl(locale, '/'),
  inLanguage: HREFLANG[locale],
  potentialAction: {
    '@type': 'SearchAction',
    target: `${absoluteUrl(locale, '/search')}?q={search_term_string}`,
    'query-input': 'required name=search_term_string'
  }
})

export const organizationLd = (locale) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName(locale),
  url: absoluteUrl(locale, '/'),
  logo: `${SITE_URL}/favicon.svg`
})

export const breadcrumbLd = (locale, crumbs) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    item: absoluteUrl(locale, crumb.path)
  }))
})

export const itemListLd = (locale, name, items = []) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  numberOfItems: items.length,
  itemListElement: items.slice(0, 20).map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    url: absoluteUrl(locale, item.path),
    ...(item.image ? { image: item.image } : {})
  }))
})

// 한국관광공사 contentTypeId → schema.org 타입
export const SCHEMA_TYPE_BY_CONTENT_TYPE = {
  12: 'TouristAttraction',
  14: 'TouristAttraction',
  15: 'Event',
  28: 'TouristAttraction',
  32: 'LodgingBusiness',
  38: 'Store',
  39: 'Restaurant'
}
