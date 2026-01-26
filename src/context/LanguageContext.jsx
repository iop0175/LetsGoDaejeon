import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext()

export const translations = {
  ko: {
    // 사이트 정보
    siteName: '대전으로',
    siteSubtitle: 'Let\'s Go Daejeon',
    siteDescription: '대전광역시의 아름다운 관광지와 맛집, 축제 정보를 소개합니다.',

    // 네비게이션
    nav: {
      home: '홈',
      travel: '관광지',
      festival: '축제/행사',
      food: '맛집',
      parking: '주차장',
      map: '지도',
      culture: '문화시설',
      medical: '의료',
      shopping: '쇼핑',
      accommodation: '숙박'
    },

    // 퀵메뉴
    quickMenu: {
      title: '완벽한 대전 여행을 위한 서비스',
      subtitle: '대전의 다양한 매력을 카테고리별로 만나보세요',
      travelCourse: '여행코스',
      restaurant: '맛집',
      festival: '축제',
      leisure: '레저',
      seasonTravel: '계절여행',
      recommend: '추천코스'
    },

    // 히어로 섹션
    hero: {
      slide1: {
        title: '대전의 봄',
        subtitle: '벚꽃이 만개한 대전의 봄을 만나보세요',
        description: '유성온천, 한밭수목원에서 펼쳐지는 봄꽃 향연'
      },
      slide2: {
        title: '과학의 도시',
        subtitle: '대한민국 과학수도 대전',
        description: '국립중앙과학관, 대전엑스포과학공원에서 미래를 만나다'
      },
      slide3: {
        title: '맛의 고장',
        subtitle: '대전의 숨겨진 맛집을 찾아서',
        description: '성심당, 두부두루치기... 대전만의 특별한 맛'
      },
      viewMore: '자세히 보기'
    },

    // 인기 관광지
    popularSpots: {
      title: '대전의 인기 관광지',
      subtitle: '가장 많이 찾는 대전의 명소를 소개합니다',
      viewMore: '더 많은 관광지 보기'
    },

    // 여행 코스
    travelCourse: {
      title: '추천 여행 코스',
      subtitle: '테마별로 즐기는 알찬 대전 여행',
      viewCourse: '코스 보기'
    },

    // 축제 섹션
    festivalSection: {
      title: '대전의 축제 · 행사',
      subtitle: '대전에서 펼쳐지는 다채로운 축제를 만나보세요',
      viewAll: '모든 축제 보기',
      upcoming: '예정'
    },

    // 맛집 섹션
    foodSection: {
      title: '대전 맛집 추천',
      subtitle: '대전에서만 맛볼 수 있는 특별한 음식들',
      viewMore: '더 많은 맛집 보기'
    },

    // 푸터
    footer: {
      description: '대전광역시의 아름다운 관광지와 맛집, 축제 정보를 소개합니다. 대전의 숨겨진 매력을 발견해보세요.',
      tourInfo: '관광 정보',
      customerService: '고객 서비스',
      relatedSites: '관련 사이트',
      faq: '자주 묻는 질문',
      tourOffice: '관광 안내소',
      travelGuide: '여행 가이드',
      daejeonCity: '대전광역시',
      visitKorea: '대한민국 구석구석',
      tourCorp: '대전관광공사',
      copyright: '© 2026 대전으로. All rights reserved.',
      privacy: '개인정보처리방침',
      terms: '이용약관',
      copyrightPolicy: '저작권정책',
      tourHotline: '관광안내 1577-3025',
      dataSource: '본 사이트의 관광정보는 대전광역시 공공데이터포털, 한국관광공사 Tour API에서 제공받은 정보입니다.',
      disclaimer: '본 사이트는 대전광역시 공식 홈페이지가 아니며, 관광 정보 제공을 목적으로 운영되는 민간 사이트입니다.'
    },

    // 공통
    common: {
      viewDetails: '자세히 보기',
      category: '카테고리',
      all: '전체',
      total: '총',
      count: '개',
      hours: '시간',
      location: '위치',
      period: '기간',
      search: '검색'
    },

    // 카테고리
    categories: {
      all: '전체',
      nature: '자연/공원',
      science: '과학/문화',
      spa: '휴양/온천',
      history: '역사/유적',
      experience: '체험/액티비티',
      korean: '한식',
      bakery: '베이커리',
      cafe: '카페',
      western: '양식',
      culture: '문화/과학',
      tradition: '문화/전통',
      food: '음식',
      sports: '스포츠/건강'
    },

    // 페이지 타이틀
    pages: {
      travel: {
        title: '대전 관광지',
        subtitle: '과학의 도시 대전의 다양한 매력을 발견하세요',
        spots: '관광지'
      },
      festival: {
        title: '대전 축제 · 행사',
        subtitle: '대전에서 펼쳐지는 다채로운 축제와 행사를 만나보세요'
      },
      food: {
        title: '대전 맛집',
        subtitle: '대전에서만 맛볼 수 있는 특별한 음식들을 소개합니다',
        restaurants: '맛집'
      }
    }
  },

  en: {
    // Site Info
    siteName: 'To Daejeon',
    siteSubtitle: 'Let\'s Go Daejeon',
    siteDescription: 'Discover the beautiful tourist attractions, restaurants, and festivals of Daejeon.',

    // Navigation
    nav: {
      home: 'Home',
      travel: 'Attractions',
      festival: 'Festivals',
      food: 'Food',
      parking: 'Parking',
      map: 'Map',
      culture: 'Culture',
      medical: 'Medical',
      shopping: 'Shopping',
      accommodation: 'Stay'
    },

    // Quick Menu
    quickMenu: {
      title: 'Services for Your Perfect Daejeon Trip',
      subtitle: 'Explore the diverse attractions of Daejeon by category',
      travelCourse: 'Travel Course',
      restaurant: 'Restaurants',
      festival: 'Festivals',
      leisure: 'Leisure',
      seasonTravel: 'Seasonal',
      recommend: 'Recommended'
    },

    // Hero Section
    hero: {
      slide1: {
        title: 'Spring in Daejeon',
        subtitle: 'Experience the cherry blossoms in full bloom',
        description: 'Flower festivals at Yuseong Spa and Hanbat Arboretum'
      },
      slide2: {
        title: 'City of Science',
        subtitle: 'Korea\'s Science Capital',
        description: 'Meet the future at National Science Museum and Expo Science Park'
      },
      slide3: {
        title: 'Taste of Daejeon',
        subtitle: 'Discover hidden culinary gems',
        description: 'Sungsimdang, Dubu-duruchigi... Unique flavors of Daejeon'
      },
      viewMore: 'Learn More'
    },

    // Popular Spots
    popularSpots: {
      title: 'Popular Attractions in Daejeon',
      subtitle: 'Discover the most visited destinations',
      viewMore: 'View More Attractions'
    },

    // Travel Course
    travelCourse: {
      title: 'Recommended Travel Courses',
      subtitle: 'Enjoy themed tours in Daejeon',
      viewCourse: 'View Course'
    },

    // Festival Section
    festivalSection: {
      title: 'Festivals & Events',
      subtitle: 'Experience the colorful festivals of Daejeon',
      viewAll: 'View All Festivals',
      upcoming: 'Upcoming'
    },

    // Food Section
    foodSection: {
      title: 'Recommended Restaurants',
      subtitle: 'Taste the special cuisine only found in Daejeon',
      viewMore: 'View More Restaurants'
    },

    // Footer
    footer: {
      description: 'Discover the beautiful tourist attractions, restaurants, and festivals of Daejeon.',
      tourInfo: 'Tourism Info',
      customerService: 'Customer Service',
      relatedSites: 'Related Sites',
      faq: 'FAQ',
      tourOffice: 'Tourist Office',
      travelGuide: 'Travel Guide',
      daejeonCity: 'Daejeon City',
      visitKorea: 'Visit Korea',
      tourCorp: 'Daejeon Tourism',
      copyright: '© 2026 To Daejeon. All rights reserved.',
      privacy: 'Privacy Policy',
      terms: 'Terms of Use',
      copyrightPolicy: 'Copyright Policy',
      tourHotline: 'Tour Hotline 1577-3025',
      dataSource: 'Tourism data provided by Daejeon Metropolitan City Open Data Portal and Korea Tourism Organization Tour API.',
      disclaimer: 'This site is not the official website of Daejeon Metropolitan City. It is a private website operated to provide tourism information.'
    },

    // Common
    common: {
      viewDetails: 'View Details',
      category: 'Category',
      all: 'All',
      total: 'Total',
      count: '',
      hours: 'hours',
      location: 'Location',
      period: 'Period',
      search: 'Search'
    },

    // Categories
    categories: {
      all: 'All',
      nature: 'Nature/Parks',
      science: 'Science/Culture',
      spa: 'Spa/Hot Springs',
      history: 'History/Heritage',
      experience: 'Experience/Activities',
      korean: 'Korean',
      bakery: 'Bakery',
      cafe: 'Cafe',
      western: 'Western',
      culture: 'Culture/Science',
      tradition: 'Culture/Traditional',
      food: 'Food',
      sports: 'Sports/Health'
    },

    // Page Titles
    pages: {
      travel: {
        title: 'Daejeon Attractions',
        subtitle: 'Discover the diverse charms of Daejeon, the city of science',
        spots: 'attractions'
      },
      festival: {
        title: 'Daejeon Festivals & Events',
        subtitle: 'Experience the colorful festivals and events in Daejeon'
      },
      food: {
        title: 'Daejeon Restaurants',
        subtitle: 'Discover the special cuisine only found in Daejeon',
        restaurants: 'restaurants'
      }
    }
  }
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language')
    return saved || 'ko'
  })

  useEffect(() => {
    localStorage.setItem('language', language)
    document.documentElement.lang = language
  }, [language])

  const t = translations[language]

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ko' ? 'en' : 'ko')
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
