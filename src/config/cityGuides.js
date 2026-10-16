import { CITIES } from './cities.js'

const guide = (slug, ko, en, options = {}) => ({ slug, kr: ko, en, ...options })

export const CITY_GUIDES = {
  daejeon: [
    guide('daejeon-one-day-course', {
      title: '대전 당일치기 핵심 여행 코스',
      description: '성심당과 원도심, 엑스포과학공원, 한밭수목원을 하루에 연결하는 대전 대표 코스입니다.',
      intro: '대전역에서 시작해 원도심 먹거리와 과학·자연 명소를 잇습니다. 이동 거리가 짧아 당일치기에 알맞습니다.'
    }, {
      title: 'One Day in Daejeon: Essential Itinerary',
      description: 'A practical one-day route through central Daejeon, Expo Science Park and Hanbat Arboretum.',
      intro: 'Start near Daejeon Station, enjoy the old downtown food scene, then continue to science and green spaces.'
    }, { types: [12, 14, 39], keywords: ['성심당', '엑스포', '한밭수목원', '중앙로', '대전역'] }),
    guide('daejeon-family-science-trip', {
      title: '아이와 함께하는 대전 과학 여행',
      description: '국립중앙과학관과 엑스포 일대 등 가족이 함께 체험하기 좋은 대전 여행지를 모았습니다.',
      intro: '실내 전시와 넓은 야외 공간을 함께 넣어 날씨와 아이의 체력에 맞춰 조정하기 쉽습니다.'
    }, {
      title: 'Daejeon Science Trip with Kids',
      description: 'Family-friendly science museums, hands-on attractions and spacious parks in Daejeon.',
      intro: 'Mix indoor exhibitions with outdoor stops and adjust the route to the weather and your children’s pace.'
    }, { types: [12, 14], keywords: ['과학', '엑스포', '천문', '어린이', '박물관'] }),
    guide('daejeon-rainy-day', {
      title: '비 오는 날 대전 실내 가볼만한 곳',
      description: '박물관, 미술관, 과학관과 실내 먹거리 명소를 묶은 대전 우천 여행 가이드입니다.',
      intro: '비를 피해 오래 머물 수 있는 문화시설을 중심으로 가까운 맛집까지 연결했습니다.'
    }, {
      title: 'What to Do in Daejeon on a Rainy Day',
      description: 'Museums, galleries, science venues and indoor food stops for a rainy day in Daejeon.',
      intro: 'Spend more time indoors and connect cultural venues with nearby places to eat.'
    }, { types: [14, 39], keywords: ['박물관', '미술관', '과학관', '전시'] }),
    guide('yuseong-healing-course', {
      title: '유성온천과 계족산 힐링 코스',
      description: '유성온천, 산책길, 대청호 주변 자연을 중심으로 쉬어가는 대전 힐링 여행입니다.',
      intro: '걷기 좋은 자연 명소와 온천·숙소를 함께 살펴보고 여유로운 일정을 만들어보세요.'
    }, {
      title: 'Daejeon Wellness: Yuseong and Nature',
      description: 'Hot springs, lakeside walks and nature escapes for a slower trip around Daejeon.',
      intro: 'Combine gentle walks with hot springs and a comfortable stay.'
    }, { types: [12, 28, 32], keywords: ['유성', '온천', '계족산', '대청호'], district: '유성구' })
  ],
  seoul: [
    guide('seoul-palace-one-day', {
      title: '서울 궁궐과 북촌 당일치기 코스',
      description: '경복궁, 북촌, 인사동을 걸어서 잇는 서울 전통문화 당일 여행 코스입니다.',
      intro: '궁궐 개방 시간부터 확인하고 북촌 골목과 인사동 식당을 차례로 연결하면 이동이 편합니다.'
    }, {
      title: 'Seoul Palace and Bukchon One-Day Itinerary',
      description: 'A walkable one-day route linking Gyeongbokgung, Bukchon and Insadong.',
      intro: 'Check palace opening hours first, then continue through Bukchon lanes to restaurants around Insadong.'
    }, { types: [12, 14, 39], keywords: ['경복궁', '북촌', '인사동', '궁', '한옥'], district: '종로구' }),
    guide('seoul-two-night-three-day', {
      title: '서울 2박 3일 처음 여행 코스',
      description: '궁궐, 명동, 한강, 홍대를 균형 있게 담은 서울 첫 방문 2박 3일 일정입니다.',
      intro: '하루에 한 권역씩 묶어 장거리 이동을 줄이고 야경과 식사 시간을 충분히 남겼습니다.'
    }, {
      title: 'Seoul First-Timer 3-Day Itinerary',
      description: 'A balanced three-day Seoul itinerary covering palaces, Myeongdong, the Han River and Hongdae.',
      intro: 'Stay within one area each day to reduce travel time and leave room for meals and evening views.'
    }, { types: [12, 14, 39, 38], keywords: ['경복궁', '명동', '한강', '홍대', '남산'] }),
    guide('seoul-rainy-day', {
      title: '서울 비 오는 날 실내 데이트',
      description: '미술관, 박물관, 복합문화공간과 시장을 묶은 서울 우천 실내 데이트 가이드입니다.',
      intro: '지하철 접근성이 좋고 실내 체류 시간이 긴 장소를 중심으로 골랐습니다.'
    }, {
      title: 'Rainy-Day Indoor Date in Seoul',
      description: 'Museums, galleries, cultural complexes and markets for a rainy day in Seoul.',
      intro: 'These stops are easy to reach by subway and offer plenty of time indoors.'
    }, { types: [14, 38, 39], keywords: ['미술관', '박물관', '전시', '문화', '시장'] }),
    guide('seoul-with-kids', {
      title: '아이와 서울 가볼만한 곳',
      description: '과학관, 공원, 동물원과 체험시설을 중심으로 고른 서울 가족 여행 가이드입니다.',
      intro: '유모차 이동과 휴식 시간을 고려해 한 권역에서 반나절 이상 머무는 구성을 추천합니다.'
    }, {
      title: 'Best Things to Do in Seoul with Kids',
      description: 'Science venues, parks, zoos and hands-on attractions for a family trip to Seoul.',
      intro: 'Choose one area for each half day and allow extra time for breaks and stroller travel.'
    }, { types: [12, 14, 28], keywords: ['어린이', '과학', '동물', '공원', '체험'] })
  ],
  busan: [
    guide('busan-beach-one-day', {
      title: '해운대·광안리 부산 바다 당일치기',
      description: '해운대와 광안리, 해변 산책과 야경을 하루에 즐기는 부산 바다 코스입니다.',
      intro: '낮에는 해운대, 해질 무렵에는 광안리로 이동하면 바다와 야경을 모두 보기 좋습니다.'
    }, {
      title: 'Busan Beach Day: Haeundae to Gwangalli',
      description: 'A one-day coastal itinerary from Haeundae to Gwangalli, ending with the night view.',
      intro: 'Explore Haeundae by day and move to Gwangalli around sunset for the bridge lights.'
    }, { types: [12, 28, 39], keywords: ['해운대', '광안리', '해수욕장', '동백'], district: '해운대구' }),
    guide('busan-two-night-three-day', {
      title: '부산 2박 3일 처음 여행 코스',
      description: '해운대, 감천문화마을, 자갈치시장과 영도를 담은 부산 첫 방문 일정입니다.',
      intro: '동부 해변과 원도심을 날짜별로 나눠 이동 시간을 줄인 코스입니다.'
    }, {
      title: 'Busan First-Timer 3-Day Itinerary',
      description: 'A three-day itinerary covering Haeundae, Gamcheon, Jagalchi and Yeongdo.',
      intro: 'Split the east coast and old downtown across different days to avoid long cross-city trips.'
    }, { types: [12, 39, 38, 14], keywords: ['해운대', '감천', '자갈치', '영도', '광안리'] }),
    guide('busan-rainy-day', {
      title: '부산 비 오는 날 실내 가볼만한 곳',
      description: '박물관, 미술관, 아쿠아리움과 시장을 묶은 부산 우천 여행 가이드입니다.',
      intro: '비바람이 강한 날에도 머물기 좋은 실내 명소와 가까운 식당을 연결했습니다.'
    }, {
      title: 'What to Do in Busan on a Rainy Day',
      description: 'Museums, galleries, aquariums and covered markets for a rainy day in Busan.',
      intro: 'Stay sheltered from coastal rain while exploring indoor attractions and nearby restaurants.'
    }, { types: [14, 38, 39], keywords: ['박물관', '미술관', '아쿠아리움', '시장'] }),
    guide('busan-family-trip', {
      title: '아이와 함께하는 부산 가족 여행',
      description: '해변, 공원, 체험시설과 박물관을 중심으로 고른 부산 가족 여행 코스입니다.',
      intro: '모래놀이와 실내 체험을 함께 넣어 아이의 체력과 날씨에 맞춰 바꾸기 쉽습니다.'
    }, {
      title: 'Busan Family Trip with Kids',
      description: 'Beaches, parks, museums and hands-on attractions for families visiting Busan.',
      intro: 'Mix beach time with indoor activities so the plan stays flexible in any weather.'
    }, { types: [12, 14, 28], keywords: ['어린이', '체험', '공원', '해수욕장', '박물관'] })
  ],
  jeju: [
    guide('jeju-east-one-day', {
      title: '제주 동쪽 성산·우도 당일치기 코스',
      description: '성산일출봉, 우도와 동쪽 해안을 연결하는 제주 동부 당일 여행 코스입니다.',
      intro: '배 시간과 일몰을 먼저 확인하고 성산 권역에서 식사와 숙소를 묶으면 이동이 편합니다.'
    }, {
      title: 'East Jeju Day Trip: Seongsan and Udo',
      description: 'A one-day route around Seongsan, Udo and the east coast of Jeju.',
      intro: 'Check ferry times and sunset first, then keep meals and accommodation around Seongsan.'
    }, { types: [12, 28, 39], keywords: ['성산', '우도', '섭지코지', '동쪽'], district: '서귀포시' }),
    guide('jeju-two-night-three-day', {
      title: '제주 2박 3일 처음 여행 코스',
      description: '동쪽, 서쪽, 서귀포를 하루씩 나눠 보는 제주 첫 방문 2박 3일 일정입니다.',
      intro: '섬을 매일 가로지르지 않도록 권역을 나누고 날씨에 따라 오름과 실내 명소를 교체하세요.'
    }, {
      title: 'Jeju First-Timer 3-Day Itinerary',
      description: 'A three-day Jeju itinerary split between the east, west and Seogwipo.',
      intro: 'Avoid crossing the island every day and swap volcanic hills for indoor stops when weather changes.'
    }, { types: [12, 28, 39, 38], keywords: ['성산', '협재', '서귀포', '한라산', '애월'] }),
    guide('jeju-rainy-day', {
      title: '제주 비 오는 날 가볼만한 곳',
      description: '박물관, 미술관, 실내 체험과 시장을 모은 제주 우천 여행 가이드입니다.',
      intro: '강풍과 비가 잦은 날에는 해안보다 실내 문화시설과 가까운 식당을 중심으로 이동하세요.'
    }, {
      title: 'What to Do in Jeju on a Rainy Day',
      description: 'Museums, galleries, indoor experiences and markets for wet and windy days in Jeju.',
      intro: 'On stormy days, favor indoor cultural venues and nearby restaurants over exposed coastal stops.'
    }, { types: [14, 38, 39], keywords: ['박물관', '미술관', '체험', '시장'] }),
    guide('jeju-with-kids', {
      title: '아이와 제주 가족 여행 추천',
      description: '동물, 자연, 실내 체험과 안전한 해변을 중심으로 고른 제주 가족 여행지입니다.',
      intro: '차량 이동 사이 휴식 시간을 두고 실내와 야외 장소를 번갈아 배치하는 편이 좋습니다.'
    }, {
      title: 'Jeju Family Trip with Kids',
      description: 'Nature, animals, indoor activities and family-friendly beaches around Jeju.',
      intro: 'Alternate indoor and outdoor stops and leave enough rest time between drives.'
    }, { types: [12, 14, 28], keywords: ['어린이', '동물', '체험', '공원', '해수욕장'] })
  ]
}

export const getCityGuides = (cityKey) => CITY_GUIDES[cityKey] || []
export const getCityGuide = (cityKey, slug) => getCityGuides(cityKey).find((item) => item.slug === slug)
export const getGuideCity = (cityKey) => CITIES[cityKey]
