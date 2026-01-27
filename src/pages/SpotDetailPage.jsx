import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { getTourSpotByContentId, incrementSpotViews, getSpotStats, toggleSpotLike, checkSpotLiked, getSpotReviews, createSpotReview, deleteSpotReview } from '../services/dbService'
import { getTourApiImages, getTourApiDetail } from '../services/api'
import { getUserTripPlans, addTripPlace } from '../services/tripService'
import { getReliableImageUrl, handleImageError, cleanIntroHtml, sanitizeIntroHtml } from '../utils/imageUtils'
import LicenseBadge from '../components/common/LicenseBadge'
import Icons from '../components/common/Icons'
import './SpotDetailPage.css'

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
  const { contentId } = useParams()
  const navigate = useNavigate()
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
    const productionDomain = 'https://letsgodaejeon.kr'
    const shareUrl = isLocalhost 
      ? `${productionDomain}/spot/${contentId}` 
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
    const productionDomain = 'https://letsgodaejeon.kr'
    const copyUrl = isLocalhost 
      ? `${productionDomain}/spot/${contentId}` 
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
          <button onClick={() => navigate(-1)} className="sdp__error-btn">
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
        <button className="sdp__header-btn" onClick={() => navigate(-1)}>
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
              {/* 메인 이미지 (왼쪽 큰 이미지) */}
              <div className="sdp__gallery-item sdp__gallery-item--main">
                <img 
                  src={getReliableImageUrl(allImages[0])} 
                  alt={language === 'en' && spot.title_en ? spot.title_en : spot.title} 
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
                      <img 
                        src={getReliableImageUrl(allImages[idx])} 
                        alt="" 
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
                      <img src={room.roomimg1} alt={room.roomtitle || `Room ${index + 1}`} />
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
                          <img 
                            src={review.profiles.avatar_url} 
                            alt="" 
                            className="sdp__review-avatar"
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
            <p className="sdp__review-empty">
              {t.detail.noReviews}
            </p>
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
            <img 
              src={getReliableImageUrl(allImages[currentImageIndex])}
              alt={spot.title}
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
                  <img src={getReliableImageUrl(img)} alt="" onError={handleImageError} />
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
                <img 
                  src={getReliableImageUrl(spot.firstimage, '/images/no-image.svg')}
                  alt={spot.title}
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
                  <Link to="/my-trip">{t.detail.newTripCreate}</Link>
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
