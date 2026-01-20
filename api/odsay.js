// Vercel Serverless Function - ODSay API Proxy
// API 키가 서버 측에서만 사용되어 클라이언트에 노출되지 않음

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const { action, SX, SY, EX, EY, SearchPathType, stationName, cityCode, stationClass } = req.query
    
    // 서버 측 환경변수에서 API 키 가져오기
    const ODSAY_API_KEY = process.env.ODSAY_API_KEY
    
    if (!ODSAY_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' })
    }

    let odsayUrl = ''
    
    if (action === 'searchPubTransPathT') {
      // 대중교통 경로 탐색
      odsayUrl = `https://api.odsay.com/v1/api/searchPubTransPathT?apiKey=${encodeURIComponent(ODSAY_API_KEY)}&SX=${SX}&SY=${SY}&EX=${EX}&EY=${EY}&OPT=0&SearchType=0&SearchPathType=${SearchPathType || '0'}&output=json`
    } else if (action === 'searchStation') {
      // 정류장/역 검색
      odsayUrl = `https://api.odsay.com/v1/api/searchStation?apiKey=${encodeURIComponent(ODSAY_API_KEY)}&lang=0&stationName=${encodeURIComponent(stationName)}&CID=${cityCode || '3'}&stationClass=${stationClass || '1'}&output=json`
    } else {
      return res.status(400).json({ error: 'Invalid action' })
    }

    // ODSay API 호출
    const response = await fetch(odsayUrl)
    const data = await response.json()

    return res.status(200).json(data)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
