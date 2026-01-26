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
      search: '검색',
      allDong: '전체 동',
      attractions: '관광지',
      restaurants: '맛집',
      addedToTrip: '여행에 추가되었습니다!',
      addFailed: '추가에 실패했습니다.',
      errorOccurred: '오류가 발생했습니다.',
      syncRequired: '관리자 페이지에서 TourAPI 데이터를 먼저 동기화해주세요.',
      loadFailed: '데이터를 불러오는데 실패했습니다.',
      loadingAttractions: '관광지 정보를 불러오는 중...',
      loadingRestaurants: '맛집 정보를 불러오는 중...',
      loadingFestivals: '축제 정보를 불러오는 중...',
      loadingData: '데이터를 불러오는 중...',
      visitWebsite: '홈페이지 방문',
      addToTrip: '내 여행에 추가',
      noImage: '이미지 없음',
      noDescription: '설명이 없습니다.',
      noResults: '검색 결과가 없습니다.',
      noTrips: '저장된 여행이 없습니다.',
      createTrip: '새 여행 만들기',
      selectTrip: '여행을 선택하세요',
      selectDay: '일차를 선택하세요',
      photoBy: '사진: ',
      sourceBy: '출처: ',
      photoByKTO: '사진 제공: 한국관광공사'
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
        subtitle: '대전에서 펼쳐지는 다채로운 축제와 행사를 만나보세요',
        festivals: '축제/행사',
        performances: '문화공연',
        loadingEvents: '공연/행사 정보를 불러오는 중...',
        theme: '테마',
        place: '장소',
        events: '공연/행사',
        noEvents: '현재 진행중인 행사가 없습니다.',
        organizedBy: '주관'
      },
      food: {
        title: '대전 맛집',
        subtitle: '대전에서만 맛볼 수 있는 특별한 음식들을 소개합니다',
        restaurants: '맛집'
      },
      medical: {
        title: '의료기관',
        subtitle: '대전의 병원, 의원, 약국 정보를 확인하세요',
        hospital: '병원',
        clinic: '의원',
        pharmacy: '약국'
      },
      accommodation: {
        title: '숙박',
        subtitle: '대전에서 편안한 휴식을 즐기세요',
        hotel: '호텔',
        motel: '모텔',
        pension: '펜션',
        guesthouse: '게스트하우스'
      },
      culture: {
        title: '문화시설',
        subtitle: '대전의 문화와 예술을 경험하세요',
        museum: '박물관',
        library: '도서관',
        theater: '공연장',
        gallery: '전시관'
      },
      shopping: {
        title: '쇼핑',
        subtitle: '대전의 쇼핑 명소를 둘러보세요'
      },
      leisure: {
        title: '레포츠',
        subtitle: '대전에서 즐기는 레저와 스포츠'
      },
      parking: {
        title: '주차장',
        subtitle: '대전의 주차장 정보를 확인하세요',
        offStreet: '노외주차장',
        onStreet: '노상주차장',
        public: '공영',
        private: '민영'
      },
      map: {
        title: '지도',
        subtitle: '대전 지역 정보를 지도에서 확인하세요',
        district: '지역',
        area: '동'
      },
      search: {
        title: '검색',
        subtitle: '대전의 다양한 정보를 검색하세요',
        results: '건',
        attractions: '관광지',
        restaurants: '맛집',
        events: '공연/행사'
      },
      sharedTrips: {
        title: '여행코스',
        subtitle: '다른 여행자들이 공유한 코스를 둘러보세요',
        dayTrip: '당일치기',
        latest: '최신순',
        popular: '인기순',
        mostLiked: '좋아요순'
      },
      myTrip: {
        title: '나만의 여행',
        subtitle: '나만의 대전 여행 코스를 만들어보세요'
      }
    },

    // 공통 UI 텍스트
    ui: {
      // 버튼/액션
      search: '검색',
      cancel: '취소',
      save: '저장',
      add: '추가하기',
      edit: '수정',
      delete: '삭제',
      close: '닫기',
      prev: '이전',
      next: '다음',
      back: '뒤로',
      refresh: '새로고침',
      copy: '복사',
      share: '공유',
      publish: '게시',
      navigate: '길찾기',
      directions: '길찾기',
      viewDetails: '자세히 보기',
      viewMore: '더보기',
      expand: '확대',
      minimize: '축소',
      bookNow: '예약하기',
      website: '홈페이지',

      // 정렬
      sortByName: '가나다순',
      sortByViews: '조회수순',
      sortByLatest: '최신순',
      sortByPopular: '인기순',
      sortByLikes: '좋아요순',

      // 상태/정보
      loading: '로딩중',
      error: '오류',
      noData: '데이터가 없습니다',
      free: '무료',
      paid: '유료',
      noInfo: '정보없음',
      anonymous: '익명',
      recommended: '추천',

      // 접근성
      menu: '메뉴',
      searchLabel: '검색',
      previousSlide: '이전',
      nextSlide: '다음',

      // 인증
      login: '로그인',
      logout: '로그아웃',
      loginRequired: '로그인이 필요합니다'
    },

    // 상세 정보 라벨
    detail: {
      address: '주소',
      phone: '전화',
      hours: '운영시간',
      closed: '휴무일',
      contact: '문의처',
      fee: '이용요금',
      parking: '주차시설',
      strollerRental: '유모차대여',
      pets: '애완동물',
      creditCard: '신용카드',
      checkIn: '체크인',
      checkOut: '체크아웃',
      rooms: '객실수',
      facilities: '부대시설',
      signature: '대표메뉴',
      menu: '취급메뉴',
      takeout: '포장',
      organizer: '주최자',
      venue: '행사장소',
      playTime: '공연시간',
      reservation: '예약안내',
      duration: '관람소요시간',
      products: '판매품목',
      about: '소개',
      reviews: '리뷰',
      writeReview: '리뷰 작성',
      rating: '평점',
      copied: '복사됨',
      copyAddress: '주소복사'
    },

    // 교통수단
    transport: {
      walk: '도보',
      car: '자동차',
      bus: '버스',
      subway: '지하철',
      taxi: '택시',
      bicycle: '자전거',
      minutes: '분',
      stops: '정거장',
      stations: '역',
      distance: '거리'
    },

    // 날씨
    weather: {
      title: '대전 날씨',
      temperature: '온도',
      humidity: '습도',
      windSpeed: '풍속',
      pressure: '기압',
      dust: '미세먼지',
      refresh: '새로고침',
      expand: '펼치기',
      collapse: '접기',
      good: '좋음',
      normal: '보통',
      bad: '나쁨',
      veryBad: '매우나쁨',
      daejeon: '대전광역시'
    },

    // 여행 코스 관련
    trip: {
      days: '일',
      day: '일차',
      places: '곳',
      accommodation: '숙소',
      start: '출발',
      destination: '도착지',
      origin: '출발지',
      published: '게시됨',
      invite: '초대',
      join: '참여하기',
      leave: '나가기',
      admin: '관리자',
      viewOnly: '보기만',
      remove: '제거',
      editPermission: '편집',
      viewPermission: '보기',
      permissionNote: '참여 시 권한이 부여됩니다',
      startDate: '시작일',
      endDate: '종료일',
      create: '생성하기',
      touristSpots: '관광지',
      culture: '문화시설',
      spots: '면'
    },

    // 관리자
    admin: {
      dashboard: '대시보드',
      settings: '설정',
      system: '시스템',
      backToHome: '메인으로',
      email: '이메일',
      password: '비밀번호',
      table: '테이블',
      items: '개',
      rows: '행',
      thumbnail: '썸네일',
      title: '제목',
      author: '작성자',
      views: '조회수',
      likes: '좋아요',
      publishedDate: '게시일',
      actions: '관리',
      preview: '미리보기',
      active: '활성화',
      inactive: '비활성',
      order: '순서',
      link: '링크',
      diff: '차이',
      all: '전체',
      year: '년',
      month: '월',
      week: '주',
      day: '일',
      image: '이미지',
      performance: '공연명',
      type: '분류',
      status: '상태',
      price: '요금'
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
      search: 'Search',
      allDong: 'All Areas',
      attractions: 'attractions',
      restaurants: 'restaurants',
      addedToTrip: 'Added to your trip!',
      addFailed: 'Failed to add.',
      errorOccurred: 'An error occurred.',
      syncRequired: 'Please sync TourAPI data from admin page first.',
      loadFailed: 'Failed to load data.',
      loadingAttractions: 'Loading attractions...',
      loadingRestaurants: 'Loading restaurants...',
      loadingFestivals: 'Loading festivals...',
      loadingData: 'Loading data...',
      visitWebsite: 'Visit Website',
      addToTrip: 'Add to Trip',
      noImage: 'No Image',
      noDescription: 'No description available.',
      noResults: 'No results found.',
      noTrips: 'No saved trips.',
      createTrip: 'Create New Trip',
      selectTrip: 'Select a trip',
      selectDay: 'Select a day',
      photoBy: 'Photo: ',
      sourceBy: 'Source: ',
      photoByKTO: 'Photos by: Korea Tourism Organization'
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
        subtitle: 'Experience the colorful festivals and events in Daejeon',
        festivals: 'Festivals',
        performances: 'Performances',
        loadingEvents: 'Loading events...',
        theme: 'Theme',
        place: 'Place',
        events: 'events',
        noEvents: 'No events are currently available.',
        organizedBy: 'Organized by'
      },
      food: {
        title: 'Daejeon Restaurants',
        subtitle: 'Discover the special cuisine only found in Daejeon',
        restaurants: 'restaurants'
      },
      medical: {
        title: 'Medical Facilities',
        subtitle: 'Find hospitals, clinics, and pharmacies in Daejeon',
        hospital: 'Hospital',
        clinic: 'Clinic',
        pharmacy: 'Pharmacy'
      },
      accommodation: {
        title: 'Accommodation',
        subtitle: 'Enjoy a comfortable stay in Daejeon',
        hotel: 'Hotel',
        motel: 'Motel',
        pension: 'Pension',
        guesthouse: 'Guesthouse'
      },
      culture: {
        title: 'Cultural Facilities',
        subtitle: 'Experience culture and arts in Daejeon',
        museum: 'Museum',
        library: 'Library',
        theater: 'Theater',
        gallery: 'Gallery'
      },
      shopping: {
        title: 'Shopping',
        subtitle: 'Explore shopping spots in Daejeon'
      },
      leisure: {
        title: 'Leisure & Sports',
        subtitle: 'Enjoy leisure and sports activities in Daejeon'
      },
      parking: {
        title: 'Parking',
        subtitle: 'Find parking information in Daejeon',
        offStreet: 'Off-street Parking',
        onStreet: 'On-street Parking',
        public: 'Public',
        private: 'Private'
      },
      map: {
        title: 'Map',
        subtitle: 'Explore Daejeon on the map',
        district: 'District',
        area: 'Area'
      },
      search: {
        title: 'Search',
        subtitle: 'Search for various information in Daejeon',
        results: 'results',
        attractions: 'Attractions',
        restaurants: 'Restaurants',
        events: 'Performances/Events'
      },
      sharedTrips: {
        title: 'Travel Courses',
        subtitle: 'Explore travel courses shared by other travelers',
        dayTrip: 'Day Trip',
        latest: 'Latest',
        popular: 'Popular',
        mostLiked: 'Most Liked'
      },
      myTrip: {
        title: 'My Trip',
        subtitle: 'Create your own Daejeon travel course'
      }
    },

    // Common UI Text
    ui: {
      // Buttons/Actions
      search: 'Search',
      cancel: 'Cancel',
      save: 'Save',
      add: 'Add',
      edit: 'Edit',
      delete: 'Delete',
      close: 'Close',
      prev: 'Prev',
      next: 'Next',
      back: 'Back',
      refresh: 'Refresh',
      copy: 'Copy',
      share: 'Share',
      publish: 'Publish',
      navigate: 'Navigate',
      directions: 'Directions',
      viewDetails: 'View Details',
      viewMore: 'More',
      expand: 'Expand',
      minimize: 'Minimize',
      bookNow: 'Book Now',
      website: 'Website',

      // Sorting
      sortByName: 'Name',
      sortByViews: 'Views',
      sortByLatest: 'Latest',
      sortByPopular: 'Popular',
      sortByLikes: 'Most Liked',

      // Status/Info
      loading: 'Loading',
      error: 'Error',
      noData: 'No data available',
      free: 'Free',
      paid: 'Paid',
      noInfo: 'No info',
      anonymous: 'Anonymous',
      recommended: 'Recommended',

      // Accessibility
      menu: 'Menu',
      searchLabel: 'Search',
      previousSlide: 'Previous',
      nextSlide: 'Next',

      // Authentication
      login: 'Login',
      logout: 'Logout',
      loginRequired: 'Login required'
    },

    // Detail Labels
    detail: {
      address: 'Address',
      phone: 'Phone',
      hours: 'Hours',
      closed: 'Closed',
      contact: 'Contact',
      fee: 'Fee',
      parking: 'Parking',
      strollerRental: 'Stroller Rental',
      pets: 'Pets',
      creditCard: 'Credit Card',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      rooms: 'Rooms',
      facilities: 'Facilities',
      signature: 'Signature',
      menu: 'Menu',
      takeout: 'Takeout',
      organizer: 'Organizer',
      venue: 'Venue',
      playTime: 'Play Time',
      reservation: 'Reservation',
      duration: 'Duration',
      products: 'Products',
      about: 'About',
      reviews: 'Reviews',
      writeReview: 'Write Review',
      rating: 'Rating',
      copied: 'Copied',
      copyAddress: 'Copy Address'
    },

    // Transportation
    transport: {
      walk: 'Walk',
      car: 'Car',
      bus: 'Bus',
      subway: 'Subway',
      taxi: 'Taxi',
      bicycle: 'Bicycle',
      minutes: 'min',
      stops: 'stops',
      stations: 'stations',
      distance: 'Distance'
    },

    // Weather
    weather: {
      title: 'Daejeon Weather',
      temperature: 'Temperature',
      humidity: 'Humidity',
      windSpeed: 'Wind Speed',
      pressure: 'Pressure',
      dust: 'Fine Dust',
      refresh: 'Refresh',
      expand: 'Expand',
      collapse: 'Collapse',
      good: 'Good',
      normal: 'Normal',
      bad: 'Bad',
      veryBad: 'Very Bad',
      daejeon: 'Daejeon'
    },

    // Trip Related
    trip: {
      days: ' days',
      day: '',
      places: ' places',
      accommodation: 'Accommodation',
      start: 'Start',
      destination: 'Destination',
      origin: 'Origin',
      published: 'Published',
      invite: 'Invite',
      join: 'Join',
      leave: 'Leave',
      admin: 'Admin',
      viewOnly: 'View only',
      remove: 'Remove',
      editPermission: 'Edit',
      viewPermission: 'View',
      permissionNote: 'Permission will be granted upon joining',
      startDate: 'Start Date',
      endDate: 'End Date',
      create: 'Create',
      touristSpots: 'Tourist Spots',
      culture: 'Culture',
      spots: ' spots'
    },

    // Admin
    admin: {
      dashboard: 'Dashboard',
      settings: 'Settings',
      system: 'System',
      backToHome: 'Back to Home',
      email: 'Email',
      password: 'Password',
      table: 'Table',
      items: 'items',
      rows: 'rows',
      thumbnail: 'Thumbnail',
      title: 'Title',
      author: 'Author',
      views: 'Views',
      likes: 'Likes',
      publishedDate: 'Published',
      actions: 'Actions',
      preview: 'Preview',
      active: 'Active',
      inactive: 'Inactive',
      order: 'Order',
      link: 'Link',
      diff: 'Diff',
      all: 'All',
      year: 'Year',
      month: 'Month',
      week: 'Week',
      day: 'Day',
      image: 'Image',
      performance: 'Performance',
      type: 'Type',
      status: 'Status',
      price: 'Price'
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
