// 도시 설정 레지스트리
// 배포(도메인)마다 NEXT_PUBLIC_CITY_KEY 환경변수로 활성 도시를 고른다.
// docs/city-expansion-api-requirements.md의 "1차 공통 API" 설계를 그대로 따른다.

export const CITIES = {
  daejeon: {
    key: 'daejeon',
    gaId: 'G-610JNHR72K', // 도시마다 GA4 속성을 따로 쓴다
    naverVerification: '3dae5e0fb04d30964913bdedff8cea8116f3c850', // 네이버 서치어드바이저 소유 확인 (도메인마다 다름)
    seoHighlights: {'ko':['성심당','엑스포과학공원','유성온천','계족산 황톳길','대청호'],'en':['Sungsimdang Bakery','Expo Science Park','Yuseong Hot Springs','Gyejoksan Mountain','Daecheong Lake']},
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
    gaId: 'G-QSVD5ZTVK2',
    naverVerification: 'cec1be6f86ca5cb62db584206a27436adbaf8159',
    seoHighlights: {'ko':['경복궁','북촌한옥마을','명동','한강공원','홍대'],'en':['Gyeongbokgung Palace','Bukchon Hanok Village','Myeongdong','Han River Parks','Hongdae']},
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
    publicUrl: 'https://www.letsgoseoul.kr',
    tourismOrgName: '서울관광재단',
    governmentUrl: 'https://www.seoul.go.kr',
    parkingReady: true,
    medicalReady: true,
    // 대전 문구를 도시명만 바꿔 쓰면 "과학의 도시 서울"처럼 어색해지는 문구는 도시별로 덮어쓴다
    pageCopy: {
      ko: {
        travel: { subtitle: '궁궐과 골목, 한강까지 오늘의 서울을 걸어보세요' },
        festival: { subtitle: '오늘 서울에서 열리는 축제와 공연, 전시' },
        food: { subtitle: '오래된 노포부터 새로 뜨는 맛집까지, 서울의 한 끼' }
      },
      en: {
        travel: { subtitle: 'Walk today\'s Seoul, from palaces and alleys to the Han River' },
        festival: { subtitle: 'Festivals, shows and exhibitions on in Seoul today' },
        food: { subtitle: 'From decades-old eateries to new favorites, a taste of Seoul' }
      }
    },
    hero: {
      image: '/images/hero/seoul.jpg',
      ko: { title: 'SEOUL · 서울으로', subtitle: '골목과 문화 사이, 서울', description: '도심의 공원부터 새로운 취향의 거리까지, 나만의 서울을 만나보세요.' },
      en: { title: 'SEOUL · Let’s Go Seoul', subtitle: 'Culture around every corner', description: 'Discover city parks, neighborhood streets, and your own side of Seoul.' }
    }
  },
  busan: {
    key: 'busan',
    gaId: 'G-527Y3MZR0L',
    naverVerification: '508a24ce776b272f6f85aa56e812a3bcc0524787',
    seoHighlights: {'ko':['해운대','광안리','감천문화마을','자갈치시장','태종대'],'en':['Haeundae Beach','Gwangalli Beach','Gamcheon Culture Village','Jagalchi Market','Taejongdae']},
    cityName: '부산',
    cityNameEn: 'Busan',
    aliases: ['부산광역시'],
    name: '부산으로',
    englishName: "Let's Go Busan",
    tourApiAreaCode: '6',
    center: { x: 129.0756, y: 35.1796 },
    bounds: { latMin: 34.88, latMax: 35.40, lngMin: 128.73, lngMax: 129.32 },
    districtNames: [
      '중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구',
      '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'
    ],
    odsayCityCode: null,
    domain: 'letsgobusan.kr',
    publicUrl: 'https://www.letsgobusan.kr',
    tourismOrgName: '부산관광공사',
    governmentUrl: 'https://www.busan.go.kr',
    parkingReady: true,
    medicalReady: true,
    pageCopy: {
      ko: {
        travel: { subtitle: '해변과 산복도로, 골목까지 걸어서 만나는 부산' },
        festival: { subtitle: '오늘 부산에서 열리는 축제와 공연, 전시' },
        food: { subtitle: '돼지국밥과 씨앗호떡, 자갈치 횟집까지 부산의 한 끼' }
      },
      en: {
        travel: { subtitle: 'Beaches, hillside roads and lanes of Busan on foot' },
        festival: { subtitle: 'Festivals, shows and exhibitions on in Busan today' },
        food: { subtitle: 'Pork soup, sweet hotteok and Jagalchi seafood, a taste of Busan' }
      }
    },
    hero: {
      image: '/images/hero/busan.jpg',
      ko: { title: 'BUSAN · 부산으로', subtitle: '파도 너머, 부산', description: '해변과 야경, 골목시장까지 바다가 이끄는 대로 부산을 걸어보세요.' },
      en: { title: 'BUSAN · Let’s Go Busan', subtitle: 'Beyond the waves, Busan', description: 'From beaches and night views to market alleys, follow the sea through Busan.' }
    }
  },
  jeju: {
    key: 'jeju',
    gaId: 'G-PECZLH9B7X',
    naverVerification: '7ccb12eebd17f9f664cb3a0cc685ff006754ee92',
    seoHighlights: {'ko':['성산일출봉','한라산','협재해수욕장','우도','애월'],'en':['Seongsan Ilchulbong','Hallasan Mountain','Hyeopjae Beach','Udo Island','Aewol']},
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
    domain: 'letsgojeju.com',
    publicUrl: 'https://www.letsgojeju.com',
    tourismOrgName: '제주관광공사',
    governmentUrl: 'https://www.jeju.go.kr',
    parkingReady: false,
    medicalReady: true,
    pageCopy: {
      ko: {
        travel: { subtitle: '오름과 바다, 돌담길 사이로 만나는 제주의 풍경' },
        festival: { subtitle: '오늘 제주에서 열리는 축제와 공연, 전시' },
        food: { subtitle: '흑돼지와 고기국수, 해녀가 차린 바다 밥상' }
      },
      en: {
        travel: { subtitle: 'Volcanic hills, the sea and stone-wall lanes of Jeju' },
        festival: { subtitle: 'Festivals, shows and exhibitions on in Jeju today' },
        food: { subtitle: 'Black pork, meat noodles and the haenyeo\'s table from the sea' }
      }
    },
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
