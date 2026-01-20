// Vercel Serverless Function - ODSay API Proxy
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
    const ODSAY_API_KEY = process.env.ODSAY_API_KEY
    
    if (!ODSAY_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let odsayUrl = ''
    
    if (action === 'searchPubTransPathT') {
      // 대중교통 경로 탐색
      const sx = url.searchParams.get('SX')
      const sy = url.searchParams.get('SY')
      const ex = url.searchParams.get('EX')
      const ey = url.searchParams.get('EY')
      const searchPathType = url.searchParams.get('SearchPathType') || '0'
      
      odsayUrl = `https://api.odsay.com/v1/api/searchPubTransPathT?apiKey=${encodeURIComponent(ODSAY_API_KEY)}&SX=${sx}&SY=${sy}&EX=${ex}&EY=${ey}&OPT=0&SearchType=0&SearchPathType=${searchPathType}&output=json`
    } else if (action === 'searchStation') {
      // 정류장/역 검색
      const stationName = url.searchParams.get('stationName')
      const cityCode = url.searchParams.get('cityCode') || '3'
      const stationClass = url.searchParams.get('stationClass') || '1'
      
      odsayUrl = `https://api.odsay.com/v1/api/searchStation?apiKey=${encodeURIComponent(ODSAY_API_KEY)}&lang=0&stationName=${encodeURIComponent(stationName)}&CID=${cityCode}&stationClass=${stationClass}&output=json`
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ODSay API 호출
    const response = await fetch(odsayUrl)
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
