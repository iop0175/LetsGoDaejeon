import { fetchLiveData } from '../../src/services/liveData'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false })
  try {
    const data = await fetchLiveData()
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900')
    return res.status(200).json({ success: true, ...data })
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message })
  }
}
