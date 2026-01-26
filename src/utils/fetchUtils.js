/**
 * 타임아웃이 적용된 안전한 fetch 래퍼
 * @param {string} url - 요청 URL
 * @param {Object} options - fetch 옵션
 * @param {number} timeout - 타임아웃 (ms), 기본 10초
 * @returns {Promise<Response>}
 */
export const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.')
    }
    throw error
  }
}

/**
 * JSON 응답을 반환하는 안전한 fetch
 * @param {string} url - 요청 URL
 * @param {Object} options - fetch 옵션
 * @param {number} timeout - 타임아웃 (ms)
 * @returns {Promise<any>} 파싱된 JSON 데이터
 */
export const safeFetch = async (url, options = {}, timeout = 10000) => {
  const response = await fetchWithTimeout(url, options, timeout)
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`)
  }
  
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }
  
  // JSON이 아닌 경우 텍스트로 반환
  return response.text()
}

/**
 * JSON 응답을 기대하되, 실패해도 기본값 반환
 * @param {string} url - 요청 URL
 * @param {Object} options - fetch 옵션
 * @param {any} defaultValue - 실패 시 반환할 기본값
 * @param {number} timeout - 타임아웃 (ms)
 * @returns {Promise<any>}
 */
export const safeFetchWithDefault = async (url, options = {}, defaultValue = null, timeout = 10000) => {
  try {
    return await safeFetch(url, options, timeout)
  } catch (error) {
    console.warn(`Fetch failed for ${url}:`, error.message)
    return defaultValue
  }
}

/**
 * localStorage 안전 읽기
 * @param {string} key - 키
 * @param {any} defaultValue - 실패 시 기본값
 * @returns {any}
 */
export const safeGetItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue
    return JSON.parse(item)
  } catch (error) {
    console.warn(`Failed to read localStorage key "${key}":`, error.message)
    return defaultValue
  }
}

/**
 * localStorage 안전 쓰기
 * @param {string} key - 키
 * @param {any} value - 저장할 값
 * @returns {boolean} 성공 여부
 */
export const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`Failed to write localStorage key "${key}":`, error.message)
    return false
  }
}

export default {
  fetchWithTimeout,
  safeFetch,
  safeFetchWithDefault,
  safeGetItem,
  safeSetItem
}
