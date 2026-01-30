import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaHeart, FaCalendarAlt, FaMapMarkerAlt, FaClock, FaSearch, FaStar } from 'react-icons/fa'
import { getPublishedTripPlans } from '../services/tripService'
import { useLanguage } from '../context/LanguageContext'
import SEO, { SEO_DATA } from '../components/common/SEO'
// CSS는 pages/_app.jsx에서 import

// 여행코스 대체 이미지
const TRAVEL_PLACEHOLDER = '/images/travel-placeholder.svg'

function SharedTripsPage() {
  const { t, language } = useLanguage()
  const seoData = SEO_DATA.sharedTrips[language] || SEO_DATA.sharedTrips.ko
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('latest') // latest, popular, likes
  
  useEffect(() => {
    loadTrips()
  }, [sortBy])
  
  const loadTrips = async () => {
    setLoading(true)
    try {
      const result = await getPublishedTripPlans()
      if (result.success) {
        let sortedTrips = [...result.plans]
        
        // 정렬
        if (sortBy === 'popular') {
          sortedTrips.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        } else if (sortBy === 'likes') {
          sortedTrips.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
        } else {
          // latest - 기본 정렬 (최신순)
          sortedTrips.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        }
        
        setTrips(sortedTrips)
      }
    } catch (err) {
      console.error('Failed to load trips:', err)
    }
    setLoading(false)
  }
  
  // 검색 필터
  const filteredTrips = trips.filter(trip => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      trip.title?.toLowerCase().includes(term) ||
      trip.description?.toLowerCase().includes(term) ||
      trip.authorNickname?.toLowerCase().includes(term)
    )
  })
  
  // 관리자 추천 코스 분리
  const adminTrips = filteredTrips.filter(trip => trip.authorNickname === 'LetsGoDaejeon 관리자')
  const userTrips = filteredTrips.filter(trip => trip.authorNickname !== 'LetsGoDaejeon 관리자')
  
  // 날짜 포맷
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }
  
  // 여행 기간 계산
  const getTripDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return '1일'
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    if (days === 1) return '당일치기'
    return `${days - 1}박 ${days}일`
  }
  
  // 장소 수 계산
  const getPlaceCount = (days) => {
    if (!days) return 0
    return days.reduce((sum, day) => sum + (day.places?.length || 0), 0)
  }
  
  const TripCard = ({ trip }) => (
    <Link href={`/shared-trip/${trip.id}`} className="trip-card">
      <div className="trip-card-image">
        <img 
          src={trip.thumbnailUrl || TRAVEL_PLACEHOLDER} 
          alt={trip.title}
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null
            e.target.src = TRAVEL_PLACEHOLDER
          }}
        />
        {trip.authorNickname === 'LetsGoDaejeon 관리자' && (
          <div className="admin-badge">
            <FaStar /> 추천
          </div>
        )}
      </div>
      <div className="trip-card-content">
        <h3 className="trip-card-title">{trip.title}</h3>
        {trip.description && (
          <p className="trip-card-description">{trip.description}</p>
        )}
        <div className="trip-card-meta">
          <span className="trip-duration">
            <FaClock /> {getTripDuration(trip.startDate, trip.endDate)}
          </span>
          <span className="trip-places">
            <FaMapMarkerAlt /> {getPlaceCount(trip.days)}곳
          </span>
        </div>
        <div className="trip-card-footer">
          <span className="trip-author">{trip.authorNickname || '익명'}</span>
          <span className="trip-likes">
            <FaHeart /> {trip.likeCount || 0}
          </span>
        </div>
      </div>
    </Link>
  )
  
  return (
    <>
      <SEO 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        url="/shared-trips"
      />
      <div className="shared-trips-page">
        <div className="shared-trips-header">
          <h1>{t.pages.sharedTrips.title}</h1>
          <p>{t.pages.sharedTrips.subtitle}</p>
        </div>
      
      <div className="shared-trips-controls">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder={t.pages.sharedTrips.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="sort-buttons">
          <button 
            className={sortBy === 'latest' ? 'active' : ''}
            onClick={() => setSortBy('latest')}
          >
            {t.pages.sharedTrips.latest}
          </button>
          <button 
            className={sortBy === 'popular' ? 'active' : ''}
            onClick={() => setSortBy('popular')}
          >
            {t.pages.sharedTrips.popular}
          </button>
          <button 
            className={sortBy === 'likes' ? 'active' : ''}
            onClick={() => setSortBy('likes')}
          >
            {t.pages.sharedTrips.mostLiked}
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{t.pages.sharedTrips.loadingCourses}</p>
        </div>
      ) : (
        <>
          {/* 관리자 추천 코스 */}
          {adminTrips.length > 0 && (
            <section className="trips-section recommended-section">
              <h2>
                <FaStar /> {t.pages.sharedTrips.recommended}
              </h2>
              <div className="trips-grid">
                {adminTrips.map(trip => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          )}
          
          {/* 사용자 여행 코스 */}
          {userTrips.length > 0 && (
            <section className="trips-section user-section">
              <h2>{t.pages.sharedTrips.userCourses}</h2>
              <div className="trips-grid">
                {userTrips.map(trip => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          )}
          
          {filteredTrips.length === 0 && (
            <div className="no-trips">
              <FaMapMarkerAlt />
              <p>{t.pages.sharedTrips.noTrips}</p>
            </div>
          )}
        </>
      )}
    </div>
    </>
  )
}

export default SharedTripsPage
