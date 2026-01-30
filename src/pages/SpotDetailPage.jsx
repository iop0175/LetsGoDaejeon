import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import DOMPurify from 'dompurify'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { getTourSpotByContentId, incrementSpotViews, getSpotStats, toggleSpotLike, checkSpotLiked, getSpotReviews, createSpotReview, deleteSpotReview, getSpotsByDistrict, getNearbyRestaurants, getNearbySpots, getNearbyAccommodations, getNearbyShopping } from '../services/dbService'
import { getTourApiImages, getTourApiDetail } from '../services/api'
import { getUserTripPlans, addTripPlace, getTripsContainingPlace } from '../services/tripService'
import { getReliableImageUrl, handleImageError, cleanIntroHtml, sanitizeIntroHtml, toSecureUrl } from '../utils/imageUtils'
import { generateSlug } from '../utils/slugUtils'
import LicenseBadge from '../components/common/LicenseBadge'
import Icons from '../components/common/Icons'
// CSS는 pages/_app.jsx에서 import

// XSS 방지를 위한 텍스트 새니타이징 함수
const sanitizeText = (text) => {
  if (!text) return ''
  // HTML 태그 제거하고 텍스트만 반환
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

// 닉네임 마스킹 함수 (첫 글자만 표시, 나머지는 **)
const maskNickname = (nickname) => {
  const sanitized = sanitizeText(nickname)
  if (!sanitized || sanitized === '익명') return '익명'
  if (sanitized.length === 1) return sanitized
  if (sanitized.length === 2) return sanitized[0] + '*'
  // 3글자 이상: 첫 글자 + **
  return sanitized[0] + '**'
}

// 시설 아이콘 매핑
const FACILITY_ICON_MAP = {
  parking: Icons.parking,
  pet: Icons.pet,
  card: Icons.card,
  babycar: Icons.stroller,
  reservation: Icons.reservation,
  packing: Icons.takeout
}

// intro fields 아이콘 매핑
const INTRO_ICON_MAP = {
  clock: Icons.clock,
  calendar: Icons.calendar,
  phone: Icons.phone,
  parking: Icons.parking,
  baby: Icons.stroller,
  pet: Icons.pet,
  card: Icons.card,
  ticket: Icons.ticket,
  star: Icons.star,
  about: Icons.about,
  facilities: Icons.facilities,
  user: Icons.user,
  location: Icons.location
}

// 콘텐츠 타입별 설정
const CONTENT_TYPE_CONFIG = {
  '12': { name: { ko: '관광지', en: 'Tourist Attraction' }, color: '#4CAF50', path: '/travel' },
  '14': { name: { ko: '문화시설', en: 'Cultural Facility' }, color: '#9C27B0', path: '/culture' },
  '28': { name: { ko: '레포츠', en: 'Leisure' }, color: '#2196F3', path: '/leisure' },
  '32': { name: { ko: '숙박', en: 'Accommodation' }, color: '#FF9800', path: '/accommodation' },
  '38': { name: { ko: '쇼핑', en: 'Shopping' }, color: '#E91E63', path: '/shopping' },
  '39': { name: { ko: '음식점', en: 'Restaurant' }, color: '#F44336', path: '/food' },
  '15': { name: { ko: '축제/행사', en: 'Festival' }, color: '#FF5722', path: '/festival' }
}

// 콘텐츠 타입별 intro_info 필드 매핑
const INTRO_FIELDS = {
  '12': [
    { key: 'usetime', label: { ko: '이용시간', en: 'Hours' }, iconKey: 'clock' },
    { key: 'restdate', label: { ko: '쉬는날', en: 'Closed' }, iconKey: 'calendar' },
    { key: 'infocenter', label: { ko: '문의처', en: 'Contact' }, iconKey: 'phone' },
    { key: 'parking', label: { ko: '주차시설', en: 'Parking' }, iconKey: 'parking' },
    { key: 'chkbabycarriage', label: { ko: '유모차대여', en: 'Stroller' }, iconKey: 'baby' },
    { key: 'chkpet', label: { ko: '애완동물', en: 'Pets' }, iconKey: 'pet' },
    { key: 'chkcreditcard', label: { ko: '신용카드', en: 'Credit Card' }, iconKey: 'card' }
  ],
  '14': [
    { key: 'usetimeculture', label: { ko: '이용시간', en: 'Hours' }, iconKey: 'clock' },
    { key: 'restdateculture', label: { ko: '휴관일', en: 'Closed' }, iconKey: 'calendar' },
    { key: 'usefee', label: { ko: '이용요금', en: 'Fee' }, iconKey: 'ticket' },
    { key: 'infocenterculture', label: { ko: '문의처', en: 'Contact' }, iconKey: 'phone' },
    { key: 'parkingculture', label: { ko: '주차시설', en: 'Parking' }, iconKey: 'parking' },
    { key: 'spendtime', label: { ko: '관람소요시간', en: 'Duration' }, iconKey: 'clock' }
  ],
  '28': [
    { key: 'usetimeleports', label: { ko: '이용시간', en: 'Hours' }, iconKey: 'clock' },
    { key: 'restdateleports', label: { ko: '휴무일', en: 'Closed' }, iconKey: 'calendar' },
    { key: 'usefeeleports', label: { ko: '이용요금', en: 'Fee' }, iconKey: 'ticket' },
    { key: 'infocenterleports', label: { ko: '문의처', en: 'Contact' }, iconKey: 'phone' },
    { key: 'parkingleports', label: { ko: '주차시설', en: 'Parking' }, iconKey: 'parking' },
    { key: 'reservation', label: { ko: '예약안내', en: 'Reservation' }, iconKey: 'calendar' }
  ],
  '32': [
    { key: 'checkintime', label: { ko: '체크인', en: 'Check-in' }, iconKey: 'clock' },
    { key: 'checkouttime', label: { ko: '체크아웃', en: 'Check-out' }, iconKey: 'clock' },
    { key: 'infocenterlodging', label: { ko: '문의처', en: 'Contact' }, iconKey: 'phone' },
    { key: 'parkinglodging', label: { ko: '주차시설', en: 'Parking' }, iconKey: 'parking' },
    { key: 'roomcount', label: { ko: '객실수', en: 'Rooms' }, iconKey: 'about' },
    { key: 'subfacility', label: { ko: '부대시설', en: 'Facilities' }, iconKey: 'facilities' }
  ],
  '38': [
    { key: 'opentime', label: { ko: '영업시간', en: 'Hours' }, iconKey: 'clock' },
    { key: 'restdateshopping', label: { ko: '휴무일', en: 'Closed' }, iconKey: 'calendar' },
    { key: 'infocentershopping', label: { ko: '문의처', en: 'Contact' }, iconKey: 'phone' },
    { key: 'parkingshopping', label: { ko: '주차시설', en: 'Parking' }, iconKey: 'parking' },
    { key: 'saleitem', label: { ko: '판매품목', en: 'Products' }, iconKey: 'about' }
  ],
  '39': [
    { key: 'firstmenu', label: { ko: '대표메뉴', en: 'Signature' }, iconKey: 'star' },
    { key: 'treatmenu', label: { ko: '취급메뉴', en: 'Menu' }, iconKey: 'about' },
    { key: 'opentimefood', label: { ko: '영업시간', en: 'Hours' }, iconKey: 'clock' },
    { key: 'restdatefood', label: { ko: '휴무일', en: 'Closed' }, iconKey: 'calendar' },
    { key: 'infocenterfood', label: { ko: '문의처', en: 'Contact' }, iconKey: 'phone' },
    { key: 'packing', label: { ko: '포장', en: 'Takeout' }, iconKey: 'about' },
    { key: 'parkingfood', label: { ko: '주차시설', en: 'Parking' }, iconKey: 'parking' }
  ],
  '15': [
    { key: 'sponsor1', label: { ko: '주최자', en: 'Organizer' }, iconKey: 'user' },
    { key: 'playtime', label: { ko: '공연시간', en: 'Time' }, iconKey: 'clock' },
    { key: 'usetimefestival', label: { ko: '이용요금', en: 'Fee' }, iconKey: 'ticket' },
    { key: 'eventplace', label: { ko: '행사장소', en: 'Venue' }, iconKey: 'location' }
  ]
}

// 시설/서비스 아이콘 매핑
const FACILITY_ITEMS = [
  { key: 'parking', label: { ko: '주차', en: 'Parking' }, checkKeys: ['parking', 'parkingculture', 'parkingleports', 'parkinglodging', 'parkingshopping', 'parkingfood'] },
  { key: 'pet', label: { ko: '반려동물', en: 'Pets' }, checkKeys: ['chkpet'] },
  { key: 'card', label: { ko: '카드결제', en: 'Card' }, checkKeys: ['chkcreditcard'] },
  { key: 'babycar', label: { ko: '유모차', en: 'Stroller' }, checkKeys: ['chkbabycarriage'] },
  { key: 'reservation', label: { ko: '예약', en: 'Reservation' }, checkKeys: ['reservation'] },
  { key: 'packing', label: { ko: '포장', en: 'Takeout' }, checkKeys: ['packing'] }
]

const SpotDetailPage = () => {
  const router = useRouter()
  // slug URL에서 contentId 추출 (/spot/관광지명-123456 형식)
  const { slug, contentId: directContentId } = router.query
  
  // slug에서 contentId 추출 (마지막 하이픈 이후 숫자)
  const contentId = (() => {
    if (directContentId) return directContentId
    if (!slug) return null
    const decoded = decodeURIComponent(slug)
    const match = decoded.match(/-(\d+)$/)
    if (match) return match[1]
    // 전체가 숫자인 경우 (기존 URL 호환)
    if (/^\d+$/.test(decoded)) return decoded
    return null
  })()
  
  const { language, t } = useLanguage()
  const { isDark } = useTheme()
  const { user } = useAuth()
  
  const [spot, setSpot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [galleryImages, setGalleryImages] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showFullGallery, setShowFullGallery] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [addressCopied, setAddressCopied] = useState(false)
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [tripPlans, setTripPlans] = useState([])
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [selectedDayId, setSelectedDayId] = useState(null)
  const [tripsLoading, setTripsLoading] = useState(false)
  const [addingToTrip, setAddingToTrip] = useState(false)
  
  // 조회수/좋아요/리뷰 상태
  const [viewCount, setViewCount] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  const [reviews, setReviews] = useState([])
  const [reviewCount, setReviewCount] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newReviewContent, setNewReviewContent] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  
  // 리뷰 페이지네이션 및 정렬 상태
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewTotalPages, setReviewTotalPages] = useState(0)
  const [reviewSortBy, setReviewSortBy] = useState('created_at') // 'created_at' | 'rating'
  const [reviewSortOrder, setReviewSortOrder] = useState('desc') // 'asc' | 'desc'
  const REVIEW_PAGE_SIZE = 5
  
  // 주변 관광지 상태
  const [relatedSpots, setRelatedSpots] = useState([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  
  // 근처 맛집/카페 상태 (관광지 전용)
  const [nearbyRestaurants, setNearbyRestaurants] = useState([])
  const [nearbyCafes, setNearbyCafes] = useState([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  
  // 근처 숙박/쇼핑 상태 (맛집 전용)
  const [nearbyAccommodations, setNearbyAccommodations] = useState([])
  const [nearbyShopping, setNearbyShopping] = useState([])
  const [nearbyPlacesLoading, setNearbyPlacesLoading] = useState(false)
  
  // 연관 여행코스 상태
  const [relatedTrips, setRelatedTrips] = useState([])
  const [relatedTripsLoading, setRelatedTripsLoading] = useState(false)
  
  // FAQ 상태
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  // FAQ 생성 함수 - 이용안내 기반으로 동적 생성
  const generateFaqs = (spot, contentType, language) => {
    if (!spot) return []
    
    const faqs = []
    const intro = spot.intro_info || {}
    const name = spot.title || '이 장소'
    
    // 요금 관련 FAQ
    const feeFields = ['usefee', 'usefeeleports', 'usetimefestival']
    const feeValue = feeFields.find(f => intro[f])
    if (feeValue) {
      const isFree = /무료|free|없음|0원/i.test(intro[feeValue])
      faqs.push({
        q: language === 'ko' 
          ? `${name}은(는) 무료로 이용할 수 있나요?`
          : `Is ${name} free to visit?`,
        a: isFree 
          ? (language === 'ko' ? '네, 무료로 이용 가능합니다.' : 'Yes, it is free to visit.')
          : (language === 'ko' ? `이용 요금이 있습니다: ${intro[feeValue].replace(/<[^>]*>/g, '')}` : `There is an admission fee: ${intro[feeValue].replace(/<[^>]*>/g, '')}`)
      })
    } else if (contentType === '12' || contentType === '14') {
      faqs.push({
        q: language === 'ko' 
          ? `${name}은(는) 무료로 관람할 수 있나요?`
          : `Is ${name} free to visit?`,
        a: language === 'ko' 
          ? '이용 요금 정보가 없어 직접 확인이 필요합니다. 문의처로 연락해주세요.'
          : 'Fee information is not available. Please contact them directly.'
      })
    }
    
    // 소요시간 관련 FAQ
    if (intro.spendtime) {
      faqs.push({
        q: language === 'ko' 
          ? '관람에 걸리는 시간은 어느 정도인가요?'
          : 'How long does it take to visit?',
        a: language === 'ko' 
          ? `평균 ${intro.spendtime.replace(/<[^>]*>/g, '')} 정도 소요됩니다.`
          : `It takes approximately ${intro.spendtime.replace(/<[^>]*>/g, '')}.`
      })
    } else if (contentType === '14') {
      faqs.push({
        q: language === 'ko' 
          ? '관람에 걸리는 시간은 어느 정도인가요?'
          : 'How long does it take to visit?',
        a: language === 'ko' 
          ? '시설 규모에 따라 다르지만, 보통 1~2시간 정도 소요됩니다.'
          : 'It usually takes 1-2 hours depending on the facility size.'
      })
    }
    
    // 반려동물 관련 FAQ
    if (intro.chkpet) {
      const allowsPet = /가능|허용|yes|ok|○/i.test(intro.chkpet)
      faqs.push({
        q: language === 'ko' 
          ? '반려동물과 함께 방문할 수 있나요?'
          : 'Can I bring my pet?',
        a: allowsPet 
          ? (language === 'ko' ? '네, 반려동물 동반 입장이 가능합니다.' : 'Yes, pets are allowed.')
          : (language === 'ko' ? `반려동물 관련 안내: ${intro.chkpet.replace(/<[^>]*>/g, '')}` : `Pet policy: ${intro.chkpet.replace(/<[^>]*>/g, '')}`)
      })
    }
    
    // 유모차/아이 관련 FAQ
    if (intro.chkbabycarriage) {
      const hasBaby = /가능|대여|yes|ok|○|있음/i.test(intro.chkbabycarriage)
      faqs.push({
        q: language === 'ko' 
          ? '아이들과 함께 방문해도 괜찮은가요?'
          : 'Is it suitable for children?',
        a: hasBaby 
          ? (language === 'ko' ? '네, 유모차 대여 서비스가 있어 아이와 함께 방문하기 좋습니다.' : 'Yes, strollers are available for rent, making it great for families.')
          : (language === 'ko' ? '아이와 함께 방문 가능합니다.' : 'Yes, children are welcome.')
      })
    } else if (['12', '14', '28'].includes(contentType)) {
      faqs.push({
        q: language === 'ko' 
          ? '아이들과 함께 방문해도 괜찮은가요?'
          : 'Is it suitable for children?',
        a: language === 'ko' 
          ? '가족 단위 방문객도 많이 찾는 곳입니다. 자세한 편의시설은 방문 전 문의해주세요.'
          : 'Many families visit here. Please contact them for specific facilities.'
      })
    }
    
    // 주차 관련 FAQ
    const parkingFields = ['parking', 'parkingculture', 'parkingleports', 'parkinglodging', 'parkingshopping', 'parkingfood']
    const parkingValue = parkingFields.find(f => intro[f])
    if (parkingValue) {
      const hasParking = /있|가능|무료|유료|대|○|yes/i.test(intro[parkingValue])
      faqs.push({
        q: language === 'ko' 
          ? '주차 공간이 있나요?'
          : 'Is parking available?',
        a: hasParking 
          ? (language === 'ko' ? `네, 주차 가능합니다. ${intro[parkingValue].replace(/<[^>]*>/g, '')}` : `Yes, parking is available. ${intro[parkingValue].replace(/<[^>]*>/g, '')}`)
          : (language === 'ko' ? `주차 안내: ${intro[parkingValue].replace(/<[^>]*>/g, '')}` : `Parking info: ${intro[parkingValue].replace(/<[^>]*>/g, '')}`)
      })
    }
    
    // 예약 관련 FAQ
    if (intro.reservation) {
      faqs.push({
        q: language === 'ko' 
          ? '사전 예약이 필요한가요?'
          : 'Do I need to make a reservation?',
        a: language === 'ko' 
          ? `예약 안내: ${intro.reservation.replace(/<[^>]*>/g, '')}`
          : `Reservation info: ${intro.reservation.replace(/<[^>]*>/g, '')}`
      })
    }
    
    // 휴무일 관련 FAQ
    const restFields = ['restdate', 'restdateculture', 'restdateleports', 'restdateshopping', 'restdatefood']
    const restValue = restFields.find(f => intro[f])
    if (restValue) {
      faqs.push({
        q: language === 'ko' 
          ? '휴무일이 있나요?'
          : 'Are there any closed days?',
        a: language === 'ko' 
          ? `${intro[restValue].replace(/<[^>]*>/g, '')}`
          : `${intro[restValue].replace(/<[^>]*>/g, '')}`
      })
    }
    
    return faqs.slice(0, 5) // 최대 5개
  }
  
  // 장소 설명 요약 생성 함수 (overview/intro_info 분석 기반)
  // {{place_name}}은 {{city}} {{district}}에 위치한 {{type}}로,
  // {{main_feature}}을 주제로 한 {{content_form}} 공간이다.
  // {{target_user}}에게 적합해 {{search_intent}} 목적으로 많이 방문한다.
  const generateSpotDescription = (spot, contentType, language) => {
    if (!spot) return null
    
    const name = spot.title || '이 장소'
    const address = spot.addr1 || ''
    const overview = (language === 'en' && spot.overview_en ? spot.overview_en : spot.overview) || ''
    const intro = spot.intro_info || {}
    const cleanOverview = overview.replace(/<[^>]*>/g, '').toLowerCase()
    
    // 주소에서 시/구 추출
    const addressParts = address.split(' ')
    const city = addressParts.find(p => p.includes('시') || p.includes('광역시')) || '대전광역시'
    const district = addressParts.find(p => p.includes('구')) || ''
    
    // 콘텐츠 타입별 기본 설정
    const typeNames = {
      '12': { ko: '관광지', en: 'tourist attraction' },
      '14': { ko: '문화시설', en: 'cultural facility' },
      '28': { ko: '레포츠 시설', en: 'leisure facility' },
      '32': { ko: '숙박시설', en: 'accommodation' },
      '38': { ko: '쇼핑 명소', en: 'shopping destination' },
      '39': { ko: '음식점', en: 'restaurant' },
      '15': { ko: '축제/행사', en: 'festival/event' }
    }
    
    // 키워드 기반 자동 분석
    const keywordMap = {
      feature: {
        ko: [
          // 쇼핑 관련 먼저 체크 (스토어, 아울렛 등)
          { keywords: ['쇼핑', '마트', '시장', '매장', '백화점', '아울렛', '스토어', '상점', '면세점'], value: '쇼핑' },
          { keywords: ['연구원', '연구소', '에너지', '기술', '원자력', '핵융합', '우주', 'KAIST', '카이스트'], value: '과학기술' },
          { keywords: ['아쿠아리움', '수족관', '물고기', '해양', '바다', '수중', '동물원', '동물'], value: '해양·동물 체험' },
          { keywords: ['공원', '숲', '산', '호수', '자연', '꽃', '나무', '정원', '수목원', '생태'], value: '자연경관' },
          { keywords: ['역사', '문화재', '유적', '전통', '사찰', '성', '기념관'], value: '역사문화' },
          { keywords: ['박물관', '미술관', '갤러리', '전시관'], value: '문화예술' },
          { keywords: ['테마', '놀이', '어린이', '키즈', '어린이집'], value: '테마 체험' },
          { keywords: ['천문', '천문대', '별', '과학'], value: '과학 체험' },
          { keywords: ['효', '성씨', '족보', '뿌리'], value: '전통문화' },
          { keywords: ['스포츠', '운동', '레저', '수영', '골프', '테니스', '축구', '체육관'], value: '스포츠' },
          { keywords: ['맛집', '음식', '요리', '메뉴', '식당', '카페', '밥', '고기', '국밥'], value: '지역 맛집' }
        ],
        en: [
          // Shopping first
          { keywords: ['shopping', 'mart', 'market', 'store', 'department', 'outlet', 'shop', 'mall', 'duty-free'], value: 'shopping' },
          { keywords: ['research', 'institute', 'energy', 'technology', 'nuclear', 'fusion', 'space', 'kaist'], value: 'science & technology' },
          { keywords: ['aquarium', 'fish', 'marine', 'ocean', 'sea', 'underwater', 'zoo', 'animal'], value: 'marine & animal experience' },
          { keywords: ['park', 'forest', 'mountain', 'lake', 'nature', 'flower', 'tree', 'garden', 'arboretum', 'ecology'], value: 'natural scenery' },
          { keywords: ['history', 'heritage', 'temple', 'castle', 'memorial'], value: 'history and culture' },
          { keywords: ['museum', 'art', 'gallery', 'exhibition'], value: 'arts and culture' },
          { keywords: ['theme', 'play', 'children', 'kids'], value: 'themed activities' },
          { keywords: ['observatory', 'astronomy', 'star', 'science'], value: 'science experience' },
          { keywords: ['filial', 'clan', 'genealogy', 'root'], value: 'traditional culture' },
          { keywords: ['sports', 'exercise', 'leisure', 'swimming', 'golf', 'tennis', 'soccer', 'gym'], value: 'sports' },
          { keywords: ['restaurant', 'food', 'cuisine', 'menu', 'cafe'], value: 'local cuisine' }
        ]
      },
      form: {
        ko: [
          // 쇼핑 먼저
          { keywords: ['쇼핑', '마트', '시장', '매장', '백화점', '아울렛', '스토어', '상점', '면세점'], value: '쇼핑 체험' },
          { keywords: ['연구원', '연구소', '에너지', '기술', '핵융합'], value: '견학 체험' },
          { keywords: ['아쿠아리움', '수족관', '동물원', '관람'], value: '실내 관람' },
          { keywords: ['공원', '야외', '산책', '정원', '광장', '자연', '숲', '산'], value: '야외 체험' },
          { keywords: ['전시', '박물관', '미술관', '갤러리', '전시관'], value: '전시 체험' },
          { keywords: ['공연', '극장', '무대', '콘서트'], value: '공연 관람' },
          { keywords: ['체험', '프로그램', '교육', '학습', '과학'], value: '교육 체험' },
          { keywords: ['실내', '관내', '건물'], value: '실내 체험' },
          { keywords: ['식당', '카페', '맛집', '음식점'], value: '미식 체험' }
        ],
        en: [
          // Shopping first
          { keywords: ['shopping', 'mart', 'market', 'store', 'department', 'outlet', 'shop', 'mall'], value: 'shopping experience' },
          { keywords: ['research', 'institute', 'energy', 'technology', 'fusion'], value: 'educational tour' },
          { keywords: ['aquarium', 'zoo', 'animal', 'marine'], value: 'indoor viewing' },
          { keywords: ['park', 'outdoor', 'walk', 'garden', 'square', 'nature', 'forest', 'mountain'], value: 'outdoor experience' },
          { keywords: ['exhibition', 'museum', 'art', 'gallery'], value: 'exhibition' },
          { keywords: ['performance', 'theater', 'stage', 'concert'], value: 'performance viewing' },
          { keywords: ['experience', 'program', 'education', 'learning', 'science'], value: 'educational experience' },
          { keywords: ['indoor', 'building'], value: 'indoor experience' },
          { keywords: ['restaurant', 'cafe', 'dining'], value: 'dining experience' }
        ]
      },
      target: {
        ko: [
          // 쇼핑 먼저
          { keywords: ['쇼핑', '마트', '시장', '매장', '백화점', '아울렛', '스토어', '상점', '면세점'], value: '쇼핑을 즐기는 분들' },
          { keywords: ['연구원', '연구소', '에너지', '기술', '핵융합'], value: '과학에 관심 있는 분들' },
          { keywords: ['아쿠아리움', '수족관', '동물원', '어린이', '아이', '키즈', '유모차', '가족'], value: '가족 단위 방문객' },
          { keywords: ['연인', '데이트', '커플'], value: '연인' },
          { keywords: ['사진', '인스타', '포토'], value: '사진 촬영을 즐기는 분들' },
          { keywords: ['역사', '문화', '기념관', '박물관'], value: '역사에 관심 있는 분들' },
          { keywords: ['학습', '교육', '체험', '과학'], value: '학습 목적의 방문객' },
          { keywords: ['운동', '스포츠', '레저'], value: '스포츠를 즐기는 분들' },
          { keywords: ['맛집', '미식', '음식', '식당'], value: '미식가' }
        ],
        en: [
          // Shopping first
          { keywords: ['shopping', 'mart', 'market', 'store', 'department', 'outlet', 'shop', 'mall'], value: 'shoppers' },
          { keywords: ['research', 'institute', 'energy', 'technology', 'fusion'], value: 'science enthusiasts' },
          { keywords: ['aquarium', 'zoo', 'animal', 'children', 'kids', 'stroller', 'family'], value: 'families' },
          { keywords: ['couple', 'date', 'romance'], value: 'couples' },
          { keywords: ['photo', 'instagram'], value: 'photography enthusiasts' },
          { keywords: ['history', 'culture', 'memorial', 'museum'], value: 'history buffs' },
          { keywords: ['learning', 'education', 'experience', 'science'], value: 'educational visitors' },
          { keywords: ['exercise', 'sports', 'leisure'], value: 'sports enthusiasts' },
          { keywords: ['restaurant', 'food', 'cuisine'], value: 'foodies' }
        ]
      },
      intent: {
        ko: [
          // 쇼핑 먼저
          { keywords: ['쇼핑', '마트', '시장', '매장', '아울렛', '스토어', '상점', '면세점'], value: '쇼핑' },
          { keywords: ['연구원', '연구소', '에너지', '기술', '핵융합', '견학'], value: '학습' },
          { keywords: ['아쿠아리움', '수족관', '동물원', '관람', '구경', '감상', '전시'], value: '관람' },
          { keywords: ['산책', '걷기', '트레킹', '등산', '공원'], value: '산책' },
          { keywords: ['체험', '프로그램', '활동', '놀이'], value: '체험 활동' },
          { keywords: ['사진', '촬영', '인스타', '포토'], value: '사진 촬영' },
          { keywords: ['학습', '교육', '탐방', '박물관', '기념관', '과학'], value: '학습' },
          { keywords: ['식사', '맛집', '외식', '음식', '식당'], value: '식사' },
          { keywords: ['휴식', '힐링', '쉼', '자연'], value: '휴식' }
        ],
        en: [
          // Shopping first
          { keywords: ['shopping', 'mart', 'market', 'store', 'outlet', 'shop', 'mall'], value: 'shopping' },
          { keywords: ['research', 'institute', 'energy', 'technology', 'fusion', 'learn', 'education', 'explore'], value: 'learning' },
          { keywords: ['aquarium', 'zoo', 'animal', 'view', 'see', 'watch', 'exhibition', 'museum', 'memorial'], value: 'sightseeing' },
          { keywords: ['walk', 'hiking', 'trail', 'park'], value: 'walking' },
          { keywords: ['experience', 'program', 'activity', 'play', 'science'], value: 'experiencing' },
          { keywords: ['photo', 'picture', 'instagram'], value: 'photography' },
          { keywords: ['dining', 'restaurant', 'eat', 'food'], value: 'dining' },
          { keywords: ['rest', 'relax', 'healing', 'nature'], value: 'relaxation' }
        ]
      }
    }
    
    // 콘텐츠 타입별 기본값 (키워드 매칭 실패 시 사용)
    const contentTypeDefaults = {
      '12': { // 관광지
        feature: { ko: '자연경관', en: 'natural scenery' },
        form: { ko: '야외 체험', en: 'outdoor experience' },
        target: { ko: '가족 단위 방문객', en: 'families' },
        intent: { ko: '관람', en: 'sightseeing' }
      },
      '14': { // 문화시설
        feature: { ko: '문화예술', en: 'arts and culture' },
        form: { ko: '전시 체험', en: 'exhibition' },
        target: { ko: '문화예술에 관심 있는 분들', en: 'art enthusiasts' },
        intent: { ko: '관람', en: 'sightseeing' }
      },
      '28': { // 레포츠
        feature: { ko: '스포츠', en: 'sports' },
        form: { ko: '레저 체험', en: 'leisure experience' },
        target: { ko: '스포츠를 즐기는 분들', en: 'sports enthusiasts' },
        intent: { ko: '체험 활동', en: 'experiencing' }
      },
      '32': { // 숙박
        feature: { ko: '편안한 휴식', en: 'comfortable rest' },
        form: { ko: '숙박 서비스', en: 'accommodation service' },
        target: { ko: '여행객', en: 'travelers' },
        intent: { ko: '휴식', en: 'relaxation' }
      },
      '38': { // 쇼핑
        feature: { ko: '쇼핑', en: 'shopping' },
        form: { ko: '쇼핑 체험', en: 'shopping experience' },
        target: { ko: '쇼핑을 즐기는 분들', en: 'shoppers' },
        intent: { ko: '쇼핑', en: 'shopping' }
      },
      '39': { // 음식점
        feature: { ko: '지역 맛집', en: 'local cuisine' },
        form: { ko: '미식 체험', en: 'dining experience' },
        target: { ko: '미식가', en: 'foodies' },
        intent: { ko: '식사', en: 'dining' }
      },
      '15': { // 축제/행사
        feature: { ko: '축제', en: 'festival' },
        form: { ko: '행사 참여', en: 'event participation' },
        target: { ko: '축제를 즐기는 분들', en: 'festival goers' },
        intent: { ko: '체험 활동', en: 'experiencing' }
      }
    }
    
    // 키워드 매칭 함수
    const findMatch = (category) => {
      const lang = language === 'ko' ? 'ko' : 'en'
      const mappings = keywordMap[category][lang]
      
      // 먼저 overview와 name에서 키워드 검색
      for (const mapping of mappings) {
        if (mapping.keywords.some(kw => cleanOverview.includes(kw) || name.toLowerCase().includes(kw))) {
          return mapping.value
        }
      }
      
      // 매칭 안 되면 콘텐츠 타입별 기본값 사용
      const typeDefault = contentTypeDefaults[contentType]
      if (typeDefault && typeDefault[category]) {
        return typeDefault[category][lang]
      }
      
      // 그래도 없으면 관광지(12) 기본값
      return contentTypeDefaults['12'][category][lang]
    }
    
    // 자동 추출된 값
    const type = typeNames[contentType]?.[language === 'ko' ? 'ko' : 'en'] || typeNames['12'][language === 'ko' ? 'ko' : 'en']
    const feature = findMatch('feature')
    const form = findMatch('form')
    const target = findMatch('target')
    const intent = findMatch('intent')
    
    // 설명 생성 - 콘텐츠 타입별 맞춤 템플릿
    if (language === 'ko') {
      const locationText = district ? `${city.replace('광역', '')} ${district}` : city.replace('광역', '')
      // 동/읍/면 추출 시도
      const neighborhood = addressParts.find(p => p.includes('동') || p.includes('읍') || p.includes('면') || p.includes('로') || p.includes('길')) || ''
      const fullLocationText = neighborhood ? `${locationText} ${neighborhood}` : locationText
      
      // 음식점(39) 전용 템플릿
      // AI 생성 설명(ai_description)이 있으면 우선 사용
      if (contentType === '39') {
        // n8n AI가 생성한 설명이 있으면 우선 사용
        if (intro.ai_description) {
          return intro.ai_description
        }
        
        // AI 설명이 없으면 기존 로직으로 폴백
        const firstMenu = intro.firstmenu || ''
        const treatMenu = intro.treatmenu || ''
        
        const foodTypes = {
          '쌈밥': '쌈밥', '국밥': '국밥', '냉면': '냉면', '짬뽕': '짬뽕', '칼국수': '칼국수',
          '삼겹살': '고기', '소고기': '고기', '돼지고기': '고기', '갈비': '고기',
          '초밥': '일식', '스시': '일식', '라멘': '일식', '우동': '일식',
          '파스타': '양식', '스테이크': '양식', '피자': '양식',
          '짜장면': '중식', '탕수육': '중식',
          '치킨': '치킨', '카페': '카페', '빵': '베이커리', '디저트': '디저트'
        }
        
        let foodType = '맛집'
        for (const [keyword, type] of Object.entries(foodTypes)) {
          if (cleanOverview.includes(keyword) || name.includes(keyword)) {
            foodType = type + ' 맛집'
            break
          }
        }
        
        const tasteKeywords = ['담백한', '깊은 맛의', '신선한', '고소한', '매콤한', '시원한', '진한', '부드러운']
        let tasteKeyword = tasteKeywords.find(tk => cleanOverview.includes(tk.replace('의', '').replace('한', ''))) || '맛있는'
        
        let menuText = ''
        if (firstMenu && treatMenu) {
          menuText = `${firstMenu}, ${treatMenu} 등`
        } else if (firstMenu || treatMenu) {
          menuText = `${firstMenu || treatMenu} 등`
        } else {
          menuText = '다양한'
        }
        
        let description = `${name}은 ${fullLocationText}에 위치한 ${foodType}으로, ${menuText} ${tasteKeyword} 메뉴가 인기다. 식사 목적으로 많이 방문한다.`
        
        return description
      }
      
      return `${name}은 ${locationText}에 위치한 ${type}로, ${feature}을 주제로 한 ${form} 공간이다. ${target}에게 적합해 ${intent} 목적으로 많이 방문한다.`
    } else {
      const locationText = district || city
      
      // Restaurant (39) specific template
      if (contentType === '39') {
        const firstMenu = intro.firstmenu || intro.treatmenu || ''
        const menuText = firstMenu ? ` known for ${firstMenu}` : ''
        return `${name} is a ${type} located in ${locationText}${menuText}. It is popular for ${intent} purposes and suitable for ${target}.`
      }
      
      return `${name} is a ${type} located in ${locationText}, featuring ${feature} in a ${form} setting. It is suitable for ${target} and popular for ${intent} purposes.`
    }
  }

  useEffect(() => {
    const loadSpot = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const result = await getTourSpotByContentId(contentId)
        
        if (result.success && result.item) {
          let spotData = result.item
          
          // overview가 없으면 TourAPI에서 상세정보 가져오기
          if (!spotData.overview) {
            try {
              const detailResult = await getTourApiDetail(contentId, true) // includeOverview = true
              if (detailResult.success && detailResult.item?.overview) {
                spotData = { ...spotData, overview: detailResult.item.overview }
              }
            } catch (err) {
              console.log('Overview 로드 실패:', err)
            }
          }
          
          setSpot(spotData)
          
          try {
            const imageResult = await getTourApiImages(contentId)
            if (imageResult.success && imageResult.items?.length > 0) {
              setGalleryImages(imageResult.items)
            }
          } catch (err) {
            console.error('이미지 로드 실패:', err)
          }
          
          // 조회수 증가 및 통계 로드
          incrementSpotViews(contentId)
          const stats = await getSpotStats(contentId)
          if (stats.success) {
            setViewCount(stats.viewCount)
            setLikeCount(stats.likeCount)
          }
          
          // 리뷰 로드
          const reviewResult = await getSpotReviews(contentId, {
            page: 1,
            pageSize: REVIEW_PAGE_SIZE,
            sortBy: 'created_at',
            sortOrder: 'desc'
          })
          if (reviewResult.success) {
            setReviews(reviewResult.reviews)
            setReviewCount(reviewResult.totalCount)
            setAvgRating(reviewResult.avgRating)
            setReviewTotalPages(reviewResult.totalPages)
            setReviewPage(1)
          }
          
          // 관광지(12), 문화시설(14), 축제(15), 레포츠(28)인 경우 좌표 기반 조회
          const isTouristSpot = ['12', '14', '15', '28'].includes(spotData.content_type_id)
          // 맛집(39)인 경우
          const isRestaurant = spotData.content_type_id === '39'
          // 숙박(32)인 경우
          const isAccommodation = spotData.content_type_id === '32'
          // 쇼핑(38)인 경우
          const isShopping = spotData.content_type_id === '38'
          
          if (isTouristSpot && spotData.mapy && spotData.mapx) {
            // 좌표 기반 주변 관광지 로드
            loadRelatedSpots(parseFloat(spotData.mapy), parseFloat(spotData.mapx), contentId)
            // 근처 맛집/카페 로드
            loadNearbyFood(parseFloat(spotData.mapy), parseFloat(spotData.mapx), contentId)
          } else if (isRestaurant && spotData.mapy && spotData.mapx) {
            // 맛집: 주변 숙박/쇼핑 로드
            loadNearbyPlaces(parseFloat(spotData.mapy), parseFloat(spotData.mapx), contentId)
          } else if (isAccommodation && spotData.mapy && spotData.mapx) {
            // 숙박: 주변 맛집/카페 로드
            loadNearbyFood(parseFloat(spotData.mapy), parseFloat(spotData.mapx), contentId)
          } else if (isShopping && spotData.mapy && spotData.mapx) {
            // 쇼핑: 주변 맛집/카페 로드
            loadNearbyFood(parseFloat(spotData.mapy), parseFloat(spotData.mapx), contentId)
          } else if (spotData.addr1) {
            // 주소 기반 주변 관광지 로드 (fallback)
            loadRelatedSpotsByAddress(spotData.addr1, contentId)
          }
          
          // 연관 여행코스 로드
          loadRelatedTrips(spotData.title, contentId)
        } else {
          setError(t.detail.notFound)
        }
      } catch (err) {
        console.error('데이터 로드 실패:', err)
        setError(t.detail.loadFailed)
      }
      
      setLoading(false)
    }
    
    if (contentId) {
      loadSpot()
      window.scrollTo(0, 0)
    }
  }, [contentId, language])
  
  // 연관 여행코스 로드 함수
  const loadRelatedTrips = async (placeName, contentId) => {
    setRelatedTripsLoading(true)
    try {
      const result = await getTripsContainingPlace(placeName, contentId, 4)
      if (result.success) {
        setRelatedTrips(result.trips)
      }
    } catch (err) {
      console.error('연관 여행코스 로드 실패:', err)
    }
    setRelatedTripsLoading(false)
  }
  
  // 좌표 기반 주변 관광지 로드 함수
  const loadRelatedSpots = async (lat, lng, excludeId) => {
    setRelatedLoading(true)
    try {
      const result = await getNearbySpots(lat, lng, excludeId, 4)
      if (result.success) {
        setRelatedSpots(result.spots)
      }
    } catch (err) {
      console.error('주변 관광지 로드 실패:', err)
    }
    setRelatedLoading(false)
  }
  
  // 주소 기반 주변 관광지 로드 함수 (fallback)
  const loadRelatedSpotsByAddress = async (address, excludeId) => {
    setRelatedLoading(true)
    try {
      const result = await getSpotsByDistrict(address, excludeId, 4)
      if (result.success) {
        setRelatedSpots(result.spots)
      }
    } catch (err) {
      console.error('주변 관광지 로드 실패:', err)
    }
    setRelatedLoading(false)
  }
  
  // 근처 맛집/카페 로드 함수 (관광지 전용)
  const loadNearbyFood = async (lat, lng, excludeId) => {
    setNearbyLoading(true)
    try {
      // 맛집 3개, 카페 3개 동시 로드
      const [restaurantResult, cafeResult] = await Promise.all([
        getNearbyRestaurants(lat, lng, excludeId, 'restaurant', 3),
        getNearbyRestaurants(lat, lng, excludeId, 'cafe', 3)
      ])
      
      if (restaurantResult.success) {
        setNearbyRestaurants(restaurantResult.spots)
      }
      if (cafeResult.success) {
        setNearbyCafes(cafeResult.spots)
      }
    } catch (err) {
      console.error('근처 맛집/카페 로드 실패:', err)
    }
    setNearbyLoading(false)
  }
  
  // 근처 숙박/쇼핑 로드 함수 (맛집 전용)
  const loadNearbyPlaces = async (lat, lng, excludeId) => {
    setNearbyPlacesLoading(true)
    try {
      // 숙박 3개, 쇼핑 3개 동시 로드
      const [accommodationResult, shoppingResult] = await Promise.all([
        getNearbyAccommodations(lat, lng, excludeId, 3),
        getNearbyShopping(lat, lng, excludeId, 3)
      ])
      
      if (accommodationResult.success) {
        setNearbyAccommodations(accommodationResult.spots)
      }
      if (shoppingResult.success) {
        setNearbyShopping(shoppingResult.spots)
      }
    } catch (err) {
      console.error('근처 숙박/쇼핑 로드 실패:', err)
    }
    setNearbyPlacesLoading(false)
  }
  
  // 좋아요 상태 확인 (로그인 시)
  useEffect(() => {
    const checkLiked = async () => {
      if (user && contentId) {
        const liked = await checkSpotLiked(contentId, user.id)
        setIsLiked(liked)
      }
    }
    checkLiked()
  }, [user, contentId])
  
  // 좋아요 토글
  const handleToggleLike = async () => {
    if (!user) {
      alert(t.ui.loginRequired)
      return
    }
    
    const result = await toggleSpotLike(contentId, user.id)
    if (result.success) {
      setIsLiked(result.isLiked)
      setLikeCount(result.likeCount)
    }
  }
  
  // 리뷰 로드 함수
  const loadReviews = async (page = 1, sortBy = reviewSortBy, sortOrder = reviewSortOrder) => {
    const reviewResult = await getSpotReviews(contentId, {
      page,
      pageSize: REVIEW_PAGE_SIZE,
      sortBy,
      sortOrder
    })
    if (reviewResult.success) {
      setReviews(reviewResult.reviews)
      setReviewCount(reviewResult.totalCount)
      setAvgRating(reviewResult.avgRating)
      setReviewTotalPages(reviewResult.totalPages)
      setReviewPage(page)
    }
    return reviewResult
  }
  
  // 리뷰 정렬 변경
  const handleReviewSortChange = async (newSortBy, newSortOrder) => {
    setReviewSortBy(newSortBy)
    setReviewSortOrder(newSortOrder)
    await loadReviews(1, newSortBy, newSortOrder)
  }
  
  // 리뷰 페이지 변경
  const handleReviewPageChange = async (newPage) => {
    await loadReviews(newPage, reviewSortBy, reviewSortOrder)
  }
  
  // 리뷰 제출
  const handleSubmitReview = async () => {
    if (!user) {
      alert(t.ui.loginRequired)
      return
    }
    
    const trimmedContent = newReviewContent.trim()
    
    if (!trimmedContent) {
      alert(t.detail.enterReview)
      return
    }
    
    // 리뷰 길이 제한 (최소 10자, 최대 1000자)
    if (trimmedContent.length < 10) {
      alert('리뷰는 최소 10자 이상 작성해주세요.')
      return
    }
    
    if (trimmedContent.length > 1000) {
      alert('리뷰는 1000자를 초과할 수 없습니다.')
      return
    }
    
    // rating 유효성 검사
    if (newRating < 1 || newRating > 5 || !Number.isInteger(newRating)) {
      alert('별점은 1~5 사이의 정수여야 합니다.')
      return
    }
    
    setReviewSubmitting(true)
    const result = await createSpotReview({
      contentId,
      userId: user.id,
      rating: newRating,
      content: trimmedContent,
      userMetadata: user.user_metadata
    })
    
    if (result.success) {
      // 리뷰 목록 다시 로드 (첫 페이지, 최신순으로)
      setReviewSortBy('created_at')
      setReviewSortOrder('desc')
      await loadReviews(1, 'created_at', 'desc')
      setShowReviewForm(false)
      setNewRating(5)
      setNewReviewContent('')
    } else {
      alert(result.message || '리뷰 작성에 실패했습니다')
    }
    setReviewSubmitting(false)
  }
  
  // 리뷰 삭제
  const handleDeleteReview = async (reviewId) => {
    if (!confirm(t.detail.deleteReview)) return
    
    const result = await deleteSpotReview(reviewId, user.id)
    if (result.success) {
      await loadReviews(reviewPage, reviewSortBy, reviewSortOrder)
    }
  }
  
  const copyAddress = async () => {
    if (spot?.addr1) {
      try {
        await navigator.clipboard.writeText(spot.addr1)
        setAddressCopied(true)
        setTimeout(() => setAddressCopied(false), 2000)
      } catch (err) {
        console.error('주소 복사 실패:', err)
      }
    }
  }
  
  const handleShare = () => {
    setShowShareModal(true)
  }
  
  const handleKakaoShare = () => {
    // 프로덕션 도메인 사용 (localhost인 경우 실제 도메인으로 변환)
    const currentUrl = window.location.href
    const isLocalhost = currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')
    const productionDomain = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.letsgodaejeon.kr'
    const spotSlug = generateSlug(spot?.title, contentId)
    const shareUrl = isLocalhost 
      ? `${productionDomain}/spot/${spotSlug}` 
      : currentUrl
    
    const shareTitle = spot?.title || '대전 관광지'
    const shareImage = allImages?.[0] || spot?.firstimage || ''
    const shareDescription = spot?.overview?.substring(0, 100) || spot?.addr1 || '대전으로 떠나는 여행'
    
    // 카카오 SDK 사용
    if (window.Kakao && window.Kakao.isInitialized()) {
      try {
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: shareTitle,
            description: shareDescription,
            imageUrl: shareImage || 'https://letsgodaejeon.vercel.app/images/og-image.png',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
          buttons: [
            {
              title: '자세히 보기',
              link: {
                mobileWebUrl: shareUrl,
                webUrl: shareUrl,
              },
            },
          ],
        })
      } catch (err) {
        console.error('카카오 공유 실패:', err)
        // fallback: 링크 복사
        handleCopyLink()
        return
      }
    } else {
      // 카카오 SDK 미초기화 시 Web Share API 또는 링크 복사
      if (navigator.share) {
        navigator.share({
          title: shareTitle,
          text: `${shareTitle} - 대전으로에서 확인하세요!`,
          url: shareUrl
        }).catch(() => {
          handleCopyLink()
        })
      } else {
        handleCopyLink()
        return
      }
    }
    setShowShareModal(false)
  }
  
  const handleCopyLink = async () => {
    // 프로덕션 도메인 사용 (localhost인 경우 실제 도메인으로 변환)
    const currentUrl = window.location.href
    const isLocalhost = currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')
    const productionDomain = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.letsgodaejeon.kr'
    const spotSlug = generateSlug(spot?.title, contentId)
    const copyUrl = isLocalhost 
      ? `${productionDomain}/spot/${spotSlug}` 
      : currentUrl
    
    try {
      await navigator.clipboard.writeText(copyUrl)
      alert(t.detail.urlCopied)
    } catch (err) {
      // fallback
      const textArea = document.createElement('textarea')
      textArea.value = copyUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert(t.detail.urlCopied)
    }
    setShowShareModal(false)
  }

  const openAddModal = async () => {
    if (!user) {
      alert(t.ui.loginRequired)
      return
    }
    
    setShowAddModal(true)
    setTripsLoading(true)
    
    try {
      const result = await getUserTripPlans(user.id)
      if (result.success) {
        setTripPlans(result.plans)
      }
    } catch (err) {
      console.error('여행 목록 로드 실패:', err)
    }
    
    setTripsLoading(false)
  }

  const handleAddToTrip = async () => {
    if (!selectedDayId || !spot) return
    
    setAddingToTrip(true)
    try {
      const contentConfig = CONTENT_TYPE_CONFIG[spot.content_type_id] || {}
      const result = await addTripPlace({
        dayId: selectedDayId,
        placeType: contentConfig.name?.ko || '관광지',
        placeName: spot.title,
        placeAddress: spot.addr1 || spot.addr2,
        placeDescription: spot.overview?.substring(0, 200),
        placeImage: spot.firstimage || spot.firstimage2,
        orderIndex: 999,
        visitTime: null,
        memo: null
      })
      
      if (result.success) {
        alert(t.detail.addToTripSuccess)
        setShowAddModal(false)
      } else {
        alert(result.error || t.detail.addToTripFailed)
      }
    } catch (err) {
      alert(t.common.errorOccurred)
    }
    setAddingToTrip(false)
  }

  const allImages = galleryImages.length > 0 
    ? galleryImages.map(img => img.originimgurl || img.smallimageurl)
    : spot?.firstimage ? [spot.firstimage] : []
    
  const nextImage = () => setCurrentImageIndex(i => (i + 1) % allImages.length)
  const prevImage = () => setCurrentImageIndex(i => (i - 1 + allImages.length) % allImages.length)

  const contentConfig = spot ? CONTENT_TYPE_CONFIG[spot.content_type_id] || {} : {}
  const introFields = spot ? INTRO_FIELDS[spot.content_type_id] || [] : []
  
  // 시설/서비스 추출
  const availableFacilities = spot?.intro_info ? FACILITY_ITEMS.filter(facility => 
    facility.checkKeys.some(key => {
      const val = spot.intro_info[key]
      return val && !val.includes('불가') && !val.includes('없음') && !val.includes('안됨')
    })
  ) : []

  if (loading) {
    return (
      <div className={`sdp ${isDark ? 'sdp--dark' : ''}`}>
        <div className="sdp__loading">
          <div className="sdp__spinner"></div>
          <p>{t.detail.loading}</p>
        </div>
      </div>
    )
  }

  if (error || !spot) {
    return (
      <div className={`sdp ${isDark ? 'sdp--dark' : ''}`}>
        <div className="sdp__error">
          <span className="sdp__error-icon"><Icons.sadFace size={48} /></span>
          <p>{error || t.detail.notFound}</p>
          <button onClick={() => router.back()} className="sdp__error-btn">
            ← {t.detail.goBack}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`sdp ${isDark ? 'sdp--dark' : ''}`}>
      {/* 상단 헤더 */}
      <header className="sdp__header">
        <button className="sdp__header-btn" onClick={() => router.back()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="sdp__header-actions">
          <button className="sdp__header-btn" onClick={handleShare}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
          <button className={`sdp__header-btn ${isLiked ? 'sdp__header-btn--liked' : ''}`} onClick={() => setIsLiked(!isLiked)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* 이미지 갤러리 - 큰 1개 + 작은 4개 그리드 */}
      <div className="sdp__gallery-wrapper">
        <section className="sdp__gallery" onClick={() => allImages.length > 0 && setShowFullGallery(true)}>
          {allImages.length > 0 ? (
            <div className="sdp__gallery-grid">
              {/* 메인 이미지 (왼쪽 큰 이미지) - LCP 최적화 */}
              <div className="sdp__gallery-item sdp__gallery-item--main">
                <Image 
                  src={getReliableImageUrl(allImages[0])} 
                  alt={language === 'en' && spot.title_en ? spot.title_en : spot.title}
                  width={600}
                  height={400}
                  priority
                  fetchPriority="high"
                  sizes="(max-width: 768px) 100vw, 600px"
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  onError={handleImageError} 
                />
              </div>
              {/* 서브 이미지 4개 (오른쪽 2x2 그리드) */}
              {[1, 2, 3, 4].map((idx) => (
                <div 
                  key={idx} 
                  className={`sdp__gallery-item sdp__gallery-item--sub ${idx === 4 && allImages.length > 5 ? 'sdp__gallery-item--more' : ''}`}
                >
                  {allImages[idx] ? (
                    <>
                      <Image 
                        src={getReliableImageUrl(allImages[idx])} 
                        alt=""
                        width={370}
                        height={277}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                        onError={handleImageError} 
                      />
                      {idx === 4 && allImages.length > 5 && (
                        <div className="sdp__gallery-more">+{allImages.length - 5}</div>
                      )}
                    </>
                  ) : (
                    <div className="sdp__gallery-placeholder">
                      <Icons.image size={32} color="#ccc" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="sdp__gallery-empty">
              <Icons.camera size={40} color="#999" />
              <p>{t.detail.noImage}</p>
            </div>
          )}
          {/* 이미지 카운터 */}
          {allImages.length > 1 && (
            <div className="sdp__gallery-counter">
              <Icons.image size={14} color="#fff" />
              <span>{allImages.length}</span>
            </div>
          )}
        </section>
      </div>

      {/* 메인 컨텐츠 */}
      <main className="sdp__main">
        {/* 기본 정보 */}
        <section className="sdp__info">
          <span className="sdp__badge" style={{ backgroundColor: contentConfig.color }}>
            {contentConfig.name?.[language]}
          </span>
          <h1 className="sdp__title">{language === 'en' && spot.title_en ? spot.title_en : spot.title}</h1>
          
          {/* 장소 설명 요약 */}
          {(() => {
            const desc = generateSpotDescription(spot, spot.content_type_id, language)
            if (!desc) return null
            return (
              <p className="sdp__description">{desc}</p>
            )
          })()}
          
          {/* 통계 정보 (조회수, 좋아요, 리뷰, 평점) */}
          <div className="sdp__stats">
            <span className="sdp__stat-item">
              <Icons.eye size={16} color="#888" />
              <span className="sdp__stat-value">{viewCount.toLocaleString()}</span>
            </span>
            <span className="sdp__stat-item sdp__stat-item--clickable" onClick={handleToggleLike}>
              <Icons.heart size={16} color={isLiked ? '#de2f5f' : '#ccc'} filled={isLiked} />
              <span className="sdp__stat-value">{likeCount.toLocaleString()}</span>
            </span>
            <span className="sdp__stat-item">
              <Icons.review size={16} color="#888" />
              <span className="sdp__stat-value">{reviewCount}</span>
            </span>
            {avgRating > 0 && (
              <span className="sdp__stat-item">
                <Icons.star size={16} />
                <span className="sdp__stat-value">{avgRating}</span>
              </span>
            )}
          </div>
        </section>

        {/* 위치/교통 */}
        <section className="sdp__section sdp__location">
          <div className="sdp__section-header">
            <span className="sdp__section-icon"><Icons.location size={18} /></span>
            <h2 className="sdp__section-title">{t.detail.location}</h2>
          </div>
          <div className="sdp__location-content">
            <p className="sdp__address">{language === 'en' && spot.addr1_en ? spot.addr1_en : spot.addr1} {spot.addr2}</p>
            <button className="sdp__copy-btn" onClick={copyAddress}>
              {addressCopied ? <><Icons.check size={14} /> {language === 'ko' ? '복사됨' : 'Copied'}</> : (language === 'ko' ? '주소복사' : 'Copy')}
            </button>
          </div>
          <div className="sdp__map-btns">
            <a 
              href={`https://map.kakao.com/link/search/${encodeURIComponent(spot.addr1)}`}
              target="_blank" rel="noopener noreferrer"
              className="sdp__map-btn sdp__map-btn--kakao"
            >
              <Icons.map size={16} />
              <span>{t.detail.kakaoMap}</span>
            </a>
            <a 
              href={`https://map.naver.com/v5/search/${encodeURIComponent(spot.addr1)}`}
              target="_blank" rel="noopener noreferrer"
              className="sdp__map-btn sdp__map-btn--naver"
            >
              <Icons.map size={16} />
              <span>{t.detail.naverMap}</span>
            </a>
          </div>
        </section>

        {/* 시설/서비스 */}
        {availableFacilities.length > 0 && (
          <section className="sdp__section sdp__facilities">
            <div className="sdp__section-header">
              <span className="sdp__section-icon"><Icons.facilities size={18} /></span>
              <h2 className="sdp__section-title">{t.detail.facilities}</h2>
            </div>
            <div className="sdp__facilities-grid">
              {availableFacilities.map((item, idx) => {
                const FacilityIcon = FACILITY_ICON_MAP[item.key]
                return (
                  <div key={idx} className="sdp__facility-item">
                    {FacilityIcon && <span className="sdp__facility-icon"><FacilityIcon size={22} /></span>}
                    <span className="sdp__facility-label">{item.label[language]}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* 소개 */}
        {(spot.overview || spot.overview_en) && (
          <section className="sdp__section sdp__overview">
            <div className="sdp__section-header">
              <span className="sdp__section-icon"><Icons.about size={18} /></span>
              <h2 className="sdp__section-title">{t.detail.about}</h2>
            </div>
            <div className="sdp__overview-content" dangerouslySetInnerHTML={{ __html: sanitizeIntroHtml(language === 'en' && spot.overview_en ? spot.overview_en : spot.overview) }} />
          </section>
        )}

        {/* 이용 안내 */}
        {spot.intro_info && Object.keys(spot.intro_info).length > 0 && (
          <section className="sdp__section sdp__usage">
            <div className="sdp__section-header">
              <span className="sdp__section-icon"><Icons.info size={18} /></span>
              <h2 className="sdp__section-title">{t.detail.usageInfo}</h2>
            </div>
            <div className="sdp__usage-list">
              {introFields.map(field => {
                const value = spot.intro_info[field.key]
                if (!value) return null
                const FieldIcon = field.iconKey ? INTRO_ICON_MAP[field.iconKey] : null
                
                return (
                  <div key={field.key} className="sdp__usage-item">
                    <span className="sdp__usage-icon">
                      {FieldIcon ? <FieldIcon size={18} /> : null}
                    </span>
                    <div className="sdp__usage-text">
                      <span className="sdp__usage-label">{field.label[language]}</span>
                      <span className="sdp__usage-value" dangerouslySetInnerHTML={{ __html: sanitizeIntroHtml(value) }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* FAQ 섹션 */}
        {(() => {
          const faqs = generateFaqs(spot, spot.content_type_id, language)
          if (faqs.length === 0) return null
          return (
            <section className="sdp__section sdp__faq">
              <div className="sdp__section-header">
                <span className="sdp__section-icon"><Icons.about size={18} /></span>
                <h2 className="sdp__section-title">
                  {language === 'ko' ? '자주 묻는 질문' : 'FAQ'}
                </h2>
              </div>
              <div className="sdp__faq-list">
                {faqs.map((faq, idx) => (
                  <div 
                    key={idx} 
                    className={`sdp__faq-item ${openFaqIndex === idx ? 'open' : ''}`}
                  >
                    <button 
                      className="sdp__faq-question"
                      onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    >
                      <span className="sdp__faq-q">Q.</span>
                      <span className="sdp__faq-q-text">{faq.q}</span>
                      <span className="sdp__faq-toggle">
                        {openFaqIndex === idx ? '−' : '+'}
                      </span>
                    </button>
                    {openFaqIndex === idx && (
                      <div className="sdp__faq-answer">
                        <span className="sdp__faq-a">A.</span>
                        <span className="sdp__faq-a-text">{faq.a}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        })()}

        {/* 객실정보 (숙박만) */}
        {spot.content_type_id === '32' && spot.room_info && spot.room_info.length > 0 && (
          <section className="sdp__section sdp__rooms">
            <div className="sdp__section-header">
              <span className="sdp__section-icon"><Icons.home size={18} /></span>
              <h2 className="sdp__section-title">{language === 'ko' ? '객실 정보' : 'Room Information'}</h2>
            </div>
            <div className="sdp__rooms-list">
              {spot.room_info.map((room, index) => (
                <div key={index} className="sdp__room-card">
                  {room.roomimg1 && (
                    <div className="sdp__room-image">
                      <Image 
                        src={room.roomimg1} 
                        alt={room.roomtitle || `Room ${index + 1}`} 
                        width={300}
                        height={200}
                        sizes="(max-width: 768px) 100vw, 300px"
                        loading="lazy"
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    </div>
                  )}
                  <div className="sdp__room-info">
                    <h3 className="sdp__room-title">{room.roomtitle || `${language === 'ko' ? '객실' : 'Room'} ${index + 1}`}</h3>
                    <div className="sdp__room-details">
                      {room.roomsize1 && (
                        <span className="sdp__room-detail">
                          <Icons.about size={14} />
                          {room.roomsize1}㎡
                        </span>
                      )}
                      {(room.roombasecount || room.roommaxcount) && (
                        <span className="sdp__room-detail">
                          <Icons.user size={14} />
                          {language === 'ko' 
                            ? `기준 ${room.roombasecount || '-'}명 / 최대 ${room.roommaxcount || '-'}명`
                            : `${room.roombasecount || '-'} / max ${room.roommaxcount || '-'}`}
                        </span>
                      )}
                      {room.roomoffseasonminfee1 && (
                        <span className="sdp__room-detail sdp__room-price">
                          <Icons.ticket size={14} />
                          {Number(room.roomoffseasonminfee1).toLocaleString()}{language === 'ko' ? '원~' : ' KRW~'}
                        </span>
                      )}
                    </div>
                    <div className="sdp__room-amenities">
                      {room.roomaircondition === 'Y' && <span className="sdp__room-amenity">{language === 'ko' ? '에어컨' : 'AC'}</span>}
                      {room.roomtv === 'Y' && <span className="sdp__room-amenity">TV</span>}
                      {room.roominternet === 'Y' && <span className="sdp__room-amenity">{language === 'ko' ? '인터넷' : 'Internet'}</span>}
                      {room.roomrefrigerator === 'Y' && <span className="sdp__room-amenity">{language === 'ko' ? '냉장고' : 'Fridge'}</span>}
                      {room.roomhairdryer === 'Y' && <span className="sdp__room-amenity">{language === 'ko' ? '드라이기' : 'Dryer'}</span>}
                      {room.roompc === 'Y' && <span className="sdp__room-amenity">PC</span>}
                      {room.roomcook === 'Y' && <span className="sdp__room-amenity">{language === 'ko' ? '취사' : 'Kitchen'}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 전화번호 */}
        {spot.tel && (
          <section className="sdp__section sdp__contact">
            <div className="sdp__section-header">
              <span className="sdp__section-icon"><Icons.phone size={18} /></span>
              <h2 className="sdp__section-title">{t.detail.contact}</h2>
            </div>
            <a href={`tel:${spot.tel.replace(/[^0-9-]/g, '')}`} className="sdp__phone">
              <Icons.phone size={16} />
              {cleanIntroHtml(spot.tel)}
            </a>
          </section>
        )}
        
        {/* 홈페이지 */}
        {spot.homepage && (
          <section className="sdp__section sdp__website">
            <div className="sdp__section-header">
              <span className="sdp__section-icon"><Icons.globe size={18} /></span>
              <h2 className="sdp__section-title">{t.ui.website}</h2>
            </div>
            <a 
              href={spot.homepage.match(/href="([^"]+)"/)?.[1] || spot.homepage}
              target="_blank" rel="noopener noreferrer"
              className="sdp__website-link"
            >
              <Icons.globe size={16} />
              {t.detail.visitWebsite}
            </a>
          </section>
        )}

        {/* 연관 여행코스 섹션 */}
        {relatedTrips.length > 0 && (
          <section className="sdp__section sdp__trips">
            <div className="sdp__section-header">
              <span className="sdp__section-icon"><Icons.map size={18} /></span>
              <h2 className="sdp__section-title">
                {language === 'ko' ? '이 장소가 포함된 여행코스' : 'Travel courses including this place'}
              </h2>
            </div>
            <div className="sdp__trips-list">
              {relatedTrips.map((trip) => (
                <Link
                  key={trip.id}
                  href={`/shared-trip/${trip.id}`}
                  className="sdp__trip-card"
                >
                  <div className="sdp__trip-thumbnail">
                    {trip.thumbnailUrl ? (
                      <Image 
                        src={trip.thumbnailUrl} 
                        alt={trip.title}
                        width={160}
                        height={90}
                        sizes="160px"
                        loading="lazy"
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="sdp__trip-placeholder">
                        <Icons.map size={24} />
                      </div>
                    )}
                  </div>
                  <div className="sdp__trip-info">
                    <h3 className="sdp__trip-title">{trip.title}</h3>
                    <div className="sdp__trip-meta">
                      <span className="sdp__trip-author">
                        <Icons.user size={12} />
                        {trip.authorNickname}
                      </span>
                      <span className="sdp__trip-days">
                        {trip.daysCount}{language === 'ko' ? '일' : ' day'}{trip.daysCount > 1 && language === 'en' ? 's' : ''}
                      </span>
                    </div>
                    <div className="sdp__trip-places">
                      {trip.placesPreview.slice(0, 3).map((place, idx) => (
                        <span key={idx} className="sdp__trip-place-tag">
                          {place}
                        </span>
                      ))}
                      {trip.placesPreview.length > 3 && (
                        <span className="sdp__trip-place-more">
                          +{trip.placesPreview.length - 3}
                        </span>
                      )}
                    </div>
                    <div className="sdp__trip-stats">
                      <span><Icons.eye size={12} /> {trip.viewCount}</span>
                      <span><Icons.heart size={12} /> {trip.likeCount}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 주변 관광지 섹션 */}
        {relatedSpots.length > 0 && (
          <section className="sdp__section sdp__related">
            <div className="sdp__section-header">
              <span className="sdp__section-icon"><Icons.compass size={18} /></span>
              <h2 className="sdp__section-title">
                {language === 'ko' ? `${spot?.title || '이 장소'} 근처 함께 가볼 만한 곳` : 'Attractions nearby'}
              </h2>
            </div>
            <p className="sdp__nearby-desc">
              {language === 'ko' 
                ? `${spot?.title || '이 장소'} 인근에 ${relatedSpots.slice(0, 3).map(s => s.name).join(', ')} 등과 함께 둘러보기 좋은 관광지가 분포해 있다.`
                : `Near ${spot?.title || 'this place'}, there are various attractions such as ${relatedSpots.slice(0, 3).map(s => s.name).join(', ')} that are great to visit together.`
              }
            </p>
            <div className="sdp__related-grid">
              {relatedSpots.map((related, idx) => (
                <Link 
                  key={related.contentId || idx}
                  href={`/spot/${generateSlug(related.name, related.contentId)}`}
                  className="sdp__related-card"
                >
                  <div className="sdp__related-image">
                    <Image 
                      src={getReliableImageUrl(related.imageUrl)}
                      alt={related.name}
                      width={350}
                      height={200}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 350px"
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      onError={handleImageError}
                      loading="lazy"
                    />
                  </div>
                  <div className="sdp__related-info">
                    <h3 className="sdp__related-title">{related.name}</h3>
                    {related.address && (
                      <p className="sdp__related-address">
                        <Icons.location size={12} />
                        {related.address.split(' ').slice(1, 3).join(' ')}
                      </p>
                    )}
                    {related.distanceText && (
                      <p className="sdp__related-distance">
                        <Icons.location size={10} />
                        {related.distanceText}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 근처 맛집/카페 섹션 (관광지/숙박) */}
        {(nearbyRestaurants.length > 0 || nearbyCafes.length > 0) && (
          <section className="sdp__section sdp__nearby-food-section">
            <div className="sdp__section-header">
              <span className="sdp__section-icon"><Icons.food size={18} /></span>
              <h2 className="sdp__section-title">
                {language === 'ko' ? '근처 맛집 & 카페' : 'Nearby Restaurants & Cafes'}
              </h2>
            </div>
            <p className="sdp__nearby-desc">
              {language === 'ko' 
                ? spot?.content_type_id === '32'
                  ? `${spot?.title || '이 숙소'} 인근에는 ${spot?.addr1?.split(' ').find(part => part.includes('구')) || '주변'} 지역의 맛집과 카페가 있어, 숙박 중 편리하게 식사와 휴식을 즐길 수 있다.`
                  : spot?.content_type_id === '28'
                    ? `${spot?.title || '이 레포츠 시설'} 인근에는 ${spot?.addr1?.split(' ').find(part => part.includes('구')) || '주변'} 지역의 맛집과 카페가 있어, 레저 활동 후 식사와 휴식을 즐기기 좋다.`
                    : spot?.content_type_id === '38'
                      ? `${spot?.title || '이 쇼핑 명소'} 인근에는 ${spot?.addr1?.split(' ').find(part => part.includes('구')) || '주변'} 지역의 맛집과 카페가 있어, 쇼핑 후 식사와 휴식을 즐기기 좋다.`
                      : `${spot?.title || '이 장소'} 인근에는 ${spot?.addr1?.split(' ').find(part => part.includes('구')) || '주변'} 지역을 중심으로 한 식사와 휴식이 가능한 맛집과 카페가 분포해 있어 함께 방문하기 좋다.`
                : spot?.content_type_id === '32'
                  ? `Near ${spot?.title || 'this accommodation'}, there are restaurants and cafes in the ${spot?.addr1?.split(' ').find(part => part.includes('구')) || 'surrounding'} area for convenient dining during your stay.`
                  : spot?.content_type_id === '28'
                    ? `Near ${spot?.title || 'this leisure facility'}, there are restaurants and cafes in the ${spot?.addr1?.split(' ').find(part => part.includes('구')) || 'surrounding'} area, perfect for dining after your activities.`
                    : spot?.content_type_id === '38'
                      ? `Near ${spot?.title || 'this shopping spot'}, there are restaurants and cafes in the ${spot?.addr1?.split(' ').find(part => part.includes('구')) || 'surrounding'} area, perfect for a break after shopping.`
                      : `Near ${spot?.title || 'this place'}, there are various restaurants and cafes in the ${spot?.addr1?.split(' ').find(part => part.includes('구')) || 'surrounding'} area for meals and relaxation.`
              }
            </p>
            
            {/* 근처 맛집 */}
            {nearbyRestaurants.length > 0 && (
              <div className="sdp__nearby-category">
                <h3 className="sdp__nearby-category-title">
                  <Icons.food size={14} /> {language === 'ko' ? '맛집' : 'Restaurants'}
                </h3>
                <div className="sdp__related-grid sdp__food-grid">
                  {nearbyRestaurants.map((restaurant, idx) => (
                    <Link 
                      key={restaurant.contentId || idx}
                      href={`/spot/${generateSlug(restaurant.name, restaurant.contentId)}`}
                      className="sdp__related-card sdp__food-card"
                    >
                      <div className="sdp__related-image">
                        <Image 
                          src={getReliableImageUrl(restaurant.imageUrl)}
                          alt={restaurant.name}
                          width={200}
                          height={120}
                          sizes="(max-width: 640px) 50vw, 200px"
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          onError={handleImageError}
                          loading="lazy"
                        />
                        <span className="sdp__food-distance">{restaurant.distanceText}</span>
                      </div>
                      <div className="sdp__related-info">
                        <h3 className="sdp__related-title">{restaurant.name}</h3>
                        {restaurant.address && (
                          <p className="sdp__related-address">
                            <Icons.location size={12} />
                            {restaurant.address.split(' ').slice(1, 3).join(' ')}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* 근처 카페 */}
            {nearbyCafes.length > 0 && (
              <div className="sdp__nearby-category">
                <h3 className="sdp__nearby-category-title">
                  <Icons.cafe size={14} /> {language === 'ko' ? '카페' : 'Cafes'}
                </h3>
                <div className="sdp__related-grid sdp__food-grid">
                  {nearbyCafes.map((cafe, idx) => (
                    <Link 
                      key={cafe.contentId || idx}
                      href={`/spot/${generateSlug(cafe.name, cafe.contentId)}`}
                      className="sdp__related-card sdp__food-card"
                    >
                      <div className="sdp__related-image">
                        <Image 
                          src={getReliableImageUrl(cafe.imageUrl)}
                          alt={cafe.name}
                          width={200}
                          height={120}
                          sizes="(max-width: 640px) 50vw, 200px"
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          onError={handleImageError}
                          loading="lazy"
                        />
                        <span className="sdp__food-distance">{cafe.distanceText}</span>
                      </div>
                      <div className="sdp__related-info">
                        <h3 className="sdp__related-title">{cafe.name}</h3>
                        {cafe.address && (
                          <p className="sdp__related-address">
                            <Icons.location size={12} />
                            {cafe.address.split(' ').slice(1, 3).join(' ')}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 근처 숙박/쇼핑 섹션 (맛집 전용) */}
        {(nearbyAccommodations.length > 0 || nearbyShopping.length > 0) && (
          <section className="sdp__section sdp__nearby-food-section">
            <div className="sdp__section-header">
              <span className="sdp__section-icon"><Icons.card size={18} /></span>
              <h2 className="sdp__section-title">
                {language === 'ko' ? '주변 숙박 & 쇼핑' : 'Nearby Accommodations & Shopping'}
              </h2>
            </div>
            <p className="sdp__nearby-desc">
              {language === 'ko' 
                ? `${spot?.title || '이 맛집'} 인근에는 ${spot?.addr1?.split(' ').find(part => part.includes('구')) || '주변'} 지역을 중심으로 숙박시설과 쇼핑 공간이 함께 형성돼 있어, 식사 후 휴식과 쇼핑을 동시에 즐기기 좋다.`
                : `Near ${spot?.title || 'this restaurant'}, there are accommodations and shopping areas in the ${spot?.addr1?.split(' ').find(part => part.includes('구')) || 'surrounding'} area, making it convenient to rest and shop after your meal.`
              }
            </p>
            
            {/* 근처 숙박 */}
            {nearbyAccommodations.length > 0 && (
              <div className="sdp__nearby-category">
                <h3 className="sdp__nearby-category-title">
                  <Icons.home size={14} /> {language === 'ko' ? '숙박' : 'Accommodations'}
                </h3>
                <div className="sdp__related-grid sdp__food-grid">
                  {nearbyAccommodations.map((accommodation, idx) => (
                    <Link 
                      key={accommodation.contentId || idx}
                      href={`/spot/${generateSlug(accommodation.name, accommodation.contentId)}`}
                      className="sdp__related-card sdp__food-card"
                    >
                      <div className="sdp__related-image">
                        <Image 
                          src={getReliableImageUrl(accommodation.imageUrl)}
                          alt={accommodation.name}
                          width={200}
                          height={120}
                          sizes="(max-width: 640px) 50vw, 200px"
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          onError={handleImageError}
                          loading="lazy"
                        />
                        <span className="sdp__food-distance">{accommodation.distanceText}</span>
                      </div>
                      <div className="sdp__related-info">
                        <h3 className="sdp__related-title">{accommodation.name}</h3>
                        {accommodation.address && (
                          <p className="sdp__related-address">
                            <Icons.location size={12} />
                            {accommodation.address.split(' ').slice(1, 3).join(' ')}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* 근처 쇼핑 */}
            {nearbyShopping.length > 0 && (
              <div className="sdp__nearby-category">
                <h3 className="sdp__nearby-category-title">
                  <Icons.card size={14} /> {language === 'ko' ? '쇼핑' : 'Shopping'}
                </h3>
                <div className="sdp__related-grid sdp__food-grid">
                  {nearbyShopping.map((shop, idx) => (
                    <Link 
                      key={shop.contentId || idx}
                      href={`/spot/${generateSlug(shop.name, shop.contentId)}`}
                      className="sdp__related-card sdp__food-card"
                    >
                      <div className="sdp__related-image">
                        <Image 
                          src={getReliableImageUrl(shop.imageUrl)}
                          alt={shop.name}
                          width={200}
                          height={120}
                          sizes="(max-width: 640px) 50vw, 200px"
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          onError={handleImageError}
                          loading="lazy"
                        />
                        <span className="sdp__food-distance">{shop.distanceText}</span>
                      </div>
                      <div className="sdp__related-info">
                        <h3 className="sdp__related-title">{shop.name}</h3>
                        {shop.address && (
                          <p className="sdp__related-address">
                            <Icons.location size={12} />
                            {shop.address.split(' ').slice(1, 3).join(' ')}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* FAQ 섹션 (음식점에서 AI 생성 FAQ가 있을 때만 표시) */}
        {spot.content_type_id === '39' && spot.intro_info?.faq && (() => {
          // FAQ가 배열인지 텍스트인지 확인하고 파싱
          let faqItems = spot.intro_info.faq
          
          // 텍스트 형식인 경우 파싱
          if (typeof faqItems === 'string') {
            const lines = faqItems.split('\n').filter(line => line.trim())
            faqItems = []
            let currentQ = null
            
            for (const line of lines) {
              const trimmed = line.trim()
              if (trimmed.startsWith('Q.')) {
                currentQ = trimmed.replace(/^Q\.\s*/, '')
              } else if (trimmed.startsWith('A.') && currentQ) {
                faqItems.push({
                  question: currentQ,
                  answer: trimmed.replace(/^A\.\s*/, '')
                })
                currentQ = null
              }
            }
          }
          
          if (!faqItems || faqItems.length === 0) return null
          
          return (
            <section className="sdp__section sdp__faq">
              <div className="sdp__section-header">
                <span className="sdp__section-icon"><Icons.about size={18} /></span>
                <h2 className="sdp__section-title">자주 묻는 질문</h2>
              </div>
              <div className="sdp__faq-list">
                {faqItems.map((item, idx) => (
                  <details key={idx} className="sdp__faq-item">
                    <summary className="sdp__faq-question">
                      <span className="sdp__faq-q">Q.</span>
                      {item.question}
                      <Icons.chevronDown size={18} className="sdp__faq-icon" />
                    </summary>
                    <div className="sdp__faq-answer">
                      <span className="sdp__faq-a">A.</span>
                      {item.answer}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )
        })()}

        {/* 리뷰 섹션 */}
        <section className="sdp__section sdp__reviews">
          <div className="sdp__section-header">
            <span className="sdp__section-icon"><Icons.review size={18} /></span>
            <h2 className="sdp__section-title">
              {t.detail.reviews}
              {reviewCount > 0 && <span className="sdp__review-count">({reviewCount})</span>}
            </h2>
            {user && (
              <button 
                className="sdp__review-write-btn"
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                {showReviewForm ? t.ui.cancel : t.detail.writeReview}
              </button>
            )}
          </div>
          
          {/* 평균 평점 */}
          {avgRating > 0 && (
            <div className="sdp__rating-summary">
              <span className="sdp__rating-value">{avgRating}</span>
              <div className="sdp__rating-stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <span key={star} className={`sdp__star ${star <= Math.round(avgRating) ? 'sdp__star--filled' : ''}`}>
                    ★
                  </span>
                ))}
              </div>
              <span className="sdp__rating-count">{reviewCount}개의 리뷰</span>
            </div>
          )}
          
          {/* 리뷰 작성 폼 */}
          {showReviewForm && (
            <div className="sdp__review-form">
              <div className="sdp__rating-input">
                <span>{t.detail.rating}:</span>
                <div className="sdp__rating-stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star}
                      type="button"
                      className={`sdp__star-btn ${star <= newRating ? 'sdp__star-btn--active' : ''}`}
                      onClick={() => setNewRating(star)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                className="sdp__review-textarea"
                placeholder={t.detail.writeReviewPlaceholder}
                value={newReviewContent}
                onChange={(e) => setNewReviewContent(e.target.value)}
                rows={4}
              />
              <button 
                className="sdp__review-submit-btn"
                onClick={handleSubmitReview}
                disabled={reviewSubmitting}
              >
                {reviewSubmitting ? t.detail.submitting : t.detail.submitReview}
              </button>
            </div>
          )}
          
          {/* 리뷰 목록 */}
          {reviews.length > 0 ? (
            <>
              {/* 리뷰 정렬 옵션 */}
              <div className="sdp__review-sort">
                <select 
                  className="sdp__review-sort-select"
                  value={`${reviewSortBy}-${reviewSortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-')
                    handleReviewSortChange(sortBy, sortOrder)
                  }}
                >
                  <option value="created_at-desc">최신순</option>
                  <option value="created_at-asc">오래된순</option>
                  <option value="rating-desc">별점 높은순</option>
                  <option value="rating-asc">별점 낮은순</option>
                </select>
              </div>
              
              <div className="sdp__review-list">
                {reviews.map(review => (
                  <div key={review.id} className="sdp__review-item">
                    <div className="sdp__review-header">
                      <div className="sdp__review-author">
                        {review.profiles?.avatar_url ? (
                          <Image 
                            src={toSecureUrl(review.profiles.avatar_url)} 
                            alt="" 
                            width={32}
                            height={32}
                            className="sdp__review-avatar"
                            loading="lazy"
                          />
                        ) : (
                          <div className="sdp__review-avatar sdp__review-avatar--default"></div>
                        )}
                        <span className="sdp__review-nickname">
                          {maskNickname(review.profiles?.nickname)}
                        </span>
                      </div>
                      <div className="sdp__review-meta">
                        <div className="sdp__review-rating">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} className={`sdp__star sdp__star--small ${star <= review.rating ? 'sdp__star--filled' : ''}`}>
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="sdp__review-date">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                        {user && user.id === review.user_id && (
                          <button 
                            className="sdp__review-delete-btn"
                            onClick={() => handleDeleteReview(review.id)}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="sdp__review-content">{sanitizeText(review.content)}</p>
                  </div>
                ))}
              </div>
              
              {/* 리뷰 페이지네이션 */}
              {reviewTotalPages > 1 && (
                <div className="sdp__review-pagination">
                  <button 
                    className="sdp__review-page-btn"
                    onClick={() => handleReviewPageChange(reviewPage - 1)}
                    disabled={reviewPage <= 1}
                  >
                    ‹ 이전
                  </button>
                  <span className="sdp__review-page-info">
                    {reviewPage} / {reviewTotalPages}
                  </span>
                  <button 
                    className="sdp__review-page-btn"
                    onClick={() => handleReviewPageChange(reviewPage + 1)}
                    disabled={reviewPage >= reviewTotalPages}
                  >
                    다음 ›
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="sdp__review-empty">
              <p className="sdp__review-empty-title">
                {language === 'ko' 
                  ? '아직 방문 후기가 등록되지 않았습니다.'
                  : 'No reviews have been posted yet.'}
              </p>
              <p className="sdp__review-empty-desc">
                {language === 'ko' 
                  ? `${spot?.title || '이 장소'}을(를) 방문하셨다면`
                  : `If you visited ${spot?.title || 'this place'},`}
              </p>
              <p className="sdp__review-empty-cta">
                {language === 'ko' 
                  ? '관람 소감과 팁을 남겨주세요.'
                  : 'please share your experience and tips.'}
              </p>
            </div>
          )}
        </section>

        {/* 저작권 */}
        <section className="sdp__license">
          <LicenseBadge type="kto" />
        </section>
      </main>

      {/* 하단 고정 버튼 */}
      <div className="sdp__bottom">
        {user && (
          <button className="sdp__bottom-btn sdp__bottom-btn--primary" onClick={openAddModal}>
            + {t.detail.addToTrip}
          </button>
        )}
        {spot.addr1 && (
          <a 
            href={`https://map.kakao.com/link/to/${encodeURIComponent(spot.title)},${spot.mapy},${spot.mapx}`}
            target="_blank" rel="noopener noreferrer"
            className="sdp__bottom-btn sdp__bottom-btn--secondary"
          >
            <Icons.compass size={16} /> {t.ui.directions}
          </a>
        )}
      </div>

      {/* 갤러리 모달 */}
      {showFullGallery && (
        <div className="sdp__modal-overlay" onClick={() => setShowFullGallery(false)}>
          <div className="sdp__gallery-modal" onClick={e => e.stopPropagation()}>
            <button className="sdp__modal-close" onClick={() => setShowFullGallery(false)}>×</button>
            <Image 
              src={getReliableImageUrl(allImages[currentImageIndex])}
              alt={spot.title}
              width={1200}
              height={800}
              style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '70vh' }}
              onError={handleImageError}
            />
            <div className="sdp__gallery-modal-nav">
              <button onClick={prevImage}>‹</button>
              <span>{currentImageIndex + 1} / {allImages.length}</span>
              <button onClick={nextImage}>›</button>
            </div>
            <div className="sdp__gallery-thumbs">
              {allImages.map((img, idx) => (
                <div 
                  key={idx} 
                  className={`sdp__thumb ${idx === currentImageIndex ? 'sdp__thumb--active' : ''}`}
                  onClick={() => setCurrentImageIndex(idx)}
                >
                  <Image 
                    src={getReliableImageUrl(img)} 
                    alt="" 
                    width={100}
                    height={75}
                    loading="lazy"
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    onError={handleImageError} 
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 공유 모달 */}
      {showShareModal && (
        <div className="sdp__modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="sdp__share-modal" onClick={e => e.stopPropagation()}>
            <div className="sdp__share-modal-header">
              <h3>{t.detail.shareTo}</h3>
              <button className="sdp__share-modal-close" onClick={() => setShowShareModal(false)}>×</button>
            </div>
            
            <div className="sdp__share-modal-body">
              <button className="sdp__share-option sdp__share-option--kakao" onClick={handleKakaoShare}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#3C1E1E">
                  <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.47 1.607 4.647 4.042 5.877l-.992 3.682c-.052.194.017.4.175.514.158.114.37.123.537.023L10.1 17.77c.623.087 1.26.133 1.9.133 5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
                </svg>
                <span>{t.detail.kakaoTalk}</span>
              </button>
              
              <button className="sdp__share-option sdp__share-option--link" onClick={handleCopyLink}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <span>{t.detail.linkCopy}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 내 여행에 추가 모달 */}
      {showAddModal && (
        <div className="sdp__modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="sdp__trip-modal" onClick={e => e.stopPropagation()}>
            <div className="sdp__trip-modal-header">
              <h3>{t.detail.addToTrip}</h3>
              <button onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <div className="sdp__trip-modal-body">
              <div className="sdp__trip-preview">
                <Image 
                  src={getReliableImageUrl(spot.firstimage, '/images/no-image.svg')}
                  alt={spot.title}
                  width={60}
                  height={60}
                  style={{ objectFit: 'cover' }}
                  onError={handleImageError}
                />
                <div>
                  <h4>{spot.title}</h4>
                  <p>{spot.addr1}</p>
                </div>
              </div>

              {tripsLoading ? (
                <div className="sdp__trip-loading"><div className="sdp__spinner"></div></div>
              ) : tripPlans.length === 0 ? (
                <div className="sdp__trip-empty">
                  <p>{t.detail.noTripPlans}</p>
                  <Link href="/my-trip">{t.detail.newTripCreate}</Link>
                </div>
              ) : (
                <>
                  <div className="sdp__trip-select">
                    <label>{t.detail.tripSelect}</label>
                    <div className="sdp__trip-list">
                      {tripPlans.map(trip => (
                        <button
                          key={trip.id}
                          className={`sdp__trip-option ${selectedTripId === trip.id ? 'sdp__trip-option--selected' : ''}`}
                          onClick={() => { setSelectedTripId(trip.id); setSelectedDayId(null); }}
                        >
                          {trip.title}
                          {selectedTripId === trip.id && <span><Icons.check size={14} /></span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedTripId && (
                    <div className="sdp__day-select">
                      <label>{t.detail.daySelect}</label>
                      <div className="sdp__day-list">
                        {tripPlans.find(tp => tp.id === selectedTripId)?.days?.map(day => (
                          <button
                            key={day.id}
                            className={`sdp__day-option ${selectedDayId === day.id ? 'sdp__day-option--selected' : ''}`}
                            onClick={() => setSelectedDayId(day.id)}
                          >
                            <Icons.calendar size={14} /> {day.dayNumber}{t.trip.day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="sdp__trip-modal-footer">
              <button className="sdp__trip-btn sdp__trip-btn--cancel" onClick={() => setShowAddModal(false)}>
                {t.ui.cancel}
              </button>
              <button 
                className="sdp__trip-btn sdp__trip-btn--add" 
                onClick={handleAddToTrip}
                disabled={!selectedDayId || addingToTrip}
              >
                {addingToTrip ? <span className="sdp__spinner-small"></span> : '+'}
                {t.ui.add}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SpotDetailPage
