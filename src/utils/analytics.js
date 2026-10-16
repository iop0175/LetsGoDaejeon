import { CITY } from '../config/cities'

// 대전 사이트만 GA 사용자 지정 이벤트를 보낸다. 다른 도시는 정식 공개 전까지 보내지 않는다.
const ENABLED = CITY.key === 'daejeon'

export const trackEvent = (name, params = {}, tries = 0) => {
  if (!ENABLED || typeof window === 'undefined') return
  // GA 스크립트는 lazyOnload라 늦게 뜬다. 준비될 때까지 짧게 재시도한다.
  if (typeof window.gtag !== 'function') {
    if (tries < 30) setTimeout(() => trackEvent(name, params, tries + 1), 500)
    return
  }
  window.gtag('event', name, { city: CITY.key, ...params })
}

// 링크 클릭을 이벤트 이름으로 분류한다. 해당 없으면 null.
export const classifyLink = (href = '') => {
  if (/^https:\/\/map\.kakao\.com\/link\//.test(href) || /^https:\/\/www\.google\.com\/maps\/dir\//.test(href)) return 'directions_click'
  if (href.startsWith('tel:')) return 'call_click'
  return null
}
