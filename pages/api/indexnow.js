// IndexNow API 엔드포인트
// POST /api/indexnow - URL 제출
// GET /api/indexnow?url=... - 단일 URL 제출

const INDEXNOW_KEY = '6d0d01a5802bbad93fbd878628659588'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.letsgodaejeon.kr'

// IndexNow 지원 검색엔진
const SEARCH_ENGINES = [
  'https://api.indexnow.org/indexnow',  // Bing, Yandex 등 공유 엔드포인트
  // 'https://www.bing.com/indexnow',
  // 'https://yandex.com/indexnow',
]

async function submitToIndexNow(urls) {
  const urlList = Array.isArray(urls) ? urls : [urls]
  const results = []
  
  for (const engine of SEARCH_ENGINES) {
    try {
      const response = await fetch(engine, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          host: 'letsgodaejeon.kr',
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
          urlList: urlList.map(url => url.startsWith('http') ? url : `${SITE_URL}${url}`),
        }),
      })
      
      results.push({
        engine,
        status: response.status,
        ok: response.ok || response.status === 202, // 202 = Accepted
      })
    } catch (error) {
      results.push({
        engine,
        status: 500,
        ok: false,
        error: error.message,
      })
    }
  }
  
  return results
}

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  // 인증 체크 (간단한 API 키 확인)
  const authKey = req.headers.authorization?.replace('Bearer ', '') || req.query.key
  if (authKey !== INDEXNOW_KEY && authKey !== process.env.INDEXNOW_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  try {
    let urls = []
    
    if (req.method === 'GET') {
      // GET 요청: 단일 URL
      const url = req.query.url
      if (!url) {
        return res.status(400).json({ error: 'URL parameter required' })
      }
      urls = [url]
    } else if (req.method === 'POST') {
      // POST 요청: 여러 URL
      urls = req.body.urls || req.body.urlList || []
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'urls array required in body' })
      }
      if (urls.length > 10000) {
        return res.status(400).json({ error: 'Maximum 10000 URLs per request' })
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
    
    const results = await submitToIndexNow(urls)
    const allSuccess = results.every(r => r.ok)
    
    return res.status(allSuccess ? 200 : 207).json({
      success: allSuccess,
      submitted: urls.length,
      urls: urls.slice(0, 10), // 최대 10개만 응답에 포함
      results,
    })
  } catch (error) {
    console.error('IndexNow error:', error)
    return res.status(500).json({ error: error.message })
  }
}
