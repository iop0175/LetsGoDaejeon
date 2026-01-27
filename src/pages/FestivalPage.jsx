import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCalendar, FiMapPin, FiClock, FiLoader, FiUser, FiX, FiInfo, FiPhone, FiExternalLink, FiMusic } from 'react-icons/fi'
import { useLanguage } from '../context/LanguageContext'
import { getAllDbData, getDbPerformances, getTourFestivals } from '../services/dbService'
import { getReliableImageUrl, cleanIntroHtml, sanitizeIntroHtml } from '../utils/imageUtils'
import LicenseBadge from '../components/common/LicenseBadge'
import Icons from '../components/common/Icons'
import './FestivalPage.css'

const FestivalPage = () => {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('festival') // 'festival' or 'performance'
  
  // 축제/행사 상태
  const [allEvents, setAllEvents] = useState([]) // 전체 데이터
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [themeFilter, setThemeFilter] = useState('all')
  const [placeFilter, setPlaceFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name') // 정렬 기준: 'name' | 'views'
  const itemsPerPage = 12
  
  // 공연 상태
  const [performances, setPerformances] = useState([])
  const [performanceLoading, setPerformanceLoading] = useState(false)
  const [performanceError, setPerformanceError] = useState(null)
  const [performancePage, setPerformancePage] = useState(1)
  const [selectedPerformance, setSelectedPerformance] = useState(null)
  const [performanceSearchQuery, setPerformanceSearchQuery] = useState('')
  const performanceItemsPerPage = 12

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

  // 필터/정렬 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [themeFilter, placeFilter, sortBy])

  // 테마 + 장소별 필터링 + 정렬 (이미 종료된 행사는 activeEvents에서 제외됨)
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
    
    // 정렬 적용
    if (sortBy === 'name') {
      // 가나다순 정렬
      data = [...data].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'))
    } else if (sortBy === 'views') {
      // 조회수순 정렬
      data = [...data].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    } else {
      // 기본: 날짜순 정렬 (현재 날짜 기준 가까운 순)
      const todayNum = parseInt(today.replace(/-/g, ''))
      data = [...data].sort((a, b) => {
        // 시작일 기준 정렬
        const aBegin = a.beginDate ? parseInt(a.beginDate.replace(/-/g, '')) : 99999999
        const bBegin = b.beginDate ? parseInt(b.beginDate.replace(/-/g, '')) : 99999999
        
        // 이미 시작된 행사 (시작일 <= 오늘) vs 아직 시작 안 한 행사 구분
        const aStarted = aBegin <= todayNum
        const bStarted = bBegin <= todayNum
        
        // 1. 진행 중인 행사 (시작됨) 우선
        if (aStarted && !bStarted) return -1
        if (!aStarted && bStarted) return 1
        
        // 2. 같은 그룹 내에서는 시작일 가까운 순
        if (!aStarted && !bStarted) {
          // 둘 다 아직 안 시작한 경우: 시작일 빠른 순
          return aBegin - bBegin
        }
        
        // 3. 둘 다 진행 중인 경우: 종료일 빠른 순 (곧 끝나는 것 먼저)
        const aEnd = a.endDate ? parseInt(a.endDate.replace(/-/g, '')) : 99999999
        const bEnd = b.endDate ? parseInt(b.endDate.replace(/-/g, '')) : 99999999
        return aEnd - bEnd
      })
    }
    
    return data
  }, [activeEvents, themeFilter, placeFilter, sortBy, today])

  // 현재 페이지에 해당하는 데이터
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredEvents, currentPage, itemsPerPage])

  // DB 데이터 로드
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // 먼저 tour_festivals에서 데이터 시도
        const tourResult = await getTourFestivals(true, 1, 1000)
        
        if (tourResult.success && tourResult.items.length > 0) {
          // TourAPI 데이터 사용
          const formattedEvents = tourResult.items.map((item, index) => ({
            id: item.id || item.content_id || index + 1,
            contentId: item.content_id,
            title: item.title,
            title_en: item.title_en, // 영어 제목
            theme: '', // TourAPI에는 테마가 없음
            place: '',
            placeDetail: item.addr1 || item.addr2,
            placeDetail_en: item.addr1_en, // 영어 주소
            beginDate: item.event_start_date 
              ? `${item.event_start_date.slice(0, 4)}-${item.event_start_date.slice(4, 6)}-${item.event_start_date.slice(6, 8)}`
              : '',
            endDate: item.event_end_date
              ? `${item.event_end_date.slice(0, 4)}-${item.event_end_date.slice(4, 6)}-${item.event_end_date.slice(6, 8)}`
              : '',
            image: getReliableImageUrl(item.firstimage || item.firstimage2, '/images/no-image.svg'),
            tel: item.tel,
            overview: item.overview,
            overview_en: item.overview_en, // 영어 설명
            mapx: item.mapx,
            mapy: item.mapy,
            intro_info: item.intro_info, // 소개정보 (주최, 공연시간, 이용요금 등)
            _source: 'tourapi'
          }))
          setAllEvents(formattedEvents)
        } else {
          // tour_festivals에 데이터가 없으면 기존 festivals 테이블 시도
          const dbResult = await getAllDbData('festival')
          
          if (dbResult.success && dbResult.items.length > 0) {
            const formattedEvents = dbResult.items.map((item, index) => ({
              id: item._id || item.eventSeq || index + 1,
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
              isRecommended: item.recommendationYn === 'Y',
              image: item.imageUrl
            }))
            setAllEvents(formattedEvents)
          } else {
            setError(t.common.syncRequired)
          }
        }
      } catch (err) {
        console.error('행사 데이터 로드 실패:', err)
        setError(t.common.loadFailed)
      }
      
      setLoading(false)
    }

    loadEvents()
  }, [language, t.common.syncRequired, t.common.loadFailed])
  
  // DB에서 공연 데이터 로드
  useEffect(() => {
    const loadPerformances = async () => {
      if (activeTab !== 'performance') return
      
      setPerformanceLoading(true)
      setPerformanceError(null)
      
      try {
        // DB에서 활성화된 공연만 불러오기
        const dbPerformances = await getDbPerformances(true)
        
        if (dbPerformances && dbPerformances.length > 0) {
          // 검색어가 있으면 필터링
          let filteredPerformances = dbPerformances
          
          if (performanceSearchQuery.length >= 2) {
            const query = performanceSearchQuery.toLowerCase()
            filteredPerformances = dbPerformances.filter(p => 
              p.title?.toLowerCase().includes(query) ||
              p.event_site?.toLowerCase().includes(query) ||
              p.type?.toLowerCase().includes(query)
            )
          }
          
          // DB 데이터를 API 형식으로 변환
          const performanceData = filteredPerformances.map(p => ({
            title: p.title,
            type: p.type,
            eventPeriod: p.event_period,
            eventSite: p.event_site,
            charge: p.charge,
            contactPoint: p.contact_point,
            url: p.url,
            imageObject: p.image_url,
            description: p.description,
            viewCount: p.view_count
          }))
          
          // 시작일 기준 정렬 (가까운 날짜순)
          performanceData.sort((a, b) => {
            const aStart = parseInt((a.eventPeriod?.split(' ~ ')[0]?.trim()) || '99999999')
            const bStart = parseInt((b.eventPeriod?.split(' ~ ')[0]?.trim()) || '99999999')
            return aStart - bStart
          })
          
          setPerformances(performanceData)
        } else {
          setPerformances([])
          if (performanceSearchQuery.length >= 2) {
            setPerformanceError(t.common.noResults)
          } else {
            setPerformanceError(language === 'ko' ? '등록된 공연이 없습니다. 관리자에게 문의하세요.' : 'No performances available.')
          }
        }
      } catch (err) {
        console.error('공연 로드 실패:', err)
        setPerformanceError(t.common.loadFailed)
      }
      
      setPerformanceLoading(false)
    }
    
    loadPerformances()
  }, [activeTab, performanceSearchQuery, language, t.common.noResults, t.common.loadFailed])
  
  // 탭 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
    setPerformancePage(1)
  }, [activeTab])
  
  // 현재 페이지에 해당하는 공연 데이터
  const paginatedPerformances = useMemo(() => {
    const startIndex = (performancePage - 1) * performanceItemsPerPage
    return performances.slice(startIndex, startIndex + performanceItemsPerPage)
  }, [performances, performancePage])
  
  const totalPerformancePages = Math.ceil(performances.length / performanceItemsPerPage)
  
  // 공연 날짜 포맷
  const formatPerformanceDate = (dateStr) => {
    if (!dateStr) return ''
    // 20260123 형식을 2026.01.23 형식으로 변환
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`
    }
    return dateStr
  }
  
  // 공연 기간 파싱
  const parseEventPeriod = (period) => {
    if (!period) return { start: '', end: '' }
    const parts = period.split(' ~ ')
    return {
      start: formatPerformanceDate(parts[0]?.trim()),
      end: formatPerformanceDate(parts[1]?.trim())
    }
  }

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
        {/* 탭 네비게이션 */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'festival' ? 'active' : ''}`}
            onClick={() => setActiveTab('festival')}
          >
            <FiCalendar />
            {t.pages.festival.festivals}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            <FiMusic />
            {t.pages.festival.performances}
          </button>
        </div>
        
        {/* 축제/행사 탭 */}
        {activeTab === 'festival' && (
          <>
            {loading ? (
              <div className="loading-container">
                <FiLoader className="loading-spinner" />
                <p>{t.pages.festival.loadingEvents}</p>
              </div>
            ) : error ? (
              <div className="error-container">
                <p>{error}</p>
              </div>
            ) : (
              <>
                {/* 필터 섹션 */}
                <div className="filter-section">
                  {availableThemes.length > 0 && (
                    <div className="theme-filters">
                      <span className="filter-label">{t.pages.festival.theme}:</span>
                      <div className="theme-buttons">
                        <button
                          className={`festival-theme-btn ${themeFilter === 'all' ? 'active' : ''}`}
                          onClick={() => setThemeFilter('all')}
                        >
                          {t.common.all}
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
                  
                  {availablePlaces.length > 0 && (
                    <div className="place-filters">
                      <span className="filter-label">{t.pages.festival.place}:</span>
                      <div className="place-buttons">
                        <button
                          className={`place-btn ${placeFilter === 'all' ? 'active' : ''}`}
                          onClick={() => setPlaceFilter('all')}
                        >
                          {t.common.all}
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
                
                {/* 정렬 + 개수 표시 */}
                <div className="sort-count-row">
                  <div className="sort-buttons">
                    <button
                      className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
                      onClick={() => setSortBy('name')}
                    >
                      {t.ui.sortByName}
                    </button>
                    <button
                      className={`sort-btn ${sortBy === 'views' ? 'active' : ''}`}
                      onClick={() => setSortBy('views')}
                    >
                      {t.ui.sortByViews}
                    </button>
                  </div>
                  <div className="events-count">
                    {t.common.total} <strong>{filteredEvents.length.toLocaleString()}</strong> {t.pages.festival.events}
                  </div>
                </div>
                
                {filteredEvents.length === 0 ? (
                  <div className="events-empty">
                    <FiCalendar className="empty-icon" />
                    <p>{t.pages.festival.noEvents}</p>
                  </div>
                ) : (
                  <div className="festival-grid">
                    {paginatedEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="event-card"
                      onClick={() => event.contentId ? navigate(`/spot/${event.contentId}`) : setSelectedEvent(event)}
                    >
                      <div className="event-image">
                        <img 
                          src={`https://picsum.photos/seed/${encodeURIComponent(event.title)}/800/500`}
                          alt={language === 'en' && event.title_en ? event.title_en : event.title}
                          loading="lazy"
                          onError={(e) => { e.target.src = '/images/no-image.svg' }}
                        />
                        <div className="event-badges">
                          <span className="theme-badge">{event.theme}</span>
                          {event.isHot && <span className="hot-badge"><Icons.fire size={14} /> HOT</span>}
                          {event.isRecommended && <span className="rec-badge"><Icons.star size={14} /> {t.ui.recommended}</span>}
                        </div>
                        <div className="event-overlay">
                          <FiInfo className="info-icon" />
                          <span>{t.common.viewDetails}</span>
                        </div>
                      </div>
                      <div className="event-content">
                        <h3 className="event-title">{language === 'en' && event.title_en ? event.title_en : event.title}</h3>
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
                            <span>{event.place} {event.placeDetail && `(${language === 'en' && event.placeDetail_en ? event.placeDetail_en : event.placeDetail})`}</span>
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
                            {t.pages.festival.organizedBy}: {event.management}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>
                )}
                
                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      className="page-btn"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      {t.ui.prev}
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
                      {t.ui.next}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
        
        {/* 문화공연 탭 */}
        {activeTab === 'performance' && (
          <>
            {performanceLoading ? (
              <div className="loading-container">
                <FiLoader className="loading-spinner" />
                <p>{t.pages.festival.loadingEvents}</p>
              </div>
            ) : performanceError ? (
              <div className="error-container">
                <p>{performanceError}</p>
              </div>
            ) : (
              <>
                <div className="performance-info-banner">
                  <FiInfo />
                  <span>{language === 'ko' ? 'KCISA(한국문화정보원) 제공 대전 지역 공연 정보입니다.' : 'Performance information provided by KCISA for Daejeon area.'}</span>
                </div>
                
                <div className="events-count">
                  {t.common.total} <strong>{performances.length.toLocaleString()}</strong> {t.pages.festival.performances}
                </div>
                
                <div className="festival-grid">
                  {paginatedPerformances.map((perf, index) => {
                    const period = parseEventPeriod(perf.eventPeriod)
                    return (
                      <div 
                        key={index} 
                        className="event-card performance-card"
                        onClick={() => setSelectedPerformance(perf)}
                      >
                        <div className="event-image">
                          <img 
                            src={perf.imageObject || '/images/no-image.svg'}
                            alt={perf.title}
                            loading="lazy"
                            onError={(e) => { e.target.src = '/images/no-image.svg' }}
                          />
                          <div className="event-badges">
                            <span className="theme-badge performance-badge">
                              <FiMusic /> {language === 'ko' ? '공연' : 'Performance'}
                            </span>
                          </div>
                          <div className="event-overlay">
                            <FiInfo className="info-icon" />
                            <span>{language === 'ko' ? '상세보기' : 'View Details'}</span>
                          </div>
                        </div>
                        <div className="event-content">
                          <h3 className="event-title">{perf.title?.replace(/\[대전\]\s*/gi, '').replace(/\[대전 서구\]\s*/gi, '')}</h3>
                          <div className="event-info">
                            <div className="info-item">
                              <FiCalendar />
                              <span>{period.start}{period.end && period.start !== period.end ? ` ~ ${period.end}` : ''}</span>
                            </div>
                            {perf.eventSite && (
                              <div className="info-item">
                                <FiMapPin />
                                <span>{perf.eventSite}</span>
                              </div>
                            )}
                            {perf.contactPoint && (
                              <div className="info-item">
                                <FiPhone />
                                <span>{perf.contactPoint}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* 공연 페이지네이션 */}
                {totalPerformancePages > 1 && (
                  <div className="pagination">
                    <button 
                      className="page-btn"
                      onClick={() => setPerformancePage(p => Math.max(1, p - 1))}
                      disabled={performancePage === 1}
                    >
                      {language === 'ko' ? '이전' : 'Prev'}
                    </button>
                    <div className="page-numbers">
                      {Array.from({ length: Math.min(5, totalPerformancePages) }, (_, i) => {
                        let pageNum
                        if (totalPerformancePages <= 5) {
                          pageNum = i + 1
                        } else if (performancePage <= 3) {
                          pageNum = i + 1
                        } else if (performancePage >= totalPerformancePages - 2) {
                          pageNum = totalPerformancePages - 4 + i
                        } else {
                          pageNum = performancePage - 2 + i
                        }
                        return (
                          <button
                            key={pageNum}
                            className={`page-num ${performancePage === pageNum ? 'active' : ''}`}
                            onClick={() => setPerformancePage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    <button 
                      className="page-btn"
                      onClick={() => setPerformancePage(p => Math.min(totalPerformancePages, p + 1))}
                      disabled={performancePage === totalPerformancePages}
                    >
                      {language === 'ko' ? '다음' : 'Next'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      
      {/* 축제 상세 정보 모달 */}
      {selectedEvent && (
        <div className="modal-overlay festival-modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <FiX />
            </button>
            <div className="modal-header">
              <div className="modal-image">
                <img 
                  src={`https://picsum.photos/seed/${encodeURIComponent(selectedEvent.title)}/1200/600`}
                  alt={selectedEvent.title}
                  onError={(e) => { e.target.src = '/images/no-image.svg' }}
                />
                <div className="modal-badges">
                  <span className="theme-badge">{selectedEvent.theme}</span>
                  {selectedEvent.isHot && <span className="hot-badge"><Icons.fire size={14} /> HOT</span>}
                  {selectedEvent.isRecommended && <span className="rec-badge"><Icons.star size={14} /> {language === 'ko' ? '추천' : 'Recommended'}</span>}
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
                
                {/* intro_info에서 주최/주관 정보 */}
                {selectedEvent.intro_info?.sponsor1 && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <FiInfo />
                      {language === 'ko' ? '주최' : 'Sponsor'}
                    </div>
                    <div className="detail-value">
                      <p dangerouslySetInnerHTML={{ 
                        __html: sanitizeIntroHtml(selectedEvent.intro_info.sponsor1)
                      }} />
                    </div>
                  </div>
                )}
                
                {/* 공연/행사 시간 */}
                {selectedEvent.intro_info?.playtime && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <FiClock />
                      {language === 'ko' ? '공연시간' : 'Play Time'}
                    </div>
                    <div className="detail-value">
                      <p dangerouslySetInnerHTML={{ 
                        __html: sanitizeIntroHtml(selectedEvent.intro_info.playtime)
                      }} />
                    </div>
                  </div>
                )}
                
                {/* 이용요금 */}
                {selectedEvent.intro_info?.usetimefestival && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <span><Icons.money size={16} /></span>
                      {language === 'ko' ? '이용요금' : 'Fee'}
                    </div>
                    <div className="detail-value">
                      <p dangerouslySetInnerHTML={{ 
                        __html: sanitizeIntroHtml(selectedEvent.intro_info.usetimefestival)
                      }} />
                    </div>
                  </div>
                )}
                
                {/* 예매처 */}
                {selectedEvent.intro_info?.bookingplace && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <span><Icons.ticket size={16} /></span>
                      {language === 'ko' ? '예매처' : 'Booking'}
                    </div>
                    <div className="detail-value">
                      <p dangerouslySetInnerHTML={{ 
                        __html: sanitizeIntroHtml(selectedEvent.intro_info.bookingplace)
                      }} />
                    </div>
                  </div>
                )}
                
                {/* 관람 연령 제한 */}
                {selectedEvent.intro_info?.agelimit && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <FiUser />
                      {language === 'ko' ? '관람연령' : 'Age Limit'}
                    </div>
                    <div className="detail-value">
                      <p>{cleanIntroHtml(selectedEvent.intro_info.agelimit)}</p>
                    </div>
                  </div>
                )}
                
                {/* 주최/주관 연락처 */}
                {(selectedEvent.tel || selectedEvent.intro_info?.sponsor1tel) && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <FiPhone />
                      {language === 'ko' ? '문의' : 'Contact'}
                    </div>
                    <div className="detail-value">
                      <p>{cleanIntroHtml(selectedEvent.tel || selectedEvent.intro_info?.sponsor1tel)}</p>
                    </div>
                  </div>
                )}
                
                {/* 개요/설명 */}
                {selectedEvent.overview && (
                  <div className="detail-row overview-row">
                    <div className="detail-label">
                      <FiInfo />
                      {language === 'ko' ? '행사소개' : 'About'}
                    </div>
                    <div className="detail-value">
                      <p dangerouslySetInnerHTML={{ 
                        __html: selectedEvent.overview.replace(/<br\s*\/?>/gi, '<br/>') 
                      }} />
                    </div>
                  </div>
                )}
              </div>
              
              {/* 저작권 라이선스 표시 */}
              <LicenseBadge type="kto" />
              
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
      
      {/* 공연 상세 정보 모달 */}
      {selectedPerformance && (
        <div className="modal-overlay festival-modal" onClick={() => setSelectedPerformance(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedPerformance(null)}>
              <FiX />
            </button>
            <div className="modal-header">
              <div className="modal-image">
                <img 
                  src={selectedPerformance.imageObject || '/images/no-image.svg'}
                  alt={selectedPerformance.title}
                  onError={(e) => { e.target.src = '/images/no-image.svg' }}
                />
                <div className="modal-badges">
                  <span className="theme-badge performance-badge">
                    <FiMusic /> {language === 'ko' ? '공연' : 'Performance'}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-body">
              <h2 className="modal-title">{selectedPerformance.title?.replace(/\[대전\]\s*/gi, '').replace(/\[대전 서구\]\s*/gi, '')}</h2>
              <div className="modal-details">
                <div className="detail-row">
                  <div className="detail-label">
                    <FiCalendar />
                    {language === 'ko' ? '공연기간' : 'Period'}
                  </div>
                  <div className="detail-value">
                    <p>{(() => {
                      const period = parseEventPeriod(selectedPerformance.eventPeriod)
                      return `${period.start}${period.end && period.start !== period.end ? ` ~ ${period.end}` : ''}`
                    })()}</p>
                  </div>
                </div>
                {selectedPerformance.eventSite && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <FiMapPin />
                      {language === 'ko' ? '공연장소' : 'Venue'}
                    </div>
                    <div className="detail-value">
                      <p className="venue-main">{selectedPerformance.eventSite}</p>
                    </div>
                  </div>
                )}
                {selectedPerformance.contactPoint && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <FiPhone />
                      {language === 'ko' ? '문의' : 'Contact'}
                    </div>
                    <div className="detail-value">
                      <p>{selectedPerformance.contactPoint}</p>
                    </div>
                  </div>
                )}
                {selectedPerformance.charge && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <FiInfo />
                      {language === 'ko' ? '요금' : 'Price'}
                    </div>
                    <div className="detail-value">
                      <p className="charge-info">{selectedPerformance.charge}</p>
                    </div>
                  </div>
                )}
                {selectedPerformance.description && (
                  <div className="detail-row description-row">
                    <div className="detail-label">
                      <FiInfo />
                      {language === 'ko' ? '공연소개' : 'Description'}
                    </div>
                    <div className="detail-value">
                      <div 
                        className="performance-description"
                        dangerouslySetInnerHTML={{ 
                          __html: selectedPerformance.description
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&amp;/g, '&')
                            .replace(/&quot;/g, '"')
                            .replace(/&nbsp;/g, ' ')
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* 저작권 라이선스 표시 - KCISA */}
              <LicenseBadge type="kcisa" />
              
              <div className="modal-actions">
                {selectedPerformance.url && (
                  <a 
                    href={selectedPerformance.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    <FiExternalLink /> {language === 'ko' ? '상세정보 보기' : 'View Details'}
                  </a>
                )}
                <button className="btn-secondary" onClick={() => setSelectedPerformance(null)}>
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
