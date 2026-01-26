/**
 * 공통 상수 정의
 * 여러 컴포넌트에서 재사용되는 상수들을 한 곳에서 관리합니다.
 */

// 대전시 구 목록 (필터용)
export const DISTRICTS = [
  { id: 'all', ko: '전체 지역', en: 'All Districts' },
  { id: '동구', ko: '동구', en: 'Dong-gu' },
  { id: '중구', ko: '중구', en: 'Jung-gu' },
  { id: '서구', ko: '서구', en: 'Seo-gu' },
  { id: '유성구', ko: '유성구', en: 'Yuseong-gu' },
  { id: '대덕구', ko: '대덕구', en: 'Daedeok-gu' }
]

// 대전시 구 이름 목록 (단순 배열)
export const DISTRICT_NAMES = ['동구', '중구', '서구', '유성구', '대덕구']

// 구 이름 한/영 매핑
export const DISTRICT_MAP = {
  '유성구': 'Yuseong-gu',
  '서구': 'Seo-gu',
  '중구': 'Jung-gu',
  '동구': 'Dong-gu',
  '대덕구': 'Daedeok-gu'
}

// 주소에서 구 정보 추출
export const extractDistrict = (address) => {
  if (!address) return { ko: '대전', en: 'Daejeon', district: null }
  const match = address.match(/대전\s*(광역시|시)?\s*(\S+구)/)
  if (match) {
    const district = match[2]
    return { ko: district, en: DISTRICT_MAP[district] || district, district }
  }
  return { ko: '대전', en: 'Daejeon', district: null }
}

// 주소에서 동 추출
export const getDongFromAddr = (addr) => {
  if (!addr) return null
  const dongMatch = addr.match(/([가-힣]+동)/)
  return dongMatch ? dongMatch[1] : null
}

// 콘텐츠 타입 ID (TourAPI)
export const CONTENT_TYPES = {
  관광지: '12',
  문화시설: '14',
  축제공연행사: '15',
  레포츠: '28',
  숙박: '32',
  쇼핑: '38',
  음식점: '39'
}

// 콘텐츠 타입 이름 (한국어 -> ID)
export const CONTENT_TYPE_NAMES = {
  '12': '관광지',
  '14': '문화시설',
  '15': '축제공연행사',
  '28': '레포츠',
  '32': '숙박',
  '38': '쇼핑',
  '39': '음식점'
}
