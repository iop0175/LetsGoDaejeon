// 도시 설정 레지스트리
// 배포(도메인)마다 NEXT_PUBLIC_CITY_KEY 환경변수로 활성 도시를 고른다.
// docs/city-expansion-api-requirements.md의 "1차 공통 API" 설계를 그대로 따른다.

export const CITIES = {
  daejeon: {
    key: 'daejeon',
    cityName: '대전',
    cityNameEn: 'Daejeon',
    aliases: ['대전광역시'],
    name: '대전으로',
    englishName: "Let's Go Daejeon",
    tourApiAreaCode: '3',
    center: { x: 127.385, y: 36.351 }, // 카카오 좌표계: x=lng, y=lat
    bounds: { latMin: 36.19, latMax: 36.51, lngMin: 127.25, lngMax: 127.55 },
    districtNames: ['유성구', '서구', '중구', '동구', '대덕구'],
    odsayCityCode: '3',
    domain: 'letsgodaejeon.kr',
    publicUrl: 'https://www.letsgodaejeon.kr',
    tourismOrgName: '대전관광공사',
    governmentUrl: 'https://www.daejeon.go.kr',
    parkingReady: true,
    medicalReady: true
  },
  seoul: {
    key: 'seoul',
    cityName: '서울',
    cityNameEn: 'Seoul',
    aliases: ['서울특별시'],
    name: '서울로',
    englishName: "Let's Go Seoul",
    tourApiAreaCode: '1',
    center: { x: 126.9780, y: 37.5665 },
    bounds: { latMin: 37.42, latMax: 37.70, lngMin: 126.76, lngMax: 127.18 },
    districtNames: [
      '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구',
      '성북구', '강북구', '도봉구', '노원구', '은평구', '서대문구', '마포구',
      '양천구', '강서구', '구로구', '금천구', '영등포구', '동작구', '관악구',
      '서초구', '강남구', '송파구', '강동구'
    ],
    odsayCityCode: '1000',
    domain: 'letsgoseoul.kr',
    publicUrl: 'https://letsgoseoul.vercel.app',
    tourismOrgName: '서울관광재단',
    governmentUrl: 'https://www.seoul.go.kr',
    parkingReady: true,
    medicalReady: true,
    hero: {
      image: '/images/hero/seoul.jpg',
      ko: { title: 'SEOUL · 서울으로', subtitle: '골목과 문화 사이, 서울', description: '도심의 공원부터 새로운 취향의 거리까지, 나만의 서울을 만나보세요.' },
      en: { title: 'SEOUL · Let’s Go Seoul', subtitle: 'Culture around every corner', description: 'Discover city parks, neighborhood streets, and your own side of Seoul.' }
    }
  },
  jeju: {
    key: 'jeju',
    cityName: '제주',
    cityNameEn: 'Jeju',
    aliases: ['제주특별자치도', '제주시', '서귀포시'],
    name: '제주로',
    englishName: "Let's Go Jeju",
    tourApiAreaCode: '39',
    center: { x: 126.5312, y: 33.4996 },
    bounds: { latMin: 33.10, latMax: 33.97, lngMin: 126.10, lngMax: 127.00 },
    districtNames: ['제주시', '서귀포시'],
    odsayCityCode: null,
    domain: null,
    publicUrl: null,
    tourismOrgName: '제주관광공사',
    governmentUrl: 'https://www.jeju.go.kr',
    parkingReady: false,
    medicalReady: false,
    hero: {
      image: '/images/hero/jeju.jpg',
      ko: { title: 'JEJU · 제주로', subtitle: '바람 따라, 제주로', description: '바다를 걷고 오름을 오르며, 섬의 속도로 여행하세요.' },
      en: { title: 'JEJU · Let’s Go Jeju', subtitle: 'Follow the breeze to Jeju', description: 'Walk the coast, explore volcanic hills, and travel at the island’s pace.' }
    }
  }
}

export const ACTIVE_CITY_KEY = process.env.NEXT_PUBLIC_CITY_KEY || 'daejeon'
if (!CITIES[ACTIVE_CITY_KEY]) throw new Error(`Unknown city: ${ACTIVE_CITY_KEY}`)
export const CITY = CITIES[ACTIVE_CITY_KEY]
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || (CITY.domain ? `https://www.${CITY.domain}` : 'http://localhost:3002')
export const IS_CITY_PREVIEW = process.env.NEXT_PUBLIC_CITY_PREVIEW === 'true'

export const getCityPageSeo = (category, categoryEn) => ({
  ko: {
    title: `${CITY.cityName} ${category} | ${CITY.name}`,
    description: `${CITY.cityName}의 ${category} 정보를 찾아보고 나만의 여행을 계획하세요.`,
    keywords: `${CITY.cityName}, ${CITY.cityName} ${category}, ${CITY.cityName} 여행`
  },
  en: {
    title: `${CITY.cityNameEn} ${categoryEn} | ${CITY.englishName}`,
    description: `Explore ${categoryEn.toLowerCase()} in ${CITY.cityNameEn} and plan your trip.`,
    keywords: `${CITY.cityNameEn}, ${CITY.cityNameEn} ${categoryEn}, travel`
  }
})
