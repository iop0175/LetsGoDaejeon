import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.letsgodaejeon.kr'

// 메인 사이트맵 페이지 목록
const mainPages = [
  { url: '/', changefreq: 'daily', priority: '1.0' },
  { url: '/travel', changefreq: 'weekly', priority: '0.9' },
  { url: '/food', changefreq: 'weekly', priority: '0.9' },
  { url: '/festival', changefreq: 'weekly', priority: '0.9' },
  { url: '/accommodation', changefreq: 'weekly', priority: '0.8' },
  { url: '/leisure', changefreq: 'weekly', priority: '0.8' },
  { url: '/culture', changefreq: 'weekly', priority: '0.8' },
  { url: '/shopping', changefreq: 'weekly', priority: '0.8' },
  { url: '/map', changefreq: 'monthly', priority: '0.7' },
  { url: '/search', changefreq: 'monthly', priority: '0.7' },
  { url: '/parking', changefreq: 'monthly', priority: '0.6' },
  { url: '/medical', changefreq: 'monthly', priority: '0.6' },
  { url: '/shared-trips', changefreq: 'weekly', priority: '0.7' },
  { url: '/terms', changefreq: 'yearly', priority: '0.3' },
  { url: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { url: '/copyright', changefreq: 'yearly', priority: '0.3' },
]

function generateUrlEntry(url, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${SITE_URL}${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

function wrapInUrlset(content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${content}
</urlset>`
}

// 메인 사이트맵 생성
export async function generateMainSitemap() {
  const today = new Date().toISOString().split('T')[0]
  const entries = mainPages.map(page => 
    generateUrlEntry(page.url, today, page.changefreq, page.priority)
  ).join('\n')
  
  return wrapInUrlset(entries)
}

// 관광지 사이트맵 생성 (content_type_id: 12)
export async function generateTravelSitemap() {
  const { data, error } = await supabase
    .from('tour_spots')
    .select('content_id, title, updated_at')
    .eq('content_type_id', '12')
    .not('title', 'is', null)
    .order('content_id')
  
  if (error) {
    console.error('Travel sitemap error:', error)
    return wrapInUrlset('')
  }
  
  const entries = (data || []).map(spot => {
    const slug = `${spot.title}-${spot.content_id}`
    const lastmod = spot.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    return generateUrlEntry(`/spot/${encodeURIComponent(slug)}`, lastmod, 'weekly', '0.8')
  }).join('\n')
  
  return wrapInUrlset(entries)
}

// 맛집 사이트맵 생성 (content_type_id: 39)
export async function generateFoodSitemap() {
  const { data, error } = await supabase
    .from('tour_spots')
    .select('content_id, title, updated_at')
    .eq('content_type_id', '39')
    .not('title', 'is', null)
    .order('content_id')
  
  if (error) {
    console.error('Food sitemap error:', error)
    return wrapInUrlset('')
  }
  
  const entries = (data || []).map(spot => {
    const slug = `${spot.title}-${spot.content_id}`
    const lastmod = spot.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    return generateUrlEntry(`/spot/${encodeURIComponent(slug)}`, lastmod, 'weekly', '0.7')
  }).join('\n')
  
  return wrapInUrlset(entries)
}

// 숙박 사이트맵 생성 (content_type_id: 32)
export async function generateAccommodationSitemap() {
  const { data, error } = await supabase
    .from('tour_spots')
    .select('content_id, title, updated_at')
    .eq('content_type_id', '32')
    .not('title', 'is', null)
    .order('content_id')
  
  if (error) {
    console.error('Accommodation sitemap error:', error)
    return wrapInUrlset('')
  }
  
  const entries = (data || []).map(spot => {
    const slug = `${spot.title}-${spot.content_id}`
    const lastmod = spot.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    return generateUrlEntry(`/spot/${encodeURIComponent(slug)}`, lastmod, 'weekly', '0.7')
  }).join('\n')
  
  return wrapInUrlset(entries)
}

// 레포츠 사이트맵 생성 (content_type_id: 28)
export async function generateLeisureSitemap() {
  const { data, error } = await supabase
    .from('tour_spots')
    .select('content_id, title, updated_at')
    .eq('content_type_id', '28')
    .not('title', 'is', null)
    .order('content_id')
  
  if (error) {
    console.error('Leisure sitemap error:', error)
    return wrapInUrlset('')
  }
  
  const entries = (data || []).map(spot => {
    const slug = `${spot.title}-${spot.content_id}`
    const lastmod = spot.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    return generateUrlEntry(`/spot/${encodeURIComponent(slug)}`, lastmod, 'weekly', '0.7')
  }).join('\n')
  
  return wrapInUrlset(entries)
}

// 문화시설 사이트맵 생성 (content_type_id: 14)
export async function generateCultureSitemap() {
  const { data, error } = await supabase
    .from('tour_spots')
    .select('content_id, title, updated_at')
    .eq('content_type_id', '14')
    .not('title', 'is', null)
    .order('content_id')
  
  if (error) {
    console.error('Culture sitemap error:', error)
    return wrapInUrlset('')
  }
  
  const entries = (data || []).map(spot => {
    const slug = `${spot.title}-${spot.content_id}`
    const lastmod = spot.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    return generateUrlEntry(`/spot/${encodeURIComponent(slug)}`, lastmod, 'weekly', '0.7')
  }).join('\n')
  
  return wrapInUrlset(entries)
}

// 쇼핑 사이트맵 생성 (content_type_id: 38)
export async function generateShoppingSitemap() {
  const { data, error } = await supabase
    .from('tour_spots')
    .select('content_id, title, updated_at')
    .eq('content_type_id', '38')
    .not('title', 'is', null)
    .order('content_id')
  
  if (error) {
    console.error('Shopping sitemap error:', error)
    return wrapInUrlset('')
  }
  
  const entries = (data || []).map(spot => {
    const slug = `${spot.title}-${spot.content_id}`
    const lastmod = spot.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    return generateUrlEntry(`/spot/${encodeURIComponent(slug)}`, lastmod, 'weekly', '0.6')
  }).join('\n')
  
  return wrapInUrlset(entries)
}

// 축제/행사 사이트맵 생성 (content_type_id: 15)
export async function generateFestivalSitemap() {
  const { data, error } = await supabase
    .from('tour_festivals')
    .select('content_id, title, updated_at')
    .not('title', 'is', null)
    .order('content_id')
  
  if (error) {
    console.error('Festival sitemap error:', error)
    return wrapInUrlset('')
  }
  
  const entries = (data || []).map(spot => {
    const slug = `${spot.title}-${spot.content_id}`
    const lastmod = spot.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0]
    return generateUrlEntry(`/spot/${encodeURIComponent(slug)}`, lastmod, 'weekly', '0.8')
  }).join('\n')
  
  return wrapInUrlset(entries)
}

// 사이트맵 인덱스 생성
export function generateSitemapIndex() {
  const today = new Date().toISOString().split('T')[0]
  const sitemaps = [
    'sitemap-main.xml',
    'sitemap-travel.xml',
    'sitemap-food.xml',
    'sitemap-accommodation.xml',
    'sitemap-leisure.xml',
    'sitemap-culture.xml',
    'sitemap-shopping.xml',
    'sitemap-festival.xml',
  ]
  
  const entries = sitemaps.map(sitemap => 
    `  <sitemap>
    <loc>${SITE_URL}/${sitemap}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`
  ).join('\n')
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`
}
