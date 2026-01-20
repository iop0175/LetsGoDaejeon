// Supabase 데이터베이스에서 데이터 가져오기
import { supabase } from './supabase'

// 테이블 설정
const TABLE_CONFIGS = {
  travel: {
    tableName: 'travel_spots',
    uniqueField: 'tourspotNm'
  },
  festival: {
    tableName: 'festivals',
    uniqueField: 'title'
  },
  food: {
    tableName: 'restaurants',
    uniqueField: 'restrntNm'
  },
  culture: {
    tableName: 'cultural_facilities',
    uniqueField: 'fcltyNm'
  },
  medical: {
    tableName: 'medical_facilities',
    uniqueField: 'hsptlNm'
  },
  shopping: {
    tableName: 'shopping_places',
    uniqueField: 'shppgNm'
  },
  accommodation: {
    tableName: 'accommodations',
    uniqueField: 'romsNm'
  },
  parking: {
    tableName: 'parking_lots',
    uniqueField: 'name'
  }
}

/**
 * 데이터베이스에서 데이터 개수 가져오기
 * @param {string} pageType - 페이지 타입 (travel, festival, food 등)
 * @returns {Promise<number>} 데이터 개수
 */
export const getDbCount = async (pageType) => {
  const config = TABLE_CONFIGS[pageType]
  if (!config) return 0
  
  try {
    const { count, error } = await supabase
      .from(config.tableName)
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error(`DB 카운트 조회 오류 (${pageType}):`, error)
      return 0
    }
    
    return count || 0
  } catch (err) {
    console.error(`DB 카운트 조회 실패 (${pageType}):`, err)
    return 0
  }
}

/**
 * 모든 페이지 타입의 DB 데이터 개수 가져오기
 * @returns {Promise<Object>} 각 페이지 타입별 개수
 */
export const getAllDbCounts = async () => {
  const counts = {}
  
  for (const pageType of Object.keys(TABLE_CONFIGS)) {
    counts[pageType] = await getDbCount(pageType)
  }
  
  return counts
}

/**
 * 데이터베이스에서 페이지네이션된 데이터 가져오기
 * @param {string} pageType - 페이지 타입
 * @param {number} page - 페이지 번호 (1부터 시작)
 * @param {number} pageSize - 페이지당 항목 수
 * @returns {Promise<Object>} { success, items, totalCount }
 */
export const getDbData = async (pageType, page = 1, pageSize = 20) => {
  const config = TABLE_CONFIGS[pageType]
  if (!config) {
    return { success: false, items: [], totalCount: 0 }
  }
  
  try {
    // 전체 개수 조회
    const { count: totalCount, error: countError } = await supabase
      .from(config.tableName)
      .select('*', { count: 'exact', head: true })
    
    if (countError) throw countError
    
    // 페이지네이션된 데이터 조회
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    const { data, error } = await supabase
      .from(config.tableName)
      .select('*')
      .range(from, to)
      .order('saved_at', { ascending: false })
    
    if (error) throw error
    
    // raw_data가 있으면 그것을 반환, 없으면 원본 데이터 반환
    // imageUrl, image_author, image_source는 테이블 컬럼에서 가져옴
    const items = (data || []).map(item => {
      if (item.raw_data && typeof item.raw_data === 'object') {
        return { 
          ...item.raw_data, 
          _id: item.id, 
          _saved_at: item.saved_at,
          imageUrl: item.imageUrl || item.raw_data?.imageUrl,
          image_author: item.image_author || item.raw_data?.image_author,
          image_source: item.image_source || item.raw_data?.image_source
        }
      }
      return item
    })
    
    return {
      success: true,
      items,
      totalCount: totalCount || 0
    }
  } catch (err) {
    console.error(`DB 데이터 조회 실패 (${pageType}):`, err)
    return { success: false, items: [], totalCount: 0 }
  }
}

/**
 * 데이터베이스에서 모든 데이터 가져오기 (필터링 없이)
 * @param {string} pageType - 페이지 타입
 * @param {number} limit - 최대 가져올 개수 (기본 1000)
 * @returns {Promise<Object>} { success, items, totalCount }
 */
export const getAllDbData = async (pageType, limit = 1000) => {
  const config = TABLE_CONFIGS[pageType]
  if (!config) {
    return { success: false, items: [], totalCount: 0 }
  }
  
  try {
    const { data, error, count } = await supabase
      .from(config.tableName)
      .select('*', { count: 'exact' })
      .limit(limit)
    
    if (error) throw error
    
    // raw_data가 있으면 그것을 반환, 없으면 원본 데이터 반환
    // imageUrl, image_author, image_source는 테이블 컬럼에서 가져옴
    const items = (data || []).map(item => {
      if (item.raw_data && typeof item.raw_data === 'object') {
        return { 
          ...item.raw_data, 
          _id: item.id, 
          _saved_at: item.saved_at,
          imageUrl: item.imageUrl || item.raw_data?.imageUrl,
          image_author: item.image_author || item.raw_data?.image_author,
          image_source: item.image_source || item.raw_data?.image_source
        }
      }
      return item
    })
    
    return {
      success: true,
      items,
      totalCount: count || items.length
    }
  } catch (err) {
    console.error(`DB 전체 데이터 조회 실패 (${pageType}):`, err)
    return { success: false, items: [], totalCount: 0 }
  }
}

/**
 * DB에 데이터가 있는지 확인
 * @param {string} pageType - 페이지 타입
 * @returns {Promise<boolean>} 데이터 존재 여부
 */
export const hasDbData = async (pageType) => {
  const count = await getDbCount(pageType)
  return count > 0
}

// ============================================================
// CRUD 함수들
// ============================================================

/**
 * 데이터베이스에서 단일 아이템 조회
 * @param {string} pageType - 페이지 타입
 * @param {number} id - 아이템 ID
 * @returns {Promise<Object>} { success, item }
 */
export const getDbItem = async (pageType, id) => {
  const config = TABLE_CONFIGS[pageType]
  if (!config) {
    return { success: false, item: null }
  }
  
  try {
    const { data, error } = await supabase
      .from(config.tableName)
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    return { success: true, item: data }
  } catch (err) {
    console.error(`DB 아이템 조회 실패 (${pageType}):`, err)
    return { success: false, item: null }
  }
}

/**
 * 데이터베이스에서 아이템 수정
 * @param {string} pageType - 페이지 타입
 * @param {number} id - 아이템 ID
 * @param {Object} updates - 수정할 필드들
 * @returns {Promise<Object>} { success, error }
 */
export const updateDbItem = async (pageType, id, updates) => {
  const config = TABLE_CONFIGS[pageType]
  if (!config) {
    return { success: false, error: '알 수 없는 페이지 타입입니다.' }
  }
  
  try {
    // updates 데이터만 사용 (updated_at은 테이블에 컬럼이 있을 경우 트리거로 자동 업데이트)
    const updateData = { ...updates }
    
    const { error } = await supabase
      .from(config.tableName)
      .update(updateData)
      .eq('id', id)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    console.error(`DB 아이템 수정 실패 (${pageType}):`, err)
    return { success: false, error: err.message }
  }
}

/**
 * 데이터베이스에서 아이템 삭제
 * @param {string} pageType - 페이지 타입
 * @param {number} id - 아이템 ID
 * @returns {Promise<Object>} { success, error }
 */
export const deleteDbItem = async (pageType, id) => {
  const config = TABLE_CONFIGS[pageType]
  if (!config) {
    return { success: false, error: '알 수 없는 페이지 타입입니다.' }
  }
  
  try {
    const { error } = await supabase
      .from(config.tableName)
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    console.error(`DB 아이템 삭제 실패 (${pageType}):`, err)
    return { success: false, error: err.message }
  }
}

/**
 * 데이터베이스에서 여러 아이템 삭제
 * @param {string} pageType - 페이지 타입
 * @param {Array<number>} ids - 삭제할 아이템 ID 배열
 * @returns {Promise<Object>} { success, error, deletedCount }
 */
export const deleteDbItems = async (pageType, ids) => {
  const config = TABLE_CONFIGS[pageType]
  if (!config) {
    return { success: false, error: '알 수 없는 페이지 타입입니다.', deletedCount: 0 }
  }
  
  try {
    const { error, count } = await supabase
      .from(config.tableName)
      .delete()
      .in('id', ids)
    
    if (error) throw error
    
    return { success: true, deletedCount: count || ids.length }
  } catch (err) {
    console.error(`DB 아이템 일괄 삭제 실패 (${pageType}):`, err)
    return { success: false, error: err.message, deletedCount: 0 }
  }
}

// ============================================================
// Hero 슬라이드 관련 함수들
// ============================================================

/**
 * 모든 히어로 슬라이드 가져오기
 * @param {boolean} activeOnly - 활성화된 슬라이드만 가져올지 여부
 * @returns {Promise<Object>} { success, items }
 */
export const getHeroSlides = async (activeOnly = false) => {
  try {
    let query = supabase
      .from('hero_slides')
      .select('*')
      .order('sort_order', { ascending: true })
    
    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return { success: true, items: data || [] }
  } catch (err) {
    console.error('히어로 슬라이드 조회 실패:', err)
    return { success: false, items: [] }
  }
}

/**
 * 히어로 슬라이드 추가
 * @param {Object} slide - 슬라이드 데이터
 * @returns {Promise<Object>} { success, item, error }
 */
export const createHeroSlide = async (slide) => {
  try {
    const { data, error } = await supabase
      .from('hero_slides')
      .insert([slide])
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, item: data }
  } catch (err) {
    console.error('히어로 슬라이드 추가 실패:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 히어로 슬라이드 수정
 * @param {number} id - 슬라이드 ID
 * @param {Object} updates - 수정할 데이터
 * @returns {Promise<Object>} { success, error }
 */
export const updateHeroSlide = async (id, updates) => {
  try {
    const updateData = { ...updates, updated_at: new Date().toISOString() }
    
    const { error } = await supabase
      .from('hero_slides')
      .update(updateData)
      .eq('id', id)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    console.error('히어로 슬라이드 수정 실패:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 히어로 슬라이드 삭제
 * @param {number} id - 슬라이드 ID
 * @returns {Promise<Object>} { success, error }
 */
export const deleteHeroSlide = async (id) => {
  try {
    const { error } = await supabase
      .from('hero_slides')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    console.error('히어로 슬라이드 삭제 실패:', err)
    return { success: false, error: err.message }
  }
}

// ============================================================
// Supabase 사용량 통계
// ============================================================

// Supabase Free Plan 한도 (2024년 기준)
const SUPABASE_FREE_LIMITS = {
  database: {
    storage: 500 * 1024 * 1024, // 500 MB
    bandwidth: 2 * 1024 * 1024 * 1024, // 2 GB (월간)
  },
  api: {
    requests: 50000, // 월간 API 요청 수 (대략적)
  },
  rows: {
    max: 50000, // 대략적인 행 수 권장 한도
  }
}

/**
 * Supabase 데이터베이스 사용량 통계 가져오기
 * @returns {Promise<Object>} 사용량 통계
 */
export const getSupabaseUsageStats = async () => {
  try {
    const stats = {
      tables: {},
      totalRows: 0,
      estimatedStorageMB: 0,
      limits: SUPABASE_FREE_LIMITS
    }
    
    // 모든 테이블의 행 수 조회
    const allTables = [
      ...Object.values(TABLE_CONFIGS).map(c => c.tableName),
      'hero_slides',
      'page_visits'
    ]
    
    for (const tableName of allTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
        
        if (!error) {
          const rowCount = count || 0
          stats.tables[tableName] = {
            rows: rowCount,
            // 대략적인 저장 용량 추정 (평균 1KB/행으로 가정)
            estimatedSizeKB: rowCount * 1
          }
          stats.totalRows += rowCount
        }
      } catch (err) {
        console.warn(`테이블 ${tableName} 조회 실패:`, err)
        stats.tables[tableName] = { rows: 0, estimatedSizeKB: 0 }
      }
    }
    
    // 총 예상 저장 용량 (MB)
    stats.estimatedStorageMB = (stats.totalRows * 1) / 1024
    
    // 사용률 계산
    stats.usage = {
      rowsPercent: Math.min(100, (stats.totalRows / SUPABASE_FREE_LIMITS.rows.max) * 100),
      storagePercent: Math.min(100, (stats.estimatedStorageMB / (SUPABASE_FREE_LIMITS.database.storage / 1024 / 1024)) * 100)
    }
    
    return { success: true, stats }
  } catch (err) {
    console.error('Supabase 사용량 통계 조회 실패:', err)
    return { success: false, stats: null, error: err.message }
  }
}

// ============================================================
// 페이지 방문 통계
// ============================================================

/**
 * 페이지 방문 기록 (DB에 저장)
 * @param {string} pageName - 페이지 이름
 */
export const recordPageVisitDB = async (pageName) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // upsert: 오늘 날짜의 기록이 있으면 count 증가, 없으면 새로 생성
    const { data: existing } = await supabase
      .from('page_visits')
      .select('id, visit_count')
      .eq('page_name', pageName)
      .eq('visit_date', today)
      .single()
    
    if (existing) {
      // 기존 레코드 업데이트
      await supabase
        .from('page_visits')
        .update({ 
          visit_count: existing.visit_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      // 새 레코드 삽입
      await supabase
        .from('page_visits')
        .insert([{ 
          page_name: pageName, 
          visit_date: today,
          visit_count: 1 
        }])
    }
  } catch (err) {
    console.error('페이지 방문 기록 실패:', err)
  }
}

/**
 * 페이지별 방문 통계 가져오기 (전체 기간)
 * @returns {Promise<Object>} { success, stats }
 */
export const getPageVisitStats = async () => {
  try {
    const { data, error } = await supabase
      .from('page_visits')
      .select('page_name, visit_count')
    
    if (error) throw error
    
    // 페이지별로 합계 계산
    const stats = {}
    data.forEach(item => {
      if (!stats[item.page_name]) {
        stats[item.page_name] = 0
      }
      stats[item.page_name] += item.visit_count
    })
    
    return { success: true, stats }
  } catch (err) {
    console.error('페이지 방문 통계 조회 실패:', err)
    return { success: false, stats: {} }
  }
}

/**
 * 기간별 페이지 방문 통계 가져오기
 * @param {string} period - 기간 (all, year, month, week, day)
 * @returns {Promise<Object>} { success, stats }
 */
export const getPageVisitStatsByPeriod = async (period = 'all') => {
  try {
    let startDate = null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    switch (period) {
      case 'day':
        startDate = today.toISOString().split('T')[0]
        break
      case 'week':
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        startDate = weekAgo.toISOString().split('T')[0]
        break
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        startDate = monthAgo.toISOString().split('T')[0]
        break
      case 'year':
        const yearAgo = new Date(today)
        yearAgo.setFullYear(yearAgo.getFullYear() - 1)
        startDate = yearAgo.toISOString().split('T')[0]
        break
      case 'all':
      default:
        // 전체 기간
        break
    }
    
    let query = supabase
      .from('page_visits')
      .select('page_name, visit_count')
    
    if (startDate) {
      query = query.gte('visit_date', startDate)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    // 페이지별로 합계 계산
    const stats = {}
    data.forEach(item => {
      if (!stats[item.page_name]) {
        stats[item.page_name] = 0
      }
      stats[item.page_name] += item.visit_count
    })
    
    return { success: true, stats }
  } catch (err) {
    console.error('기간별 방문 통계 조회 실패:', err)
    return { success: false, stats: {} }
  }
}

/**
 * 오늘의 페이지별 방문 통계 가져오기
 * @returns {Promise<Object>} { success, stats }
 */
export const getTodayPageVisitStats = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('page_visits')
      .select('page_name, visit_count')
      .eq('visit_date', today)
    
    if (error) throw error
    
    const stats = {}
    data.forEach(item => {
      stats[item.page_name] = item.visit_count
    })
    
    return { success: true, stats }
  } catch (err) {
    console.error('오늘 방문 통계 조회 실패:', err)
    return { success: false, stats: {} }
  }
}

/**
 * 최근 N일간 방문 통계 가져오기
 * @param {number} days - 일 수 (기본 7일)
 * @returns {Promise<Object>} { success, data }
 */
export const getRecentPageVisitStats = async (days = 7) => {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('page_visits')
      .select('*')
      .gte('visit_date', startDateStr)
      .order('visit_date', { ascending: true })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (err) {
    console.error('최근 방문 통계 조회 실패:', err)
    return { success: false, data: [] }
  }
}

/**
 * 가장 많이 방문한 페이지 가져오기
 * @returns {Promise<Object>} { success, page, count }
 */
export const getMostVisitedPageDB = async () => {
  try {
    const { success, stats } = await getPageVisitStats()
    if (!success) return { success: false, page: null, count: 0 }
    
    let maxPage = null
    let maxCount = 0
    
    Object.entries(stats).forEach(([page, count]) => {
      if (count > maxCount) {
        maxCount = count
        maxPage = page
      }
    })
    
    return { success: true, page: maxPage, count: maxCount }
  } catch (err) {
    console.error('최다 방문 페이지 조회 실패:', err)
    return { success: false, page: null, count: 0 }
  }
}

// ============================================================
// 검색 기록 통계
// ============================================================

/**
 * 검색 기록 저장 (DB)
 * @param {string} query - 검색어
 */
export const recordSearchQuery = async (query) => {
  if (!query || query.trim().length === 0) return
  
  const searchQuery = query.trim().toLowerCase()
  
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // 오늘 같은 검색어가 있는지 확인
    const { data: existing } = await supabase
      .from('search_logs')
      .select('id, search_count')
      .eq('search_query', searchQuery)
      .eq('search_date', today)
      .single()
    
    if (existing) {
      // 기존 레코드 업데이트
      await supabase
        .from('search_logs')
        .update({ 
          search_count: existing.search_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      // 새 레코드 삽입
      await supabase
        .from('search_logs')
        .insert([{ 
          search_query: searchQuery, 
          search_date: today,
          search_count: 1 
        }])
    }
  } catch (err) {
    console.error('검색 기록 저장 실패:', err)
  }
}

/**
 * 인기 검색어 가져오기 (전체 기간)
 * @param {number} limit - 가져올 개수
 * @returns {Promise<Object>} { success, items }
 */
export const getPopularSearchQueries = async (limit = 10) => {
  try {
    // 검색어별로 합계 계산
    const { data, error } = await supabase
      .from('search_logs')
      .select('search_query, search_count')
    
    if (error) throw error
    
    // 검색어별 합계 계산
    const queryMap = {}
    data.forEach(item => {
      if (!queryMap[item.search_query]) {
        queryMap[item.search_query] = 0
      }
      queryMap[item.search_query] += item.search_count
    })
    
    // 정렬하여 상위 N개 반환
    const sorted = Object.entries(queryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query, count]) => ({ query, count }))
    
    return { success: true, items: sorted }
  } catch (err) {
    console.error('인기 검색어 조회 실패:', err)
    return { success: false, items: [] }
  }
}

/**
 * 오늘의 인기 검색어 가져오기
 * @param {number} limit - 가져올 개수
 * @returns {Promise<Object>} { success, items }
 */
export const getTodayPopularSearchQueries = async (limit = 10) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('search_logs')
      .select('search_query, search_count')
      .eq('search_date', today)
      .order('search_count', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    const items = data.map(item => ({
      query: item.search_query,
      count: item.search_count
    }))
    
    return { success: true, items }
  } catch (err) {
    console.error('오늘 인기 검색어 조회 실패:', err)
    return { success: false, items: [] }
  }
}

/**
 * 검색 통계 요약 가져오기
 * @returns {Promise<Object>} { success, totalSearches, uniqueQueries, topQuery }
 */
export const getSearchStats = async () => {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select('search_query, search_count')
    
    if (error) throw error
    
    // 총 검색 횟수
    const totalSearches = data.reduce((sum, item) => sum + item.search_count, 0)
    
    // 고유 검색어 수
    const uniqueQueries = new Set(data.map(item => item.search_query)).size
    
    // 최다 검색어
    const queryMap = {}
    data.forEach(item => {
      if (!queryMap[item.search_query]) {
        queryMap[item.search_query] = 0
      }
      queryMap[item.search_query] += item.search_count
    })
    
    let topQuery = null
    let topCount = 0
    Object.entries(queryMap).forEach(([query, count]) => {
      if (count > topCount) {
        topCount = count
        topQuery = { query, count }
      }
    })
    
    return { success: true, totalSearches, uniqueQueries, topQuery }
  } catch (err) {
    console.error('검색 통계 조회 실패:', err)
    return { success: false, totalSearches: 0, uniqueQueries: 0, topQuery: null }
  }
}

export { TABLE_CONFIGS }

