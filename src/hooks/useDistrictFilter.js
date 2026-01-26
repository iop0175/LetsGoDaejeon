import { useState, useEffect, useMemo, useCallback } from 'react'
import { extractDistrict, getDongFromAddr } from '../utils/constants'

/**
 * 구/동 필터링 및 페이지네이션 커스텀 훅
 * @param {Array} data - 필터링할 전체 데이터 배열
 * @param {Object} options - 옵션
 * @param {number} options.itemsPerPage - 페이지당 항목 수 (기본: 12)
 * @param {string} options.addressField - 주소 필드명 (기본: 'address')
 * @param {string} options.defaultSort - 기본 정렬 필드
 * @param {Function} options.sortFn - 커스텀 정렬 함수 (sortBy, a, b) => number
 * @returns {Object} 필터링된 데이터 및 상태 관리 함수들
 */
export const useDistrictFilter = (data, options = {}) => {
  const {
    itemsPerPage = 12,
    addressField = 'address',
    defaultSort = 'name',
    sortFn = null
  } = options

  const [districtFilter, setDistrictFilter] = useState('all')
  const [dongFilter, setDongFilter] = useState('all')
  const [sortBy, setSortBy] = useState(defaultSort)
  const [currentPage, setCurrentPage] = useState(1)

  // 구 변경 시 동 필터 리셋
  useEffect(() => {
    setDongFilter('all')
    setCurrentPage(1)
  }, [districtFilter])

  // 필터/정렬 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [dongFilter, sortBy])

  // 선택된 구의 동 목록 추출
  const availableDongs = useMemo(() => {
    if (districtFilter === 'all') return []
    
    const dongsSet = new Set()
    data.forEach(item => {
      const addr = item[addressField]
      if (addr) {
        const location = extractDistrict(addr)
        if (location.district === districtFilter) {
          const dong = getDongFromAddr(addr)
          if (dong) dongsSet.add(dong)
        }
      }
    })
    return Array.from(dongsSet).sort((a, b) => a.localeCompare(b, 'ko'))
  }, [data, districtFilter, addressField])

  // 필터링 및 정렬된 데이터
  const filteredData = useMemo(() => {
    let result = [...data]
    
    // 구별 필터링
    if (districtFilter !== 'all') {
      result = result.filter(item => {
        const addr = item[addressField]
        if (!addr) return false
        const location = extractDistrict(addr)
        return location.district === districtFilter
      })
    }
    
    // 동별 필터링
    if (dongFilter !== 'all') {
      result = result.filter(item => {
        const addr = item[addressField]
        if (!addr) return false
        const dong = getDongFromAddr(addr)
        return dong === dongFilter
      })
    }
    
    // 정렬 적용
    if (sortFn) {
      result.sort((a, b) => sortFn(sortBy, a, b))
    } else {
      // 기본 정렬 로직
      if (sortBy === 'name') {
        result.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || '', 'ko'))
      } else if (sortBy === 'views') {
        result.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      }
    }
    
    return result
  }, [data, districtFilter, dongFilter, sortBy, addressField, sortFn])

  // 페이지네이션된 데이터
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  // 총 페이지 수
  const totalPages = useMemo(() => 
    Math.ceil(filteredData.length / itemsPerPage),
    [filteredData.length, itemsPerPage]
  )

  // 페이지 변경 핸들러
  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages || 1)))
  }, [totalPages])

  // 필터 리셋
  const resetFilters = useCallback(() => {
    setDistrictFilter('all')
    setDongFilter('all')
    setSortBy(defaultSort)
    setCurrentPage(1)
  }, [defaultSort])

  return {
    // 상태
    districtFilter,
    dongFilter,
    sortBy,
    currentPage,
    totalPages,
    
    // 필터링된 데이터
    filteredData,
    paginatedData,
    availableDongs,
    totalCount: filteredData.length,
    
    // 상태 변경 함수
    setDistrictFilter,
    setDongFilter,
    setSortBy,
    goToPage,
    setCurrentPage,
    resetFilters
  }
}

export default useDistrictFilter
