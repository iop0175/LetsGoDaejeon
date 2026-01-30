// IndexNow 유틸리티 - 클라이언트 및 서버에서 사용
const INDEXNOW_KEY = '6d0d01a5802bbad93fbd878628659588'
const SITE_URL = 'https://letsgodaejeon.kr'

/**
 * IndexNow에 URL 제출
 * @param {string|string[]} urls - 제출할 URL(들)
 * @returns {Promise<{success: boolean, results?: any}>}
 */
export async function submitToIndexNow(urls) {
  const urlList = Array.isArray(urls) ? urls : [urls]
  
  try {
    const response = await fetch('/api/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INDEXNOW_KEY}`,
      },
      body: JSON.stringify({ urls: urlList }),
    })
    
    const data = await response.json()
    return { success: response.ok, ...data }
  } catch (error) {
    console.error('IndexNow submit error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 관광지/맛집 URL 생성 및 IndexNow 제출
 * @param {string} title - 장소 이름
 * @param {string|number} contentId - 콘텐츠 ID
 */
export async function submitSpotToIndexNow(title, contentId) {
  const slug = encodeURIComponent(`${title}-${contentId}`)
  const url = `/spot/${slug}`
  return submitToIndexNow(url)
}

/**
 * 여러 URL 일괄 제출 (최대 10000개)
 * @param {string[]} urls - URL 배열
 */
export async function submitBulkToIndexNow(urls) {
  const chunks = []
  for (let i = 0; i < urls.length; i += 1000) {
    chunks.push(urls.slice(i, i + 1000))
  }
  
  const results = []
  for (const chunk of chunks) {
    const result = await submitToIndexNow(chunk)
    results.push(result)
    // Rate limiting: 1초 대기
    if (chunks.length > 1) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  
  return {
    success: results.every(r => r.success),
    totalSubmitted: urls.length,
    results,
  }
}

export { INDEXNOW_KEY, SITE_URL }
