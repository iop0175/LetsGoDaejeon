// Supabase 데이터베이스에서 데이터 가져오기
import { supabase } from './supabase'

// 테이블 설정 (TourAPI에 없는 데이터만 유지)
const TABLE_CONFIGS = {
  medical: {
    tableName: 'medical_facilities',
    uniqueField: 'hsptlNm'
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

      return 0
    }
    
    return count || 0
  } catch (err) {

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
export const getDbData = async (pageType, page = 1, pageSize = 20, searchQuery = '') => {
  const config = TABLE_CONFIGS[pageType]
  if (!config) {
    return { success: false, items: [], totalCount: 0 }
  }
  
  try {
    // 검색 필드 결정 (각 테이블의 주요 필드)
    const searchFields = {
      medical: ['hsptlNm', 'locplc', 'hsptlKnd'],
      parking: ['pkParkNm', 'pkAddr']
    }
    
    // 전체 개수 조회 (검색 필터 적용)
    let countQuery = supabase
      .from(config.tableName)
      .select('*', { count: 'exact', head: true })
    
    // 검색어가 있으면 필터 적용
    if (searchQuery && searchQuery.trim()) {
      const fields = searchFields[pageType] || []
      if (fields.length > 0) {
        // OR 조건으로 여러 필드 검색
        const orConditions = fields.map(field => `${field}.ilike.%${searchQuery}%`).join(',')
        countQuery = countQuery.or(orConditions)
      }
    }
    
    const { count: totalCount, error: countError } = await countQuery
    
    if (countError) throw countError
    
    // 페이지네이션된 데이터 조회
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    let dataQuery = supabase
      .from(config.tableName)
      .select('*')
    
    // 검색어가 있으면 필터 적용
    if (searchQuery && searchQuery.trim()) {
      const fields = searchFields[pageType] || []
      if (fields.length > 0) {
        const orConditions = fields.map(field => `${field}.ilike.%${searchQuery}%`).join(',')
        dataQuery = dataQuery.or(orConditions)
      }
    }
    
    const { data, error } = await dataQuery
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
    
    // 단순 upsert로 처리 (RLS 정책이 없으면 실패할 수 있음)
    const { error: upsertError } = await supabase
      .from('page_visits')
      .upsert(
        { 
          page_name: pageName, 
          visit_date: today,
          visit_count: 1 
        }, 
        { 
          onConflict: 'page_name,visit_date',
          ignoreDuplicates: true  // 중복 시 무시
        }
      )
    
    // 에러 발생 시 조용히 무시 (콘솔에도 출력하지 않음)
    // 페이지 방문 통계는 핵심 기능이 아니므로 실패해도 무방
    if (upsertError) {
      // 개발 환경에서만 debug 로그
      if (import.meta.env.DEV) {
        console.debug('[PageVisit] Skipped:', upsertError.code)
      }
    }
  } catch (err) {
    // 완전히 무시 - 사용자 경험에 영향 없음
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

    return { success: false, totalSearches: 0, uniqueQueries: 0, topQuery: null }
  }
}

// ============================================================
// 경로 캐시 관련 함수
// API 호출을 최소화하기 위해 경로 정보를 DB에 캐싱
// ============================================================

/**
 * 좌표를 소수점 4자리로 반올림 (약 11m 오차 허용)
 */
const roundCoord = (coord) => Math.round(coord * 10000) / 10000

/**
 * 캐시에서 경로 정보 조회
 * @param {Object} origin - 출발지 { lat, lng }
 * @param {Object} dest - 도착지 { lat, lng }
 * @param {string} transportType - 이동수단 (car, bus, subway, walk)
 * @returns {Promise<Object|null>} 캐시된 경로 정보 또는 null
 */
export const getRouteFromCache = async (origin, dest, transportType) => {
  try {
    const originLat = roundCoord(origin.lat)
    const originLng = roundCoord(origin.lng)
    const destLat = roundCoord(dest.lat)
    const destLng = roundCoord(dest.lng)
    
    const { data, error } = await supabase
      .from('route_cache')
      .select('*')
      .eq('origin_lat', originLat)
      .eq('origin_lng', originLng)
      .eq('dest_lat', destLat)
      .eq('dest_lng', destLng)
      .eq('transport_type', transportType)
      .maybeSingle() // single() 대신 maybeSingle() 사용 - 결과가 없어도 에러 발생하지 않음
    
    if (error) {

      return null
    }
    
    // 캐시 히트 - hit_count 증가
    if (data) {
      supabase
        .from('route_cache')
        .update({ hit_count: (data.hit_count || 0) + 1 })
        .eq('id', data.id)
        .then(() => {})
        .catch(() => {})
      
      return {
        success: true,
        fromCache: true,
        duration: data.duration,
        distance: data.distance,
        payment: data.payment,
        routeDetails: data.route_details,
        allRoutes: data.all_routes,
        path: data.path_data,
        isEstimate: data.is_estimate,
        noRoute: data.no_route
      }
    }
    
    return null
  } catch (err) {

    return null
  }
}

/**
 * 경로 정보를 캐시에 저장
 * @param {Object} origin - 출발지 { lat, lng }
 * @param {Object} dest - 도착지 { lat, lng }
 * @param {string} transportType - 이동수단
 * @param {Object} routeData - 저장할 경로 데이터
 * @returns {Promise<boolean>} 저장 성공 여부
 */
export const saveRouteToCache = async (origin, dest, transportType, routeData) => {
  try {
    const originLat = roundCoord(origin.lat)
    const originLng = roundCoord(origin.lng)
    const destLat = roundCoord(dest.lat)
    const destLng = roundCoord(dest.lng)
    
    const cacheEntry = {
      origin_lat: originLat,
      origin_lng: originLng,
      dest_lat: destLat,
      dest_lng: destLng,
      transport_type: transportType,
      duration: routeData.duration ? Math.round(routeData.duration) : null,
      distance: routeData.distance ? Math.round(routeData.distance) : null, // 소수점 반올림
      payment: routeData.payment ? Math.round(routeData.payment) : null,
      route_details: routeData.routeDetails || null,
      all_routes: routeData.allRoutes || null,
      path_data: routeData.path || null,
      is_estimate: routeData.isEstimate || false,
      no_route: routeData.noRoute || false
    }
    
    // upsert: 있으면 업데이트, 없으면 삽입
    const { error } = await supabase
      .from('route_cache')
      .upsert(cacheEntry, {
        onConflict: 'origin_lat,origin_lng,dest_lat,dest_lng,transport_type'
      })
    
    if (error) {

      return false
    }
    
    return true
  } catch (err) {

    return false
  }
}

/**
 * 특정 경로의 캐시 삭제 (경로 정보 갱신 시)
 * @param {Object} origin - 출발지 { lat, lng }
 * @param {Object} dest - 도착지 { lat, lng }
 * @param {string} transportType - 이동수단 (선택, 없으면 모든 이동수단)
 * @returns {Promise<boolean>} 삭제 성공 여부
 */
export const deleteRouteCache = async (origin, dest, transportType = null) => {
  try {
    const originLat = roundCoord(origin.lat)
    const originLng = roundCoord(origin.lng)
    const destLat = roundCoord(dest.lat)
    const destLng = roundCoord(dest.lng)
    
    let query = supabase
      .from('route_cache')
      .delete()
      .eq('origin_lat', originLat)
      .eq('origin_lng', originLng)
      .eq('dest_lat', destLat)
      .eq('dest_lng', destLng)
    
    if (transportType) {
      query = query.eq('transport_type', transportType)
    }
    
    const { error } = await query
    
    if (error) {

      return false
    }
    
    return true
  } catch (err) {

    return false
  }
}

/**
 * 캐시 통계 조회
 * @returns {Promise<Object>} { totalCached, hitCount, oldestCache }
 */
export const getRouteCacheStats = async () => {
  try {
    // 전체 캐시 수
    const { count: totalCached, error: countError } = await supabase
      .from('route_cache')
      .select('*', { count: 'exact', head: true })
    
    if (countError) throw countError
    
    // 총 히트 수
    const { data: hitData, error: hitError } = await supabase
      .from('route_cache')
      .select('hit_count')
    
    if (hitError) throw hitError
    
    const totalHits = hitData.reduce((sum, item) => sum + (item.hit_count || 0), 0)
    
    // 가장 오래된 캐시
    const { data: oldestData, error: oldestError } = await supabase
      .from('route_cache')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    
    return {
      success: true,
      totalCached: totalCached || 0,
      totalHits,
      oldestCache: oldestData?.created_at || null
    }
  } catch (err) {

    return { success: false, totalCached: 0, totalHits: 0, oldestCache: null }
  }
}

// ============================================================
// 좌표 캐시 관련 함수
// 주소 → 좌표 변환 결과를 DB에 캐싱
// ============================================================

/**
 * 주소를 정규화 (캐시 키로 사용)
 */
const normalizeAddress = (address) => {
  return address
    .trim()
    .replace(/\s+/g, ' ') // 여러 공백을 하나로
    .toLowerCase()
}

/**
 * 캐시에서 좌표 정보 조회
 * @param {string} address - 검색할 주소
 * @returns {Promise<Object|null>} 캐시된 좌표 정보 또는 null
 */
export const getCoordinateFromCache = async (address) => {
  try {
    const normalizedAddr = normalizeAddress(address)
    
    const { data, error } = await supabase
      .from('coordinate_cache')
      .select('*')
      .eq('address', normalizedAddr)
      .maybeSingle()
    
    if (error) {

      return null
    }
    
    if (data) {
      // 캐시 히트 - hit_count 증가 (비동기)
      supabase
        .from('coordinate_cache')
        .update({ hit_count: (data.hit_count || 0) + 1 })
        .eq('id', data.id)
        .then(() => {})
        .catch(() => {})
      
      return {
        success: true,
        fromCache: true,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        placeName: data.place_name
      }
    }
    
    return null
  } catch (err) {

    return null
  }
}

/**
 * 좌표 정보를 캐시에 저장
 * @param {string} address - 검색 주소
 * @param {number} lat - 위도
 * @param {number} lng - 경도
 * @param {string} placeName - 장소명 (선택)
 * @returns {Promise<boolean>} 저장 성공 여부
 */
export const saveCoordinateToCache = async (address, lat, lng, placeName = null) => {
  try {
    const normalizedAddr = normalizeAddress(address)
    
    const cacheEntry = {
      address: normalizedAddr,
      lat,
      lng,
      place_name: placeName
    }
    
    const { error } = await supabase
      .from('coordinate_cache')
      .upsert(cacheEntry, {
        onConflict: 'address'
      })
    
    if (error) {

      return false
    }
    
    return true
  } catch (err) {

    return false
  }
}

// ============================================================
// API 호출 로그 관련 함수
// 모든 외부 API 호출을 기록하고 통계 제공
// ============================================================

/**
 * 세션 ID 생성 또는 가져오기 (익명 사용자 추적용)
 */
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('api_session_id')
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    sessionStorage.setItem('api_session_id', sessionId)
  }
  return sessionId
}

/**
 * 현재 사용자 ID 가져오기 (로그인한 경우)
 */
const getCurrentUserId = () => {
  const session = supabase.auth.getSession()
  return session?.data?.session?.user?.id || null
}

/**
 * API 호출 로그 기록
 * @param {Object} logData - 로그 데이터
 * @param {string} logData.apiType - API 종류 (kakao_geocoding, kakao_route, odsay_transit, tour_api, kto_photo)
 * @param {string} logData.endpoint - 호출 엔드포인트
 * @param {Object} logData.requestParams - 요청 파라미터
 * @param {string} logData.responseStatus - 응답 상태 (success, fail, error)
 * @param {number} logData.responseCode - HTTP 상태 코드
 * @param {string} logData.responseMessage - 에러 메시지 (실패 시)
 * @param {string} logData.pageName - 호출 페이지
 * @param {number} logData.responseTimeMs - 응답 시간 (ms)
 * @param {boolean} logData.fromCache - 캐시 히트 여부
 * @returns {Promise<boolean>} 저장 성공 여부
 */
export const recordApiCall = async (logData) => {
  try {
    const entry = {
      api_type: logData.apiType,
      endpoint: logData.endpoint || null,
      request_params: logData.requestParams || null,
      response_status: logData.responseStatus || 'success',
      response_code: logData.responseCode || null,
      response_message: logData.responseMessage || null,
      user_id: await getCurrentUserIdAsync(),
      session_id: getSessionId(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      page_name: logData.pageName || null,
      response_time_ms: logData.responseTimeMs || null,
      from_cache: logData.fromCache || false
    }
    
    // 비동기로 저장 (UI 블로킹 방지)
    supabase
      .from('api_call_logs')
      .insert(entry)
      .then(() => {})
      .catch(() => {})
    
    // 일별 통계도 업데이트
    updateApiDailyStat(logData.apiType, logData.responseStatus === 'success', logData.fromCache, logData.responseTimeMs)
    
    return true
  } catch (err) {

    return false
  }
}

/**
 * 현재 사용자 ID 비동기 가져오기
 */
const getCurrentUserIdAsync = async () => {
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session?.user?.id || null
  } catch {
    return null
  }
}

/**
 * 일별 API 통계 업데이트
 * @param {string} apiType - API 종류
 * @param {boolean} isSuccess - 성공 여부
 * @param {boolean} fromCache - 캐시 히트 여부
 * @param {number} responseTimeMs - 응답 시간
 */
const updateApiDailyStat = async (apiType, isSuccess, fromCache, responseTimeMs) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // 기존 통계 조회
    const { data: existing } = await supabase
      .from('api_daily_stats')
      .select('*')
      .eq('stat_date', today)
      .eq('api_type', apiType)
      .maybeSingle()
    
    if (existing) {
      // 기존 통계 업데이트
      const updates = {
        total_calls: (existing.total_calls || 0) + 1,
        success_calls: (existing.success_calls || 0) + (isSuccess ? 1 : 0),
        fail_calls: (existing.fail_calls || 0) + (isSuccess ? 0 : 1),
        cache_hits: (existing.cache_hits || 0) + (fromCache ? 1 : 0)
      }
      
      // 응답 시간 통계 업데이트
      if (responseTimeMs && !fromCache) {
        const totalPrevious = (existing.avg_response_time_ms || 0) * ((existing.total_calls || 1) - (existing.cache_hits || 0))
        const newTotal = totalPrevious + responseTimeMs
        const newCount = (existing.total_calls || 0) - (existing.cache_hits || 0) + 1
        updates.avg_response_time_ms = Math.round(newTotal / newCount)
        updates.max_response_time_ms = Math.max(existing.max_response_time_ms || 0, responseTimeMs)
      }
      
      await supabase
        .from('api_daily_stats')
        .update(updates)
        .eq('id', existing.id)
    } else {
      // 새 통계 생성
      await supabase
        .from('api_daily_stats')
        .insert({
          stat_date: today,
          api_type: apiType,
          total_calls: 1,
          success_calls: isSuccess ? 1 : 0,
          fail_calls: isSuccess ? 0 : 1,
          cache_hits: fromCache ? 1 : 0,
          avg_response_time_ms: fromCache ? null : responseTimeMs,
          max_response_time_ms: fromCache ? null : responseTimeMs
        })
    }
  } catch (err) {

  }
}

/**
 * 오늘의 API 호출 통계 조회
 * @returns {Promise<Object>} { success, stats: { apiType: { total, success, fail, cacheHits, avgTime } } }
 */
export const getTodayApiStats = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('api_daily_stats')
      .select('*')
      .eq('stat_date', today)
    
    if (error) throw error
    
    const stats = {}
    let totalCalls = 0
    let totalCacheHits = 0
    
    data.forEach(item => {
      stats[item.api_type] = {
        total: item.total_calls,
        success: item.success_calls,
        fail: item.fail_calls,
        cacheHits: item.cache_hits,
        avgTime: item.avg_response_time_ms,
        maxTime: item.max_response_time_ms
      }
      totalCalls += item.total_calls
      totalCacheHits += item.cache_hits
    })
    
    return {
      success: true,
      stats,
      summary: {
        totalCalls,
        totalCacheHits,
        cacheHitRate: totalCalls > 0 ? Math.round((totalCacheHits / totalCalls) * 100) : 0
      }
    }
  } catch (err) {

    return { success: false, stats: {}, summary: { totalCalls: 0, totalCacheHits: 0, cacheHitRate: 0 } }
  }
}

/**
 * 최근 N일간 API 호출 통계 조회
 * @param {number} days - 조회 일수 (기본 7일)
 * @returns {Promise<Object>} { success, data: [{ date, apiType, total, ... }] }
 */
export const getApiStatsByPeriod = async (days = 7) => {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const { data, error } = await supabase
      .from('api_daily_stats')
      .select('*')
      .gte('stat_date', startDate.toISOString().split('T')[0])
      .order('stat_date', { ascending: false })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (err) {

    return { success: false, data: [] }
  }
}

/**
 * 최근 API 호출 로그 조회 (상세)
 * @param {number} limit - 조회 개수 (기본 100)
 * @param {string} apiType - API 종류 필터 (선택)
 * @returns {Promise<Object>} { success, logs: [...] }
 */
export const getRecentApiLogs = async (limit = 100, apiType = null) => {
  try {
    let query = supabase
      .from('api_call_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (apiType) {
      query = query.eq('api_type', apiType)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return { success: true, logs: data }
  } catch (err) {

    return { success: false, logs: [] }
  }
}

/**
 * API 호출 통계 요약 (대시보드용)
 * @returns {Promise<Object>} 종합 통계
 */
export const getApiCallSummary = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    // 오늘 통계
    const { data: todayData } = await supabase
      .from('api_daily_stats')
      .select('total_calls, cache_hits')
      .eq('stat_date', today)
    
    const todayTotal = todayData?.reduce((sum, d) => sum + (d.total_calls || 0), 0) || 0
    const todayCacheHits = todayData?.reduce((sum, d) => sum + (d.cache_hits || 0), 0) || 0
    
    // 7일 통계
    const { data: weekData } = await supabase
      .from('api_daily_stats')
      .select('total_calls, cache_hits')
      .gte('stat_date', sevenDaysAgo.toISOString().split('T')[0])
    
    const weekTotal = weekData?.reduce((sum, d) => sum + (d.total_calls || 0), 0) || 0
    const weekCacheHits = weekData?.reduce((sum, d) => sum + (d.cache_hits || 0), 0) || 0
    
    // 가장 많이 호출된 API
    const { data: topApi } = await supabase
      .from('api_daily_stats')
      .select('api_type, total_calls')
      .eq('stat_date', today)
      .order('total_calls', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    return {
      success: true,
      today: {
        totalCalls: todayTotal,
        cacheHits: todayCacheHits,
        cacheHitRate: todayTotal > 0 ? Math.round((todayCacheHits / todayTotal) * 100) : 0,
        actualApiCalls: todayTotal - todayCacheHits
      },
      week: {
        totalCalls: weekTotal,
        cacheHits: weekCacheHits,
        cacheHitRate: weekTotal > 0 ? Math.round((weekCacheHits / weekTotal) * 100) : 0,
        actualApiCalls: weekTotal - weekCacheHits
      },
      topApi: topApi?.api_type || null
    }
  } catch (err) {

    return { success: false }
  }
}

// API 종류 상수
export const API_TYPES = {
  KAKAO_GEOCODING: 'kakao_geocoding',
  KAKAO_ROUTE: 'kakao_route',
  ODSAY_TRANSIT: 'odsay_transit',
  TOUR_API: 'tour_api',
  KTO_PHOTO: 'kto_photo'
}

// ==================== 공연 관리 함수 ====================

/**
 * HTML 엔티티 디코딩
 */
const decodeHtmlEntities = (str) => {
  if (!str) return str
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * 날짜 문자열에서 Date 추출 (YYYY.MM.DD 또는 YYYY-MM-DD 형식)
 */
const parseDateFromPeriod = (periodStr, isEnd = false) => {
  if (!periodStr) return null
  
  // 날짜 패턴 추출 (YYYY.MM.DD 또는 YYYY-MM-DD)
  const datePattern = /(\d{4})[.\-](\d{2})[.\-](\d{2})/g
  const dates = [...periodStr.matchAll(datePattern)]
  
  if (dates.length === 0) return null
  
  // 시작일은 첫 번째 날짜, 종료일은 마지막 날짜
  const targetDate = isEnd ? dates[dates.length - 1] : dates[0]
  return `${targetDate[1]}-${targetDate[2]}-${targetDate[3]}`
}

/**
 * DB에 저장된 공연 목록 조회
 * @param {boolean} activeOnly - 활성화된 공연만 조회
 * @returns {Promise<Array>} 공연 목록
 */
export const getDbPerformances = async (activeOnly = true) => {
  try {
    let query = supabase
      .from('performances')
      .select('*')
      .order('start_date', { ascending: true })
    
    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('공연 목록 조회 실패:', error)
      return []
    }
    
    return data || []
  } catch (err) {
    console.error('공연 목록 조회 에러:', err)
    return []
  }
}

/**
 * 공연 데이터 DB에 저장
 * @param {Object} performance - 공연 데이터
 * @returns {Promise<Object>} 저장 결과
 */
export const savePerformance = async (performance) => {
  try {
    // eventPeriod에서 시작일/종료일 추출
    const startDate = parseDateFromPeriod(performance.eventPeriod, false)
    const endDate = parseDateFromPeriod(performance.eventPeriod, true)
    
    const performanceData = {
      title: decodeHtmlEntities(performance.title),
      type: decodeHtmlEntities(performance.type) || null,
      event_period: performance.eventPeriod || null,
      start_date: startDate,
      end_date: endDate,
      event_site: decodeHtmlEntities(performance.eventSite) || null,
      charge: decodeHtmlEntities(performance.charge) || null,
      contact_point: decodeHtmlEntities(performance.contactPoint) || null,
      url: performance.url || null,
      image_url: performance.imageObject || null,
      description: decodeHtmlEntities(performance.description) || null,
      view_count: performance.viewCount || 0,
      is_active: true
    }
    
    // upsert: title로 중복 체크
    const { data, error } = await supabase
      .from('performances')
      .upsert(performanceData, { 
        onConflict: 'title',
        ignoreDuplicates: false 
      })
      .select()
    
    if (error) {
      console.error('공연 저장 실패:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (err) {
    console.error('공연 저장 에러:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 여러 공연 데이터 일괄 저장
 * @param {Array} performances - 공연 데이터 배열
 * @returns {Promise<Object>} 저장 결과
 */
export const savePerformances = async (performances) => {
  try {
    const performancesData = performances.map(p => {
      const startDate = parseDateFromPeriod(p.eventPeriod, false)
      const endDate = parseDateFromPeriod(p.eventPeriod, true)
      
      return {
        title: decodeHtmlEntities(p.title),
        type: decodeHtmlEntities(p.type) || null,
        event_period: p.eventPeriod || null,
        start_date: startDate,
        end_date: endDate,
        event_site: decodeHtmlEntities(p.eventSite) || null,
        charge: decodeHtmlEntities(p.charge) || null,
        contact_point: decodeHtmlEntities(p.contactPoint) || null,
        url: p.url || null,
        image_url: p.imageObject || null,
        description: decodeHtmlEntities(p.description) || null,
        view_count: p.viewCount || 0,
        is_active: true
      }
    })
    
    // 배치 upsert
    const { data, error } = await supabase
      .from('performances')
      .upsert(performancesData, { 
        onConflict: 'title',
        ignoreDuplicates: false 
      })
      .select()
    
    if (error) {
      console.error('공연 일괄 저장 실패:', error)
      return { success: false, error: error.message, savedCount: 0 }
    }
    
    return { success: true, data, savedCount: data?.length || 0 }
  } catch (err) {
    console.error('공연 일괄 저장 에러:', err)
    return { success: false, error: err.message, savedCount: 0 }
  }
}

/**
 * 공연 삭제
 * @param {string} id - 공연 ID
 * @returns {Promise<Object>} 삭제 결과
 */
export const deletePerformance = async (id) => {
  try {
    const { error } = await supabase
      .from('performances')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('공연 삭제 실패:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err) {
    console.error('공연 삭제 에러:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 만료된 공연 삭제 (종료일이 오늘 이전인 공연)
 * @returns {Promise<Object>} 삭제 결과
 */
export const deleteExpiredPerformances = async () => {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    
    // 먼저 삭제 대상 조회
    const { data: expiredData } = await supabase
      .from('performances')
      .select('id, title, end_date')
      .lt('end_date', today)
    
    if (!expiredData || expiredData.length === 0) {
      return { success: true, deletedCount: 0, message: '삭제할 만료된 공연이 없습니다.' }
    }
    
    // 삭제 실행
    const { error } = await supabase
      .from('performances')
      .delete()
      .lt('end_date', today)
    
    if (error) {
      console.error('만료된 공연 삭제 실패:', error)
      return { success: false, error: error.message }
    }
    
    return { 
      success: true, 
      deletedCount: expiredData.length,
      deletedPerformances: expiredData
    }
  } catch (err) {
    console.error('만료된 공연 삭제 에러:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 공연 개수 조회
 * @returns {Promise<number>} 공연 개수
 */
export const getPerformanceCount = async () => {
  try {
    const { count, error } = await supabase
      .from('performances')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    
    if (error) {
      console.error('공연 개수 조회 실패:', error)
      return 0
    }
    
    return count || 0
  } catch (err) {
    console.error('공연 개수 조회 에러:', err)
    return 0
  }
}

/**
 * 공연 수정
 * @param {string} id - 공연 ID
 * @param {Object} updates - 수정할 필드
 * @returns {Promise<Object>} 수정 결과
 */
export const updatePerformance = async (id, updates) => {
  try {
    // eventPeriod가 수정되면 start_date, end_date도 업데이트
    if (updates.event_period) {
      updates.start_date = parseDateFromPeriod(updates.event_period, false)
      updates.end_date = parseDateFromPeriod(updates.event_period, true)
    }
    
    const { data, error } = await supabase
      .from('performances')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) {
      console.error('공연 수정 실패:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (err) {
    console.error('공연 수정 에러:', err)
    return { success: false, error: err.message }
  }
}

export { TABLE_CONFIGS }

// ============================================================
// TourAPI 관련 함수들 (tour_spots, tour_festivals 테이블)
// ============================================================

/**
 * TourAPI 관광정보 조회 (tour_spots 테이블)
 * @param {string} contentTypeId - 관광타입 (12:관광지, 14:문화시설, 28:레포츠, 32:숙박, 38:쇼핑, 39:음식점)
 * @param {number} page - 페이지 번호 (1부터 시작)
 * @param {number} pageSize - 페이지당 항목 수
 * @param {string} searchQuery - 검색어
 * @returns {Promise<Object>} { success, items, totalCount }
 */
export const getTourSpots = async (contentTypeId, page = 1, pageSize = 20, searchQuery = '') => {
  try {
    // 전체 개수 조회
    let countQuery = supabase
      .from('tour_spots')
      .select('*', { count: 'exact', head: true })
      .eq('content_type_id', contentTypeId)
    
    if (searchQuery && searchQuery.trim()) {
      countQuery = countQuery.or(`title.ilike.%${searchQuery}%,addr1.ilike.%${searchQuery}%`)
    }
    
    const { count: totalCount, error: countError } = await countQuery
    if (countError) throw countError
    
    // 데이터 조회
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    let dataQuery = supabase
      .from('tour_spots')
      .select('*')
      .eq('content_type_id', contentTypeId)
    
    if (searchQuery && searchQuery.trim()) {
      dataQuery = dataQuery.or(`title.ilike.%${searchQuery}%,addr1.ilike.%${searchQuery}%`)
    }
    
    const { data, error } = await dataQuery
      .range(from, to)
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    
    return {
      success: true,
      items: data || [],
      totalCount: totalCount || 0
    }
  } catch (err) {
    console.error('TourSpots 조회 에러:', err)
    return { success: false, items: [], totalCount: 0 }
  }
}

/**
 * TourAPI 관광정보 전체 조회 (검색 필터 없이)
 * @param {string} contentTypeId - 관광타입
 * @param {number} limit - 최대 개수
 * @returns {Promise<Object>} { success, items, totalCount }
 */
export const getAllTourSpots = async (contentTypeId, limit = 1000) => {
  try {
    const { data, error, count } = await supabase
      .from('tour_spots')
      .select('*', { count: 'exact' })
      .eq('content_type_id', contentTypeId)
      .limit(limit)
      .order('title', { ascending: true })
    
    if (error) throw error
    
    return {
      success: true,
      items: data || [],
      totalCount: count || 0
    }
  } catch (err) {
    console.error('TourSpots 전체 조회 에러:', err)
    return { success: false, items: [], totalCount: 0 }
  }
}

/**
 * TourAPI 관광정보 저장 (Upsert)
 * @param {Array} spots - 저장할 관광정보 배열
 * @returns {Promise<Object>} { success, savedCount, errors }
 */
export const saveTourSpots = async (spots) => {
  if (!spots || spots.length === 0) {
    return { success: true, savedCount: 0 }
  }
  
  try {
    // API 응답을 DB 스키마에 맞게 변환
    const dbRecords = spots.map(spot => ({
      content_id: spot.contentid,
      content_type_id: spot.contenttypeid,
      title: spot.title,
      addr1: spot.addr1 || '',
      addr2: spot.addr2 || '',
      areacode: spot.areacode || '3',
      sigungucode: spot.sigungucode || '',
      cat1: spot.cat1 || '',
      cat2: spot.cat2 || '',
      cat3: spot.cat3 || '',
      firstimage: spot.firstimage || '',
      firstimage2: spot.firstimage2 || '',
      mapx: spot.mapx || '',
      mapy: spot.mapy || '',
      mlevel: spot.mlevel || '',
      tel: spot.tel || '',
      zipcode: spot.zipcode || '',
      cpyrht_div_cd: spot.cpyrhtDivCd || '',
      created_time: spot.createdtime || '',
      modified_time: spot.modifiedtime || ''
    }))
    
    // Upsert (content_id 기준)
    const { data, error } = await supabase
      .from('tour_spots')
      .upsert(dbRecords, { onConflict: 'content_id' })
      .select()
    
    if (error) {
      console.error('TourSpots 저장 에러:', error)
      return { success: false, savedCount: 0, error: error.message }
    }
    
    return { success: true, savedCount: data?.length || spots.length }
  } catch (err) {
    console.error('TourSpots 저장 에러:', err)
    return { success: false, savedCount: 0, error: err.message }
  }
}

/**
 * TourAPI 관광정보 삭제
 * @param {string} contentTypeId - 관광타입
 * @returns {Promise<Object>} { success, deletedCount }
 */
export const deleteTourSpots = async (contentTypeId) => {
  try {
    const { data, error } = await supabase
      .from('tour_spots')
      .delete()
      .eq('content_type_id', contentTypeId)
      .select()
    
    if (error) {
      console.error('TourSpots 삭제 에러:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }
    
    return { success: true, deletedCount: data?.length || 0 }
  } catch (err) {
    console.error('TourSpots 삭제 에러:', err)
    return { success: false, deletedCount: 0, error: err.message }
  }
}

/**
 * TourAPI 관광정보 개수 조회
 * @param {string} contentTypeId - 관광타입 (null이면 전체)
 * @returns {Promise<number>} 개수
 */
export const getTourSpotsCount = async (contentTypeId = null) => {
  try {
    let query = supabase
      .from('tour_spots')
      .select('*', { count: 'exact', head: true })
    
    if (contentTypeId) {
      query = query.eq('content_type_id', contentTypeId)
    }
    
    const { count, error } = await query
    if (error) throw error
    
    return count || 0
  } catch (err) {
    console.error('TourSpots 개수 조회 에러:', err)
    return 0
  }
}

// ============================================================
// TourAPI 행사/축제 함수들 (tour_festivals 테이블)
// ============================================================

/**
 * TourAPI 행사/축제 조회
 * @param {boolean} activeOnly - 진행중/예정 행사만 조회 (종료일 >= 오늘)
 * @param {number} page - 페이지 번호
 * @param {number} pageSize - 페이지당 항목 수
 * @param {string} searchQuery - 검색어
 * @returns {Promise<Object>} { success, items, totalCount }
 */
export const getTourFestivals = async (activeOnly = true, page = 1, pageSize = 20, searchQuery = '') => {
  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
    
    // 전체 개수 조회
    let countQuery = supabase
      .from('tour_festivals')
      .select('*', { count: 'exact', head: true })
    
    if (activeOnly) {
      // event_end_date가 null이거나 오늘 이후인 경우
      countQuery = countQuery.or(`event_end_date.gte.${today},event_end_date.is.null`)
    }
    
    if (searchQuery && searchQuery.trim()) {
      countQuery = countQuery.or(`title.ilike.%${searchQuery}%,addr1.ilike.%${searchQuery}%`)
    }
    
    const { count: totalCount, error: countError } = await countQuery
    if (countError) throw countError
    
    // 데이터 조회
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    let dataQuery = supabase
      .from('tour_festivals')
      .select('*')
    
    if (activeOnly) {
      // event_end_date가 null이거나 오늘 이후인 경우
      dataQuery = dataQuery.or(`event_end_date.gte.${today},event_end_date.is.null`)
    }
    
    if (searchQuery && searchQuery.trim()) {
      dataQuery = dataQuery.or(`title.ilike.%${searchQuery}%,addr1.ilike.%${searchQuery}%`)
    }
    
    const { data, error } = await dataQuery
      .range(from, to)
      .order('event_start_date', { ascending: true })
    
    if (error) throw error
    
    return {
      success: true,
      items: data || [],
      totalCount: totalCount || 0
    }
  } catch (err) {
    console.error('TourFestivals 조회 에러:', err)
    return { success: false, items: [], totalCount: 0 }
  }
}

/**
 * TourAPI 행사/축제 전체 조회
 * @param {boolean} activeOnly - 진행중/예정만
 * @param {number} limit - 최대 개수
 * @returns {Promise<Object>} { success, items, totalCount }
 */
export const getAllTourFestivals = async (activeOnly = true, limit = 500) => {
  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    
    let query = supabase
      .from('tour_festivals')
      .select('*', { count: 'exact' })
    
    if (activeOnly) {
      // event_end_date가 null이거나 오늘 이후인 경우
      query = query.or(`event_end_date.gte.${today},event_end_date.is.null`)
    }
    
    const { data, error, count } = await query
      .limit(limit)
      .order('event_start_date', { ascending: true })
    
    if (error) throw error
    
    return {
      success: true,
      items: data || [],
      totalCount: count || 0
    }
  } catch (err) {
    console.error('TourFestivals 전체 조회 에러:', err)
    return { success: false, items: [], totalCount: 0 }
  }
}

/**
 * TourAPI 행사/축제 저장 (Upsert)
 * @param {Array} festivals - 저장할 행사 배열
 * @returns {Promise<Object>} { success, savedCount }
 */
export const saveTourFestivals = async (festivals) => {
  if (!festivals || festivals.length === 0) {
    return { success: true, savedCount: 0 }
  }
  
  try {
    console.log('[DEBUG] saveTourFestivals - 입력 개수:', festivals.length)
    
    // 샘플 데이터 확인
    if (festivals.length > 0) {
      console.log('[DEBUG] saveTourFestivals - 샘플:', {
        title: festivals[0].title,
        eventenddate: festivals[0].eventenddate,
        eventstartdate: festivals[0].eventstartdate
      })
    }
    
    // 모든 행사를 저장 (종료일 필터링 제거 - 조회 시 필터링)
    const activeEvents = festivals
    console.log('[DEBUG] saveTourFestivals - 저장할 개수:', activeEvents.length)
    
    // API 응답을 DB 스키마에 맞게 변환
    const dbRecords = activeEvents.map(f => ({
      content_id: f.contentid,
      content_type_id: '15',
      title: f.title,
      addr1: f.addr1 || '',
      addr2: f.addr2 || '',
      areacode: f.areacode || '3',
      sigungucode: f.sigungucode || '',
      cat1: f.cat1 || '',
      cat2: f.cat2 || '',
      cat3: f.cat3 || '',
      firstimage: f.firstimage || '',
      firstimage2: f.firstimage2 || '',
      mapx: f.mapx || '',
      mapy: f.mapy || '',
      mlevel: f.mlevel || '',
      tel: f.tel || '',
      zipcode: f.zipcode || '',
      event_start_date: f.eventstartdate || '',
      event_end_date: f.eventenddate || '',
      cpyrht_div_cd: f.cpyrhtDivCd || '',
      created_time: f.createdtime || '',
      modified_time: f.modifiedtime || ''
    }))
    
    // Upsert
    const { data, error } = await supabase
      .from('tour_festivals')
      .upsert(dbRecords, { onConflict: 'content_id' })
      .select()
    
    if (error) {
      console.error('TourFestivals 저장 에러:', error)
      return { success: false, savedCount: 0, error: error.message }
    }
    
    return { success: true, savedCount: data?.length || activeEvents.length }
  } catch (err) {
    console.error('TourFestivals 저장 에러:', err)
    return { success: false, savedCount: 0, error: err.message }
  }
}

/**
 * 만료된 TourAPI 행사/축제 삭제
 * @returns {Promise<Object>} { success, deletedCount }
 */
export const deleteExpiredTourFestivals = async () => {
  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    
    const { data, error } = await supabase
      .from('tour_festivals')
      .delete()
      .lt('event_end_date', today)
      .select()
    
    if (error) {
      console.error('만료된 TourFestivals 삭제 에러:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }
    
    return { success: true, deletedCount: data?.length || 0 }
  } catch (err) {
    console.error('만료된 TourFestivals 삭제 에러:', err)
    return { success: false, deletedCount: 0, error: err.message }
  }
}

/**
 * TourAPI 행사/축제 전체 삭제
 * @returns {Promise<Object>} { success, deletedCount }
 */
export const deleteAllTourFestivals = async () => {
  try {
    const { data, error } = await supabase
      .from('tour_festivals')
      .delete()
      .neq('content_id', '')  // 모든 레코드 삭제
      .select()
    
    if (error) {
      console.error('TourFestivals 전체 삭제 에러:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }
    
    return { success: true, deletedCount: data?.length || 0 }
  } catch (err) {
    console.error('TourFestivals 전체 삭제 에러:', err)
    return { success: false, deletedCount: 0, error: err.message }
  }
}

/**
 * TourAPI 행사/축제 개수 조회
 * @param {boolean} activeOnly - 진행중/예정만
 * @returns {Promise<number>} 개수
 */
export const getTourFestivalsCount = async (activeOnly = true) => {
  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    console.log('[DEBUG] getTourFestivalsCount - today:', today, 'activeOnly:', activeOnly)
    
    // 먼저 전체 개수 확인
    const { count: totalCount } = await supabase
      .from('tour_festivals')
      .select('*', { count: 'exact', head: true })
    console.log('[DEBUG] getTourFestivalsCount - 전체 개수:', totalCount)
    
    // event_end_date 샘플 확인
    const { data: sampleData } = await supabase
      .from('tour_festivals')
      .select('title, event_start_date, event_end_date')
      .limit(3)
    console.log('[DEBUG] getTourFestivalsCount - 샘플 데이터:', sampleData)
    
    let query = supabase
      .from('tour_festivals')
      .select('*', { count: 'exact', head: true })
    
    if (activeOnly) {
      // event_end_date가 null이거나 오늘 이후인 경우
      query = query.or(`event_end_date.gte.${today},event_end_date.is.null`)
      console.log('[DEBUG] getTourFestivalsCount - filter applied: event_end_date >=', today)
    }
    
    const { count, error } = await query
    console.log('[DEBUG] getTourFestivalsCount - 필터 후 개수:', { count, error })
    
    if (error) throw error
    
    return count || 0
  } catch (err) {
    console.error('TourFestivals 개수 조회 에러:', err)
    return 0
  }
}

/**
 * TourAPI 전체 통계 조회
 * @returns {Promise<Object>} { success, stats: { spots, festivals } }
 */
export const getTourApiStats = async () => {
  try {
    console.log('[DEBUG] getTourApiStats - 시작')
    const stats = {
      spots: {},
      festivals: 0
    }
    
    // 관광정보 타입별 개수
    const contentTypes = ['12', '14', '28', '32', '38', '39']
    const typeNames = {
      '12': '관광지',
      '14': '문화시설',
      '28': '레포츠',
      '32': '숙박',
      '38': '쇼핑',
      '39': '음식점'
    }
    
    for (const typeId of contentTypes) {
      const count = await getTourSpotsCount(typeId)
      console.log(`[DEBUG] getTourApiStats - spots[${typeId}]:`, count)
      stats.spots[typeId] = { name: typeNames[typeId], count }
    }
    
    // 행사/축제 개수 (전체 - 종료된 것 포함)
    stats.festivals = await getTourFestivalsCount(false)
    console.log('[DEBUG] getTourApiStats - festivals:', stats.festivals)
    console.log('[DEBUG] getTourApiStats - 최종 결과:', stats)
    
    return { success: true, stats }
  } catch (err) {
    console.error('TourAPI 통계 조회 에러:', err)
    return { success: false, stats: { spots: {}, festivals: 0 } }
  }
}

