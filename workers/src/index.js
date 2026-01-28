/**
 * LetsGoDaejeon API Proxy Worker
 * Cloudflare Workers를 사용한 API 프록시 서버
 */

// 허용된 Origin 목록
const ALLOWED_ORIGINS = [
  'https://letsgodaejeon.kr',
  'https://www.letsgodaejeon.kr',
  'https://letsgodaejeon.vercel.app',
  'http://localhost:5173',        // 개발용 (Vite)
  'http://localhost:3000',        // 개발용 (Next.js)
  'http://localhost:3001',        // 개발용 (Next.js 대체 포트)
  'http://localhost:3002',        // 개발용 (추가 포트)
  'http://127.0.0.1:5173',        // 개발용
  'http://127.0.0.1:3000',        // 개발용
  'http://127.0.0.1:3001',        // 개발용
];

// Rate Limiting 설정
const RATE_LIMIT = {
  maxRequests: 100,      // 최대 요청 수
  windowMs: 60 * 1000,   // 시간 윈도우 (1분)
};

// 메모리 기반 Rate Limit 저장소 (Worker 인스턴스 단위)
// 주의: 여러 Worker 인스턴스 간에 공유되지 않음
const rateLimitStore = new Map();
let lastCleanup = Date.now();

// Rate Limit 체크 함수
function checkRateLimit(clientIP) {
  const now = Date.now();
  const key = clientIP;
  
  // 주기적으로 오래된 엔트리 정리 (5분마다)
  if (now - lastCleanup > 5 * 60 * 1000) {
    const expireTime = now - RATE_LIMIT.windowMs;
    for (const [k, v] of rateLimitStore) {
      if (v.windowStart < expireTime) {
        rateLimitStore.delete(k);
      }
    }
    lastCleanup = now;
  }
  
  // 기존 데이터 조회
  let data = rateLimitStore.get(key);
  
  // 데이터가 없거나 윈도우가 만료된 경우 초기화
  if (!data || now - data.windowStart > RATE_LIMIT.windowMs) {
    data = { count: 0, windowStart: now };
  }
  
  // 요청 수 증가
  data.count++;
  rateLimitStore.set(key, data);
  
  // 긴급 메모리 정리 (5000개 초과 시)
  if (rateLimitStore.size > 5000) {
    const expireTime = now - RATE_LIMIT.windowMs;
    for (const [k, v] of rateLimitStore) {
      if (v.windowStart < expireTime) {
        rateLimitStore.delete(k);
      }
    }
  }
  
  // Rate Limit 초과 여부 반환
  return {
    isLimited: data.count > RATE_LIMIT.maxRequests,
    remaining: Math.max(0, RATE_LIMIT.maxRequests - data.count),
    resetAt: data.windowStart + RATE_LIMIT.windowMs,
  };
}

// Origin 검증 함수 (정확한 일치만 허용)
function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

// CORS 헤더 생성 (동적으로 Origin 설정)
function getCorsHeaders(origin) {
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// JSON 응답 헬퍼 (Rate Limit 헤더 포함)
function jsonResponse(data, status = 200, origin = null, rateLimit = null) {
  const headers = {
    ...getCorsHeaders(origin),
    'Content-Type': 'application/json',
  };
  
  // Rate Limit 헤더 추가
  if (rateLimit) {
    headers['X-RateLimit-Limit'] = String(RATE_LIMIT.maxRequests);
    headers['X-RateLimit-Remaining'] = String(rateLimit.remaining);
    headers['X-RateLimit-Reset'] = String(Math.ceil(rateLimit.resetAt / 1000));
  }
  
  return new Response(JSON.stringify(data), { status, headers });
}

// 에러 응답 헬퍼
function errorResponse(message, status = 500, origin = null, rateLimit = null) {
  return jsonResponse({ error: message }, status, origin, rateLimit);
}

// ODSay API 프록시
async function handleOdsay(request, env, pathname, origin) {
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


    
    // ODSay에 등록된 도메인을 Referer로 설정
    const response = await fetch(odsayUrl.toString(), {
      method: 'GET',
      headers: {
        'Referer': 'https://letsgodaejeon-api.daegieun700.workers.dev',
        'Origin': 'https://letsgodaejeon-api.daegieun700.workers.dev',
      }
    });
    const data = await response.json();
    
    return jsonResponse(data, 200, origin);
  } catch (error) {

    return errorResponse('ODSay API 요청 실패: ' + error.message, 500, origin);
  }
}

// 카카오 API 프록시
async function handleKakao(request, env, pathname, origin) {
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
    

    
    const response = await fetch(kakaoUrl.toString(), {
      headers: {
        'Authorization': `KakaoAK ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return jsonResponse(data, 200, origin);
  } catch (error) {

    return errorResponse('카카오 API 요청 실패: ' + error.message, 500, origin);
  }
}

// 대전시 공공데이터 API 프록시
async function handleDaejeonApi(request, env, pathname, origin) {
  try {
    const url = new URL(request.url);
    const apiPath = pathname.replace('/api/daejeon', '');
    
    // API 키 (환경변수에서 가져옴)
    const apiKey = env.DAEJEON_API_KEY ? env.DAEJEON_API_KEY.trim() : '';
    
    // 특수 경로 처리
    if (apiPath === '/parking') {
      // 주차장 API (XML 응답을 JSON으로 파싱)
      return handleDaejeonParking(request, env, origin);
    }
    
    if (apiPath === '/medical') {
      // 의료기관 API
      const medicalUrl = new URL('https://apis.data.go.kr/6300000/mdlcnst/getmdlcnst');
      medicalUrl.searchParams.set('serviceKey', apiKey);
      url.searchParams.forEach((value, key) => {
        if (key !== 'serviceKey') {
          medicalUrl.searchParams.set(key, value);
        }
      });
      
      const response = await fetch(medicalUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      const data = await response.json();
      return jsonResponse(data, 200, origin);
    }
    
    // 대전시 API URL 구성
    let daejeonUrl;
    if (apiPath.includes('/eventDataService/')) {
      // 축제/행사 API
      daejeonUrl = new URL(`https://apis.data.go.kr/6300000${apiPath}`);
    } else {
      // 기본 대전 관광 API
      daejeonUrl = new URL(`https://apis.data.go.kr/6300000/openapi2022${apiPath}`);
    }
    
    // 서비스 키 추가
    daejeonUrl.searchParams.set('serviceKey', apiKey);
    
    // 기존 쿼리 파라미터 복사 (serviceKey 제외)
    url.searchParams.forEach((value, key) => {
      if (key !== 'serviceKey') {
        daejeonUrl.searchParams.set(key, value);
      }
    });
    
    const response = await fetch(daejeonUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    const data = await response.json();
    return jsonResponse(data, 200, origin);
  } catch (error) {
    return errorResponse('대전시 API 요청 실패: ' + error.message, 500, origin);
  }
}

// 대전시 주차장 API (XML을 JSON으로 변환)
async function handleDaejeonParking(request, env, origin) {
  try {
    const url = new URL(request.url);
    const apiKey = env.DAEJEON_API_KEY ? env.DAEJEON_API_KEY.trim() : '';
    
    const numOfRows = url.searchParams.get('numOfRows') || '50';
    const pageNo = url.searchParams.get('pageNo') || '1';
    
    const parkingUrl = new URL('https://apis.data.go.kr/6300000/GetPakpListService1/getPakpList1');
    parkingUrl.searchParams.set('serviceKey', apiKey);
    parkingUrl.searchParams.set('numOfRows', numOfRows);
    parkingUrl.searchParams.set('pageNo', pageNo);
    parkingUrl.searchParams.set('type', 'xml');
    
    const response = await fetch(parkingUrl.toString());
    const text = await response.text();
    
    // 간단한 XML 파싱 (Workers 환경에서는 DOMParser 없음)
    const getTagValue = (xml, tag) => {
      const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return match ? match[1] : '';
    };
    
    const resultCode = getTagValue(text, 'resultCode');
    const totalCount = parseInt(getTagValue(text, 'totalCount') || '0');
    
    if (resultCode === '00') {
      // item 태그들 추출
      const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
      const items = itemMatches.map(itemXml => ({
        name: getTagValue(itemXml, 'PRKPLCENM'),
        parkingId: getTagValue(itemXml, 'PRKPLCENO'),
        lat: parseFloat(getTagValue(itemXml, 'LATITUDE') || '0'),
        lon: parseFloat(getTagValue(itemXml, 'LONGITUDE') || '0'),
        addr: getTagValue(itemXml, 'LNMADR'),
        addrRoad: getTagValue(itemXml, 'RDNMADR'),
        divideNum: getTagValue(itemXml, 'PRKPLCESE') === '공영' ? '6' : '1',
        typeNum: getTagValue(itemXml, 'PRKPLCETYPE') === '노외' ? '2' : '1',
        parkingType: getTagValue(itemXml, 'PRKPLCESE'),
        parkingCategory: getTagValue(itemXml, 'PRKPLCETYPE'),
        totalLot: getTagValue(itemXml, 'PRKCMPRT'),
        weekdayOpen: getTagValue(itemXml, 'WEEKDAYOPEROPENHHMM'),
        weekdayClose: getTagValue(itemXml, 'WEEKDAYOPERCOLSEHHMM'),
        satOpen: getTagValue(itemXml, 'SATOPEROPEROPENHHMM'),
        satClose: getTagValue(itemXml, 'SATOPERCLOSEHHMM'),
        holidayOpen: getTagValue(itemXml, 'HOLIDAYOPEROPENHHMM'),
        holidayClose: getTagValue(itemXml, 'HOLIDAYCLOSEOPENHHMM'),
        chargeInfo: getTagValue(itemXml, 'PARKINGCHRGEINFO'),
        basicTime: getTagValue(itemXml, 'BASICTIME'),
        basicCharge: getTagValue(itemXml, 'BASICCHARGE'),
        addTime: getTagValue(itemXml, 'ADDUNITTIME'),
        addCharge: getTagValue(itemXml, 'ADDUNITCHARGE'),
        dayTicket: getTagValue(itemXml, 'DAYCMMTKT'),
        monthTicket: getTagValue(itemXml, 'MONTHCMMTKT'),
        payMethod: getTagValue(itemXml, 'METPAY'),
        operDay: getTagValue(itemXml, 'OPERDAY'),
        referenceDate: getTagValue(itemXml, 'REFERENCEDATE')
      }));
      
      return jsonResponse({
        success: true,
        totalCount: totalCount || items.length,
        items: items
      }, 200, origin);
    }
    
    return jsonResponse({ success: false, items: [], totalCount: 0 }, 200, origin);
  } catch (error) {
    return errorResponse('주차장 API 요청 실패: ' + error.message, 500, origin);
  }
}

// 한국관광공사 API 프록시
async function handleKtoApi(request, env, pathname, origin) {
  try {
    const url = new URL(request.url);
    const apiPath = pathname.replace('/api/kto', '');
    
    // API 키 (환경변수에서 가져옴)
    const apiKey = env.KTO_API_KEY ? env.KTO_API_KEY.trim() : '';
    
    // 한국관광공사 API URL 구성
    const ktoUrl = new URL(`https://apis.data.go.kr/B551011${apiPath}`);
    
    // 서비스 키 추가
    ktoUrl.searchParams.set('serviceKey', apiKey);
    
    // 기존 쿼리 파라미터 복사 (serviceKey 제외)
    url.searchParams.forEach((value, key) => {
      if (key !== 'serviceKey') {
        ktoUrl.searchParams.set(key, value);
      }
    });
    
    const response = await fetch(ktoUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    const data = await response.json();
    return jsonResponse(data, 200, origin);
  } catch (error) {
    return errorResponse('한국관광공사 API 요청 실패: ' + error.message, 500, origin);
  }
}

// KCISA 문화예술 공연 API 프록시 (XML → JSON 변환)
async function handleKcisaApi(request, env, pathname, origin) {
  try {
    const url = new URL(request.url);
    const apiPath = pathname.replace('/api/kcisa', '');
    
    // API 키 (환경변수에서 가져옴)
    const apiKey = env.KCISA_API_KEY ? env.KCISA_API_KEY.trim() : '';
    
    // KCISA API URL 구성
    const kcisaUrl = new URL(`https://api.kcisa.kr/openapi${apiPath}/request`);
    
    // 서비스 키 추가
    kcisaUrl.searchParams.set('serviceKey', apiKey);
    
    // 기존 쿼리 파라미터 복사 (serviceKey 제외)
    url.searchParams.forEach((value, key) => {
      if (key !== 'serviceKey') {
        kcisaUrl.searchParams.set(key, value);
      }
    });
    
    const response = await fetch(kcisaUrl.toString());
    const text = await response.text();
    
    // XML 파싱 헬퍼 (Workers 환경용)
    const getTagValue = (xml, tag) => {
      const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return match ? match[1].trim() : '';
    };
    
    const resultCode = getTagValue(text, 'resultCode');
    const resultMsg = getTagValue(text, 'resultMsg');
    
    if (resultCode === '0000' || resultCode === '0') {
      // item 태그들 추출
      const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
      const items = itemMatches.map(itemXml => ({
        title: getTagValue(itemXml, 'title'),
        type: getTagValue(itemXml, 'type'),           // 분류 (연극, 뮤지컬 등)
        period: getTagValue(itemXml, 'period'),       // 공연기간
        eventPeriod: getTagValue(itemXml, 'eventPeriod'),
        eventSite: getTagValue(itemXml, 'eventSite'), // 장소
        charge: getTagValue(itemXml, 'charge'),       // 요금
        contactPoint: getTagValue(itemXml, 'contactPoint'), // 연락처
        url: getTagValue(itemXml, 'url'),             // 상세페이지
        imageObject: getTagValue(itemXml, 'imageObject'), // 이미지 URL
        description: getTagValue(itemXml, 'description'), // 설명
        viewCount: parseInt(getTagValue(itemXml, 'viewCount') || '0')
      }));
      
      return jsonResponse({
        success: true,
        resultCode,
        resultMsg,
        totalCount: items.length,
        items: items
      }, 200, origin);
    }
    
    return jsonResponse({ 
      success: false, 
      resultCode,
      resultMsg,
      items: [], 
      totalCount: 0 
    }, 200, origin);
  } catch (error) {
    return errorResponse('KCISA API 요청 실패: ' + error.message, 500, origin);
  }
}

// TourAPI 4.0 (한국관광공사 국문 관광정보 서비스) 프록시
async function handleTourApi(request, env, pathname, origin) {
  try {
    const url = new URL(request.url);
    const apiPath = pathname.replace('/api/tour', '');
    
    // API 키 (환경변수에서 가져옴)
    const apiKey = env.TOURAPI_KEY ? env.TOURAPI_KEY.trim() : '';
    
    // TourAPI URL 구성 (KorService2)
    const tourUrl = new URL(`https://apis.data.go.kr/B551011/KorService2${apiPath}`);
    
    // 서비스 키 추가
    tourUrl.searchParams.set('serviceKey', apiKey);
    
    // 필수 파라미터 기본값 설정
    if (!url.searchParams.has('MobileOS')) {
      tourUrl.searchParams.set('MobileOS', 'ETC');
    }
    if (!url.searchParams.has('MobileApp')) {
      tourUrl.searchParams.set('MobileApp', 'LetsGoDaejeon');
    }
    if (!url.searchParams.has('_type')) {
      tourUrl.searchParams.set('_type', 'json');
    }
    
    // 기존 쿼리 파라미터 복사 (serviceKey 제외)
    url.searchParams.forEach((value, key) => {
      if (key !== 'serviceKey') {
        tourUrl.searchParams.set(key, value);
      }
    });
    
    const response = await fetch(tourUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    // 응답 텍스트를 먼저 확인
    const text = await response.text();
    
    // JSON 파싱 시도
    try {
      const data = JSON.parse(text);
      return jsonResponse(data, 200, origin);
    } catch (parseError) {
      // JSON 파싱 실패시 원본 텍스트와 함께 에러 반환
      return errorResponse('TourAPI 응답 파싱 실패: ' + text.substring(0, 200), 500, origin);
    }
  } catch (error) {
    return errorResponse('TourAPI 요청 실패: ' + error.message, 500, origin);
  }
}

// TourAPI 영문 서비스 (EngService2) 프록시
async function handleTourApiEng(request, env, pathname, origin) {
  try {
    const url = new URL(request.url);
    const apiPath = pathname.replace('/api/tour-en', '');
    
    // API 키 (환경변수에서 가져옴 - 국문/영문 동일 키 사용)
    const apiKey = env.TOURAPI_KEY ? env.TOURAPI_KEY.trim() : '';
    
    // TourAPI 영문 URL 구성 (EngService2)
    const tourUrl = new URL(`https://apis.data.go.kr/B551011/EngService2${apiPath}`);
    
    // 서비스 키 추가
    tourUrl.searchParams.set('serviceKey', apiKey);
    
    // 필수 파라미터 기본값 설정
    if (!url.searchParams.has('MobileOS')) {
      tourUrl.searchParams.set('MobileOS', 'ETC');
    }
    if (!url.searchParams.has('MobileApp')) {
      tourUrl.searchParams.set('MobileApp', 'LetsGoDaejeon');
    }
    if (!url.searchParams.has('_type')) {
      tourUrl.searchParams.set('_type', 'json');
    }
    
    // 기존 쿼리 파라미터 복사 (serviceKey 제외)
    url.searchParams.forEach((value, key) => {
      if (key !== 'serviceKey') {
        tourUrl.searchParams.set(key, value);
      }
    });
    
    const response = await fetch(tourUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    // 응답 텍스트를 먼저 확인
    const text = await response.text();
    
    // JSON 파싱 시도
    try {
      const data = JSON.parse(text);
      return jsonResponse(data, 200, origin);
    } catch (parseError) {
      // JSON 파싱 실패시 원본 텍스트와 함께 에러 반환
      return errorResponse('TourAPI (EN) 응답 파싱 실패: ' + text.substring(0, 200), 500, origin);
    }
  } catch (error) {
    return errorResponse('TourAPI (EN) 요청 실패: ' + error.message, 500, origin);
  }
}

// KCISA 전시정보 API (API_CCA_145) - 필드명이 대문자
async function handleKcisaExhibitionApi(request, env, pathname, origin) {
  try {
    const url = new URL(request.url);
    const apiPath = pathname.replace('/api/kcisa-exhibition', '');
    
    // API 키 (전시 API용 별도 키)
    const apiKey = env.KCISA_EXHIBITION_API_KEY ? env.KCISA_EXHIBITION_API_KEY.trim() : '';
    
    // KCISA API URL 구성
    const kcisaUrl = new URL(`https://api.kcisa.kr/openapi${apiPath}/request`);
    
    // 서비스 키 추가
    kcisaUrl.searchParams.set('serviceKey', apiKey);
    
    // 기존 쿼리 파라미터 복사 (serviceKey 제외)
    url.searchParams.forEach((value, key) => {
      if (key !== 'serviceKey') {
        kcisaUrl.searchParams.set(key, value);
      }
    });
    
    const response = await fetch(kcisaUrl.toString());
    const text = await response.text();
    
    // XML 파싱 헬퍼 (대문자 태그용)
    const getTagValue = (xml, tag) => {
      const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return match ? match[1].trim() : '';
    };
    
    const resultCode = getTagValue(text, 'resultCode');
    const resultMsg = getTagValue(text, 'resultMsg');
    const totalCount = parseInt(getTagValue(text, 'totalCount') || '0');
    
    if (resultCode === '0000' || resultCode === '0') {
      // item 태그들 추출
      const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
      const items = itemMatches.map(itemXml => ({
        title: getTagValue(itemXml, 'TITLE'),
        institution: getTagValue(itemXml, 'CNTC_INSTT_NM'),     // 기관명
        collectedDate: getTagValue(itemXml, 'COLLECTED_DATE'),
        issuedDate: getTagValue(itemXml, 'ISSUED_DATE'),
        description: getTagValue(itemXml, 'DESCRIPTION'),
        imageObject: getTagValue(itemXml, 'IMAGE_OBJECT'),      // 이미지 URL
        localId: getTagValue(itemXml, 'LOCAL_ID'),
        url: getTagValue(itemXml, 'URL'),                       // 상세페이지
        viewCount: getTagValue(itemXml, 'VIEW_COUNT'),
        subDescription: getTagValue(itemXml, 'SUB_DESCRIPTION'),
        spatialCoverage: getTagValue(itemXml, 'SPATIAL_COVERAGE'),
        eventSite: getTagValue(itemXml, 'EVENT_SITE'),          // 장소 (서울, 대전 등)
        genre: getTagValue(itemXml, 'GENRE'),                   // 장르 (예정전시, 현재전시 등)
        duration: getTagValue(itemXml, 'DURATION'),
        author: getTagValue(itemXml, 'AUTHOR'),                 // 작가
        contactPoint: getTagValue(itemXml, 'CONTACT_POINT'),
        actor: getTagValue(itemXml, 'ACTOR'),
        contributor: getTagValue(itemXml, 'CONTRIBUTOR'),
        audience: getTagValue(itemXml, 'AUDIENCE'),
        charge: getTagValue(itemXml, 'CHARGE'),                 // 요금
        period: getTagValue(itemXml, 'PERIOD'),                 // 기간 (YYYY-MM-DD~YYYY-MM-DD)
        eventPeriod: getTagValue(itemXml, 'EVENT_PERIOD')
      }));
      
      return jsonResponse({
        success: true,
        resultCode,
        resultMsg,
        totalCount,
        items: items
      }, 200, origin);
    }
    
    return jsonResponse({ 
      success: false, 
      resultCode,
      resultMsg,
      items: [], 
      totalCount: 0 
    }, 200, origin);
  } catch (error) {
    return errorResponse('KCISA 전시 API 요청 실패: ' + error.message, 500, origin);
  }
}

// 디버그 엔드포인트
async function handleDebug(request, env, origin = null) {
  return jsonResponse({
    hasOdsayKey: !!env.ODSAY_API_KEY,
    odsayKeyLength: env.ODSAY_API_KEY ? env.ODSAY_API_KEY.length : 0,
    odsayKeyTrimLength: env.ODSAY_API_KEY ? env.ODSAY_API_KEY.trim().length : 0,
    hasKakaoKey: !!env.KAKAO_REST_API_KEY,
    hasDaejeonKey: !!env.DAEJEON_API_KEY,
    hasKtoKey: !!env.KTO_API_KEY,
    hasKcisaKey: !!env.KCISA_API_KEY,
    hasKcisaExhibitionKey: !!env.KCISA_EXHIBITION_API_KEY,
    hasTourApiKey: !!env.TOURAPI_KEY,
    allowedOrigins: ALLOWED_ORIGINS,
  }, 200, origin);
}

// 메인 핸들러
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const origin = request.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);
    
    // 클라이언트 IP 추출 (Cloudflare 헤더 우선)
    const clientIP = request.headers.get('CF-Connecting-IP') 
      || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
      || 'unknown';

    // CORS preflight 처리
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 헬스체크 (Origin 검증, Rate Limit 없이 허용)
    if (pathname === '/health' || pathname === '/') {
      return jsonResponse({ 
        status: 'ok', 
        message: 'LetsGoDaejeon API Proxy',
        timestamp: new Date().toISOString()
      }, 200, origin);
    }

    // 디버그 (Origin 검증 없이 허용)
    if (pathname === '/debug') {
      return handleDebug(request, env, origin);
    }

    // API 요청은 Origin 검증 및 Rate Limit 적용
    if (pathname.startsWith('/api/')) {
      // Origin이 없거나 허용되지 않은 경우 차단
      if (!isAllowedOrigin(origin)) {
        console.log(`Blocked request from unauthorized origin: ${origin || 'no origin'}`);
        return errorResponse('Unauthorized: Invalid origin', 403, origin);
      }
      
      // Rate Limit 체크
      const rateLimit = checkRateLimit(clientIP);
      if (rateLimit.isLimited) {
        console.log(`Rate limit exceeded for IP: ${clientIP}`);
        return errorResponse(
          'Too Many Requests: Rate limit exceeded. Please try again later.', 
          429, 
          origin, 
          rateLimit
        );
      }
    }

    // API 라우팅
    if (pathname.startsWith('/api/odsay')) {
      return handleOdsay(request, env, pathname, origin);
    }
    
    if (pathname.startsWith('/api/kakao')) {
      return handleKakao(request, env, pathname, origin);
    }
    
    if (pathname.startsWith('/api/daejeon')) {
      return handleDaejeonApi(request, env, pathname, origin);
    }
    
    if (pathname.startsWith('/api/kto')) {
      return handleKtoApi(request, env, pathname, origin);
    }
    
    // TourAPI 영문 서비스 (EngService2) - 국문보다 먼저 체크
    if (pathname.startsWith('/api/tour-en')) {
      return handleTourApiEng(request, env, pathname, origin);
    }
    
    // TourAPI 4.0 (한국관광공사 국문 관광정보 서비스)
    if (pathname.startsWith('/api/tour')) {
      return handleTourApi(request, env, pathname, origin);
    }
    
    // KCISA 전시 API (API_CCA_145) - 먼저 체크 (더 구체적인 경로)
    if (pathname.startsWith('/api/kcisa-exhibition')) {
      return handleKcisaExhibitionApi(request, env, pathname, origin);
    }
    
    // KCISA 공연 API (CNV_060)
    if (pathname.startsWith('/api/kcisa')) {
      return handleKcisaApi(request, env, pathname, origin);
    }

    // 404
    return errorResponse('Not Found', 404, origin);
  },
};
