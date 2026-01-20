// Vercel Serverless Function - Kakao API Proxy
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
    const { action, query, origin, destination } = req.query
    
    // 서버 측 환경변수에서 API 키 가져오기
    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY
    
    if (!KAKAO_REST_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' })
    }

    let kakaoUrl = ''
    const authHeader = { 'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}` }
    
    if (action === 'address') {
      // 주소 → 좌표 변환
      kakaoUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`
    } else if (action === 'keyword') {
      // 키워드 검색
      kakaoUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`
    } else if (action === 'directions') {
      // 자동차 경로 탐색
      kakaoUrl = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin}&destination=${destination}&priority=RECOMMEND`
    } else {
      return res.status(400).json({ error: 'Invalid action' })
    }

    // Kakao API 호출
    const response = await fetch(kakaoUrl, {
      headers: authHeader
    })
    const data = await response.json()

    return res.status(200).json(data)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
