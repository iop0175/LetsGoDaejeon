/**
 * 이미지 URL 유틸리티
 * Mixed Content 문제 해결 및 이미지 오류 처리
 */

// 기본 대체 이미지 경로
export const DEFAULT_IMAGE = '/images/no-image.svg'

/**
 * http:// URL을 https://로 변환
 * 보안 연결을 위해 이미지 URL을 HTTPS로 업그레이드
 * @param {string} url - 원본 이미지 URL
 * @returns {string} HTTPS로 변환된 URL 또는 원본 URL
 */
export const toSecureUrl = (url) => {
  if (!url) return null
  
  // 이미 HTTPS이거나 상대 경로인 경우 그대로 반환
  if (url.startsWith('https://') || url.startsWith('/') || url.startsWith('data:')) {
    return url
  }
  
  // http://를 https://로 변환
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://')
  }
  
  // 프로토콜이 없는 경우 (//로 시작)
  if (url.startsWith('//')) {
    return `https:${url}`
  }
  
  return url
}

/**
 * 이미지 URL이 유효한지 검증
 * @param {string} url - 검증할 이미지 URL
 * @returns {Promise<boolean>} 유효 여부
 */
export const isValidImageUrl = async (url) => {
  if (!url) return false
  
  return new Promise((resolve) => {
    const img = new Image()
    const timeout = setTimeout(() => {
      resolve(false)
    }, 5000) // 5초 타임아웃
    
    img.onload = () => {
      clearTimeout(timeout)
      resolve(true)
    }
    
    img.onerror = () => {
      clearTimeout(timeout)
      resolve(false)
    }
    
    img.src = toSecureUrl(url)
  })
}

/**
 * 안전한 이미지 URL 반환 (HTTPS 변환 + 폴백)
 * @param {string} url - 원본 이미지 URL
 * @param {string} fallback - 대체 이미지 URL (기본: DEFAULT_IMAGE)
 * @returns {string} 안전한 이미지 URL
 */
export const getSafeImageUrl = (url, fallback = DEFAULT_IMAGE) => {
  if (!url) return fallback
  return toSecureUrl(url)
}

/**
 * 이미지 로드 오류 시 대체 이미지로 교체하는 핸들러
 * @param {Event} event - 이미지 오류 이벤트
 * @param {string} fallback - 대체 이미지 URL
 */
export const handleImageError = (event, fallback = DEFAULT_IMAGE) => {
  const img = event.target
  
  // 무한 루프 방지: 이미 대체 이미지를 시도했으면 중단
  if (img.dataset.fallbackApplied === 'true') {
    return
  }
  
  img.dataset.fallbackApplied = 'true'
  img.src = fallback
}

/**
 * 이미지 태그용 props 생성 (오류 처리 포함)
 * @param {string} url - 원본 이미지 URL
 * @param {string} alt - 대체 텍스트
 * @param {string} fallback - 대체 이미지 URL
 * @returns {Object} img 태그에 사용할 props
 */
export const getImageProps = (url, alt = '', fallback = DEFAULT_IMAGE) => {
  return {
    src: getSafeImageUrl(url, fallback),
    alt,
    onError: (e) => handleImageError(e, fallback)
  }
}

/**
 * 백그라운드 이미지 스타일 생성 (안전한 URL 사용)
 * @param {string} url - 원본 이미지 URL
 * @param {string} fallback - 대체 이미지 URL
 * @returns {Object} backgroundImage 스타일 객체
 */
export const getBackgroundImageStyle = (url, fallback = DEFAULT_IMAGE) => {
  const safeUrl = getSafeImageUrl(url, fallback)
  return {
    backgroundImage: `url(${safeUrl})`
  }
}

/**
 * 알려진 문제 있는 도메인 목록
 * SSL 인증서 오류 등으로 접근이 어려운 도메인
 */
const PROBLEMATIC_DOMAINS = [
  'livingindaejeon.or.kr',
  // 필요시 추가
]

/**
 * 이미지 URL이 문제가 있는 도메인인지 확인
 * @param {string} url - 확인할 URL
 * @returns {boolean} 문제 있는 도메인 여부
 */
export const isProblematicDomain = (url) => {
  if (!url) return false
  
  try {
    const urlObj = new URL(url.startsWith('//') ? `https:${url}` : url)
    return PROBLEMATIC_DOMAINS.some(domain => urlObj.hostname.includes(domain))
  } catch {
    return false
  }
}

/**
 * 안전한 이미지 URL 반환 (문제 도메인 체크 포함)
 * @param {string} url - 원본 이미지 URL
 * @param {string} fallback - 대체 이미지 URL
 * @returns {string} 안전한 이미지 URL
 */

// 이미 경고한 URL 추적 (중복 경고 방지)
const warnedUrls = new Set()

export const getReliableImageUrl = (url, fallback = DEFAULT_IMAGE) => {
  if (!url) return fallback
  
  // 문제가 있는 도메인이면 바로 대체 이미지 반환
  if (isProblematicDomain(url)) {
    // 중복 경고 방지: 같은 URL은 한 번만 처리
    if (!warnedUrls.has(url)) {
      warnedUrls.add(url)
    }
    return fallback
  }
  
  return toSecureUrl(url)
}

/**
 * HTML 특수문자를 이스케이프하여 XSS 공격 방지
 * @param {string} text - 이스케이프할 텍스트
 * @returns {string} 이스케이프된 텍스트
 */
export const escapeHtml = (text) => {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * TourAPI intro_info의 HTML 태그를 정리
 * <br> 태그를 줄바꿈으로 변환하고, 불필요한 HTML 태그 제거
 * @param {string} htmlText - TourAPI에서 받은 HTML 포함 텍스트
 * @param {string} separator - 줄바꿈 대체 문자 (기본: ' / ')
 * @returns {string} 정리된 텍스트
 */
export const cleanIntroHtml = (htmlText, separator = ' / ') => {
  if (!htmlText) return ''
  
  let text = htmlText
  
  // <br>, <br/>, <br /> 태그를 separator로 변환
  text = text.replace(/<br\s*\/?>/gi, separator)
  
  // 나머지 HTML 태그 제거 (a, strong, em 등)
  text = text.replace(/<[^>]+>/g, '')
  
  // HTML 엔티티 디코딩
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  text = textarea.value
  
  // 연속된 공백/separator 정리
  text = text.replace(new RegExp(`(${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})+`, 'g'), separator)
  
  // 시작과 끝의 separator 제거
  text = text.replace(new RegExp(`^${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'g'), '')
  
  return text.trim()
}

/**
 * TourAPI intro_info HTML을 안전한 HTML로 변환 (br 태그만 유지)
 * @param {string} htmlText - TourAPI에서 받은 HTML 포함 텍스트
 * @returns {string} br 태그만 포함된 안전한 HTML
 */
export const sanitizeIntroHtml = (htmlText) => {
  if (!htmlText) return ''
  
  let text = htmlText
  
  // <br> 태그를 임시 placeholder로 대체
  const brPlaceholder = '[[BR]]'
  text = text.replace(/<br\s*\/?>/gi, brPlaceholder)
  
  // 나머지 HTML 태그 제거
  text = text.replace(/<[^>]+>/g, '')
  
  // HTML 엔티티 디코딩
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  text = textarea.value
  
  // placeholder를 <br/> 태그로 복원
  text = text.replace(new RegExp(brPlaceholder.replace(/[[\]]/g, '\\$&'), 'g'), '<br/>')
  
  // 연속된 <br/> 정리
  text = text.replace(/(<br\s*\/?>)+/gi, '<br/>')
  
  return text.trim()
}
