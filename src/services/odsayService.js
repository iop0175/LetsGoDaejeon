// ODsay 대중교통 API 서비스
// 버스, 지하철 경로 탐색

const ODSAY_API_KEY = import.meta.env.VITE_ODSAY_API_KEY

// API 키 확인 로그
console.log('ODSay API Key 설정 여부:', !!ODSAY_API_KEY)

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
  return new Promise((resolve) => {
    try {
      // ODsay JSONP 콜백 함수명 (고유하게 생성)
      const callbackName = `odsayCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 콜백 함수 등록
      window[callbackName] = (data) => {
        console.log('[ODSay] 콜백 응답 수신:', data)
        // 콜백 함수 정리
        delete window[callbackName]
        const script = document.getElementById(callbackName)
        if (script) script.remove()
        
        if (data.error) {
          console.error('[ODSay] API 에러 응답:', data.error)
          trackApiCall('searchPubTransPathT', false)
          resolve({ 
            success: false, 
            error: data.error.msg || '경로를 찾을 수 없습니다',
            errorCode: data.error.code
          })
          return
        }
        
        trackApiCall('searchPubTransPathT', true)
        
        if (!data.result || !data.result.path || data.result.path.length === 0) {
          resolve({ success: false, error: '경로를 찾을 수 없습니다' })
          return
        }
        
        // 최적 경로 선택 (첫 번째 결과)
        const bestPath = data.result.path[0]
        const info = bestPath.info
        
        // 경로 상세 정보 파싱
        const subPaths = bestPath.subPath || []
        const routeDetails = subPaths.map(sub => {
          if (sub.trafficType === 1) {
            // 지하철
            return {
              type: 'subway',
              lineName: sub.lane?.[0]?.name || '지하철',
              lineColor: sub.lane?.[0]?.subwayColor || '#1a5dc8',
              startStation: sub.startName,
              endStation: sub.endName,
              stationCount: sub.stationCount,
              sectionTime: sub.sectionTime,
              distance: sub.distance
            }
          } else if (sub.trafficType === 2) {
            // 버스
            return {
              type: 'bus',
              busNo: sub.lane?.[0]?.busNo || '버스',
              busType: sub.lane?.[0]?.type || 0,
              busColor: getBusColor(sub.lane?.[0]?.type),
              startStation: sub.startName,
              endStation: sub.endName,
              stationCount: sub.stationCount,
              sectionTime: sub.sectionTime,
              distance: sub.distance
            }
          } else if (sub.trafficType === 3) {
            // 도보
            return {
              type: 'walk',
              sectionTime: sub.sectionTime,
              distance: sub.distance
            }
          }
          return null
        }).filter(Boolean)
        
        resolve({
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
        })
      }
      
      // ODsay JSONP 파라미터
      const params = new URLSearchParams({
        apiKey: ODSAY_API_KEY,
        SX: startX, // 출발지 경도
        SY: startY, // 출발지 위도
        EX: endX,   // 도착지 경도
        EY: endY,   // 도착지 위도
        OPT: 0,     // 0: 최단시간
        SearchType: searchType === 'bus' ? 1 : searchType === 'subway' ? 2 : 0,
        output: 'json'
      })
      
      // JSONP 스크립트 태그 생성
      const script = document.createElement('script')
      script.id = callbackName
      const apiUrl = `https://api.odsay.com/v1/api/searchPubTransPathT?${params.toString()}&callback=${callbackName}`
      script.src = apiUrl
      console.log('[ODSay] JSONP 요청 URL:', apiUrl.replace(ODSAY_API_KEY, 'API_KEY_HIDDEN'))
      
      script.onerror = (error) => {
        console.error('[ODSay] 스크립트 로드 에러:', error)
        trackApiCall('searchPubTransPathT', false)
        delete window[callbackName]
        script.remove()
        resolve({ success: false, error: 'API 요청 실패' })
      }
      
      // 타임아웃 설정 (10초)
      setTimeout(() => {
        if (window[callbackName]) {
          delete window[callbackName]
          script.remove()
          resolve({ success: false, error: '요청 시간 초과' })
        }
      }, 10000)
      
      document.head.appendChild(script)
      
    } catch (err) {
      trackApiCall('searchPubTransPathT', false)
      console.error('대중교통 경로 탐색 실패:', err)
      resolve({ success: false, error: err.message })
    }
  })
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
  console.log('[ODSay] getPublicTransitRouteByCoords 호출됨')
  console.log('[ODSay] 출발지:', origin)
  console.log('[ODSay] 도착지:', destination)
  console.log('[ODSay] 교통 타입:', transportType)
  console.log('[ODSay] API Key 존재:', !!ODSAY_API_KEY)
  
  const result = await getPublicTransitRoute(
    origin.lng,  // 출발지 경도
    origin.lat,  // 출발지 위도
    destination.lng, // 도착지 경도
    destination.lat, // 도착지 위도
    transportType
  )
  
  console.log('[ODSay] getPublicTransitRoute 결과:', result)
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
