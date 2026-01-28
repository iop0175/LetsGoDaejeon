/**
 * SEO 친화적 slug 생성 유틸리티 (한국어 버전)
 * 
 * 규칙:
 * - 한국어 그대로 사용
 * - 소문자 영문은 그대로 유지
 * - 공백은 하이픈(-)으로 대체
 * - 특수문자 제거
 */

/**
 * SEO 친화적 slug 생성 (한국어 유지)
 * @param {string} title - 제목 (한글 또는 영문)
 * @param {string|number} contentId - 고유 식별자 (중복 방지용)
 * @returns {string} SEO 친화적 slug
 * 
 * 예시:
 * - "대전엑스포과학공원" → "대전엑스포과학공원-741658"
 * - "성심당 본점" → "성심당-본점-123456"
 * - "Expo Science Park" → "expo-science-park-741658"
 */
export const generateSlug = (title, contentId) => {
  if (!title) return String(contentId || 'unknown')
  
  let slug = title
  
  // 1. 소문자로 변환 (영문만)
  slug = slug.split('').map(char => {
    // 영문이면 소문자로
    if (/[A-Z]/.test(char)) return char.toLowerCase()
    return char
  }).join('')
  
  // 2. 마침표(.)를 하이픈(-)으로 변환
  slug = slug.replace(/\./g, '-')
  
  // 3. 특수문자 제거 (한글, 영문, 숫자, 공백, 하이픈만 유지)
  slug = slug.replace(/[^가-힣a-z0-9\s-]/g, '')
  
  // 3. 연속된 공백을 하나로
  slug = slug.replace(/\s+/g, ' ').trim()
  
  // 4. 공백을 하이픈으로 변환
  slug = slug.replace(/\s/g, '-')
  
  // 5. 연속된 하이픈 정리
  slug = slug.replace(/-+/g, '-')
  
  // 6. 시작/끝 하이픈 제거
  slug = slug.replace(/^-|-$/g, '')
  
  // 7. contentId 추가 (중복 방지 + 유일성 보장)
  if (contentId) {
    slug = `${slug}-${contentId}`
  }
  
  // 8. 빈 slug 방지
  if (!slug || slug === String(contentId)) {
    return String(contentId || 'unknown')
  }
  
  // 9. Next.js에서 자동으로 URL 인코딩하므로 인코딩하지 않음
  return slug
}

/**
 * Slug에서 contentId 추출
 * @param {string} slug - URL slug (인코딩되거나 디코딩된 상태 모두 지원)
 * @returns {string|null} contentId
 * 
 * 예시:
 * - "대전엑스포과학공원-741658" → "741658"
 * - "성심당-본점-123456" → "123456"
 */
export const extractContentIdFromSlug = (slug) => {
  if (!slug) return null
  
  // URL 디코딩 시도 (이미 디코딩된 경우에도 안전)
  let decoded = slug
  try {
    decoded = decodeURIComponent(slug)
  } catch {
    // 이미 디코딩된 상태면 그대로 사용
  }
  
  // 마지막 하이픈 이후의 숫자 추출
  const match = decoded.match(/-(\d+)$/)
  if (match) {
    return match[1]
  }
  
  // 전체가 숫자인 경우 (기존 contentId 형식 호환)
  if (/^\d+$/.test(decoded)) {
    return decoded
  }
  
  return null
}

/**
 * 기존 contentId URL을 slug URL로 변환
 * @param {object} spot - 관광지 데이터
 * @returns {string} slug
 */
export const spotToSlug = (spot) => {
  const title = spot.title || spot.name || spot.tourspotNm
  const contentId = spot.content_id || spot.contentId
  return generateSlug(title, contentId)
}

/**
 * 여러 관광지 데이터에 slug 필드 추가
 * @param {Array} spots - 관광지 배열
 * @returns {Array} slug가 추가된 관광지 배열
 */
export const addSlugsToSpots = (spots) => {
  if (!Array.isArray(spots)) return []
  
  return spots.map(spot => ({
    ...spot,
    slug: spotToSlug(spot)
  }))
}
