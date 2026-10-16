import { CITY } from './cities'

// 페이지별 검색 노출 문구. 도시마다 대표 명소를 넣어 제목·설명이 서로 겹치지 않게 한다.
const hl = (locale, n = 3) => (CITY.seoHighlights?.[locale === 'en' ? 'en' : 'ko'] || []).slice(0, n)
const join = (items, locale) => items.join(locale === 'en' ? ', ' : ', ')
const countKo = (n, unit) => (n > 0 ? ` ${n}${unit}` : '')

export function getPageSeo(page, locale = 'kr', { count = 0 } = {}) {
  const en = locale === 'en'
  const city = en ? CITY.cityNameEn : CITY.cityName
  const site = en ? CITY.englishName : CITY.name
  const top = join(hl(locale), locale)
  const top2 = join(hl(locale, 2), locale)

  const ko = {
    home: {
      title: `${city} 여행 가이드 | 가볼만한 곳·맛집·축제 - ${site}`,
      description: `${city} 여행 준비는 ${site}에서. ${top} 등 ${city} 가볼만한 곳, 맛집, 진행 중인 축제와 공연, 숙소, 주차장·병원 정보까지 한곳에 모았습니다.`,
      keywords: `${city} 여행, ${city} 가볼만한 곳, ${city} 맛집, ${city} 축제, ${city} 관광지, ${hl('kr').join(', ')}`
    },
    travel: {
      title: `${city} 가볼만한 곳${countKo(count, '곳')} | ${city} 관광지 추천 - ${site}`,
      description: `${top} 등 ${city} 관광지${count ? ` ${count}곳` : ''}을 지역·인기순으로 살펴보세요. 사진, 주소, 전화번호와 지도 길찾기까지 한 번에 확인할 수 있습니다.`,
      keywords: `${city} 관광지, ${city} 가볼만한 곳, ${city} 명소, ${city} 여행지 추천, ${hl('kr').join(', ')}`,
      h1: `${city} 가볼만한 곳`
    },
    food: {
      title: `${city} 맛집 추천${countKo(count, '곳')} | ${city} 식당 목록 - ${site}`,
      description: `${city} 맛집${count ? ` ${count}곳` : ''}의 주소, 전화번호, 사진을 한눈에 비교하세요. ${top2} 근처 식당과 지역 대표 음식을 찾아보세요.`,
      keywords: `${city} 맛집, ${city} 맛집 추천, ${city} 식당, ${city} 음식점, ${city} 대표 음식`,
      h1: `${city} 맛집 추천`
    },
    festival: {
      title: `${city} 축제·공연·행사 일정 | 이번 달 ${city} 행사 - ${site}`,
      description: `지금 열리는 ${city} 축제와 공연, 전시 일정을 날짜순으로 확인하세요. 진행 중인 행사와 곧 열리는 행사를 장소와 기간과 함께 안내합니다.`,
      keywords: `${city} 축제, ${city} 행사, ${city} 공연, ${city} 전시, ${city} 이번 주 행사`,
      h1: `${city} 축제·공연·행사`
    },
    culture: {
      title: `${city} 문화시설 | 박물관·미술관·공연장 안내 - ${site}`,
      description: `${city}의 박물관, 미술관, 공연장, 도서관 등 문화시설${count ? ` ${count}곳` : ''}을 모았습니다. 위치와 연락처, 관람 정보를 확인하세요.`,
      keywords: `${city} 박물관, ${city} 미술관, ${city} 공연장, ${city} 문화시설, ${city} 전시관`,
      h1: `${city} 문화시설`
    },
    leisure: {
      title: `${city} 레포츠·체험 | 액티비티 추천 - ${site}`,
      description: `${city}에서 즐기는 레포츠와 체험 활동${count ? ` ${count}곳` : ''}을 소개합니다. 트레킹, 수상 레저, 체험 시설의 위치와 연락처를 확인하세요.`,
      keywords: `${city} 레포츠, ${city} 체험, ${city} 액티비티, ${city} 놀거리, ${city} 데이트`,
      h1: `${city} 레포츠·체험`
    },
    shopping: {
      title: `${city} 쇼핑 | 시장·백화점·특산품 매장 - ${site}`,
      description: `${city}의 전통시장, 백화점, 쇼핑몰, 기념품·특산품 매장${count ? ` ${count}곳` : ''}을 한 번에 살펴보세요. 위치와 연락처를 안내합니다.`,
      keywords: `${city} 쇼핑, ${city} 시장, ${city} 백화점, ${city} 기념품, ${city} 특산품`,
      h1: `${city} 쇼핑`
    },
    accommodation: {
      title: `${city} 숙소 추천${countKo(count, '곳')} | 호텔·펜션·게스트하우스 - ${site}`,
      description: `${city} 호텔, 펜션, 게스트하우스, 한옥 등 숙박 시설${count ? ` ${count}곳` : ''}의 위치와 연락처를 비교하세요. 관광지 근처 숙소를 찾기 쉽게 정리했습니다.`,
      keywords: `${city} 숙소, ${city} 호텔, ${city} 펜션, ${city} 게스트하우스, ${city} 숙박 추천`,
      h1: `${city} 숙소`
    },
    parking: {
      title: `${city} 주차장 | 공영주차장 위치·요금 안내 - ${site}`,
      description: `${city} 공영주차장의 위치, 운영시간, 요금 정보를 검색하세요. 관광지 방문 전 가까운 주차장을 미리 확인할 수 있습니다.`,
      keywords: `${city} 주차장, ${city} 공영주차장, ${city} 주차 요금, ${city} 무료 주차장`,
      h1: `${city} 공영주차장`
    },
    medical: {
      title: `${city} 병원·약국 찾기 | 의료기관 안내 - ${site}`,
      description: `여행 중 급할 때 쓰는 ${city} 병원, 의원, 약국 정보를 지역별로 검색하세요. 진료과목과 전화번호, 위치를 확인할 수 있습니다.`,
      keywords: `${city} 병원, ${city} 약국, ${city} 응급실, ${city} 의료기관, ${city} 야간 진료`,
      h1: `${city} 병원·약국`
    },
    map: {
      title: `${city} 관광 지도 | 관광지·맛집·숙소 한눈에 - ${site}`,
      description: `${city}의 관광지, 맛집, 숙소를 지도에서 바로 찾아보세요. 카테고리별로 골라 보고 길찾기까지 이어서 확인할 수 있습니다.`,
      keywords: `${city} 지도, ${city} 관광 지도, ${city} 맛집 지도, ${city} 여행 지도`,
      h1: `${city} 관광 지도`
    },
    search: {
      title: `${city} 여행 검색 | 관광지·맛집·축제 찾기 - ${site}`,
      description: `${city}의 관광지, 맛집, 숙소, 축제를 이름으로 검색하세요.`,
      keywords: `${city} 검색, ${city} 여행 검색`,
      noindex: true
    },
    tripPlanner: {
      title: `${city} 여행 일정 만들기 | 무료 여행 플래너 - ${site}`,
      description: `${city} 관광지, 맛집, 숙소를 담아 나만의 여행 일정을 만드세요. 날짜별로 장소를 정리하고 지도에서 동선을 확인할 수 있습니다.`,
      keywords: `${city} 여행 계획, ${city} 여행 일정, ${city} 여행 플래너, ${city} 코스`,
      h1: `${city} 여행 일정 만들기`
    },
    sharedTrips: {
      title: `${city} 여행 코스 추천 | 여행자들이 공유한 일정 - ${site}`,
      description: `다른 여행자들이 공유한 ${city} 여행 코스와 일정을 참고해 보세요. 1박 2일, 당일치기 등 인기 코스를 확인하고 내 일정으로 가져올 수 있습니다.`,
      keywords: `${city} 여행 코스, ${city} 추천 코스, ${city} 1박 2일, ${city} 당일치기`,
      h1: `${city} 여행 코스`
    },
    terms: { title: `이용약관 - ${site}`, description: `${site} 서비스 이용약관입니다.`, noindex: true },
    privacy: { title: `개인정보처리방침 - ${site}`, description: `${site} 개인정보처리방침입니다.`, noindex: true },
    copyright: { title: `저작권 정책 - ${site}`, description: `${site}의 저작권 정책과 공공데이터 이용 안내입니다.`, noindex: true }
  }

  const enCopy = {
    home: {
      title: `${city} Travel Guide | Things to Do, Food & Festivals - ${site}`,
      description: `Plan your trip to ${city} with ${site}. Explore ${top}, local restaurants, festivals, places to stay, parking and clinics in one guide.`,
      keywords: `${city} travel guide, things to do in ${city}, ${city} restaurants, ${city} festivals, ${hl('en').join(', ')}`
    },
    travel: {
      title: `Things to Do in ${city}: Top Attractions${count ? ` (${count})` : ''} | ${site}`,
      description: `Browse ${count ? count + ' ' : ''}attractions in ${city}, including ${top}. See photos, addresses, phone numbers and get directions.`,
      keywords: `${city} attractions, things to do in ${city}, ${city} sightseeing, best places in ${city}, ${hl('en').join(', ')}`,
      h1: `Things to Do in ${city}`
    },
    food: {
      title: `Best Restaurants in ${city}${count ? ` (${count} Places)` : ''} | ${site}`,
      description: `Find ${count ? count + ' ' : ''}restaurants in ${city} with addresses, phone numbers and photos. Look for local food near ${top2}.`,
      keywords: `${city} restaurants, where to eat in ${city}, ${city} food, Korean food ${city}, ${city} local cuisine`,
      h1: `Where to Eat in ${city}`
    },
    festival: {
      title: `${city} Festivals & Events Calendar | ${site}`,
      description: `Check festivals, performances and exhibitions happening in ${city} now and coming up, with dates and venues.`,
      keywords: `${city} festivals, ${city} events, events in ${city} this month, ${city} performances`,
      h1: `${city} Festivals & Events`
    },
    culture: {
      title: `${city} Museums, Galleries & Cultural Venues | ${site}`,
      description: `Explore museums, art galleries, theaters and libraries in ${city}${count ? ` (${count} venues)` : ''}, with locations and contact details.`,
      keywords: `${city} museums, ${city} art galleries, ${city} theaters, ${city} cultural venues`,
      h1: `${city} Cultural Venues`
    },
    leisure: {
      title: `${city} Outdoor Activities & Experiences | ${site}`,
      description: `Discover outdoor activities and experiences in ${city}${count ? ` (${count} spots)` : ''}, from hiking to water leisure, with locations and contacts.`,
      keywords: `${city} activities, ${city} outdoor, ${city} things to do, ${city} experiences`,
      h1: `${city} Activities`
    },
    shopping: {
      title: `Shopping in ${city}: Markets, Malls & Souvenirs | ${site}`,
      description: `Traditional markets, department stores, malls and souvenir shops in ${city}${count ? ` (${count} places)` : ''}, with locations and contacts.`,
      keywords: `${city} shopping, ${city} markets, ${city} souvenirs, ${city} department stores`,
      h1: `Shopping in ${city}`
    },
    accommodation: {
      title: `Where to Stay in ${city}: Hotels, Guesthouses & Hanok | ${site}`,
      description: `Compare ${count ? count + ' ' : ''}places to stay in ${city}, including hotels, guesthouses, pensions and hanok, with locations and contacts.`,
      keywords: `${city} hotels, where to stay in ${city}, ${city} guesthouse, ${city} accommodation`,
      h1: `Where to Stay in ${city}`
    },
    parking: {
      title: `${city} Public Parking Lots | Locations & Fees - ${site}`,
      description: `Search public parking lots in ${city} with locations, opening hours and fees, so you can plan parking before you visit.`,
      keywords: `${city} parking, ${city} public parking, ${city} parking fees`,
      h1: `${city} Public Parking`
    },
    medical: {
      title: `Hospitals & Pharmacies in ${city} | ${site}`,
      description: `Find hospitals, clinics and pharmacies in ${city} by area, with departments, phone numbers and locations for travelers.`,
      keywords: `${city} hospital, ${city} pharmacy, ${city} clinic, medical help ${city}`,
      h1: `${city} Hospitals & Pharmacies`
    },
    map: {
      title: `${city} Tourist Map | Attractions, Food & Stays - ${site}`,
      description: `See attractions, restaurants and accommodation in ${city} on a map. Filter by category and get directions.`,
      keywords: `${city} map, ${city} tourist map, ${city} attractions map`,
      h1: `${city} Tourist Map`
    },
    search: {
      title: `Search ${city} | Attractions, Food & Events - ${site}`,
      description: `Search attractions, restaurants, accommodation and festivals in ${city}.`,
      keywords: `search ${city}`,
      noindex: true
    },
    tripPlanner: {
      title: `${city} Trip Planner | Build Your Itinerary Free - ${site}`,
      description: `Build your own ${city} itinerary. Add attractions, restaurants and stays, organise them by day and check the route on a map.`,
      keywords: `${city} trip planner, ${city} itinerary, plan a trip to ${city}`,
      h1: `${city} Trip Planner`
    },
    sharedTrips: {
      title: `${city} Itineraries | Travel Courses Shared by Travelers - ${site}`,
      description: `Get ideas from ${city} itineraries shared by other travelers, from day trips to overnight courses, and copy them into your own plan.`,
      keywords: `${city} itinerary, ${city} travel course, ${city} 2 day trip, ${city} day trip`,
      h1: `${city} Itineraries`
    },
    terms: { title: `Terms of Service - ${site}`, description: `Terms of service for ${site}.`, noindex: true },
    privacy: { title: `Privacy Policy - ${site}`, description: `Privacy policy for ${site}.`, noindex: true },
    copyright: { title: `Copyright Policy - ${site}`, description: `Copyright policy and public data notice for ${site}.`, noindex: true }
  }

  return (en ? enCopy : ko)[page] || (en ? enCopy : ko).home
}
