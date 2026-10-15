import { CITY } from '../../src/config/cities.js'
import { loadBusan, normalizeBusanStory } from '../../src/utils/busanApi.js'
export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (CITY.key !== 'busan') return res.status(404).json({ success: false, items: [] })
  if (req.method !== 'GET') return res.status(405).json({ success: false, items: [] })
  const resource = String(req.query.type || 'themes')
  if (!['themes', 'food'].includes(resource)) return res.status(400).json({ success: false, error: '지원하지 않는 콘텐츠입니다.' })
  try {
    const query = String(req.query.q || '').trim().toLowerCase()
    const pageNo = Math.max(1, Math.floor(Number(req.query.pageNo) || 1))
    const numOfRows = Math.min(24, Math.max(1, Math.floor(Number(req.query.numOfRows) || 12)))
    const items = (await loadBusan(resource)).map(row => normalizeBusanStory(row, resource))
      .filter(item => !query || `${item.title} ${item.district} ${item.address} ${item.intro}`.toLowerCase().includes(query))
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json({ success: true, totalCount: items.length, items: items.slice((pageNo - 1) * numOfRows, pageNo * numOfRows) })
  } catch (error) {
    return res.status(502).json({ success: false, items: [], error: error.message })
  }
}
