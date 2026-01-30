import { generateSitemapIndex } from '../../src/utils/sitemapGenerator'

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  
  const xml = generateSitemapIndex()
  res.status(200).send(xml)
}
