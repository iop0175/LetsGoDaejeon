/**
 * LetsGoDaejeon API Proxy Worker
 * Cloudflare Workers를 사용한 API 프록시 서버
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// JSON 응답 헬퍼
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

// 에러 응답 헬퍼
function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

// ODSay API 프록시
async function handleOdsay(request, env, pathname) {
  try {
    const url = new URL(request.url);
    const apiPath = pathname.replace('/api/odsay', '');
    
    // ODSay API URL 구성
    const odsayUrl = new URL(`https://api.odsay.com/v1/api${apiPath}`);
    
    // API 키 추가 (trim으로 공백/줄바꿈 제거)
    const apiKey = env.ODSAY_API_KEY ? env.ODSAY_API_KEY.trim() : '';
    odsayUrl.searchParams.set('apiKey', apiKey);
    
    // 기존 쿼리 파라미터 복사
    url.searchParams.forEach((value, key) => {
      if (key !== 'apiKey') {
        odsayUrl.searchParams.set(key, value);
      }
    });

    console.log('Calling ODSay API:', odsayUrl.toString().replace(apiKey, '***'));
    
    // ODSay에 등록된 도메인을 Referer로 설정
    const response = await fetch(odsayUrl.toString(), {
      method: 'GET',
      headers: {
        'Referer': 'https://letsgodaejeon-api.daegieun700.workers.dev',
        'Origin': 'https://letsgodaejeon-api.daegieun700.workers.dev',
      }
    });
    const data = await response.json();
    
    return jsonResponse(data);
  } catch (error) {
    console.error('ODSay API Error:', error);
    return errorResponse('ODSay API 요청 실패: ' + error.message, 500);
  }
}

// 카카오 API 프록시
async function handleKakao(request, env, pathname) {
  try {
    const url = new URL(request.url);
    // /api/kakao 제거하고 나머지 경로 사용
    const apiPath = pathname.replace('/api/kakao', '');
    
    let kakaoUrl;
    if (apiPath.startsWith('/mobility')) {
      // 모빌리티 API: /api/kakao/mobility/v1/directions → https://apis-navi.kakaomobility.com/v1/directions
      const mobilityPath = apiPath.replace('/mobility', '');
      kakaoUrl = new URL(`https://apis-navi.kakaomobility.com${mobilityPath}`);
    } else {
      // 로컬/맵 API: /api/kakao/v2/local/search/address.json → https://dapi.kakao.com/v2/local/search/address.json
      kakaoUrl = new URL(`https://dapi.kakao.com${apiPath}`);
    }
    
    // 기존 쿼리 파라미터 복사
    url.searchParams.forEach((value, key) => {
      kakaoUrl.searchParams.set(key, value);
    });

    const apiKey = env.KAKAO_REST_API_KEY ? env.KAKAO_REST_API_KEY.trim() : '';
    
    console.log('Calling Kakao API:', kakaoUrl.toString());
    
    const response = await fetch(kakaoUrl.toString(), {
      headers: {
        'Authorization': `KakaoAK ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return jsonResponse(data);
  } catch (error) {
    console.error('Kakao API Error:', error);
    return errorResponse('카카오 API 요청 실패: ' + error.message, 500);
  }
}

// 디버그 엔드포인트
async function handleDebug(request, env) {
  return jsonResponse({
    hasOdsayKey: !!env.ODSAY_API_KEY,
    odsayKeyLength: env.ODSAY_API_KEY ? env.ODSAY_API_KEY.length : 0,
    odsayKeyTrimLength: env.ODSAY_API_KEY ? env.ODSAY_API_KEY.trim().length : 0,
    hasKakaoKey: !!env.KAKAO_REST_API_KEY,
  });
}

// 메인 핸들러
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS preflight 처리
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 헬스체크
    if (pathname === '/health' || pathname === '/') {
      return jsonResponse({ 
        status: 'ok', 
        message: 'LetsGoDaejeon API Proxy',
        timestamp: new Date().toISOString()
      });
    }

    // 디버그
    if (pathname === '/debug') {
      return handleDebug(request, env);
    }

    // API 라우팅
    if (pathname.startsWith('/api/odsay')) {
      return handleOdsay(request, env, pathname);
    }
    
    if (pathname.startsWith('/api/kakao')) {
      return handleKakao(request, env, pathname);
    }

    // 404
    return errorResponse('Not Found', 404);
  },
};
