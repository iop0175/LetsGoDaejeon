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
    const items = (data || []).map(item => {
      if (item.raw_data && typeof item.raw_data === 'object') {
        return { ...item.raw_data, _id: item.id, _saved_at: item.saved_at }
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
    const items = (data || []).map(item => {
      if (item.raw_data && typeof item.raw_data === 'object') {
        return { ...item.raw_data, _id: item.id, _saved_at: item.saved_at }
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

export { TABLE_CONFIGS }
