// 카카오 모빌리티 API 서비스
// 경로 탐색 및 이동 시간 조회

const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY

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

/**
 * 주소를 좌표로 변환 (Geocoding)
 * @param {string} address - 검색할 주소
 * @returns {Promise<{success: boolean, lat?: number, lng?: number}>}
 */
export const getCoordinatesFromAddress = async (address) => {
  try {
    // 주소 정규화: 도로명 뒤에 붙어있는 숫자 앞에 공백 추가 (예: 엑스포로85 → 엑스포로 85)
    const normalizedAddress = address.replace(/([가-힣])(\d)/g, '$1 $2')
    
    // 직접 API 호출
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(normalizedAddress)}`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`
        }
      }
    )
    
    const data = await response.json()
    trackKakaoApiCall('address_search', !!data.documents?.length)
    
    if (data.documents && data.documents.length > 0) {
      const { x, y } = data.documents[0]
      return { success: true, lng: parseFloat(x), lat: parseFloat(y) }
    }
    
    // 주소 검색 실패 시 원본 주소로 키워드 검색 시도
    const keywordResponse = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(address)}`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`
        }
      }
    )
    
    const keywordData = await keywordResponse.json()
    trackKakaoApiCall('keyword_search', !!keywordData.documents?.length)
    
    if (keywordData.documents && keywordData.documents.length > 0) {
      const { x, y } = keywordData.documents[0]
      return { success: true, lng: parseFloat(x), lat: parseFloat(y) }
    }
    
    // 키워드 검색도 실패 시 "대전" 추가해서 재시도
    if (!address.includes('대전')) {
      const daejeonKeywordResponse = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent('대전 ' + address)}`,
        {
          headers: {
            'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`
          }
        }
      )
      
      const daejeonKeywordData = await daejeonKeywordResponse.json()
      trackKakaoApiCall('keyword_search_daejeon', !!daejeonKeywordData.documents?.length)
      
      if (daejeonKeywordData.documents && daejeonKeywordData.documents.length > 0) {
        const { x, y } = daejeonKeywordData.documents[0]
        return { success: true, lng: parseFloat(x), lat: parseFloat(y) }
      }
    }
    
    return { success: false, error: 'Address not found' }
  } catch (err) {
    trackKakaoApiCall('geocoding', false)
    console.error('좌표 변환 실패:', err)
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
    // 직접 API 호출
    const response = await fetch(
      `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}&priority=RECOMMEND`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`
        }
      }
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
 * @returns {Promise<{success: boolean, duration?: number, distance?: number, isEstimate?: boolean, routeDetails?: Array}>}
 */
export const getRouteByTransport = async (fromAddress, toAddress, transportType, useOdsay = true) => {
  try {
    // 1. 주소 → 좌표 변환
    const originResult = await getCoordinatesFromAddress(fromAddress)
    if (!originResult.success) {
      return { success: false, error: `출발지 주소를 찾을 수 없습니다: ${fromAddress}` }
    }
    
    const destResult = await getCoordinatesFromAddress(toAddress)
    if (!destResult.success) {
      return { success: false, error: `도착지 주소를 찾을 수 없습니다: ${toAddress}` }
    }
    
    const origin = { lat: originResult.lat, lng: originResult.lng }
    const destination = { lat: destResult.lat, lng: destResult.lng }
    
    // 2. 이동 방법에 따른 경로 탐색
    switch (transportType) {
      case 'car':
      case 'taxi':
        return await getCarRoute(origin, destination)
        
      case 'bus':
      case 'subway':
        // ODsay API 사용
        if (useOdsay) {
          try {
            const { getPublicTransitRouteByCoords } = await import('./odsayService.js')
            const searchType = transportType === 'bus' ? 'bus' : transportType === 'subway' ? 'subway' : 'all'
            const odsayResult = await getPublicTransitRouteByCoords(origin, destination, searchType)
            
            if (odsayResult.success) {
              // 노선이 없는 경우 추정값 사용하지 않고 그대로 반환
              if (odsayResult.noRoute) {
                return {
                  success: true,
                  duration: 0,
                  distance: 0,
                  payment: 0,
                  routeDetails: [],
                  noRoute: true,
                  isEstimate: false
                }
              }
              return {
                success: true,
                duration: odsayResult.totalTime,
                distance: odsayResult.totalDistance,
                payment: odsayResult.payment,
                routeDetails: odsayResult.routeDetails,
                busTransitCount: odsayResult.busTransitCount,
                subwayTransitCount: odsayResult.subwayTransitCount,
                noRoute: false,
                isEstimate: false
              }
            } else {
              // ODsay API 실패 시 (경로 없음 포함), 버스/지하철 전용 검색은 noRoute 반환
              return {
                success: true,
                duration: 0,
                distance: 0,
                payment: 0,
                routeDetails: [],
                noRoute: true,
                isEstimate: false
              }
            }
          } catch (odsayErr) {
            // 예외 발생 시에도 버스/지하철 전용 검색은 noRoute 반환
            return {
              success: true,
              duration: 0,
              distance: 0,
              payment: 0,
              routeDetails: [],
              noRoute: true,
              isEstimate: false
            }
          }
        }
        // ODsay 비활성화 시 추정값 사용
        return await getPublicTransportRoute(origin, destination)
        
      case 'walk':
        return await getWalkingRoute(origin, destination)
        
      case 'bicycle':
        return await getBicycleRoute(origin, destination)
        
      default:
        return await getCarRoute(origin, destination)
    }
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
