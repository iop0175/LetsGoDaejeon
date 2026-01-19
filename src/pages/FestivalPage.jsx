import { useState, useEffect, useMemo } from 'react'
import { FiCalendar, FiMapPin, FiClock, FiLoader, FiUser, FiX, FiInfo } from 'react-icons/fi'
import { useLanguage } from '../context/LanguageContext'
import { getFestivals } from '../services/api'
import './FestivalPage.css'

const FestivalPage = () => {
  const { language, t } = useLanguage()
  const [allEvents, setAllEvents] = useState([]) // 전체 데이터
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [themeFilter, setThemeFilter] = useState('all')
  const [placeFilter, setPlaceFilter] = useState('all')
  const itemsPerPage = 12

  // 시간 포맷 변환
  const formatTime = (time) => {
    if (!time || time.length < 4) return ''
    return `${time.slice(0, 2)}:${time.slice(2, 4)}`
  }

  // 날짜 포맷 변환
  const formatDate = (date) => {
    if (!date) return ''
    return date.replace(/-/g, '.')
  }

  // 요일 계산
  const getDayOfWeek = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const days = language === 'ko' 
      ? ['일', '월', '화', '수', '목', '금', '토']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[date.getDay()]
  }

  // 오늘 날짜 (YYYY-MM-DD 형식)
  const today = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  // 종료되지 않은 행사만 필터링
  const activeEvents = useMemo(() => {
    return allEvents.filter(event => {
      if (!event.endDate) return true // 종료일이 없으면 포함
      const normalizedEndDate = event.endDate.replace(/-/g, '')
      const normalizedToday = today.replace(/-/g, '')
      return normalizedEndDate >= normalizedToday
    })
  }, [allEvents, today])

  // 사용 가능한 테마 목록 추출 (종료되지 않은 행사 기준)
  const availableThemes = useMemo(() => {
    const themes = new Set()
    activeEvents.forEach(event => {
      if (event.theme) themes.add(event.theme)
    })
    return Array.from(themes).sort()
  }, [activeEvents])

  // 사용 가능한 장소 목록 추출 (종료되지 않은 행사 기준)
  const availablePlaces = useMemo(() => {
    const places = new Set()
    activeEvents.forEach(event => {
      if (event.place) places.add(event.place)
    })
    return Array.from(places).sort()
  }, [activeEvents])

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [themeFilter, placeFilter])

  // 테마 + 장소별 필터링 (이미 종료된 행사는 activeEvents에서 제외됨)
  const filteredEvents = useMemo(() => {
    let data = activeEvents
    
    // 테마별 필터링
    if (themeFilter !== 'all') {
      data = data.filter(event => event.theme === themeFilter)
    }
    
    // 장소별 필터링
    if (placeFilter !== 'all') {
      data = data.filter(event => event.place === placeFilter)
    }
    
    return data
  }, [activeEvents, themeFilter, placeFilter])

  // 현재 페이지에 해당하는 데이터
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredEvents, currentPage, itemsPerPage])

  // API 데이터 로드 (전체 데이터 한 번에)
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true)
      setError(null)
      
      // 전체 데이터를 한 번에 불러옴 (1000개)
      const result = await getFestivals(1, 1000)
      
      if (result.success) {
        const formattedEvents = result.items.map((item, index) => ({
          id: item.eventSeq || index + 1,
          title: item.title,
          theme: item.themeCdNm,
          place: item.placeCdNm,
          placeDetail: item.placeDetail,
          target: item.targetCdNm,
          management: item.managementCdNm,
          beginDate: item.beginDt,
          endDate: item.endDt,
          beginTime: item.beginTm,
          endTime: item.endTm,
          isHot: item.hotYn === 'Y',
          isRecommended: item.recommendationYn === 'Y'
        }))
        setAllEvents(formattedEvents)
      } else {
        setError(language === 'ko' ? '데이터를 불러오는데 실패했습니다.' : 'Failed to load data.')
      }
      
      setLoading(false)
    }

    loadEvents()
  }, [language])

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage)

  // 모달 닫기
  const closeModal = () => {
    setSelectedEvent(null)
  }

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  return (
    <div className="festival-page">
      <div className="page-hero festival-hero">
        <div className="page-hero-content">
          <h1>{t.pages.festival.title}</h1>
          <p>{t.pages.festival.subtitle}</p>
        </div>
      </div>
      
      <div className="container">
        {loading ? (
          <div className="loading-container">
            <FiLoader className="loading-spinner" />
            <p>{language === 'ko' ? '공연/행사 정보를 불러오는 중...' : 'Loading events...'}</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* 필터 섹션 */}
            <div className="filter-section">
              {/* 테마 필터 */}
              {availableThemes.length > 0 && (
                <div className="theme-filters">
                  <span className="filter-label">{language === 'ko' ? '테마:' : 'Theme:'}</span>
                  <div className="theme-buttons">
                    <button
                      className={`festival-theme-btn ${themeFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setThemeFilter('all')}
                    >
                      {language === 'ko' ? '전체' : 'All'}
                    </button>
                    {availableThemes.map((theme) => (
                      <button
                        key={theme}
                        className={`festival-theme-btn ${themeFilter === theme ? 'active' : ''}`}
                        onClick={() => setThemeFilter(theme)}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 장소 필터 */}
              {availablePlaces.length > 0 && (
                <div className="place-filters">
                  <span className="filter-label">{language === 'ko' ? '장소:' : 'Place:'}</span>
                  <div className="place-buttons">
                    <button
                      className={`place-btn ${placeFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setPlaceFilter('all')}
                    >
                      {language === 'ko' ? '전체' : 'All'}
                    </button>
                    {availablePlaces.map((place) => (
                      <button
                        key={place}
                        className={`place-btn ${placeFilter === place ? 'active' : ''}`}
                        onClick={() => setPlaceFilter(place)}
                      >
                        {place}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="events-count">
              {t.common.total} <strong>{filteredEvents.length.toLocaleString()}</strong>{language === 'ko' ? '개의 공연/행사' : ' events'}
            </div>
            
            <div className="festival-grid">
              {paginatedEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="event-card"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="event-image">
                    <img 
                      src={`https://picsum.photos/seed/${encodeURIComponent(event.title)}/800/500`}
                      alt={event.title}
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = '/images/no-image.svg'
                      }}
                    />
                    <div className="event-badges">
                      <span className="theme-badge">{event.theme}</span>
                      {event.isHot && <span className="hot-badge">🔥 HOT</span>}
                      {event.isRecommended && <span className="rec-badge">⭐ {language === 'ko' ? '추천' : 'Recommended'}</span>}
                    </div>
                    <div className="event-overlay">
                      <FiInfo className="info-icon" />
                      <span>{language === 'ko' ? '상세보기' : 'View Details'}</span>
                    </div>
                  </div>
                  <div className="event-content">
                    <h3 className="event-title">{event.title}</h3>
                    
                    <div className="event-info">
                      <div className="info-item">
                        <FiCalendar />
                        <span>
                          {formatDate(event.beginDate)}
                          {event.beginDate !== event.endDate && ` ~ ${formatDate(event.endDate)}`}
                        </span>
                      </div>
                      
                      <div className="info-item">
                        <FiClock />
                        <span>{formatTime(event.beginTime)} ~ {formatTime(event.endTime)}</span>
                      </div>
                      
                      <div className="info-item">
                        <FiMapPin />
                        <span>{event.place} {event.placeDetail && `(${event.placeDetail})`}</span>
                      </div>
                      
                      {event.target && (
                        <div className="info-item">
                          <FiUser />
                          <span>{event.target}</span>
                        </div>
                      )}
                    </div>
                    
                    {event.management && (
                      <p className="event-management">
                        {language === 'ko' ? '주관' : 'Organized by'}: {event.management}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* 페이지네이션 */}
            <div className="pagination">
              <button 
                className="page-btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                {language === 'ko' ? '이전' : 'Prev'}
              </button>
              
              <div className="page-numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`page-num ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button 
                className="page-btn"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {language === 'ko' ? '다음' : 'Next'}
              </button>
            </div>
          </>
        )}
      </div>
      
      {/* 상세 정보 모달 */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <FiX />
            </button>
            
            <div className="modal-header">
              <div className="modal-image">
                <img 
                  src={`https://picsum.photos/seed/${encodeURIComponent(selectedEvent.title)}/1200/600`}
                  alt={selectedEvent.title}
                  onError={(e) => {
                    e.target.src = '/images/no-image.svg'
                  }}
                />
                <div className="modal-badges">
                  <span className="theme-badge">{selectedEvent.theme}</span>
                  {selectedEvent.isHot && <span className="hot-badge">🔥 HOT</span>}
                  {selectedEvent.isRecommended && <span className="rec-badge">⭐ {language === 'ko' ? '추천' : 'Recommended'}</span>}
                </div>
              </div>
            </div>
            
            <div className="modal-body">
              <h2 className="modal-title">{selectedEvent.title}</h2>
              
              <div className="modal-details">
                <div className="detail-row">
                  <div className="detail-label">
                    <FiCalendar />
                    {language === 'ko' ? '일시' : 'Date & Time'}
                  </div>
                  <div className="detail-value">
                    <p>
                      {formatDate(selectedEvent.beginDate)} ({getDayOfWeek(selectedEvent.beginDate)})
                      {selectedEvent.beginDate !== selectedEvent.endDate && 
                        ` ~ ${formatDate(selectedEvent.endDate)} (${getDayOfWeek(selectedEvent.endDate)})`
                      }
                    </p>
                    <p className="time-info">
                      {formatTime(selectedEvent.beginTime)} ~ {formatTime(selectedEvent.endTime)}
                    </p>
                  </div>
                </div>
                
                <div className="detail-row">
                  <div className="detail-label">
                    <FiMapPin />
                    {language === 'ko' ? '장소' : 'Venue'}
                  </div>
                  <div className="detail-value">
                    <p className="venue-main">{selectedEvent.place}</p>
                    {selectedEvent.placeDetail && (
                      <p className="venue-detail">{selectedEvent.placeDetail}</p>
                    )}
                  </div>
                </div>
                
                {selectedEvent.target && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <FiUser />
                      {language === 'ko' ? '관람대상' : 'Target Audience'}
                    </div>
                    <div className="detail-value">
                      <p>{selectedEvent.target}</p>
                    </div>
                  </div>
                )}
                
                {selectedEvent.management && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <FiInfo />
                      {language === 'ko' ? '주관' : 'Organizer'}
                    </div>
                    <div className="detail-value">
                      <p>{selectedEvent.management}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                <button className="btn-primary">
                  {language === 'ko' ? '예매하기' : 'Book Now'}
                </button>
                <button className="btn-secondary" onClick={closeModal}>
                  {language === 'ko' ? '닫기' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FestivalPage
