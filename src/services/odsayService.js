// ODsay 대중교통 API 서비스
// 버스, 지하철 경로 탐색

// Cloudflare Workers API 프록시 URL
const WORKERS_API_URL = 'https://letsgodaejeon-api.daegieun700.workers.dev'

// API 사용량 추적
let apiCallCount = 0
const apiCallHistory = []

/**
 * API 호출 카운터 증가 및 기록
 */
const trackApiCall = (endpoint, success = true) => {
  apiCallCount++
  apiCallHistory.push({
    timestamp: new Date().toISOString(),
    endpoint,
    success
  })
  
  // 최근 1000개만 유지
  if (apiCallHistory.length > 1000) {
    apiCallHistory.shift()
  }
}

/**
 * API 사용량 통계 조회
 * @returns {Object} API 사용량 정보
 */
export const getOdsayApiStats = () => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  
  // 오늘 호출 수
  const todayCalls = apiCallHistory.filter(call => 
    call.timestamp.startsWith(today)
  ).length
  
  // 최근 1시간 호출 수
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const lastHourCalls = apiCallHistory.filter(call => 
    new Date(call.timestamp) >= oneHourAgo
  ).length
  
  // 성공률
  const successCalls = apiCallHistory.filter(call => call.success).length
  const successRate = apiCallHistory.length > 0 
    ? Math.round((successCalls / apiCallHistory.length) * 100) 
    : 100
  
  return {
    totalCalls: apiCallCount,
    todayCalls,
    lastHourCalls,
    successRate,
    // ODsay 무료 플랜: 일 1,000건
    dailyLimit: 1000,
    remainingToday: Math.max(0, 1000 - todayCalls)
  }
}

/**
 * 대중교통 경로 탐색
 * @param {number} startX - 출발지 경도 (longitude)
 * @param {number} startY - 출발지 위도 (latitude)
 * @param {number} endX - 도착지 경도
 * @param {number} endY - 도착지 위도
 * @param {string} searchType - 검색 유형: 'bus' | 'subway' | 'all'
 * @returns {Promise<Object>} 경로 정보
 */
export const getPublicTransitRoute = async (startX, startY, endX, endY, searchType = 'all') => {
  try {
    // API URL 생성
    const searchPathType = searchType === 'subway' ? 1 : searchType === 'bus' ? 2 : 0
    
    // Cloudflare Workers 프록시를 통한 API 호출 (API 키 보호)
    const apiUrl = `${WORKERS_API_URL}/api/odsay/searchPubTransPathT?SX=${startX}&SY=${startY}&EX=${endX}&EY=${endY}&OPT=0&SearchType=0&SearchPathType=${searchPathType}&output=json`
    
    const response = await fetch(apiUrl)
    const data = await response.json()
    
    if (data.error) {
      trackApiCall('searchPubTransPathT', false)
      const errorMsg = Array.isArray(data.error) 
        ? data.error[0]?.message 
        : (data.error.msg || '경로를 찾을 수 없습니다')
      const errorCode = Array.isArray(data.error) 
        ? data.error[0]?.code 
        : data.error.code
      return { 
        success: false, 
        error: errorMsg,
        errorCode: errorCode
      }
    }
    
    trackApiCall('searchPubTransPathT', true)
    
    if (!data.result || !data.result.path || data.result.path.length === 0) {
      // 버스 또는 지하철 전용 검색에서 결과가 없으면 "경로 없음"으로 처리
      if (searchType === 'subway' || searchType === 'bus') {
        const routeTypeText = searchType === 'subway' ? '지하철' : '버스'
        return { 
          success: true, 
          totalTime: 0,
          totalDistance: 0,
          payment: 0,
          busTransitCount: 0,
          subwayTransitCount: 0,
          routeDetails: [],
          noRoute: true,
          error: `이용 가능한 ${routeTypeText} 노선이 없습니다`
        }
      }
      return { success: false, error: '경로를 찾을 수 없습니다' }
    }
    
    // 최적 경로 선택 (첫 번째 결과)
    const bestPath = data.result.path[0]
    const info = bestPath.info
    
    // 경로 상세 정보 파싱
    const subPaths = bestPath.subPath || []
    
    const routeDetails = subPaths.map(sub => {
      if (sub.trafficType === 1) {
        // 지하철
        // 정류장 좌표 목록 추출
        const stations = sub.passStopList?.stations || []
        const stationCoords = stations.map(s => ({
          name: s.stationName,
          x: s.x,
          y: s.y
        }))
        
        return {
          type: 'subway',
          lineName: sub.lane?.[0]?.name || '지하철',
          lineColor: sub.lane?.[0]?.subwayColor || '#1a5dc8',
          startStation: sub.startName,
          endStation: sub.endName,
          stationCount: sub.stationCount,
          sectionTime: sub.sectionTime,
          distance: sub.distance,
          startX: sub.startX,
          startY: sub.startY,
          endX: sub.endX,
          endY: sub.endY,
          stationCoords // 지하철역 좌표 목록
        }
      } else if (sub.trafficType === 2) {
        // 버스
        // 정류장 좌표 목록 추출
        const stations = sub.passStopList?.stations || []
        const stationCoords = stations.map(s => ({
          name: s.stationName,
          x: s.x,
          y: s.y
        }))
        
        return {
          type: 'bus',
          busNo: sub.lane?.[0]?.busNo || '버스',
          busType: sub.lane?.[0]?.type || 0,
          busColor: getBusColor(sub.lane?.[0]?.type),
          startStation: sub.startName,
          endStation: sub.endName,
          stationCount: sub.stationCount,
          sectionTime: sub.sectionTime,
          distance: sub.distance,
          startX: sub.startX,
          startY: sub.startY,
          endX: sub.endX,
          endY: sub.endY,
          stationCoords // 버스 정류장 좌표 목록
        }
      } else if (sub.trafficType === 3) {
        // 도보
        return {
          type: 'walk',
          sectionTime: sub.sectionTime,
          distance: sub.distance,
          startX: sub.startX,
          startY: sub.startY,
          endX: sub.endX,
          endY: sub.endY
        }
      }
      return null
    }).filter(Boolean)
    
    return {
      success: true,
      totalTime: info.totalTime, // 총 소요 시간 (분)
      totalDistance: Math.round(info.totalDistance / 1000 * 10) / 10, // 총 거리 (km)
      payment: info.payment, // 요금
      busTransitCount: info.busTransitCount, // 버스 환승 횟수
      subwayTransitCount: info.subwayTransitCount, // 지하철 환승 횟수
      mapObj: info.mapObj, // 경로 지도 표시용 객체
      routeDetails, // 상세 경로 정보
      firstStartStation: info.firstStartStation,
      lastEndStation: info.lastEndStation
    }
  } catch (err) {
    console.error('[ODSay] fetch 에러:', err)
    trackApiCall('searchPubTransPathT', false)
    return { success: false, error: err.message }
  }
}

/**
 * 버스 타입에 따른 색상 반환
 */
const getBusColor = (busType) => {
  switch (busType) {
    case 1: return '#52c41a' // 일반 - 초록
    case 2: return '#1890ff' // 좌석 - 파랑
    case 3: return '#52c41a' // 마을 - 초록
    case 4: return '#eb2f96' // 직행좌석 - 빨강
    case 5: return '#eb2f96' // 급행 - 빨강
    case 6: return '#52c41a' // 지선 - 초록
    case 7: return '#1890ff' // 간선 - 파랑
    default: return '#52c41a'
  }
}

/**
 * 정류장/역 검색 (JSONP)
 * @param {string} stationName - 정류장 또는 역 이름
 * @param {string} cityCode - 도시 코드 (대전: 3)
 * @returns {Promise<Object>} 검색 결과
 */
export const searchStation = (stationName, cityCode = '3') => {
  return new Promise((resolve) => {
    try {
      const callbackName = `odsayCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      window[callbackName] = (data) => {
        delete window[callbackName]
        const script = document.getElementById(callbackName)
        if (script) script.remove()
        
        if (data.error) {
          trackApiCall('searchStation', false)
          resolve({ success: false, error: data.error.msg })
          return
        }
        
        trackApiCall('searchStation', true)
        
        if (!data.result || !data.result.station) {
          resolve({ success: false, error: '정류장을 찾을 수 없습니다' })
          return
        }
        
        resolve({
          success: true,
          stations: data.result.station.map(s => ({
            stationName: s.stationName,
            stationId: s.stationID,
            x: s.x,
            y: s.y,
            type: s.type
          }))
        })
      }
      
      const params = new URLSearchParams({
        apiKey: ODSAY_API_KEY,
        stationName: stationName,
        CID: cityCode,
        output: 'json'
      })
      
      const script = document.createElement('script')
      script.id = callbackName
      script.src = `https://api.odsay.com/v1/api/searchStation?${params.toString()}&callback=${callbackName}`
      script.onerror = () => {
        trackApiCall('searchStation', false)
        delete window[callbackName]
        script.remove()
        resolve({ success: false, error: 'API 요청 실패' })
      }
      
      setTimeout(() => {
        if (window[callbackName]) {
          delete window[callbackName]
          script.remove()
          resolve({ success: false, error: '요청 시간 초과' })
        }
      }, 10000)
      
      document.head.appendChild(script)
    } catch (err) {
      trackApiCall('searchStation', false)
      resolve({ success: false, error: err.message })
    }
  })
}

/**
 * 주소/좌표를 이용한 대중교통 경로 탐색 (편의 함수)
 * @param {Object} origin - 출발지 {lat, lng}
 * @param {Object} destination - 도착지 {lat, lng}
 * @param {string} transportType - 'bus' | 'subway' | 'all'
 * @returns {Promise<Object>} 경로 정보
 */
export const getPublicTransitRouteByCoords = async (origin, destination, transportType = 'all') => {
  const result = await getPublicTransitRoute(
    origin.lng,  // 출발지 경도
    origin.lat,  // 출발지 위도
    destination.lng, // 도착지 경도
    destination.lat, // 도착지 위도
    transportType
  )
  
  return result
}

/**
 * 버스 실시간 도착 정보 조회 (JSONP)
 * @param {string} stationId - 정류장 ID
 * @returns {Promise<Object>} 버스 도착 정보
 */
export const getBusArrivalInfo = (stationId) => {
  return new Promise((resolve) => {
    try {
      const callbackName = `odsayCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      window[callbackName] = (data) => {
        delete window[callbackName]
        const script = document.getElementById(callbackName)
        if (script) script.remove()
        
        if (data.error) {
          trackApiCall('realtimeStation', false)
          resolve({ success: false, error: data.error.msg })
          return
        }
        
        trackApiCall('realtimeStation', true)
        
        if (!data.result || !data.result.real) {
          resolve({ success: true, arrivals: [] })
          return
        }
        
        resolve({
          success: true,
          arrivals: data.result.real.map(bus => ({
            busNo: bus.routeName,
            arrivalSec: bus.arrivalSec,
            arrivalMin: Math.round(bus.arrivalSec / 60),
            stationCount: bus.stationNum
          }))
        })
      }
      
      const params = new URLSearchParams({
        apiKey: ODSAY_API_KEY,
        stationID: stationId,
        output: 'json'
      })
      
      const script = document.createElement('script')
      script.id = callbackName
      script.src = `https://api.odsay.com/v1/api/realtimeStation?${params.toString()}&callback=${callbackName}`
      script.onerror = () => {
        trackApiCall('realtimeStation', false)
        delete window[callbackName]
        script.remove()
        resolve({ success: false, error: 'API 요청 실패' })
      }
      
      setTimeout(() => {
        if (window[callbackName]) {
          delete window[callbackName]
          script.remove()
          resolve({ success: false, error: '요청 시간 초과' })
        }
      }, 10000)
      
      document.head.appendChild(script)
    } catch (err) {
      trackApiCall('realtimeStation', false)
      resolve({ success: false, error: err.message })
    }
  })
}

export default {
  getPublicTransitRoute,
  getPublicTransitRouteByCoords,
  searchStation,
  getBusArrivalInfo,
  getOdsayApiStats
}
