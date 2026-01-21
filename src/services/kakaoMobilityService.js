// 카카오 모빌리티 API 서비스
// 경로 탐색 및 이동 시간 조회

import { getRouteFromCache, saveRouteToCache, getCoordinateFromCache, saveCoordinateToCache } from './dbService.js'

// Cloudflare Workers API 프록시 URL
const WORKERS_API_URL = 'https://letsgodaejeon-api.daegieun700.workers.dev'

// API 사용량 추적
let kakaoApiCallCount = 0
const kakaoApiCallHistory = []

/**
 * API 호출 카운터 증가 및 기록
 */
const trackKakaoApiCall = (endpoint, success = true) => {
  kakaoApiCallCount++
  kakaoApiCallHistory.push({
    timestamp: new Date().toISOString(),
    endpoint,
    success
  })
  
  // 최근 1000개만 유지
  if (kakaoApiCallHistory.length > 1000) {
    kakaoApiCallHistory.shift()
  }
}

/**
 * 카카오 API 사용량 통계 조회
 * @returns {Object} API 사용량 정보
 */
export const getKakaoApiStats = () => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  
  // 오늘 호출 수
  const todayCalls = kakaoApiCallHistory.filter(call => 
    call.timestamp.startsWith(today)
  ).length
  
  // 최근 1시간 호출 수
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const lastHourCalls = kakaoApiCallHistory.filter(call => 
    new Date(call.timestamp) >= oneHourAgo
  ).length
  
  // 성공률
  const successCalls = kakaoApiCallHistory.filter(call => call.success).length
  const successRate = kakaoApiCallHistory.length > 0 
    ? Math.round((successCalls / kakaoApiCallHistory.length) * 100) 
    : 100
  
  // 엔드포인트별 호출 수
  const endpointStats = {}
  kakaoApiCallHistory.forEach(call => {
    endpointStats[call.endpoint] = (endpointStats[call.endpoint] || 0) + 1
  })
  
  return {
    totalCalls: kakaoApiCallCount,
    todayCalls,
    lastHourCalls,
    successRate,
    // 카카오 REST API 무료 한도 (지도/로컬: 일 300,000건)
    dailyLimit: 300000,
    remainingToday: Math.max(0, 300000 - todayCalls),
    endpointStats
  }
}

// 대전 지역 범위 체크 (위도: 36.19~36.51, 경도: 127.25~127.55)
const isDaejeonArea = (lat, lng) => {
  return lat >= 36.19 && lat <= 36.51 && lng >= 127.25 && lng <= 127.55
}

/**
 * 주소를 좌표로 변환 (Geocoding)
 * @param {string} address - 검색할 주소
 * @returns {Promise<{success: boolean, lat?: number, lng?: number}>}
 */
export const getCoordinatesFromAddress = async (address) => {
  
  try {
    // ===== 캐시 확인 =====
    const cachedCoord = await getCoordinateFromCache(address)
    if (cachedCoord && cachedCoord.fromCache) {
      console.log(`[좌표 캐시 히트] ${address}`)
      return {
        success: true,
        lat: cachedCoord.lat,
        lng: cachedCoord.lng,
        fromCache: true
      }
    }
    
    console.log(`[좌표 API 호출] ${address}`)
    
    // 도로명 숫자 분리 정규화 (예: 엑스포로85 → 엑스포로 85)
    const normalizeRoad = (str) => str.replace(/([가-힣])(\d)/g, '$1 $2').trim()
    
    // 괄호 내용 제거 (예: 카이스트(KAIST) → 카이스트)
    const removeParentheses = (str) => str.replace(/\(.*?\)/g, '').trim()
    
    // 대전 지역인지 확인하고 결과 반환하는 헬퍼
    const returnIfDaejeon = (lat, lng) => {
      if (isDaejeonArea(lat, lng)) {
        return { success: true, lng, lat }
      }
      return null
    }
    
    // 검색어에서 핵심 키워드 추출
    const extractKeywords = (str) => {
      return removeParentheses(str)
        .replace(/대전(광역시)?|유성구|서구|중구|동구|대덕구|\d+/g, '')
        .trim()
    }
    
    // 키워드 검색 결과에서 가장 관련성 높은 결과 찾기
    const findBestMatch = (documents, searchKeyword) => {
      const keywords = extractKeywords(searchKeyword).toLowerCase()
      const keywordParts = keywords.split(' ').filter(kw => kw.length > 1)
      
      // 점수 계산 함수
      const getScore = (doc) => {
        const placeName = removeParentheses(doc.place_name).toLowerCase()
        const inDaejeon = isDaejeonArea(parseFloat(doc.y), parseFloat(doc.x))
        
        let score = 0
        
        // 대전 지역: +100점
        if (inDaejeon) score += 100
        
        // 검색어 전체 포함: +50점
        const matchCount = keywordParts.filter(kw => placeName.includes(kw)).length
        score += matchCount * 50
        
        // 완전 일치 (가장 높은 우선순위): +200점
        if (placeName === keywords) {
          score += 200
        }
        // 장소명이 검색어로 시작: +150점 (카이스트 -> KAIST)
        else if (placeName.startsWith(keywords)) {
          score += 150
        }
        // 장소명에 검색어 포함: +50점 (카이스트홀딩스는 여기)
        else if (placeName.includes(keywords)) {
          score += 50
        }
        
        // 장소명 길이가 짧을수록 높은 점수 (간결한 이름 선호)
        // 최대 50점, 글자수 * 5점 감점
        const lengthPenalty = Math.min(50, placeName.length * 3)
        score += (50 - lengthPenalty)
        
        return score
      }
      
      // 점수 기준 정렬
      const sortedDocs = [...documents].sort((a, b) => getScore(b) - getScore(a))
      
      return sortedDocs[0]
    }
    
    // 주소/키워드 검색 실행 헬퍼
    const searchAddress = async (query) => {
      const response = await fetch(
        `${WORKERS_API_URL}/api/kakao/v2/local/search/address.json?query=${encodeURIComponent(query)}`
      )
      const data = await response.json()
      trackKakaoApiCall('address_search', !!data.documents?.length)
      return data.documents || []
    }
    
    const searchKeyword = async (query) => {
      const response = await fetch(
        `${WORKERS_API_URL}/api/kakao/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&x=127.385&y=36.351&radius=20000`
      )
      const data = await response.json()
      trackKakaoApiCall('keyword_search', !!data.documents?.length)
      return data.documents || []
    }
    
    // ============================================================
    // 검색 순서:
    // 1. 주소 검색 (원본)
    // 2. 키워드 검색 (원본)
    // 3. 괄호 제거 후 검색 (괄호가 있으면)
    // 4. "대전" 추가 후 검색
    // ============================================================
    
    const normalizedAddress = normalizeRoad(address)
    const hasParentheses = /\(.*?\)/.test(address)
    const withoutParentheses = hasParentheses ? normalizeRoad(removeParentheses(address)) : null
    const withDaejeon = !address.includes('대전') ? `대전 ${normalizeRoad(removeParentheses(address))}` : null
    
    // 결과를 캐시에 저장하고 반환하는 헬퍼
    const returnWithCache = (lat, lng) => {
      // 캐시 저장 (비동기, 결과 대기하지 않음)
      saveCoordinateToCache(address, lat, lng).then(saved => {
        if (saved) console.log(`[좌표 캐시 저장] ${address}`)
      }).catch(err => console.warn('[좌표 캐시 저장 실패]', err))
      
      return { success: true, lat, lng }
    }
    
    // 1단계: 주소 검색 (원본)
    const addressDocs = await searchAddress(normalizedAddress)
    if (addressDocs.length > 0) {
      const { x, y } = addressDocs[0]
      const lat = parseFloat(y), lng = parseFloat(x)
      if (isDaejeonArea(lat, lng)) {
        return returnWithCache(lat, lng)
      }
    }
    
    // 2단계: 키워드 검색 (원본)
    const keywordDocs = await searchKeyword(normalizedAddress)
    if (keywordDocs.length > 0) {
      const best = findBestMatch(keywordDocs, normalizedAddress)
      const lat = parseFloat(best.y), lng = parseFloat(best.x)
      if (isDaejeonArea(lat, lng)) {
        return returnWithCache(lat, lng)
      }
    }
    
    // 3단계: 괄호 제거 후 검색 (괄호가 있으면)
    if (withoutParentheses && withoutParentheses !== normalizedAddress) {
      // 주소 검색
      const noParen_addressDocs = await searchAddress(withoutParentheses)
      if (noParen_addressDocs.length > 0) {
        const { x, y } = noParen_addressDocs[0]
        const lat = parseFloat(y), lng = parseFloat(x)
        if (isDaejeonArea(lat, lng)) {
          return returnWithCache(lat, lng)
        }
      }
      
      // 키워드 검색
      const noParen_keywordDocs = await searchKeyword(withoutParentheses)
      if (noParen_keywordDocs.length > 0) {
        const best = findBestMatch(noParen_keywordDocs, withoutParentheses)
        const lat = parseFloat(best.y), lng = parseFloat(best.x)
        if (isDaejeonArea(lat, lng)) {
          return returnWithCache(lat, lng)
        }
      }
    }
    
    // 4단계: "대전" 추가 후 검색
    if (withDaejeon) {
      // 주소 검색
      const daejeon_addressDocs = await searchAddress(withDaejeon)
      if (daejeon_addressDocs.length > 0) {
        const { x, y } = daejeon_addressDocs[0]
        const lat = parseFloat(y), lng = parseFloat(x)
        if (isDaejeonArea(lat, lng)) {
          return returnWithCache(lat, lng)
        }
      }
      
      // 키워드 검색
      const daejeon_keywordDocs = await searchKeyword(withDaejeon)
      if (daejeon_keywordDocs.length > 0) {
        const best = findBestMatch(daejeon_keywordDocs, withDaejeon)
        const lat = parseFloat(best.y), lng = parseFloat(best.x)
        if (isDaejeonArea(lat, lng)) {
          return returnWithCache(lat, lng)
        }
      }
    }
    
    // 최종 실패 - 대전 외 결과라도 반환 (캐시에도 저장)
    if (keywordDocs.length > 0) {
      const best = findBestMatch(keywordDocs, normalizedAddress)
      const lat = parseFloat(best.y), lng = parseFloat(best.x)
      return returnWithCache(lat, lng)
    }
    
    return { success: false, error: 'Address not found' }
  } catch (err) {
    trackKakaoApiCall('geocoding', false)
    console.error('❌ [좌표 변환 실패]:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 자동차 경로 탐색 (카카오 모빌리티 API)
 * @param {Object} origin - 출발지 {lat, lng}
 * @param {Object} destination - 도착지 {lat, lng}
 * @param {boolean} includePath - 경로 좌표 포함 여부
 * @returns {Promise<{success: boolean, duration?: number, distance?: number, path?: Array}>}
 */
export const getCarRoute = async (origin, destination, includePath = false) => {
  try {
    // Workers 프록시를 통한 API 호출 (API 키 보호)
    const response = await fetch(
      `${WORKERS_API_URL}/api/kakao/mobility/v1/directions?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}&priority=RECOMMEND`
    )
    
    const data = await response.json()
    trackKakaoApiCall('directions', !!data.routes?.length)
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      
      const result = {
        success: true,
        duration: Math.round(route.summary.duration / 60), // 분 단위로 변환
        distance: Math.round(route.summary.distance / 1000 * 10) / 10 // km 단위 (소수점 1자리)
      }
      
      // 경로 좌표 추출
      if (includePath && route.sections) {
        const pathCoords = []
        route.sections.forEach(section => {
          section.roads?.forEach(road => {
            // vertexes는 [lng1, lat1, lng2, lat2, ...] 형태
            for (let i = 0; i < road.vertexes.length; i += 2) {
              pathCoords.push({
                lng: road.vertexes[i],
                lat: road.vertexes[i + 1]
              })
            }
          })
        })
        result.path = pathCoords
      }
      
      return result
    }
    
    return { success: false, error: 'Route not found' }
  } catch (err) {
    trackKakaoApiCall('directions', false)
    console.error('자동차 경로 탐색 실패:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 대중교통 경로 탐색 (직선 거리 기반 추정)
 * 카카오 대중교통 API는 별도 요금이므로 추정값 사용
 * @param {Object} origin - 출발지 {lat, lng}
 * @param {Object} destination - 도착지 {lat, lng}
 * @returns {Promise<{success: boolean, duration?: number, distance?: number}>}
 */
export const getPublicTransportRoute = async (origin, destination) => {
  try {
    // 직선 거리 계산 (Haversine formula)
    const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng)
    
    // 대중교통 평균 속도 약 25km/h로 추정 (정류장 대기 시간 포함)
    const duration = Math.round(distance / 25 * 60) + 10 // 환승 대기 시간 10분 추가
    
    return {
      success: true,
      duration,
      distance: Math.round(distance * 10) / 10,
      isEstimate: true
    }
  } catch (err) {
    console.error('대중교통 경로 추정 실패:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 도보 경로 탐색
 * @param {Object} origin - 출발지 {lat, lng}
 * @param {Object} destination - 도착지 {lat, lng}
 * @returns {Promise<{success: boolean, duration?: number, distance?: number}>}
 */
export const getWalkingRoute = async (origin, destination) => {
  try {
    // 직선 거리 계산
    const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng)
    
    // 도보 속도 약 4km/h
    const duration = Math.round(distance / 4 * 60)
    
    return {
      success: true,
      duration,
      distance: Math.round(distance * 10) / 10,
      isEstimate: true
    }
  } catch (err) {
    console.error('도보 경로 추정 실패:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 자전거 경로 탐색
 * @param {Object} origin - 출발지 {lat, lng}
 * @param {Object} destination - 도착지 {lat, lng}
 * @returns {Promise<{success: boolean, duration?: number, distance?: number}>}
 */
export const getBicycleRoute = async (origin, destination) => {
  try {
    // 직선 거리 계산
    const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng)
    
    // 자전거 평균 속도 약 15km/h
    const duration = Math.round(distance / 15 * 60)
    
    return {
      success: true,
      duration,
      distance: Math.round(distance * 10) / 10,
      isEstimate: true
    }
  } catch (err) {
    console.error('자전거 경로 추정 실패:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 이동 방법에 따른 경로 탐색
 * @param {string} fromAddress - 출발지 주소
 * @param {string} toAddress - 도착지 주소
 * @param {string} transportType - 이동 방법 (walk, car, bus, subway, taxi, bicycle)
 * @param {boolean} useOdsay - ODsay API 사용 여부 (버스/지하철)
 * @param {Object} fromCoords - 출발지 좌표 {lat, lng} (선택, 주소 검색 대신 사용)
 * @param {Object} toCoords - 도착지 좌표 {lat, lng} (선택, 주소 검색 대신 사용)
 * @returns {Promise<{success: boolean, duration?: number, distance?: number, isEstimate?: boolean, routeDetails?: Array}>}
 */
export const getRouteByTransport = async (fromAddress, toAddress, transportType, useOdsay = true, fromCoords = null, toCoords = null) => {
  try {
    // 1. 좌표 결정 (전달된 좌표가 있으면 사용, 없으면 주소 검색)
    let origin = null, destination = null
    let originFailed = false, destFailed = false
    
    if (fromCoords && fromCoords.lat && fromCoords.lng) {
      origin = fromCoords
    } else {
      const originResult = await getCoordinatesFromAddress(fromAddress)
      if (originResult.success) {
        origin = { lat: originResult.lat, lng: originResult.lng }
      } else {
        originFailed = true
      }
    }
    
    if (toCoords && toCoords.lat && toCoords.lng) {
      destination = toCoords
    } else {
      const destResult = await getCoordinatesFromAddress(toAddress)
      if (destResult.success) {
        destination = { lat: destResult.lat, lng: destResult.lng }
      } else {
        destFailed = true
      }
    }
    
    // 둘 다 실패한 경우에만 에러 반환
    // 부분 실패 시 성공한 좌표는 유지하고, 호출자가 재시도할 수 있도록 정보 전달
    if (originFailed && destFailed) {
      return { 
        success: false, 
        error: `출발지와 도착지 주소를 찾을 수 없습니다`,
        originFailed: true,
        destFailed: true
      }
    }
    if (originFailed) {
      return { 
        success: false, 
        error: `출발지 주소를 찾을 수 없습니다: ${fromAddress}`,
        originFailed: true,
        destFailed: false,
        resolvedDestCoords: destination // 성공한 도착지 좌표 전달
      }
    }
    if (destFailed) {
      return { 
        success: false, 
        error: `도착지 주소를 찾을 수 없습니다: ${toAddress}`,
        originFailed: false,
        destFailed: true,
        resolvedOriginCoords: origin // 성공한 출발지 좌표 전달
      }
    }
    
    // ===== 캐시 확인 =====
    const cachedRoute = await getRouteFromCache(origin, destination, transportType)
    if (cachedRoute && cachedRoute.fromCache) {
      console.log(`[캐시 히트] ${transportType} 경로: ${fromAddress} → ${toAddress}`)
      return {
        success: true,
        duration: cachedRoute.duration,
        distance: cachedRoute.distance,
        payment: cachedRoute.payment,
        routeDetails: cachedRoute.routeDetails || [],
        allRoutes: cachedRoute.allRoutes || [],
        path: cachedRoute.path,
        noRoute: cachedRoute.noRoute || false,
        isEstimate: cachedRoute.isEstimate || false,
        fromCache: true
      }
    }
    
    // ===== 캐시 미스: API 호출 =====
    console.log(`[API 호출] ${transportType} 경로: ${fromAddress} → ${toAddress}`)
    
    // 2. 이동 방법에 따른 경로 탐색
    let result = null
    switch (transportType) {
      case 'car':
      case 'taxi':
        result = await getCarRoute(origin, destination)
        break
        
      case 'bus':
      case 'subway':
        // ODsay API 사용
        if (useOdsay) {
          try {
            const { getPublicTransitRouteByCoords } = await import('./odsayService.js')
            const searchType = transportType === 'bus' ? 'bus' : transportType === 'subway' ? 'subway' : 'all'
            const odsayResult = await getPublicTransitRouteByCoords(origin, destination, searchType)
            
            if (odsayResult.success) {
              // 노선이 없는 경우
              if (odsayResult.noRoute) {
                result = {
                  success: true,
                  duration: 0,
                  distance: 0,
                  payment: 0,
                  routeDetails: [],
                  allRoutes: [],
                  noRoute: true,
                  isEstimate: false
                }
              } else {
                result = {
                  success: true,
                  duration: odsayResult.totalTime,
                  distance: odsayResult.totalDistance,
                  payment: odsayResult.payment,
                  routeDetails: odsayResult.routeDetails,
                  allRoutes: odsayResult.allRoutes || [], // 모든 경로 옵션
                  busTransitCount: odsayResult.busTransitCount,
                  subwayTransitCount: odsayResult.subwayTransitCount,
                  noRoute: false,
                  isEstimate: false
                }
              }
            } else {
              // ODsay API 실패 시 (경로 없음 포함), 버스/지하철 전용 검색은 noRoute 반환
              result = {
                success: true,
                duration: 0,
                distance: 0,
                payment: 0,
                routeDetails: [],
                allRoutes: [],
                noRoute: true,
                isEstimate: false
              }
            }
          } catch (odsayErr) {
            // 예외 발생 시에도 버스/지하철 전용 검색은 noRoute 반환
            result = {
              success: true,
              duration: 0,
              distance: 0,
              payment: 0,
              routeDetails: [],
              allRoutes: [],
              noRoute: true,
              isEstimate: false
            }
          }
        } else {
          // ODsay 비활성화 시 추정값 사용
          result = await getPublicTransportRoute(origin, destination)
        }
        break
        
      case 'walk':
        result = await getWalkingRoute(origin, destination)
        break
        
      case 'bicycle':
        result = await getBicycleRoute(origin, destination)
        break
        
      default:
        result = await getCarRoute(origin, destination)
        break
    }
    
    // ===== 결과를 캐시에 저장 =====
    if (result && result.success) {
      // 캐시 저장 (비동기, 결과 대기하지 않음)
      saveRouteToCache(origin, destination, transportType, {
        duration: result.duration,
        distance: result.distance,
        payment: result.payment,
        routeDetails: result.routeDetails,
        allRoutes: result.allRoutes,
        path: result.path,
        isEstimate: result.isEstimate,
        noRoute: result.noRoute
      }).then(saved => {
        if (saved) {
          console.log(`[캐시 저장] ${transportType} 경로 저장 완료`)
        }
      }).catch(err => {
        console.warn('[캐시 저장 실패]', err)
      })
    }
    
    return result
  } catch (err) {
    console.error('경로 탐색 실패:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 두 좌표 간 직선 거리 계산 (Haversine formula)
 * @param {number} lat1 - 출발지 위도
 * @param {number} lng1 - 출발지 경도
 * @param {number} lat2 - 도착지 위도
 * @param {number} lng2 - 도착지 경도
 * @returns {number} 거리 (km)
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371 // 지구 반지름 (km)
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

const toRad = (deg) => deg * (Math.PI / 180)

export default {
  getCoordinatesFromAddress,
  getCarRoute,
  getPublicTransportRoute,
  getWalkingRoute,
  getBicycleRoute,
  getRouteByTransport,
  calculateDistance,
  getKakaoApiStats
}
