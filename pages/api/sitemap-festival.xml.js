import { generateFestivalSitemap } from '../src/utils/sitemapGenerator'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  
  const xml = await generateFestivalSitemap()
  res.status(200).send(xml)
}
