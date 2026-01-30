// Supabase 데이터베이스에서 데이터 가져오기
import { supabase } from './supabase'
import { toSecureUrl } from '../utils/imageUtils'

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
      const isDev = typeof process !== 'undefined' 
        ? process.env.NODE_ENV === 'development'
        : (typeof import.meta !== 'undefined' && import.meta.env?.DEV)
      if (isDev) {
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
 * TourAPI 관광정보 단일 조회 (content_id로 조회)
 * @param {string} contentId - 콘텐츠 ID
 * @returns {Promise<Object>} { success, item }
 */
export const getTourSpotByContentId = async (contentId) => {
  try {
    const { data, error } = await supabase
      .from('tour_spots')
      .select('*')
      .eq('content_id', contentId)
      .single()
    
    if (error) throw error
    
    return {
      success: true,
      item: data
    }
  } catch (err) {
    console.error('TourSpot 단일 조회 에러:', err)
    return { success: false, item: null }
  }
}

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
 * DB에만 있고 API에 없는 tour_spots 조회
 * @param {string} contentTypeId - 관광타입
 * @param {Array<string>} apiContentIds - API에서 받아온 content_id 목록
 * @returns {Promise<Object>} { success, items, count }
 */
export const getOrphanedTourSpots = async (contentTypeId, apiContentIds) => {
  try {
    // DB에서 해당 타입의 모든 항목 조회
    const { data: dbItems, error } = await supabase
      .from('tour_spots')
      .select('id, content_id, title, intro_info, overview')
      .eq('content_type_id', contentTypeId)
      .order('title', { ascending: true })
    
    if (error) throw error
    
    // API에 없는 항목 필터링 및 ai_description 추출
    const apiIdSet = new Set(apiContentIds.map(id => String(id)))
    const orphanedItems = (dbItems || [])
      .filter(item => !apiIdSet.has(String(item.content_id)))
      .map(item => ({
        id: item.id,
        content_id: item.content_id,
        title: item.title,
        ai_description: item.intro_info?.ai_description || null,
        overview: item.overview
      }))
    
    return { 
      success: true, 
      items: orphanedItems,
      count: orphanedItems.length
    }
  } catch (err) {
    console.error('Orphaned TourSpots 조회 에러:', err)
    return { success: false, items: [], count: 0, error: err.message }
  }
}

/**
 * 특정 tour_spots 항목들 삭제 (ID 목록으로)
 * @param {Array<number>} ids - 삭제할 ID 목록
 * @returns {Promise<Object>} { success, deletedCount }
 */
export const deleteTourSpotsByIds = async (ids) => {
  try {
    const { data, error } = await supabase
      .from('tour_spots')
      .delete()
      .in('id', ids)
      .select()
    
    if (error) throw error
    
    return { success: true, deletedCount: data?.length || 0 }
  } catch (err) {
    console.error('TourSpots 선택 삭제 에러:', err)
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

/**
 * TourAPI 상세정보(overview) 동기화
 * DB에 저장된 tour_spots 항목들의 overview를 TourAPI에서 가져와 업데이트
 * @param {string} contentTypeId - 관광타입 (null이면 전체)
 * @param {Function} onProgress - 진행 콜백 (current, total, item)
 * @returns {Promise<Object>} { success, updatedCount, failedCount }
 */
export const syncTourSpotsOverview = async (contentTypeId = null, onProgress = null) => {
  try {
    // overview가 없는 항목 조회
    let query = supabase
      .from('tour_spots')
      .select('id, content_id, content_type_id, title')
      .is('overview', null)
      .order('id', { ascending: true })
    
    if (contentTypeId) {
      query = query.eq('content_type_id', contentTypeId)
    }
    
    const { data: items, error: selectError } = await query
    if (selectError) throw selectError
    
    if (!items || items.length === 0) {
      return { success: true, updatedCount: 0, failedCount: 0, message: 'No items need overview sync', failedItems: [] }
    }
    
    let updatedCount = 0
    let failedCount = 0
    const failedItems = []
    const total = items.length
    
    // 동적 import (순환 참조 방지)
    const { getTourApiDetail } = await import('./api.js')
    
    // 각 항목에 대해 상세정보 조회 및 업데이트
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      try {
        // TourAPI 상세정보 조회
        const result = await getTourApiDetail(item.content_id, true)
        
        if (result.success && result.item?.overview) {
          // overview 업데이트
          const { error: updateError } = await supabase
            .from('tour_spots')
            .update({ 
              overview: result.item.overview,
              homepage: result.item.homepage || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
          
          if (updateError) {
            console.error(`Update failed for ${item.title}:`, updateError)
            failedCount++
            failedItems.push({
              id: item.id,
              content_id: item.content_id,
              content_type_id: item.content_type_id,
              title: item.title,
              reason: `DB update error: ${updateError.message}`
            })
          } else {
            updatedCount++
          }
        } else {
          console.warn(`[OverviewSync] API returned no overview for: ${item.title} (content_id: ${item.content_id}, type: ${item.content_type_id})`)
          failedCount++
          failedItems.push({
            id: item.id,
            content_id: item.content_id,
            content_type_id: item.content_type_id,
            title: item.title,
            reason: 'API returned no overview data'
          })
        }
        
        // 진행 콜백 호출
        if (onProgress) {
          onProgress(i + 1, total, item.title)
        }
        
        // API 호출 간격 (rate limit 방지)
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (err) {
        console.error(`Error syncing ${item.title}:`, err)
        failedCount++
        failedItems.push({
          id: item.id,
          content_id: item.content_id,
          content_type_id: item.content_type_id,
          title: item.title,
          reason: err.message
        })
      }
    }
    
    // 실패 항목 요약 로그
    if (failedItems.length > 0) {
      console.warn(`[OverviewSync] Failed items (${failedItems.length}):`)
      failedItems.forEach(item => {
        console.warn(`  - ${item.title} (${item.content_id}, type: ${item.content_type_id}): ${item.reason}`)
      })
    }
    
    return { 
      success: true, 
      updatedCount, 
      failedCount, 
      total,
      failedItems,
      message: `Updated ${updatedCount}/${total} items` 
    }
  } catch (err) {
    console.error('Overview 동기화 에러:', err)
    return { success: false, updatedCount: 0, failedCount: 0, error: err.message, failedItems: [] }
  }
}

/**
 * overview가 없는 tour_spots 개수 조회
 * @param {string} contentTypeId - 관광타입 (null이면 전체)
 * @returns {Promise<number>} 개수
 */
export const getTourSpotsWithoutOverviewCount = async (contentTypeId = null) => {
  try {
    let query = supabase
      .from('tour_spots')
      .select('*', { count: 'exact', head: true })
      .is('overview', null)
    
    if (contentTypeId) {
      query = query.eq('content_type_id', contentTypeId)
    }
    
    const { count, error } = await query
    if (error) throw error
    
    return count || 0
  } catch (err) {
    console.error('Overview 없는 항목 개수 조회 에러:', err)
    return 0
  }
}

/**
 * 영문 데이터가 없는 tour_spots 개수 조회
 * @param {string} contentTypeId - 관광타입 (null이면 전체)
 * @returns {Promise<number>} 개수
 */
export const getTourSpotsWithoutEngCount = async (contentTypeId = null) => {
  try {
    // 전체 개수
    let totalQuery = supabase
      .from('tour_spots')
      .select('*', { count: 'exact', head: true })
    
    if (contentTypeId) {
      totalQuery = totalQuery.eq('content_type_id', contentTypeId)
    }
    
    const { count: totalCount } = await totalQuery
    
    // 영문 있는 개수 (title_en이 null이 아닌)
    let engQuery = supabase
      .from('tour_spots')
      .select('*', { count: 'exact', head: true })
      .not('title_en', 'is', null)
    
    if (contentTypeId) {
      engQuery = engQuery.eq('content_type_id', contentTypeId)
    }
    
    const { count: engCount } = await engQuery
    
    const noEngCount = (totalCount || 0) - (engCount || 0)
    console.log(`[getTourSpotsWithoutEngCount] 전체: ${totalCount}, 영문있음: ${engCount}, 영문없음: ${noEngCount}`)
    
    return noEngCount
  } catch (err) {
    console.error('영문 데이터 없는 항목 개수 조회 에러:', err)
    return 0
  }
}

/**
 * 이미 매핑된 영문 content_id 목록 조회
 * @param {string} engContentTypeId - 영문 관광타입
 * @returns {Promise<Object>} { success, ids: ['123', '456', ...] }
 */
export const getMappedEngContentIds = async (engContentTypeId = null) => {
  try {
    // 영문 타입에 해당하는 국문 타입 찾기
    const engToKor = {
      '76': '12', // 관광지
      '78': '14', // 문화시설
      '85': '15', // 행사/축제
      '75': '28', // 레포츠
      '80': '32', // 숙박
      '79': '38', // 쇼핑
      '82': '39'  // 음식점
    }
    const korContentTypeId = engContentTypeId ? engToKor[engContentTypeId] : null
    
    console.log('[getMappedEngContentIds] 영문 타입:', engContentTypeId, '-> 국문 타입:', korContentTypeId)
    
    let query = supabase
      .from('tour_spots')
      .select('content_id_en')
      .not('content_id_en', 'is', null)
    
    if (korContentTypeId) {
      query = query.eq('content_type_id', korContentTypeId)
    }
    
    const { data, error } = await query
    if (error) throw error
    
    const ids = (data || []).map(item => String(item.content_id_en))
    console.log('[getMappedEngContentIds] 매핑된 영문 ID 개수:', ids.length, '샘플:', ids.slice(0, 5))
    return { success: true, ids }
  } catch (err) {
    console.error('매핑된 영문 content_id 조회 에러:', err)
    return { success: false, ids: [], error: err.message }
  }
}

/**
 * 영문 데이터가 없는 tour_spots 목록 조회
 * @param {string} contentTypeId - 관광타입 (null이면 전체)
 * @param {string} searchQuery - 검색어
 * @param {number} limit - 조회 개수
 * @returns {Promise<Object>} { success, items }
 */
export const getTourSpotsWithoutEng = async (contentTypeId = null, searchQuery = '', limit = 50) => {
  try {
    let query = supabase
      .from('tour_spots')
      .select('id, content_id, content_type_id, title, addr1, zipcode, firstimage, mapx, mapy')
      .is('title_en', null)
      .order('title', { ascending: true })
      .limit(limit)
    
    if (contentTypeId) {
      query = query.eq('content_type_id', contentTypeId)
    }
    
    if (searchQuery) {
      query = query.ilike('title', `%${searchQuery}%`)
    }
    
    const { data, error } = await query
    if (error) throw error
    
    return { success: true, items: data || [] }
  } catch (err) {
    console.error('영문 데이터 없는 항목 목록 조회 에러:', err)
    return { success: false, items: [], error: err.message }
  }
}

/**
 * 단일 tour_spot에 영문 데이터 수동 매핑
 * @param {number} spotId - tour_spots.id
 * @param {Object} engData - 영문 데이터 { content_id_en, title_en, addr1_en, overview_en, homepage_en }
 * @returns {Promise<Object>} { success, error }
 */
export const mapTourSpotEnglish = async (spotId, engData) => {
  try {
    const { error } = await supabase
      .from('tour_spots')
      .update({
        content_id_en: engData.content_id_en,
        title_en: engData.title_en,
        addr1_en: engData.addr1_en || '',
        overview_en: engData.overview_en || '',
        homepage_en: engData.homepage_en || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', spotId)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    console.error('영문 데이터 수동 매핑 에러:', err)
    return { success: false, error: err.message }
  }
}

/**
 * tour_spot 영문 데이터 삭제 (초기화)
 * @param {number} spotId - tour_spots.id
 * @returns {Promise<Object>} { success, error }
 */
export const clearTourSpotEnglish = async (spotId) => {
  try {
    const { error } = await supabase
      .from('tour_spots')
      .update({
        content_id_en: null,
        title_en: null,
        addr1_en: null,
        overview_en: null,
        homepage_en: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', spotId)
    
    if (error) throw error
    
    return { success: true }
  } catch (err) {
    console.error('영문 데이터 삭제 에러:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 한글 제목 정규화 (공백, 특수문자 제거)
 */
const normalizeKorTitle = (title) => {
  if (!title) return ''
  return title
    .replace(/\([^)]*\)/g, '')  // 괄호 내용 제거
    .replace(/\s+/g, '')        // 공백 제거
    .replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F가-힣a-zA-Z0-9]/g, '') // 한글,영문,숫자만
    .toLowerCase()
    .trim()
}

/**
 * 영문 제목에서 한글 이름 추출 (괄호 안 또는 전체 한글)
 */
const extractKorNameFromEng = (engTitle) => {
  if (!engTitle) return null
  // 1. 괄호 안 한글 추출: "Daejeon Expo Park (대전 엑스포과학공원)"
  const match = engTitle.match(/\(([^)]*[가-힣]+[^)]*)\)/)
  if (match) {
    return normalizeKorTitle(match[1])
  }
  // 2. 전체 제목에서 한글 부분만 추출
  const korChars = engTitle.match(/[가-힣]+/g)
  return korChars ? normalizeKorTitle(korChars.join('')) : null
}

/**
 * TourAPI 영문 데이터 동기화 (다단계 매칭 방식)
 * 1차: 장소명 매칭 (영문 제목 내 한글명)
 * 2차: zipcode 매칭 (우편번호 동일)
 * 3차: firstimage 매칭 (이미지 URL 동일)
 * @param {string} contentTypeId - 국문 관광타입 (12, 14 등)
 * @param {Function} onProgress - 진행 콜백 (current, total, item)
 * @returns {Promise<Object>} { success, updatedCount, failedCount, matchedItems }
 */
export const syncTourSpotsEnglish = async (contentTypeId = null, onProgress = null) => {
  try {
    // 1. DB에서 국문 데이터 조회 (영문 데이터 없는 것)
    let query = supabase
      .from('tour_spots')
      .select('id, content_id, content_type_id, title, zipcode, firstimage')
      .is('title_en', null)
      .order('id', { ascending: true })
    
    if (contentTypeId) {
      query = query.eq('content_type_id', contentTypeId)
    }
    
    const { data: korItems, error: selectError } = await query
    if (selectError) throw selectError
    
    if (!korItems || korItems.length === 0) {
      return { success: true, updatedCount: 0, failedCount: 0, message: 'No items need English sync' }
    }
    
    // 2. 영문 API에서 데이터 가져오기
    const { getTourApiSpotsEng, getTourApiDetailEng, CONTENT_TYPE_KOR_TO_ENG } = await import('./api.js')
    
    const korContentTypes = contentTypeId ? [contentTypeId] : ['12', '14', '28', '32', '38', '39']
    
    // 매칭 인덱스 생성
    const engByKorName = new Map()     // 정규화된 한글명 → engItem
    const engByZipcode = new Map()     // zipcode → engItem[]
    const engByImage = new Map()       // firstimage → engItem
    const allEngItems = []
    
    for (const korTypeId of korContentTypes) {
      const engTypeId = CONTENT_TYPE_KOR_TO_ENG[korTypeId]
      if (!engTypeId) continue
      
      if (onProgress) onProgress(0, korItems.length, `영문 데이터 조회 중... (타입: ${korTypeId} → ${engTypeId})`)
      
      const result = await getTourApiSpotsEng({ contentTypeId: engTypeId, numOfRows: 1000 })
      if (result.success && result.items) {
        for (const engItem of result.items) {
          allEngItems.push(engItem)
          
          // 1. 한글명 인덱스
          const korName = extractKorNameFromEng(engItem.title)
          if (korName) {
            engByKorName.set(korName, engItem)
          }
          
          // 2. zipcode 인덱스 (배열로 저장 - 같은 우편번호에 여러 장소 가능)
          if (engItem.zipcode) {
            if (!engByZipcode.has(engItem.zipcode)) {
              engByZipcode.set(engItem.zipcode, [])
            }
            engByZipcode.get(engItem.zipcode).push(engItem)
          }
          
          // 3. firstimage 인덱스
          if (engItem.firstimage) {
            engByImage.set(engItem.firstimage, engItem)
          }
        }
      }
      await new Promise(r => setTimeout(r, 200))
    }
    
    console.log(`[EngSync] 영문 데이터 로드: 총 ${allEngItems.length}개`)
    console.log(`[EngSync] 인덱스: 한글명 ${engByKorName.size}개, 우편번호 ${engByZipcode.size}개, 이미지 ${engByImage.size}개`)
    
    // 3. 다단계 매칭 수행
    let updatedCount = 0
    let failedCount = 0
    const matchedItems = []
    const unmatchedItems = []
    const total = korItems.length
    
    console.group('[SYNC] 영문 데이터 매칭 진행')
    
    for (let i = 0; i < korItems.length; i++) {
      const korItem = korItems[i]
      const normalizedKorTitle = normalizeKorTitle(korItem.title)
      
      let engItem = null
      let matchMethod = ''
      
      // 1차: 장소명 완전일치 매칭 (정규화 후 비교)
      engItem = engByKorName.get(normalizedKorTitle)
      if (engItem) matchMethod = '장소명완전일치'
      
      // 2차: zipcode + 명칭 완전일치 매칭
      if (!engItem && korItem.zipcode) {
        const candidates = engByZipcode.get(korItem.zipcode)
        if (candidates && candidates.length > 0) {
          // zipcode 동일한 것들 중 이름 완전일치 체크
          for (const candidate of candidates) {
            const candidateKorName = extractKorNameFromEng(candidate.title)
            // 완전 일치만 허용
            if (candidateKorName && candidateKorName === normalizedKorTitle) {
              engItem = candidate
              matchMethod = 'zipcode+명칭완전일치'
              break
            }
          }
        }
      }
      
      // 3차: firstimage 완전일치 매칭 (이미지 URL이 동일하면 같은 장소)
      if (!engItem && korItem.firstimage) {
        engItem = engByImage.get(korItem.firstimage)
        if (engItem) matchMethod = '이미지완전일치'
      }
      
      if (engItem) {
        // 매칭 성공 로그
        console.log(`[OK] [${matchMethod}] ${korItem.title} → ${engItem.title}`)
        
        // 영문 상세정보 조회 (overview 포함)
        const detailResult = await getTourApiDetailEng(engItem.contentid)
        const engDetail = detailResult.success ? detailResult.item : engItem
        
        // DB 업데이트
        const { error: updateError } = await supabase
          .from('tour_spots')
          .update({
            content_id_en: engItem.contentid,
            title_en: engItem.title,
            addr1_en: engItem.addr1 || '',
            overview_en: engDetail?.overview || '',
            homepage_en: engDetail?.homepage || '',
            updated_at: new Date().toISOString()
          })
          .eq('id', korItem.id)
        
        if (updateError) {
          console.error(`[EngSync] 업데이트 실패: ${korItem.title}`, updateError)
          failedCount++
        } else {
          updatedCount++
          matchedItems.push({
            korTitle: korItem.title,
            engTitle: engItem.title,
            content_id: korItem.content_id,
            content_id_en: engItem.contentid,
            method: matchMethod
          })
        }
        
        await new Promise(r => setTimeout(r, 100))
      } else {
        failedCount++
        unmatchedItems.push({
          id: korItem.id,
          title: korItem.title,
          content_id: korItem.content_id,
          content_type_id: korItem.content_type_id,
          zipcode: korItem.zipcode
        })
      }
      
      if (onProgress) {
        onProgress(i + 1, total, korItem.title)
      }
    }
    
    console.groupEnd() // 영문 데이터 매칭 진행 그룹 종료
    
    console.log(`[EngSync] 완료: ${updatedCount}개 매칭, ${failedCount}개 미매칭`)
    
    // 매칭 결과 상세 로그
    if (matchedItems.length > 0) {
      console.group('[SUCCESS] 영문 매칭 성공 (매칭 방법별)')
      const byMethod = {}
      matchedItems.forEach(item => {
        if (!byMethod[item.method]) byMethod[item.method] = []
        byMethod[item.method].push(item)
      })
      Object.entries(byMethod).forEach(([method, items]) => {
        console.log(`[${method}] ${items.length}개`)
        items.slice(0, 5).forEach(item => console.log(`  - ${item.korTitle} → ${item.engTitle}`))
        if (items.length > 5) console.log(`  ... 외 ${items.length - 5}개`)
      })
      console.groupEnd()
    }
    
    // 미매칭 항목 로그
    if (unmatchedItems.length > 0) {
      console.group('[FAIL] 영문 매칭 실패 항목 (최대 30개)')
      unmatchedItems.slice(0, 30).forEach(item => {
        console.log(`[${item.content_type_id}] ${item.title} (zipcode: ${item.zipcode || '-'})`)
      })
      if (unmatchedItems.length > 30) {
        console.log(`... 외 ${unmatchedItems.length - 30}개`)
      }
      console.groupEnd()
    }
    
    return {
      success: true,
      updatedCount,
      failedCount,
      total,
      matchedItems,
      unmatchedItems,
      message: `Updated ${updatedCount}/${total} items with English data`
    }
  } catch (err) {
    console.error('영문 데이터 동기화 에러:', err)
    return { success: false, updatedCount: 0, failedCount: 0, error: err.message }
  }
}

/**
 * TourAPI 소개정보(intro_info) 동기화
 * DB에 저장된 tour_spots 항목들의 소개정보를 TourAPI에서 가져와 업데이트
 * @param {string} contentTypeId - 관광타입 (null이면 전체)
 * @param {Function} onProgress - 진행 콜백 (current, total, item)
 * @returns {Promise<Object>} { success, updatedCount, failedCount }
 */
export const syncTourSpotsIntroInfo = async (contentTypeId = null, onProgress = null) => {
  try {
    // intro_info가 없는 항목 조회
    let query = supabase
      .from('tour_spots')
      .select('id, content_id, content_type_id, title')
      .is('intro_info', null)
      .order('id', { ascending: true })
    
    if (contentTypeId) {
      query = query.eq('content_type_id', contentTypeId)
    }
    
    const { data: items, error: selectError } = await query
    if (selectError) throw selectError
    
    if (!items || items.length === 0) {
      return { success: true, updatedCount: 0, failedCount: 0, message: 'No items need intro sync', failedItems: [] }
    }
    
    let updatedCount = 0
    let failedCount = 0
    const failedItems = []
    const total = items.length
    
    // 동적 import (순환 참조 방지)
    const { getTourApiIntro } = await import('./api.js')
    
    // 각 항목에 대해 소개정보 조회 및 업데이트
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      try {
        // TourAPI 소개정보 조회
        const result = await getTourApiIntro(item.content_id, item.content_type_id)
        
        if (result.success && result.item) {
          // intro_info 업데이트 (전체 응답을 JSONB로 저장)
          const { error: updateError } = await supabase
            .from('tour_spots')
            .update({ 
              intro_info: result.item,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
          
          if (updateError) {
            console.error(`Update failed for ${item.title}:`, updateError)
            failedCount++
            failedItems.push({
              id: item.id,
              content_id: item.content_id,
              content_type_id: item.content_type_id,
              title: item.title,
              reason: `DB update error: ${updateError.message}`
            })
          } else {
            updatedCount++
          }
        } else {
          console.warn(`[IntroSync] API returned no data for: ${item.title} (content_id: ${item.content_id}, type: ${item.content_type_id})`)
          failedCount++
          failedItems.push({
            id: item.id,
            content_id: item.content_id,
            content_type_id: item.content_type_id,
            title: item.title,
            reason: 'API returned no intro data'
          })
        }
        
        // 진행 콜백 호출
        if (onProgress) {
          onProgress(i + 1, total, item.title)
        }
        
        // API 호출 간격 (rate limit 방지)
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (err) {
        console.error(`Error syncing intro for ${item.title}:`, err)
        failedCount++
        failedItems.push({
          id: item.id,
          content_id: item.content_id,
          content_type_id: item.content_type_id,
          title: item.title,
          reason: err.message
        })
      }
    }
    
    // 실패 항목 요약 로그
    if (failedItems.length > 0) {
      console.warn(`[IntroSync] Failed items (${failedItems.length}):`)
      failedItems.forEach(item => {
        console.warn(`  - ${item.title} (${item.content_id}, type: ${item.content_type_id}): ${item.reason}`)
      })
    }
    
    return { 
      success: true, 
      updatedCount, 
      failedCount, 
      total,
      failedItems,
      message: `Updated ${updatedCount}/${total} items` 
    }
  } catch (err) {
    console.error('Intro info 동기화 에러:', err)
    return { success: false, updatedCount: 0, failedCount: 0, error: err.message, failedItems: [] }
  }
}

/**
 * intro_info가 없는 tour_spots 개수 조회
 * @param {string} contentTypeId - 관광타입 (null이면 전체)
 * @returns {Promise<number>} 개수
 */
export const getTourSpotsWithoutIntroCount = async (contentTypeId = null) => {
  try {
    let query = supabase
      .from('tour_spots')
      .select('*', { count: 'exact', head: true })
      .is('intro_info', null)
    
    if (contentTypeId) {
      query = query.eq('content_type_id', contentTypeId)
    }
    
    const { count, error } = await query
    if (error) throw error
    
    return count || 0
  } catch (err) {
    console.error('Intro info 없는 항목 개수 조회 에러:', err)
    return 0
  }
}

/**
 * TourAPI 숙박 객실정보(room_info) 동기화
 * DB에 저장된 숙박(32) 항목들의 객실정보를 TourAPI에서 가져와 업데이트
 * @param {Function} onProgress - 진행 콜백 (current, total, item)
 * @returns {Promise<Object>} { success, updatedCount, failedCount }
 */
export const syncTourSpotsRoomInfo = async (onProgress = null) => {
  try {
    // room_info가 없는 숙박 항목 조회
    const { data: items, error: selectError } = await supabase
      .from('tour_spots')
      .select('id, content_id, content_type_id, title')
      .eq('content_type_id', '32') // 숙박만
      .is('room_info', null)
      .order('id', { ascending: true })
    
    if (selectError) throw selectError
    
    if (!items || items.length === 0) {
      return { success: true, updatedCount: 0, failedCount: 0, message: 'No items need room info sync', failedItems: [] }
    }
    
    let updatedCount = 0
    let failedCount = 0
    const failedItems = []
    const total = items.length
    
    // 동적 import (순환 참조 방지)
    const { getTourApiRoomInfo } = await import('./api.js')
    
    // 각 항목에 대해 객실정보 조회 및 업데이트
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      try {
        // TourAPI 반복정보 조회 (객실정보)
        const result = await getTourApiRoomInfo(item.content_id, '32')
        
        if (result.success && result.items && result.items.length > 0) {
          // room_info 업데이트 (배열을 JSONB로 저장)
          const { error: updateError } = await supabase
            .from('tour_spots')
            .update({ 
              room_info: result.items,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
          
          if (updateError) {
            console.error(`Update failed for ${item.title}:`, updateError)
            failedCount++
            failedItems.push({
              id: item.id,
              content_id: item.content_id,
              title: item.title,
              reason: `DB update error: ${updateError.message}`
            })
          } else {
            updatedCount++
          }
        } else {
          // 객실정보가 없는 경우 빈 배열로 저장 (재조회 방지)
          await supabase
            .from('tour_spots')
            .update({ 
              room_info: [],
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
          
          console.warn(`[RoomSync] No room data for: ${item.title} (content_id: ${item.content_id})`)
          failedCount++
          failedItems.push({
            id: item.id,
            content_id: item.content_id,
            title: item.title,
            reason: 'API returned no room data'
          })
        }
        
        // 진행 콜백 호출
        if (onProgress) {
          onProgress(i + 1, total, item.title)
        }
        
        // API 호출 간격 (rate limit 방지)
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (err) {
        console.error(`Error syncing room info for ${item.title}:`, err)
        failedCount++
        failedItems.push({
          id: item.id,
          content_id: item.content_id,
          title: item.title,
          reason: err.message
        })
      }
    }
    
    // 실패 항목 요약 로그
    if (failedItems.length > 0) {
      console.warn(`[RoomSync] Failed items (${failedItems.length}):`)
      failedItems.forEach(item => {
        console.warn(`  - ${item.title} (${item.content_id}): ${item.reason}`)
      })
    }
    
    return { 
      success: true, 
      updatedCount, 
      failedCount, 
      total,
      failedItems,
      message: `Updated ${updatedCount}/${total} items` 
    }
  } catch (err) {
    console.error('Room info 동기화 에러:', err)
    return { success: false, updatedCount: 0, failedCount: 0, error: err.message, failedItems: [] }
  }
}

/**
 * room_info가 없는 숙박 tour_spots 개수 조회
 * @returns {Promise<number>} 개수
 */
export const getTourSpotsWithoutRoomCount = async () => {
  try {
    const { count, error } = await supabase
      .from('tour_spots')
      .select('*', { count: 'exact', head: true })
      .eq('content_type_id', '32') // 숙박만
      .is('room_info', null)
    
    if (error) throw error
    
    return count || 0
  } catch (err) {
    console.error('Room info 없는 항목 개수 조회 에러:', err)
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
      
      // 영문 데이터 있는 항목 개수 조회
      const { count: engCount, error: engError } = await supabase
        .from('tour_spots')
        .select('*', { count: 'exact', head: true })
        .eq('content_type_id', typeId)
        .not('title_en', 'is', null)
      
      const hasEngCount = engError ? 0 : (engCount || 0)
      
      stats.spots[typeId] = { name: typeNames[typeId], count, hasEngCount }
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


// ==================== 조회수/좋아요/리뷰 관련 함수 ====================

/**
 * 관광지 조회수 증가 (페이지 방문 시 호출)
 * @param {string} contentId - 관광지 ID
 * @returns {Promise<Object>} { success, viewCount }
 */
export const incrementSpotViews = async (contentId) => {
  try {
    // 먼저 기존 레코드 확인 (maybeSingle 사용)
    const { data: existing, error: selectError } = await supabase
      .from('spot_stats')
      .select('view_count')
      .eq('content_id', contentId)
      .maybeSingle()
    
    if (selectError) {
      console.error('spot_stats 조회 에러:', selectError)
    }
    
    if (existing) {
      // 기존 레코드가 있으면 업데이트
      const { data, error } = await supabase
        .from('spot_stats')
        .update({ 
          view_count: existing.view_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('content_id', contentId)
        .select('view_count')
        .single()
      
      if (error) throw error
      return { success: true, viewCount: data.view_count }
    } else {
      // 없으면 새로 생성
      const { data, error } = await supabase
        .from('spot_stats')
        .insert({ 
          content_id: contentId, 
          view_count: 1,
          like_count: 0
        })
        .select('view_count')
        .single()
      
      if (error) throw error
      return { success: true, viewCount: data.view_count }
    }
  } catch (err) {
    console.error('조회수 증가 에러:', err)
    return { success: false, viewCount: 0 }
  }
}

/**
 * 관광지 통계 조회 (조회수, 좋아요 수)
 * @param {string} contentId - 관광지 ID
 * @returns {Promise<Object>} { success, viewCount, likeCount }
 */
export const getSpotStats = async (contentId) => {
  try {
    const { data, error } = await supabase
      .from('spot_stats')
      .select('view_count, like_count')
      .eq('content_id', contentId)
      .maybeSingle()
    
    if (error) {
      console.error('통계 조회 에러:', error)
    }
    
    return { 
      success: true, 
      viewCount: data?.view_count || 0,
      likeCount: data?.like_count || 0
    }
  } catch (err) {
    console.error('관광지 통계 조회 에러:', err)
    return { success: false, viewCount: 0, likeCount: 0 }
  }
}

/**
 * 좋아요 토글 (로그인 필요)
 * @param {string} contentId - 관광지 ID
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} { success, isLiked, likeCount }
 */
export const toggleSpotLike = async (contentId, userId) => {
  try {
    if (!userId) {
      return { success: false, message: '로그인이 필요합니다', isLiked: false }
    }
    
    // 기존 좋아요 확인 (maybeSingle()은 결과가 없어도 에러를 발생시키지 않음)
    const { data: existing, error: selectError } = await supabase
      .from('spot_likes')
      .select('id')
      .eq('content_id', contentId)
      .eq('user_id', userId)
      .maybeSingle()
    
    if (selectError) {
      console.error('좋아요 확인 에러:', selectError)
      return { success: false, isLiked: false, likeCount: 0 }
    }
    
    if (existing) {
      // 좋아요 취소
      await supabase
        .from('spot_likes')
        .delete()
        .eq('id', existing.id)
      
      // spot_stats 좋아요 수 감소
      await supabase.rpc('decrement_like_count', { p_content_id: contentId })
      
      const stats = await getSpotStats(contentId)
      return { success: true, isLiked: false, likeCount: stats.likeCount }
    } else {
      // 좋아요 추가
      await supabase
        .from('spot_likes')
        .insert({ content_id: contentId, user_id: userId })
      
      // spot_stats 좋아요 수 증가
      await supabase.rpc('increment_like_count', { p_content_id: contentId })
      
      const stats = await getSpotStats(contentId)
      return { success: true, isLiked: true, likeCount: stats.likeCount }
    }
  } catch (err) {
    console.error('좋아요 토글 에러:', err)
    return { success: false, isLiked: false, likeCount: 0 }
  }
}

/**
 * 사용자가 해당 관광지를 좋아요 했는지 확인
 * @param {string} contentId - 관광지 ID
 * @param {string} userId - 사용자 ID
 * @returns {Promise<boolean>}
 */
export const checkSpotLiked = async (contentId, userId) => {
  try {
    if (!userId) return false
    
    const { data, error } = await supabase
      .from('spot_likes')
      .select('id')
      .eq('content_id', contentId)
      .eq('user_id', userId)
      .maybeSingle()
    
    // maybeSingle()은 결과가 없어도 에러를 발생시키지 않음
    if (error) {
      console.warn('좋아요 확인 에러:', error.message)
      return false
    }
    
    return !!data
  } catch {
    return false
  }
}

/**
 * 리뷰 작성
 * @param {Object} reviewData - { contentId, userId, rating, content, userMetadata }
 * @returns {Promise<Object>} { success, review }
 */
export const createSpotReview = async ({ contentId, userId, rating, content, userMetadata }) => {
  try {
    if (!userId) {
      return { success: false, message: '로그인이 필요합니다' }
    }
    
    // 입력 유효성 검사
    if (!contentId) {
      return { success: false, message: '관광지 정보가 없습니다' }
    }
    
    // rating 유효성 검사 (1-5 정수)
    const validRating = Math.floor(Number(rating))
    if (isNaN(validRating) || validRating < 1 || validRating > 5) {
      return { success: false, message: '별점은 1~5 사이여야 합니다' }
    }
    
    // content 유효성 검사 (10-1000자)
    const trimmedContent = String(content || '').trim()
    if (trimmedContent.length < 10) {
      return { success: false, message: '리뷰는 최소 10자 이상이어야 합니다' }
    }
    if (trimmedContent.length > 1000) {
      return { success: false, message: '리뷰는 1000자를 초과할 수 없습니다' }
    }
    
    // 리뷰 삽입
    const { data, error } = await supabase
      .from('spot_reviews')
      .insert({
        content_id: contentId,
        user_id: userId,
        rating: validRating,
        content: trimmedContent
      })
      .select('*')
      .single()
    
    if (error) throw error
    
    // 프로필 정보 조회 또는 생성
    let profile = { nickname: '익명', avatar_url: null }
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nickname, avatar_url')
        .eq('id', userId)
        .maybeSingle()
      
      if (profileData && profileData.nickname) {
        profile = {
          ...profileData,
          avatar_url: toSecureUrl(profileData.avatar_url)
        }
      } else {
        // 프로필이 없거나 닉네임이 없으면 user_metadata에서 생성
        const nickname = userMetadata?.name || userMetadata?.full_name || userMetadata?.email?.split('@')[0] || '사용자'
        const avatar_url = toSecureUrl(userMetadata?.avatar_url || userMetadata?.picture)
        
        // 프로필 upsert
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            nickname: nickname,
            avatar_url: avatar_url,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })
          .select('nickname, avatar_url')
          .maybeSingle()
        
        if (!profileError && newProfile) {
          profile = newProfile
        } else {
          profile = { nickname, avatar_url }
        }
      }
    } catch {
      // 프로필 조회/생성 실패 시 기본값 사용
    }
    
    return { 
      success: true, 
      review: {
        ...data,
        profiles: profile
      }
    }
  } catch (err) {
    console.error('리뷰 작성 에러:', err)
    return { success: false, message: '리뷰 작성에 실패했습니다' }
  }
}

/**
 * 리뷰 목록 조회
 * @param {string} contentId - 관광지 ID
 * @param {Object} options - 옵션 { page, pageSize, sortBy, sortOrder }
 * @param {number} options.page - 페이지 번호 (기본: 1)
 * @param {number} options.pageSize - 페이지당 개수 (기본: 5)
 * @param {string} options.sortBy - 정렬 기준 ('created_at' | 'rating', 기본: 'created_at')
 * @param {string} options.sortOrder - 정렬 순서 ('asc' | 'desc', 기본: 'desc')
 * @returns {Promise<Object>} { success, reviews, totalCount, avgRating, totalPages }
 */
export const getSpotReviews = async (contentId, options = {}) => {
  const {
    page = 1,
    pageSize = 5,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options
  
  try {
    // 전체 개수 조회
    const { count: totalCount } = await supabase
      .from('spot_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('content_id', contentId)
    
    // 평균 평점 조회
    const { data: avgData } = await supabase
      .from('spot_reviews')
      .select('rating')
      .eq('content_id', contentId)
    
    const avgRating = avgData && avgData.length > 0
      ? (avgData.reduce((sum, r) => sum + r.rating, 0) / avgData.length).toFixed(1)
      : 0
    
    // 리뷰 목록 조회
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    // 정렬 기준 검증
    const validSortBy = ['created_at', 'rating'].includes(sortBy) ? sortBy : 'created_at'
    const ascending = sortOrder === 'asc'
    
    const { data: reviews, error } = await supabase
      .from('spot_reviews')
      .select('*')
      .eq('content_id', contentId)
      .order(validSortBy, { ascending })
      .range(from, to)
    
    if (error) throw error
    
    // 각 리뷰에 대해 프로필 정보 별도 조회
    const reviewsWithProfile = await Promise.all(
      (reviews || []).map(async (review) => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nickname, avatar_url')
            .eq('id', review.user_id)
            .maybeSingle()
          
          return {
            ...review,
            profiles: profile ? {
              ...profile,
              avatar_url: toSecureUrl(profile.avatar_url)
            } : { nickname: '익명', avatar_url: null }
          }
        } catch {
          return {
            ...review,
            profiles: { nickname: '익명', avatar_url: null }
          }
        }
      })
    )
    
    const total = totalCount || 0
    const totalPages = Math.ceil(total / pageSize)
    
    return { 
      success: true, 
      reviews: reviewsWithProfile,
      totalCount: total,
      avgRating: parseFloat(avgRating),
      totalPages,
      currentPage: page
    }
  } catch (err) {
    console.error('리뷰 조회 에러:', err)
    return { success: false, reviews: [], totalCount: 0, avgRating: 0, totalPages: 0, currentPage: 1 }
  }
}

/**
 * 리뷰 삭제 (본인만 가능)
 * @param {string} reviewId - 리뷰 ID
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} { success }
 */
export const deleteSpotReview = async (reviewId, userId) => {
  try {
    const { error } = await supabase
      .from('spot_reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', userId)
    
    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('리뷰 삭제 에러:', err)
    return { success: false }
  }
}

/**
 * 좌표 기반 근처 음식점/카페 조회
 * @param {number} lat - 위도 (mapy)
 * @param {number} lng - 경도 (mapx)
 * @param {string} excludeContentId - 제외할 contentId
 * @param {string} foodType - 'restaurant' (일반 맛집) 또는 'cafe' (카페)
 * @param {number} limit - 가져올 개수
 * @returns {Promise<Object>} { success, spots }
 */
export const getNearbyRestaurants = async (lat, lng, excludeContentId, foodType = 'restaurant', limit = 3) => {
  try {
    if (!lat || !lng) {
      return { success: false, spots: [], message: '좌표 정보가 없습니다' }
    }

    // PostgreSQL에서 거리 계산을 위한 RPC 함수가 없으므로,
    // 좌표 범위로 필터링 후 JS에서 거리 계산
    const latRange = 0.015  // 약 1.5km 범위
    const lngRange = 0.018
    
    let query = supabase
      .from('tour_spots')
      .select('content_id, title, firstimage, firstimage2, addr1, mapx, mapy, intro_info')
      .eq('content_type_id', '39')  // 음식점
      .neq('content_id', excludeContentId)
      .gte('mapy', lat - latRange)
      .lte('mapy', lat + latRange)
      .gte('mapx', lng - lngRange)
      .lte('mapx', lng + lngRange)
    
    // 카페/디저트 필터
    if (foodType === 'cafe') {
      query = query.or('title.ilike.%카페%,title.ilike.%커피%,title.ilike.%디저트%,title.ilike.%베이커리%,title.ilike.%빵%')
    } else {
      // 일반 맛집 (카페/커피 제외)
      query = query.not('title', 'ilike', '%카페%')
      query = query.not('title', 'ilike', '%커피%')
    }
    
    const { data, error } = await query.limit(20)  // 더 많이 가져온 후 거리순 정렬
    
    if (error) throw error
    
    // 거리 계산 및 정렬
    const spotsWithDistance = (data || []).map(item => {
      const distance = calculateDistance(lat, lng, parseFloat(item.mapy), parseFloat(item.mapx))
      return {
        contentId: item.content_id,
        name: item.title,
        imageUrl: item.firstimage || item.firstimage2,
        address: item.addr1,
        distance: distance,
        distanceText: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`
      }
    })
    
    // 거리순 정렬 후 limit 적용
    const sortedSpots = spotsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
    
    return { success: true, spots: sortedSpots }
  } catch (err) {
    console.error('근처 맛집 조회 에러:', err)
    return { success: false, spots: [], message: err.message }
  }
}

/**
 * 좌표 기반 근처 숙박 조회
 * @param {number} lat - 위도 (mapy)
 * @param {number} lng - 경도 (mapx)
 * @param {string} excludeContentId - 제외할 contentId
 * @param {number} limit - 가져올 개수
 * @returns {Promise<Object>} { success, spots }
 */
export const getNearbyAccommodations = async (lat, lng, excludeContentId, limit = 3) => {
  try {
    if (!lat || !lng) {
      return { success: false, spots: [], message: '좌표 정보가 없습니다' }
    }

    const latRange = 0.02  // 약 2km 범위
    const lngRange = 0.024
    
    const { data, error } = await supabase
      .from('tour_spots')
      .select('content_id, title, firstimage, firstimage2, addr1, mapx, mapy, intro_info')
      .eq('content_type_id', '32')  // 숙박
      .neq('content_id', excludeContentId)
      .not('firstimage', 'is', null)
      .gte('mapy', lat - latRange)
      .lte('mapy', lat + latRange)
      .gte('mapx', lng - lngRange)
      .lte('mapx', lng + lngRange)
      .limit(20)
    
    if (error) throw error
    
    // 거리 계산 및 정렬
    const spotsWithDistance = (data || []).map(item => {
      const distance = calculateDistance(lat, lng, parseFloat(item.mapy), parseFloat(item.mapx))
      return {
        contentId: item.content_id,
        name: item.title,
        imageUrl: item.firstimage || item.firstimage2,
        address: item.addr1,
        distance: distance,
        distanceText: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`
      }
    })
    
    const sortedSpots = spotsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
    
    return { success: true, spots: sortedSpots }
  } catch (err) {
    console.error('근처 숙박 조회 에러:', err)
    return { success: false, spots: [], message: err.message }
  }
}

/**
 * 좌표 기반 근처 쇼핑 조회
 * @param {number} lat - 위도 (mapy)
 * @param {number} lng - 경도 (mapx)
 * @param {string} excludeContentId - 제외할 contentId
 * @param {number} limit - 가져올 개수
 * @returns {Promise<Object>} { success, spots }
 */
export const getNearbyShopping = async (lat, lng, excludeContentId, limit = 3) => {
  try {
    if (!lat || !lng) {
      return { success: false, spots: [], message: '좌표 정보가 없습니다' }
    }

    const latRange = 0.02  // 약 2km 범위
    const lngRange = 0.024
    
    const { data, error } = await supabase
      .from('tour_spots')
      .select('content_id, title, firstimage, firstimage2, addr1, mapx, mapy, intro_info')
      .eq('content_type_id', '38')  // 쇼핑
      .neq('content_id', excludeContentId)
      .not('firstimage', 'is', null)
      .gte('mapy', lat - latRange)
      .lte('mapy', lat + latRange)
      .gte('mapx', lng - lngRange)
      .lte('mapx', lng + lngRange)
      .limit(20)
    
    if (error) throw error
    
    // 거리 계산 및 정렬
    const spotsWithDistance = (data || []).map(item => {
      const distance = calculateDistance(lat, lng, parseFloat(item.mapy), parseFloat(item.mapx))
      return {
        contentId: item.content_id,
        name: item.title,
        imageUrl: item.firstimage || item.firstimage2,
        address: item.addr1,
        distance: distance,
        distanceText: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`
      }
    })
    
    const sortedSpots = spotsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
    
    return { success: true, spots: sortedSpots }
  } catch (err) {
    console.error('근처 쇼핑 조회 에러:', err)
    return { success: false, spots: [], message: err.message }
  }
}

/**
 * 두 좌표 간 거리 계산 (Haversine 공식, km 단위)
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371  // 지구 반경 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

/**
 * 좌표 기반 근처 관광지 조회
 * @param {number} lat - 위도 (mapy)
 * @param {number} lng - 경도 (mapx)
 * @param {string} excludeContentId - 제외할 contentId
 * @param {number} limit - 가져올 개수
 * @returns {Promise<Object>} { success, spots }
 */
export const getNearbySpots = async (lat, lng, excludeContentId, limit = 4) => {
  try {
    if (!lat || !lng) {
      return { success: false, spots: [], message: '좌표 정보가 없습니다' }
    }

    const latRange = 0.03  // 약 3km 범위
    const lngRange = 0.036
    
    const { data, error } = await supabase
      .from('tour_spots')
      .select('content_id, title, firstimage, firstimage2, addr1, mapx, mapy')
      .in('content_type_id', ['12', '14', '15', '28'])  // 관광지, 문화시설, 축제, 레포츠
      .neq('content_id', excludeContentId)
      .not('firstimage', 'is', null)
      .gte('mapy', lat - latRange)
      .lte('mapy', lat + latRange)
      .gte('mapx', lng - lngRange)
      .lte('mapx', lng + lngRange)
      .limit(20)
    
    if (error) throw error
    
    // 거리 계산 및 정렬
    const spotsWithDistance = (data || []).map(item => {
      const distance = calculateDistance(lat, lng, parseFloat(item.mapy), parseFloat(item.mapx))
      return {
        contentId: item.content_id,
        name: item.title,
        imageUrl: item.firstimage || item.firstimage2,
        address: item.addr1,
        distance: distance,
        distanceText: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`
      }
    })
    
    const sortedSpots = spotsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
    
    return { success: true, spots: sortedSpots }
  } catch (err) {
    console.error('근처 관광지 조회 에러:', err)
    return { success: false, spots: [], message: err.message }
  }
}

/**
 * 주변 관광지 조회 (같은 구 지역)
 * @param {string} address - 주소 (예: 대전광역시 유성구...)
 * @param {string} excludeContentId - 제외할 관광지 contentId
 * @param {number} limit - 가져올 개수 (기본 4)
 * @returns {Promise<Object>} { success, spots }
 */
export const getSpotsByDistrict = async (address, excludeContentId, limit = 4) => {
  try {
    // 주소에서 구 이름 추출 (예: 유성구, 서구, 중구 등)
    const district = address?.split(' ').find(part => part.includes('구'))
    
    if (!district) {
      return { success: false, spots: [], message: '구 정보를 찾을 수 없습니다' }
    }
    
    const { data, error } = await supabase
      .from('tour_spots')
      .select('content_id, title, firstimage, firstimage2, addr1')
      .ilike('addr1', `%${district}%`)
      .neq('content_id', excludeContentId)
      .not('firstimage', 'is', null)
      .limit(limit)
    
    if (error) throw error
    
    const spots = (data || []).map(item => ({
      contentId: item.content_id,
      name: item.title,
      imageUrl: item.firstimage || item.firstimage2,
      address: item.addr1
    }))
    
    return { success: true, spots }
  } catch (err) {
    console.error('주변 관광지 조회 에러:', err)
    return { success: false, spots: [], message: err.message }
  }
}

/**
 * AI Description이 없는 음식점(39) 개수 조회
 * @returns {Promise<number>} 개수
 */
export const getRestaurantsWithoutAiDescCount = async () => {
  try {
    // intro_info가 없거나 intro_info.ai_description이 없는 음식점(39) 조회
    const { data, error } = await supabase
      .from('tour_spots')
      .select('id, intro_info')
      .eq('content_type_id', '39')
      .not('overview', 'is', null)
    
    if (error) throw error
    
    // ai_description이 없는 항목만 카운트
    const count = (data || []).filter(item => 
      !item.intro_info?.ai_description
    ).length
    
    return count
  } catch (err) {
    console.error('AI description 없는 음식점 개수 조회 에러:', err)
    return 0
  }
}

/**
 * AI Description이 없는 음식점 목록 조회
 * @param {number} limit - 조회 개수 (기본 10)
 * @returns {Promise<Array>} 음식점 목록
 */
export const getRestaurantsWithoutAiDesc = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('tour_spots')
      .select('id, content_id, title, addr1, overview, intro_info')
      .eq('content_type_id', '39')
      .not('overview', 'is', null)
      .order('id', { ascending: true })
    
    if (error) throw error
    
    // ai_description이 없는 항목만 필터
    const filtered = (data || []).filter(item => 
      !item.intro_info?.ai_description
    ).slice(0, limit)
    
    return filtered
  } catch (err) {
    console.error('AI description 없는 음식점 조회 에러:', err)
    return []
  }
}

/**
 * n8n webhook으로 음식점 데이터 전송 (AI description 생성 요청)
 * @param {string} webhookUrl - n8n webhook URL
 * @param {Array} restaurants - 음식점 목록
 * @param {Function} onProgress - 진행 콜백 (current, total, item)
 * @param {Function} onLog - 로그 콜백 (type, message, data)
 * @returns {Promise<Object>} { success, sentCount, failedCount }
 */
export const sendRestaurantsToN8n = async (webhookUrl, restaurants, onProgress = null, onLog = null) => {
  if (!webhookUrl || !restaurants || restaurants.length === 0) {
    return { success: false, sentCount: 0, failedCount: 0, message: 'Invalid parameters' }
  }

  let sentCount = 0
  let failedCount = 0
  const total = restaurants.length
  const failedItems = []

  for (let i = 0; i < restaurants.length; i++) {
    const item = restaurants[i]
    
    if (onProgress) {
      onProgress(i + 1, total, item.title)
    }

    try {
      const payload = {
        contentid: item.content_id,
        title: item.title,
        addr1: item.addr1,
        overview: item.overview
      }

      if (onLog) {
        onLog('info', `[${i + 1}/${total}] 전송 중: ${item.title}`, { content_id: item.content_id })
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        sentCount++
        if (onLog) {
          onLog('success', `✅ ${item.title} 전송 완료`, { content_id: item.content_id, status: response.status })
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // API 과부하 방지 - 100ms 대기
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (err) {
      failedCount++
      failedItems.push({ content_id: item.content_id, title: item.title, error: err.message })
      if (onLog) {
        onLog('error', `❌ ${item.title} 전송 실패: ${err.message}`, { content_id: item.content_id })
      }
    }
  }

  return { 
    success: true, 
    sentCount, 
    failedCount, 
    total,
    failedItems 
  }
}

/**
 * tour_spots의 intro_info에 AI description과 FAQ 저장
 * @param {string} contentId - content_id
 * @param {Object} aiData - { ai_description, faq }
 * @returns {Promise<Object>} { success, error }
 */
export const saveAiDescriptionToDb = async (contentId, aiData) => {
  try {
    // 기존 intro_info 조회
    const { data: existing, error: selectError } = await supabase
      .from('tour_spots')
      .select('intro_info')
      .eq('content_id', contentId)
      .single()
    
    if (selectError && selectError.code !== 'PGRST116') throw selectError
    
    const existingIntro = existing?.intro_info || {}
    const newIntro = {
      ...existingIntro,
      ...(aiData.ai_description && { ai_description: aiData.ai_description }),
      ...(aiData.faq && { faq: aiData.faq }),
      ai_updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('tour_spots')
      .update({ intro_info: newIntro })
      .eq('content_id', contentId)
    
    if (updateError) throw updateError
    
    return { success: true }
  } catch (err) {
    console.error('AI description 저장 에러:', err)
    return { success: false, error: err.message }
  }
}

// ============================================================
// 카테고리별 AI Description 생성 (n8n) 함수들
// ============================================================

// 콘텐츠 타입별 intro_info 필드 매핑
const INTRO_FIELDS_BY_TYPE = {
  '12': [ // 관광지
    { key: 'usetime', label: '운영시간' },
    { key: 'restdate', label: '휴무일' },
    { key: 'parking', label: '주차' },
    { key: 'infocenter', label: '문의' }
  ],
  '14': [ // 문화시설
    { key: 'usetimeculture', label: '운영시간' },
    { key: 'restdateculture', label: '휴무일' },
    { key: 'usefee', label: '이용요금' },
    { key: 'parkingculture', label: '주차' },
    { key: 'infocenterculture', label: '문의' }
  ],
  '28': [ // 레포츠
    { key: 'usetimeleports', label: '이용시간' },
    { key: 'usefeeleports', label: '이용요금' },
    { key: 'restdateleports', label: '휴무일' },
    { key: 'infocenterleports', label: '문의' },
    { key: 'parkingleports', label: '주차' }
  ],
  '32': [ // 숙박
    { key: 'checkintime', label: '체크인' },
    { key: 'checkouttime', label: '체크아웃' },
    { key: 'roomcount', label: '객실수' },
    { key: 'subfacility', label: '부대시설' },
    { key: 'parkinglodging', label: '주차' },
    { key: 'infocenterlodging', label: '문의' }
  ],
  '38': [ // 쇼핑
    { key: 'opentime', label: '영업시간' },
    { key: 'saleitem', label: '판매품목' },
    { key: 'restdateshopping', label: '휴무일' },
    { key: 'parkingshopping', label: '주차' },
    { key: 'infocentershopping', label: '문의' }
  ],
  '39': [ // 음식점
    { key: 'firstmenu', label: '대표메뉴' },
    { key: 'treatmenu', label: '취급메뉴' },
    { key: 'opentimefood', label: '영업시간' },
    { key: 'restdatefood', label: '휴무일' },
    { key: 'parkingfood', label: '주차' },
    { key: 'infocenterfood', label: '문의' }
  ]
}

/**
 * 카테고리별 AI Description이 없는 항목 개수 조회
 * @param {string} contentTypeId - 콘텐츠 타입 ID (12, 14, 28, 32, 38, 39)
 * @returns {Promise<number>} 개수
 */
export const getSpotsByTypeWithoutAiDescCount = async (contentTypeId) => {
  try {
    const { data, error } = await supabase
      .from('tour_spots')
      .select('id, intro_info')
      .eq('content_type_id', contentTypeId)
      .not('overview', 'is', null)
    
    if (error) throw error
    
    // ai_description이 없는 항목만 카운트
    const count = (data || []).filter(item => 
      !item.intro_info?.ai_description
    ).length
    
    return count
  } catch (err) {
    console.error(`AI description 없는 항목(type ${contentTypeId}) 개수 조회 에러:`, err)
    return 0
  }
}

/**
 * 카테고리별 AI Description이 없는 항목 목록 조회
 * @param {string} contentTypeId - 콘텐츠 타입 ID
 * @param {number} limit - 조회 개수 (기본 10)
 * @returns {Promise<Array>} 항목 목록
 */
export const getSpotsByTypeWithoutAiDesc = async (contentTypeId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('tour_spots')
      .select('id, content_id, title, addr1, overview, intro_info')
      .eq('content_type_id', contentTypeId)
      .not('overview', 'is', null)
      .order('id', { ascending: true })
    
    if (error) throw error
    
    // ai_description이 없는 항목만 필터
    const filtered = (data || []).filter(item => 
      !item.intro_info?.ai_description
    ).slice(0, limit)
    
    return filtered
  } catch (err) {
    console.error(`AI description 없는 항목(type ${contentTypeId}) 조회 에러:`, err)
    return []
  }
}

/**
 * overview와 intro_info를 합쳐서 하나의 텍스트로 만들기
 * @param {Object} item - 관광지 데이터
 * @param {string} contentTypeId - 콘텐츠 타입 ID
 * @returns {string} 합쳐진 텍스트
 */
export const combineSpotDataForAi = (item, contentTypeId) => {
  const intro = item.intro_info || {}
  const fields = INTRO_FIELDS_BY_TYPE[contentTypeId] || []
  
  // intro_info에서 유효한 값만 추출
  const introFields = []
  for (const { key, label } of fields) {
    if (intro[key]) {
      const value = intro[key].replace(/<br>/g, ', ').replace(/<[^>]*>/g, '')
      introFields.push(`${label}: ${value}`)
    }
  }
  
  const introText = introFields.length > 0 ? introFields.join(' / ') : ''
  
  // title + addr1 + overview + intro_info 전부 합치기
  let combinedText = item.title
  if (item.addr1) combinedText += `\n주소: ${item.addr1}`
  if (item.overview) combinedText += `\n\n${item.overview}`
  if (introText) combinedText += `\n\n[이용안내] ${introText}`
  
  return combinedText
}

/**
 * 카테고리별 n8n webhook으로 데이터 전송 (AI description 생성 요청)
 * @param {string} webhookUrl - n8n production webhook URL
 * @param {Array} items - 관광지 목록
 * @param {string} contentTypeId - 콘텐츠 타입 ID
 * @param {Function} onProgress - 진행 콜백 (current, total, item)
 * @param {Function} onLog - 로그 콜백 (type, message, data)
 * @returns {Promise<Object>} { success, sentCount, failedCount, failedItems }
 */
export const sendSpotsToN8nByType = async (webhookUrl, items, contentTypeId, onProgress = null, onLog = null) => {
  if (!webhookUrl || !items || items.length === 0) {
    return { success: false, sentCount: 0, failedCount: 0, message: 'Invalid parameters' }
  }

  let sentCount = 0
  let failedCount = 0
  const total = items.length
  const failedItems = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    
    if (onProgress) {
      onProgress(i + 1, total, item.title)
    }

    try {
      // overview와 intro_info를 합쳐서 전송
      const combinedOverview = combineSpotDataForAi(item, contentTypeId)
      
      const payload = {
        contentid: item.content_id,
        overview: combinedOverview
      }

      if (onLog) {
        onLog('info', `[${i + 1}/${total}] 전송 중: ${item.title}`, { content_id: item.content_id })
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        sentCount++
        if (onLog) {
          onLog('success', `✅ ${item.title} 전송 완료`, { content_id: item.content_id, status: response.status })
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // n8n 처리 시간 확보 및 Gemini API Rate Limit 방지를 위해 2분 대기
      if (i < items.length - 1) {  // 마지막 아이템은 대기 안함
        if (onLog) {
          onLog('info', `⏳ 다음 요청까지 2분 대기...`)
        }
        await new Promise(resolve => setTimeout(resolve, 120000))
      }
      
    } catch (err) {
      failedCount++
      failedItems.push({ content_id: item.content_id, title: item.title, error: err.message })
      if (onLog) {
        onLog('error', `❌ ${item.title} 전송 실패: ${err.message}`, { content_id: item.content_id })
      }
    }
  }

  return { 
    success: true, 
    sentCount, 
    failedCount, 
    total,
    failedItems 
  }
}

