import Head from 'next/head'
import { useLanguage } from '../../context/LanguageContext'

/**
 * SEO 컴포넌트 - 페이지별 메타 태그 관리 (Next.js용)
 * 
 * @param {Object} props
 * @param {string} props.title - 페이지 제목
 * @param {string} props.description - 페이지 설명
 * @param {string} props.keywords - SEO 키워드 (쉼표로 구분)
 * @param {string} props.image - OG 이미지 URL
 * @param {string} props.url - 페이지 URL
 * @param {string} props.type - OG 타입 (website, article 등)
 */
const SEO = ({ 
  title, 
  description, 
  keywords, 
  image = 'https://lets-go-daejeon.vercel.app/og-image.svg',
  url,
  type = 'website'
}) => {
  const { language } = useLanguage()
  
  const siteUrl = 'https://lets-go-daejeon.vercel.app'
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl
  const siteName = language === 'ko' ? '대전으로' : "Let's Go Daejeon"
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} | Let's Go Daejeon`
  
  return (
    <Head>
      {/* 기본 메타 태그 */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={fullUrl} />
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={language === 'ko' ? 'ko_KR' : 'en_US'} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  )
}

// 페이지별 기본 SEO 데이터
export const SEO_DATA = {
  home: {
    ko: {
      title: '대전 관광 여행 가이드',
      description: '대전의 아름다운 관광지, 맛집, 축제, 문화시설을 소개합니다. 대전 여행의 모든 것을 한눈에!',
      keywords: '대전, 대전 관광, 대전 여행, 대전 맛집, 대전 축제, 대전 가볼만한곳, 대전 명소, Daejeon, Daejeon Tourism'
    },
    en: {
      title: 'Daejeon Travel Guide',
      description: 'Discover beautiful attractions, restaurants, festivals, and cultural facilities in Daejeon. Your complete guide to Daejeon travel!',
      keywords: 'Daejeon, Daejeon Tourism, Daejeon Travel, Daejeon Restaurant, Daejeon Festival, Korea Travel, Visit Daejeon'
    }
  },
  travel: {
    ko: {
      title: '대전 관광지',
      description: '대전의 인기 관광지와 명소를 소개합니다. 엑스포과학공원, 유성온천, 계족산, 대청호 등 대전 가볼만한 곳을 확인하세요.',
      keywords: '대전 관광지, 대전 명소, 대전 가볼만한곳, 엑스포과학공원, 유성온천, 계족산, 대청호, 한밭수목원, 대전 여행지'
    },
    en: {
      title: 'Daejeon Attractions',
      description: 'Discover popular tourist attractions in Daejeon. Explore Expo Science Park, Yuseong Hot Springs, Gyejoksan Mountain, and more.',
      keywords: 'Daejeon attractions, Daejeon sightseeing, Expo Science Park, Yuseong Hot Springs, Gyejoksan, Daecheongho Lake'
    }
  },
  festival: {
    ko: {
      title: '대전 축제 행사',
      description: '대전에서 열리는 다양한 축제와 행사 정보를 확인하세요. 대전 0시 축제, 대전 사이언스 페스티벌, 효문화뿌리축제 등.',
      keywords: '대전 축제, 대전 행사, 대전 0시 축제, 대전 사이언스 페스티벌, 효문화뿌리축제, 대전 이벤트, 대전 문화행사'
    },
    en: {
      title: 'Daejeon Festivals & Events',
      description: 'Find festivals and events in Daejeon. Daejeon 0 Festival, Science Festival, Hyo Culture Festival and more.',
      keywords: 'Daejeon festival, Daejeon events, Daejeon 0 Festival, Daejeon Science Festival, Korea festival'
    }
  },
  food: {
    ko: {
      title: '대전 맛집',
      description: '대전의 맛집과 음식점을 소개합니다. 성심당, 대전 칼국수, 두부두루치기 등 대전 먹거리를 만나보세요.',
      keywords: '대전 맛집, 대전 음식점, 대전 먹거리, 성심당, 대전 칼국수, 두부두루치기, 대전 맛집 추천, 대전 로컬 맛집'
    },
    en: {
      title: 'Daejeon Restaurants',
      description: 'Discover the best restaurants in Daejeon. Try Sungsimdang bakery, Daejeon noodles, and local delicacies.',
      keywords: 'Daejeon restaurant, Daejeon food, Sungsimdang, Daejeon noodles, Korean food, best restaurant Daejeon'
    }
  },
  culture: {
    ko: {
      title: '대전 문화시설',
      description: '대전의 박물관, 미술관, 공연장 등 문화시설을 소개합니다. 국립중앙과학관, 대전시립미술관, 대전예술의전당.',
      keywords: '대전 문화시설, 대전 박물관, 대전 미술관, 국립중앙과학관, 대전시립미술관, 대전예술의전당, 대전 전시회'
    },
    en: {
      title: 'Daejeon Cultural Facilities',
      description: 'Explore museums, galleries, and performance halls in Daejeon. National Science Museum, Daejeon Museum of Art.',
      keywords: 'Daejeon museum, Daejeon art gallery, National Science Museum, Daejeon culture, Korea museum'
    }
  },
  accommodation: {
    ko: {
      title: '대전 숙소',
      description: '대전의 호텔, 모텔, 펜션 등 숙박시설을 찾아보세요. 유성온천 호텔, 대전역 근처 숙소 정보.',
      keywords: '대전 숙소, 대전 호텔, 대전 모텔, 유성온천 호텔, 대전역 숙소, 대전 펜션, 대전 숙박'
    },
    en: {
      title: 'Daejeon Accommodation',
      description: 'Find hotels, motels, and accommodations in Daejeon. Yuseong Hot Spring hotels and Daejeon Station area lodging.',
      keywords: 'Daejeon hotel, Daejeon accommodation, Yuseong hotel, Korea hotel, Daejeon lodging'
    }
  },
  shopping: {
    ko: {
      title: '대전 쇼핑',
      description: '대전의 쇼핑몰, 시장, 상점가를 소개합니다. 세이백화점, 롯데백화점, 중앙시장 등 대전 쇼핑 명소.',
      keywords: '대전 쇼핑, 대전 백화점, 대전 시장, 중앙시장, 대전 쇼핑몰, 대전 아울렛'
    },
    en: {
      title: 'Daejeon Shopping',
      description: 'Discover shopping malls, markets, and stores in Daejeon. Department stores and traditional markets.',
      keywords: 'Daejeon shopping, Daejeon mall, Daejeon market, Korea shopping, Daejeon department store'
    }
  },
  leisure: {
    ko: {
      title: '대전 레저 스포츠',
      description: '대전의 레저, 스포츠 시설을 소개합니다. 골프장, 수영장, 스키장, 워터파크 정보.',
      keywords: '대전 레저, 대전 스포츠, 대전 골프장, 대전 수영장, 대전 워터파크, 대전 액티비티'
    },
    en: {
      title: 'Daejeon Leisure & Sports',
      description: 'Find leisure and sports facilities in Daejeon. Golf courses, swimming pools, and outdoor activities.',
      keywords: 'Daejeon leisure, Daejeon sports, Daejeon golf, Daejeon activities, Korea outdoor'
    }
  },
  medical: {
    ko: {
      title: '대전 의료 관광',
      description: '대전의 병원, 의료시설 정보를 제공합니다. 대전 의료관광, 건강검진, 한의원 정보.',
      keywords: '대전 의료, 대전 병원, 대전 의료관광, 대전 건강검진, 대전 한의원'
    },
    en: {
      title: 'Daejeon Medical Tourism',
      description: 'Find hospitals and medical facilities in Daejeon. Medical tourism and health checkup information.',
      keywords: 'Daejeon medical, Daejeon hospital, Korea medical tourism, health checkup Daejeon'
    }
  },
  parking: {
    ko: {
      title: '대전 주차장',
      description: '대전의 주차장 정보를 실시간으로 확인하세요. 공영주차장, 유료주차장 위치와 요금 안내.',
      keywords: '대전 주차장, 대전 공영주차장, 대전 주차요금, 대전 주차 정보'
    },
    en: {
      title: 'Daejeon Parking',
      description: 'Find real-time parking information in Daejeon. Public parking lots and fees.',
      keywords: 'Daejeon parking, parking lot Daejeon, Korea parking'
    }
  },
  map: {
    ko: {
      title: '대전 관광 지도',
      description: '대전 관광지, 맛집, 숙소를 지도에서 한눈에 확인하세요. 대전 여행 코스 추천.',
      keywords: '대전 지도, 대전 관광지도, 대전 여행 지도, 대전 맛집 지도'
    },
    en: {
      title: 'Daejeon Tourism Map',
      description: 'View Daejeon attractions, restaurants, and hotels on the map. Plan your Daejeon trip.',
      keywords: 'Daejeon map, Daejeon tourism map, Daejeon travel map'
    }
  },
  myTrip: {
    ko: {
      title: '내 여행 계획',
      description: '나만의 대전 여행 계획을 만들고 관리하세요. 여행 일정 만들기, 장소 저장하기.',
      keywords: '대전 여행 계획, 여행 일정, 대전 여행 코스, 여행 플래너'
    },
    en: {
      title: 'My Trip Plan',
      description: 'Create and manage your Daejeon travel plans. Build your itinerary and save places.',
      keywords: 'Daejeon trip plan, travel itinerary, Daejeon travel planner'
    }
  },
  sharedTrips: {
    ko: {
      title: '공유된 여행',
      description: '다른 여행자들이 공유한 대전 여행 계획을 확인하세요. 여행 코스 추천.',
      keywords: '대전 여행 공유, 여행 코스 추천, 대전 여행 후기'
    },
    en: {
      title: 'Shared Trips',
      description: 'Discover travel plans shared by other travelers. Get trip recommendations.',
      keywords: 'shared travel plans, Daejeon trip recommendation, travel community'
    }
  },
  search: {
    ko: {
      title: '검색',
      description: '대전 관광지, 맛집, 축제, 숙소를 검색하세요. 원하는 여행 정보를 쉽게 찾아보세요.',
      keywords: '대전 검색, 대전 관광 검색, 대전 맛집 검색, 대전 여행 검색'
    },
    en: {
      title: 'Search',
      description: 'Search for Daejeon attractions, restaurants, festivals, and accommodations.',
      keywords: 'Daejeon search, search Daejeon tourism, find Daejeon'
    }
  }
}

export default SEO
