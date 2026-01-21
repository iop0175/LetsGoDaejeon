import { memo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowRight, FiClock, FiUser, FiMapPin, FiEye, FiHeart, FiX, FiNavigation } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { getPublishedTripPlans } from '../../services/tripService'
import './TravelCourse.css'

// 기본 추천 코스 (게시된 여행이 없을 때 표시)
const defaultCourses = [
  {
    id: 'default-1',
    title: { ko: '과학과 자연이 함께하는 대전 1일 코스', en: 'Science & Nature Day Trip' },
    spots: { 
      ko: ['국립중앙과학관', '한밭수목원', '유성온천'],
      en: ['National Science Museum', 'Hanbat Arboretum', 'Yuseong Spa']
    },
    spotDetails: [
      { placeName: '국립중앙과학관', address: '대전 유성구 대덕대로 481', lat: 36.3751, lng: 127.3751 },
      { placeName: '한밭수목원', address: '대전 서구 둔산대로 169', lat: 36.3680, lng: 127.3882 },
      { placeName: '유성온천', address: '대전 유성구 온천로', lat: 36.3558, lng: 127.3427 }
    ],
    duration: { ko: '1일', en: '1 day' },
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
    tag: { ko: '인기', en: 'Popular' },
    isDefault: true
  },
  {
    id: 'default-2',
    title: { ko: '대전 맛집 투어 코스', en: 'Daejeon Food Tour' },
    spots: { 
      ko: ['성심당', '두부두루치기', '칼국수 골목', '유성 족발골목'],
      en: ['Sungsimdang', 'Dubu Duruchigi', 'Kalguksu Alley', 'Jokbal Alley']
    },
    spotDetails: [
      { placeName: '성심당', address: '대전 중구 대종로480번길 15', lat: 36.3275, lng: 127.4274 },
      { placeName: '두부두루치기', address: '대전 동구 대전로 922', lat: 36.3349, lng: 127.4343 },
      { placeName: '칼국수 골목', address: '대전 중구 중앙로 170번길', lat: 36.3266, lng: 127.4268 },
      { placeName: '유성 족발골목', address: '대전 유성구 봉명동', lat: 36.3516, lng: 127.3391 }
    ],
    duration: { ko: '1일', en: '1 day' },
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=400&fit=crop',
    tag: { ko: '미식', en: 'Gourmet' },
    isDefault: true
  },
  {
    id: 'default-3',
    title: { ko: '대청호와 함께하는 힐링 코스', en: 'Healing at Daecheongho' },
    spots: { 
      ko: ['대청호 오백리길', '대청댐', '식장산'],
      en: ['Daecheongho Trail', 'Daecheong Dam', 'Sikjangsan']
    },
    spotDetails: [
      { placeName: '대청호 오백리길', address: '대전 대덕구 미호동', lat: 36.4748, lng: 127.4826 },
      { placeName: '대청댐', address: '대전 대덕구 미호동 산5-1', lat: 36.4785, lng: 127.4798 },
      { placeName: '식장산', address: '대전 동구 세천동', lat: 36.3814, lng: 127.5058 }
    ],
    duration: { ko: '1일', en: '1 day' },
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=400&fit=crop',
    tag: { ko: '자연', en: 'Nature' },
    isDefault: true
  }
]

const TravelCourse = memo(() => {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const [publishedTrips, setPublishedTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [spotCardPosition, setSpotCardPosition] = useState({ top: 0, left: 0 })
  const spotCardRef = useRef(null)

  // 게시된 여행 계획 로드
  useEffect(() => {
    const loadPublishedTrips = async () => {
      try {
        const result = await getPublishedTripPlans({ limit: 6, orderBy: 'published_at' })
        if (result.success) {
          setPublishedTrips(result.plans)
        }
      } catch (err) {
        // 에러 시 기본 코스만 표시
      }
      setLoading(false)
    }
    
    loadPublishedTrips()
  }, [])

  // 외부 클릭 시 카드 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (spotCardRef.current && !spotCardRef.current.contains(e.target)) {
        setSelectedSpot(null)
      }
    }
    
    if (selectedSpot) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedSpot])

  // 게시된 여행을 코스 형식으로 변환
  const publishedCourses = publishedTrips.map(trip => {
    // 모든 장소 정보 추출
    const allPlaces = trip.days?.flatMap(day => day.places || []) || []
    
    return {
      id: trip.id,
      title: { ko: trip.title, en: trip.title },
      spots: { 
        ko: allPlaces.map(p => p.placeName).slice(0, 4),
        en: allPlaces.map(p => p.placeName).slice(0, 4)
      },
      spotDetails: allPlaces.slice(0, 4),
      duration: { 
        ko: `${trip.days?.length || 1}일`, 
        en: `${trip.days?.length || 1} day${(trip.days?.length || 1) > 1 ? 's' : ''}`
      },
      image: trip.thumbnailUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
      tag: { ko: '사용자 코스', en: 'User Course' },
      author: trip.authorNickname || '익명',
      viewCount: trip.viewCount || 0,
      likeCount: trip.likeCount || 0,
      isPublished: true
    }
  })

  // 표시할 코스 결정 (게시된 것 + 기본 코스 합쳐서 최대 6개)
  const displayCourses = publishedCourses.length > 0 
    ? [...publishedCourses, ...defaultCourses].slice(0, 6)
    : defaultCourses

  // 장소 클릭 핸들러
  const handleSpotClick = (e, spotDetail, courseId) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!spotDetail) return
    
    const rect = e.target.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    
    setSpotCardPosition({
      top: rect.bottom + scrollTop + 8,
      left: Math.min(rect.left, window.innerWidth - 280)
    })
    
    setSelectedSpot({
      ...spotDetail,
      courseId
    })
  }

  // 카드 클릭 핸들러 (전체 카드 클릭 시 상세 페이지 이동)
  const handleCardClick = (course) => {
    if (selectedSpot) return // 팝오버가 열려있으면 이동하지 않음
    const path = course.isPublished ? `/trip/shared/${course.id}` : `/travel/course/${course.id}`
    navigate(path)
  }

  // 길찾기
  const handleDirection = (spot) => {
    if (spot.lat && spot.lng) {
      const kakaoMapUrl = `https://map.kakao.com/link/to/${encodeURIComponent(spot.placeName)},${spot.lat},${spot.lng}`
      window.open(kakaoMapUrl, '_blank')
    }
  }

  return (
    <section className="travel-course section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{t.travelCourse.title}</h2>
          <p className="section-subtitle">
            {publishedCourses.length > 0 
              ? (language === 'ko' ? '다른 여행자들이 공유한 코스를 둘러보세요' : 'Explore courses shared by other travelers')
              : t.travelCourse.subtitle}
          </p>
        </div>
        
        {loading ? (
          <div className="course-loading">
            <div className="loading-spinner" />
          </div>
        ) : (
          <div className="course-grid">
            {displayCourses.map((course) => (
              <div 
                key={course.id} 
                className={`course-card ${course.isPublished ? 'published-course' : ''}`}
                onClick={() => handleCardClick(course)}
              >
                <div className="course-image">
                  <img src={course.image} alt={course.title[language]} loading="lazy" />
                  <span className={`course-tag ${course.isPublished ? 'user-tag' : ''}`}>
                    {course.tag[language]}
                  </span>
                </div>
                <div className="course-content">
                  <h3 className="course-title">{course.title[language]}</h3>
                  
                  {course.isPublished && (
                    <div className="course-author">
                      <FiUser /> {course.author}
                    </div>
                  )}
                  
                  <div className="course-spots">
                    {course.spots[language].map((spot, idx) => (
                      <span 
                        key={idx} 
                        className="spot-badge clickable"
                        onClick={(e) => handleSpotClick(e, course.spotDetails?.[idx], course.id)}
                      >
                        {spot}
                      </span>
                    ))}
                    {course.spots[language].length === 0 && (
                      <span className="spot-badge empty">
                        {language === 'ko' ? '장소 없음' : 'No places'}
                      </span>
                    )}
                  </div>
                  
                  <div className="course-footer">
                    <span className="course-duration">
                      <FiClock />
                      {course.duration[language]}
                    </span>
                    
                    {course.isPublished && (
                      <div className="course-stats">
                        <span><FiEye /> {course.viewCount}</span>
                        <span><FiHeart /> {course.likeCount}</span>
                      </div>
                    )}
                    
                    <span className="course-link">
                      {t.travelCourse.viewCourse} <FiArrowRight />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 장소 정보 팝오버 카드 */}
        {selectedSpot && (
          <div 
            ref={spotCardRef}
            className="spot-info-card"
            style={{
              top: spotCardPosition.top,
              left: spotCardPosition.left
            }}
          >
            <button className="spot-card-close" onClick={() => setSelectedSpot(null)}>
              <FiX />
            </button>
            <h4 className="spot-card-title">{selectedSpot.placeName}</h4>
            {selectedSpot.address && (
              <p className="spot-card-address">
                <FiMapPin /> {selectedSpot.address}
              </p>
            )}
            {selectedSpot.memo && (
              <p className="spot-card-memo">{selectedSpot.memo}</p>
            )}
            {selectedSpot.lat && selectedSpot.lng && (
              <button 
                className="spot-card-direction"
                onClick={() => handleDirection(selectedSpot)}
              >
                <FiNavigation /> {language === 'ko' ? '길찾기' : 'Directions'}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
})

TravelCourse.displayName = 'TravelCourse'

export default TravelCourse
