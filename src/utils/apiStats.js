// API 호출 통계 관리 유틸리티
const STORAGE_KEY = 'api_call_stats'
const DATE_KEY = 'api_stats_date'

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
  const savedDate = localStorage.getItem(DATE_KEY)
  const today = getTodayString()
  
  if (savedDate !== today) {
    // 날짜가 다르면 통계 리셋
    localStorage.setItem(DATE_KEY, today)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initStats()))
    return initStats()
  }
  
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved ? JSON.parse(saved) : initStats()
}

// API 호출 기록
export const recordApiCall = (apiName) => {
  const stats = checkAndResetStats()
  if (stats.hasOwnProperty(apiName)) {
    stats[apiName] += 1
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  }
}

// 페이지 방문 기록
export const recordPageVisit = (pageName) => {
  const stats = checkAndResetStats()
  if (stats.pages && stats.pages.hasOwnProperty(pageName)) {
    stats.pages[pageName] += 1
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  }
}

// 통계 데이터 가져오기
export const getApiStats = () => {
  return checkAndResetStats()
}

// 통계 데이터 리셋
export const resetApiStats = () => {
  const today = getTodayString()
  localStorage.setItem(DATE_KEY, today)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initStats()))
  return initStats()
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
  parking: '주차장'
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
