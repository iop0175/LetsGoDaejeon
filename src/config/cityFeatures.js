// 도시별로 켜지는 추가 기능 페이지. 메뉴, 푸터, 사이트맵, 실시간 현황의 바로가기가 이 목록을 함께 쓴다.
const FEATURES = [
  { id: 'today', path: '/today', ko: '오늘의 추천 코스', en: "Today's picks", cities: ['daejeon', 'seoul', 'busan', 'jeju'] },
  { id: 'subway', path: '/subway', ko: '지하철 실시간 도착', en: 'Live subway arrivals', cities: ['seoul'] },
  { id: 'beaches', path: '/beaches', ko: '해수욕장 바다 컨디션', en: 'Beach sea conditions', cities: ['busan', 'jeju'] },
  { id: 'bus', path: '/bus', ko: '버스 노선 검색', en: 'Bus route finder', cities: ['daejeon'] }
]

export const getCityFeatures = (cityKey) => FEATURES.filter((feature) => feature.cities.includes(cityKey))
export const hasCityFeature = (cityKey, id) => FEATURES.some((feature) => feature.id === id && feature.cities.includes(cityKey))
