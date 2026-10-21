// 제주 전기차 충전소 실시간 충전 가능 대수: ?id=충전소ID
import { CITY } from '../../src/config/cities.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' || CITY.key !== 'jeju') return res.status(404).json({ success: false })
  const id = String(req.query.id || '')
  if (!/^[A-Za-z0-9]{4,20}$/.test(id)) return res.status(400).json({ success: false, error: '충전소 번호가 올바르지 않습니다.' })
  try {
    const { loadEvAvailability } = await import('../../src/services/jejuIts')
    const available = (await loadEvAvailability())[id]
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({ success: true, available: available || null })
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message })
  }
}
