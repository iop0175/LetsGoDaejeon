import { useState, useEffect, useCallback } from 'react'

/**
 * 비동기 데이터 로딩 커스텀 훅
 * @param {Function} fetchFn - 데이터를 가져오는 비동기 함수
 * @param {Array} deps - 의존성 배열 (이 값들이 변경되면 다시 로드)
 * @param {Object} options - 옵션
 * @param {boolean} options.immediate - 즉시 로드 여부 (기본: true)
 * @param {any} options.initialData - 초기 데이터 값 (기본: [])
 * @param {Function} options.onSuccess - 성공 시 콜백
 * @param {Function} options.onError - 실패 시 콜백
 * @returns {Object} 데이터, 로딩 상태, 에러, 리로드 함수
 */
export const useAsyncData = (fetchFn, deps = [], options = {}) => {
  const {
    immediate = true,
    initialData = [],
    onSuccess = null,
    onError = null
  } = options

  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await fetchFn()
      setData(result)
      onSuccess?.(result)
      return result
    } catch (err) {
      const errorMessage = err?.message || '데이터를 불러오는데 실패했습니다.'
      setError(errorMessage)
      onError?.(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchFn, onSuccess, onError])

  useEffect(() => {
    if (immediate) {
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return {
    data,
    setData,
    loading,
    error,
    reload: load,
    isLoading: loading,
    isError: !!error
  }
}

/**
 * 페이지 방문 기록 훅
 * @param {string} pageName - 페이지 이름
 */
export const usePageVisit = (pageName) => {
  useEffect(() => {
    // 서버에 페이지 방문 기록
    const recordVisit = async () => {
      try {
        const { recordPageVisitDb } = await import('../services/dbService')
        await recordPageVisitDb(pageName)
      } catch (err) {
        // 방문 기록 실패는 무시
      }
    }
    recordVisit()
  }, [pageName])
}

export default useAsyncData
