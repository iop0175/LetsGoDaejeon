// API 호출 통계 관리 유틸리티
const STORAGE_KEY = 'api_call_stats'
const DATE_KEY = 'api_stats_date'
const WARNING_SHOWN_KEY = 'api_warning_shown'

// API 일일 호출 임계값 (경고 표시용)
const API_THRESHOLDS = {
  total: 500,      // 총 API 호출 임계값
  single: 200,     // 단일 API 임계값
}

// 현재 날짜를 YYYY-MM-DD 형식으로 반환
const getTodayString = () => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// 통계 데이터 초기화
const initStats = () => ({
  travel: 0,
  festival: 0,
  food: 0,
  culture: 0,
  medical: 0,
  shopping: 0,
  accommodation: 0,
  parking: 0,
  tourapi: 0,      // TourAPI 호출 수
  kakao: 0,        // 카카오 API 호출 수
  odsay: 0,        // ODSay API 호출 수
  // 페이지별 방문 수
  pages: {
    home: 0,
    travel: 0,
    festival: 0,
    food: 0,
    culture: 0,
    medical: 0,
    shopping: 0,
    accommodation: 0,
    parking: 0,
    map: 0,
    search: 0,
    'my-trip': 0
  }
})

// 오늘 날짜 확인하고 필요시 리셋
const checkAndResetStats = () => {
  try {
    const savedDate = localStorage.getItem(DATE_KEY)
    const today = getTodayString()
    
    if (savedDate !== today) {
      // 날짜가 다르면 통계 리셋
      localStorage.setItem(DATE_KEY, today)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initStats()))
      return initStats()
    }
    
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return initStats()
    
    try {
      return JSON.parse(saved)
    } catch {
      // JSON 파싱 실패 시 초기화
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initStats()))
      return initStats()
    }
  } catch (err) {
    // localStorage 접근 실패 시 메모리에만 저장
    console.warn('localStorage access failed:', err.message)
    return initStats()
  }
}

// API 호출 기록
export const recordApiCall = (apiName) => {
  try {
    const stats = checkAndResetStats()
    if (stats.hasOwnProperty(apiName)) {
      stats[apiName] += 1
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
      
      // 임계값 체크 및 경고
      checkThresholdWarning(stats)
    }
  } catch (err) {
    // 실패해도 무시 (통계 기록 실패는 치명적이지 않음)
  }
}

// 임계값 초과 경고 체크
const checkThresholdWarning = (stats) => {
  const today = getTodayString()
  const warningShown = localStorage.getItem(WARNING_SHOWN_KEY)
  
  // 오늘 이미 경고를 표시했으면 건너뛰기
  if (warningShown === today) return
  
  // 총 API 호출 수 계산 (페이지 제외)
  const totalCalls = Object.entries(stats)
    .filter(([key]) => key !== 'pages')
    .reduce((sum, [, count]) => sum + (typeof count === 'number' ? count : 0), 0)
  
  // 임계값 초과 체크
  if (totalCalls >= API_THRESHOLDS.total) {
    console.warn(`[API 사용량 경고] 오늘 총 ${totalCalls}회의 API 호출이 발생했습니다.`)
    localStorage.setItem(WARNING_SHOWN_KEY, today)
  }
  
  // 단일 API 임계값 초과 체크
  Object.entries(stats).forEach(([key, count]) => {
    if (key !== 'pages' && typeof count === 'number' && count >= API_THRESHOLDS.single) {
      console.warn(`[API 사용량 경고] ${key} API가 ${count}회 호출되었습니다.`)
    }
  })
}

// 페이지 방문 기록
export const recordPageVisit = (pageName) => {
  try {
    const stats = checkAndResetStats()
    if (stats.pages && stats.pages.hasOwnProperty(pageName)) {
      stats.pages[pageName] += 1
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
    }
  } catch (err) {
    // 실패해도 무시
  }
}

// 통계 데이터 가져오기
export const getApiStats = () => {
  return checkAndResetStats()
}

// 통계 데이터 리셋
export const resetApiStats = () => {
  try {
    const today = getTodayString()
    localStorage.setItem(DATE_KEY, today)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initStats()))
    return initStats()
  } catch (err) {
    return initStats()
  }
}

// API별 한글 이름
export const API_NAMES = {
  travel: '관광지',
  festival: '축제/행사',
  food: '맛집',
  culture: '문화시설',
  medical: '의료시설',
  shopping: '쇼핑',
  accommodation: '숙박',
  parking: '주차장',
  tourapi: 'TourAPI',
  kakao: '카카오',
  odsay: 'ODSay'
}

// 페이지별 한글 이름
export const PAGE_NAMES = {
  home: '홈',
  travel: '관광지',
  festival: '축제/행사',
  food: '맛집',
  culture: '문화시설',
  medical: '의료시설',
  shopping: '쇼핑',
  accommodation: '숙박',
  parking: '주차장',
  map: '지도',
  search: '검색',
  'my-trip': '나의여행'
}

// 가장 많이 호출된 API 찾기
export const getMostCalledApi = () => {
  const stats = checkAndResetStats()
  let maxCalls = 0
  let maxApi = null
  
  Object.entries(API_NAMES).forEach(([key, name]) => {
    if (stats[key] > maxCalls) {
      maxCalls = stats[key]
      maxApi = { key, name, count: maxCalls }
    }
  })
  
  return maxApi
}

// 가장 많이 방문한 페이지 찾기
export const getMostVisitedPage = () => {
  const stats = checkAndResetStats()
  let maxVisits = 0
  let maxPage = null
  
  Object.entries(PAGE_NAMES).forEach(([key, name]) => {
    if (stats.pages && stats.pages[key] > maxVisits) {
      maxVisits = stats.pages[key]
      maxPage = { key, name, count: maxVisits }
    }
  })
  
  return maxPage
}
// 총 API 호출 수 가져오기
export const getTotalApiCalls = () => {
  const stats = checkAndResetStats()
  return Object.entries(stats)
    .filter(([key]) => key !== 'pages')
    .reduce((sum, [, count]) => sum + (typeof count === 'number' ? count : 0), 0)
}

// API 사용량 요약 가져오기
export const getApiUsageSummary = () => {
  const stats = checkAndResetStats()
  const totalCalls = getTotalApiCalls()
  
  return {
    total: totalCalls,
    threshold: API_THRESHOLDS.total,
    percentUsed: Math.round((totalCalls / API_THRESHOLDS.total) * 100),
    isWarning: totalCalls >= API_THRESHOLDS.total * 0.8, // 80% 이상이면 경고
    isExceeded: totalCalls >= API_THRESHOLDS.total,
    byApi: Object.entries(stats)
      .filter(([key]) => key !== 'pages' && typeof stats[key] === 'number')
      .map(([key, count]) => ({
        name: API_NAMES[key] || key,
        count,
        percentOfTotal: totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
  }
}