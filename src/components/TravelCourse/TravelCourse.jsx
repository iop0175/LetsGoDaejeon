import { memo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowRight, FiClock, FiUser, FiMapPin, FiEye, FiHeart, FiX, FiNavigation } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { getPublishedTripPlans } from '../../services/tripService'
import './TravelCourse.css'

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
        // 에러 시 빈 배열
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
  const displayCourses = publishedTrips.map(trip => {
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
      tag: { ko: '추천 코스', en: 'Recommended' },
      author: trip.authorNickname || '익명',
      viewCount: trip.viewCount || 0,
      likeCount: trip.likeCount || 0,
      isPublished: true
    }
  })

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
    navigate(`/trip/shared/${course.id}`)
  }

  // 길찾기
  const handleDirection = (spot) => {
    if (spot.lat && spot.lng) {
      const kakaoMapUrl = `https://map.kakao.com/link/to/${encodeURIComponent(spot.placeName)},${spot.lat},${spot.lng}`
      window.open(kakaoMapUrl, '_blank')
    }
  }

  // 게시된 코스가 없으면 섹션 자체를 숨김
  if (!loading && displayCourses.length === 0) {
    return null
  }

  return (
    <section className="travel-course section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{t.travelCourse.title}</h2>
          <p className="section-subtitle">
            {language === 'ko' ? '다른 여행자들이 공유한 코스를 둘러보세요' : 'Explore courses shared by other travelers'}
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
                className="course-card published-course"
                onClick={() => handleCardClick(course)}
              >
                <div className="course-image">
                  <img src={course.image} alt={course.title[language]} loading="lazy" />
                  <span className="course-tag user-tag">
                    {course.tag[language]}
                  </span>
                </div>
                <div className="course-content">
                  <h3 className="course-title">{course.title[language]}</h3>
                  
                  <div className="course-author">
                    <FiUser /> {course.author}
                  </div>
                  
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
                    
                    <div className="course-stats">
                      <span><FiEye /> {course.viewCount}</span>
                      <span><FiHeart /> {course.likeCount}</span>
                    </div>
                    
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
