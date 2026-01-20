// Vercel Serverless Function - Kakao API Proxy
// API 키가 서버 측에서만 사용되어 클라이언트에 노출되지 않음

export const config = {
  runtime: 'edge',
}

export default async function handler(request) {
  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // OPTIONS 요청 처리 (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    
    // 서버 측 환경변수에서 API 키 가져오기
    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY
    
    if (!KAKAO_REST_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let kakaoUrl = ''
    const authHeader = { 'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}` }
    
    if (action === 'address') {
      // 주소 → 좌표 변환
      const query = url.searchParams.get('query')
      kakaoUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`
    } else if (action === 'keyword') {
      // 키워드 검색
      const query = url.searchParams.get('query')
      kakaoUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`
    } else if (action === 'directions') {
      // 자동차 경로 탐색
      const origin = url.searchParams.get('origin')
      const destination = url.searchParams.get('destination')
      kakaoUrl = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin}&destination=${destination}&priority=RECOMMEND`
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Kakao API 호출
    const response = await fetch(kakaoUrl, {
      headers: authHeader
    })
    const data = await response.json()

    return new Response(
      JSON.stringify(data),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
