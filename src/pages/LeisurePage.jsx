import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMapPin, FiClock, FiLoader, FiX, FiCamera, FiPhone, FiNavigation, FiPlus, FiCalendar, FiCheck, FiSun } from 'react-icons/fi'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getTourSpots as getTourSpotsDb } from '../services/dbService'
import { getUserTripPlans, addTripPlace } from '../services/tripService'
import { handleImageError, getReliableImageUrl, cleanIntroHtml } from '../utils/imageUtils'
import { DISTRICTS, extractDistrict } from '../utils/constants'
import './LeisurePage.css'

const LeisurePage = () => {
  const { language, t } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [allSpots, setAllSpots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [districtFilter, setDistrictFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name') // 정렬 기준: 'name' | 'views'
  const itemsPerPage = 12

  // 상세 모달 상태
  const [selectedSpot, setSelectedSpot] = useState(null)
  
  // 내 여행에 추가 모달 상태
  const [showAddToTripModal, setShowAddToTripModal] = useState(false)
  const [spotToAdd, setSpotToAdd] = useState(null)
  const [tripPlans, setTripPlans] = useState([])
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [selectedDayId, setSelectedDayId] = useState(null)
  const [tripsLoading, setTripsLoading] = useState(false)
  const [addingToTrip, setAddingToTrip] = useState(false)

  // 구/정렬 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [districtFilter, sortBy])

  // 구별 필터링 + 정렬
  const filteredSpots = useMemo(() => {
    let data = districtFilter === 'all' 
      ? allSpots 
      : allSpots.filter(item => {
          const district = extractDistrict(item.address)
          return district === districtFilter
        })
    
    // 정렬 적용
    if (sortBy === 'name') {
      data = [...data].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'))
    } else if (sortBy === 'views') {
      data = [...data].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    }
    
    return data
  }, [allSpots, districtFilter, sortBy])

  // 현재 페이지에 해당하는 데이터
  const paginatedSpots = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredSpots.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredSpots, currentPage, itemsPerPage])

  // 상세 모달 열기
  const openSpotDetail = (spot) => {
    setSelectedSpot(spot)
  }

  // 모달 닫기
  const closeSpotDetail = () => {
    setSelectedSpot(null)
  }
  
  // 내 여행에 추가 모달 열기
  const openAddToTripModal = async (spot) => {
    setSpotToAdd(spot)
    setShowAddToTripModal(true)
    setSelectedTripId(null)
    setSelectedDayId(null)
    
    setTripsLoading(true)
    try {
      const result = await getUserTripPlans(user?.id || 'anonymous')
      if (result.success) {
        setTripPlans(result.plans)
      }
    } catch (err) {
      console.error('Failed to load trips:', err)
    }
    setTripsLoading(false)
  }
  
  // 내 여행에 추가 모달 닫기
  const closeAddToTripModal = () => {
    setShowAddToTripModal(false)
    setSpotToAdd(null)
    setSelectedTripId(null)
    setSelectedDayId(null)
  }
  
  // 선택된 여행의 일차 목록
  const selectedTripDays = useMemo(() => {
    if (!selectedTripId) return []
    const trip = tripPlans.find(t => t.id === selectedTripId)
    return trip?.days || []
  }, [selectedTripId, tripPlans])
  
  // 여행에 장소 추가
  const handleAddToTrip = async () => {
    if (!selectedDayId || !spotToAdd) return
    
    setAddingToTrip(true)
    try {
      const result = await addTripPlace({
        dayId: selectedDayId,
        placeType: 'leisure',
        placeName: spotToAdd.title,
        placeAddress: spotToAdd.address,
        placeDescription: spotToAdd.overview,
        placeImage: spotToAdd.image,
        orderIndex: 999,
        visitTime: null,
        memo: null
      })
      
      if (result.success) {
        alert(t.common.addedToTrip)
        setShowTripModal(false)
      } else {
        alert(result.error || t.common.addFailed)
      }
    } catch (err) {
      alert(t.common.errorOccurred)
    }
    setAddingToTrip(false)
  }

  // DB에서 데이터 로드 (tour_spots contentTypeId=28)
  useEffect(() => {
    const loadSpots = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // tour_spots에서 레포츠(28) 데이터 가져오기
        const result = await getTourSpotsDb('28', 1, 1000)
        
        if (result.success && result.items.length > 0) {
          const formattedSpots = result.items.map((item, index) => ({
            id: item.id || item.content_id || index + 1,
            contentId: item.content_id,
            title: item.title,
            address: item.addr1 || item.addr2 || '',
            overview: item.overview || '',
            phone: item.tel,
            image: getReliableImageUrl(item.firstimage || item.firstimage2, '/images/no-image.svg'),
            mapx: item.mapx,
            mapy: item.mapy,
            homepage: item.homepage,
            contentTypeId: item.content_type_id,
            intro_info: item.intro_info // 소개정보 (이용시간, 이용요금, 주차 등)
          }))
          setAllSpots(formattedSpots)
        } else {
          setError(t.common.syncRequired)
        }
      } catch (err) {
        console.error('레포츠 데이터 로드 실패:', err)
        setError(t.common.loadFailed)
      }
      
      setLoading(false)
    }

    loadSpots()
  }, [language, t])

  const totalPages = Math.ceil(filteredSpots.length / itemsPerPage)

  return (
    <div className="leisure-page">
      <div className="page-hero leisure-hero">
        <div className="page-hero-content">
          <h1><FiSun /> {t.pages.leisure.title}</h1>
          <p>{t.pages.leisure.subtitle}</p>
        </div>
      </div>
      
      <div className="container">
        {loading ? (
          <div className="loading-container">
            <FiLoader className="loading-spinner" />
            <p>{t.pages.leisure.loading}</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* 구 필터 */}
            <div className="location-filters">
              <div className="district-buttons">
                {DISTRICTS.map(d => (
                  <button
                    key={d.id}
                    className={`district-btn ${districtFilter === d.id ? 'active' : ''}`}
                    onClick={() => setDistrictFilter(d.id)}
                  >
                    {language === 'ko' ? d.ko : d.en}
                  </button>
                ))}
              </div>
            </div>

            {/* 정렬 + 결과 수 */}
            <div className="sort-count-row">
              <div className="sort-buttons">
                <button
                  className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => setSortBy('name')}
                >
                  {t.pages.leisure.sortByName}
                </button>
                <button
                  className={`sort-btn ${sortBy === 'views' ? 'active' : ''}`}
                  onClick={() => setSortBy('views')}
                >
                  {t.pages.leisure.sortByViews}
                </button>
              </div>
              <div className="results-count">
                {language === 'ko' 
                  ? `총 ${filteredSpots.length}개의 레포츠 시설`
                  : `${filteredSpots.length} leisure spots found`}
              </div>
            </div>

            {/* 레포츠 카드 그리드 */}
            <div className="leisure-grid">
              {paginatedSpots.map((spot) => (
                <div key={spot.id} className="leisure-card" onClick={() => navigate(`/spot/${spot.contentId}`)}>
                  <div className="leisure-card-image">
                    {spot.image ? (
                      <img 
                        src={spot.image} 
                        alt={spot.title} 
                        loading="lazy"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="no-image">
                        <FiCamera />
                        <span>{t.common.noImage}</span>
                      </div>
                    )}
                  </div>
                  <div className="leisure-card-content">
                    <h3>{spot.title}</h3>
                    <p className="spot-address">
                      <FiMapPin />
                      <span>{spot.address || t.common.noAddress}</span>
                    </p>
                    {spot.phone && (
                      <p className="leisure-phone">
                        <FiPhone />
                        <span>{spot.phone}</span>
                      </p>
                    )}
                  </div>
                  {user && (
                    <button 
                      className="add-to-trip-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        openAddToTripModal(spot)
                      }}
                    >
                      <FiPlus />
                    </button>
                  )}
                </div>
              ))}
            </div>

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
      </div>

      {/* 상세 정보 모달 */}
      {selectedSpot && (
        <div className="modal-overlay" onClick={closeSpotDetail}>
          <div className="spot-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeSpotDetail}>
              <FiX />
            </button>
            
            <div className="modal-content">
              <div className="modal-image">
                {selectedSpot.image ? (
                  <img src={selectedSpot.image} alt={selectedSpot.title} onError={handleImageError} />
                ) : (
                  <div className="no-image large">
                    <FiCamera size={48} />
                    <span>{t.common.noImage}</span>
                  </div>
                )}
              </div>
              
              <div className="modal-info">
                <h2>{selectedSpot.title}</h2>
                
                <div className="info-item">
                  <FiMapPin className="info-icon" />
                  <span>{selectedSpot.address || t.common.noAddress}</span>
                </div>
                
                {/* 이용시간: intro_info.usetimeleports */}
                {selectedSpot.intro_info?.usetimeleports && (
                  <div className="info-item">
                    <FiClock className="info-icon" />
                    <span>{cleanIntroHtml(selectedSpot.intro_info.usetimeleports, ' / ')}</span>
                  </div>
                )}
                
                {/* 쉬는날: intro_info.restdateleports */}
                {selectedSpot.intro_info?.restdateleports && (
                  <div className="info-item rest-day">
                    <span>📅 {t.pages.leisure.closed}: </span>
                    <span>{cleanIntroHtml(selectedSpot.intro_info.restdateleports, ', ')}</span>
                  </div>
                )}
                
                {/* 이용요금: intro_info.usefeeleports */}
                {selectedSpot.intro_info?.usefeeleports && (
                  <div className="info-item">
                    <span>💰 </span>
                    <span>{cleanIntroHtml(selectedSpot.intro_info.usefeeleports, ' / ')}</span>
                  </div>
                )}
                
                {/* 전화번호: intro_info.infocenterleports 또는 기존 phone */}
                {(selectedSpot.phone || selectedSpot.intro_info?.infocenterleports) && (
                  <div className="info-item">
                    <FiPhone className="info-icon" />
                    <a href={`tel:${cleanIntroHtml(selectedSpot.phone || selectedSpot.intro_info?.infocenterleports).replace(/-/g, '')}`}>
                      {cleanIntroHtml(selectedSpot.phone || selectedSpot.intro_info?.infocenterleports)}
                    </a>
                  </div>
                )}
                
                {/* 주차시설: intro_info.parkingleports */}
                {selectedSpot.intro_info?.parkingleports && (
                  <div className="info-item parking">
                    <span>🅿️ {cleanIntroHtml(selectedSpot.intro_info.parkingleports)}</span>
                  </div>
                )}
                
                {selectedSpot.overview && (
                  <div className="info-description">
                    <p>{selectedSpot.overview}</p>
                  </div>
                )}
                
                <div className="modal-actions">
                  {selectedSpot.address && (
                    <a 
                      href={`https://map.kakao.com/link/search/${encodeURIComponent(selectedSpot.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-btn map"
                    >
                      <FiNavigation /> {t.pages.leisure.directions}
                    </a>
                  )}
                  
                  {user && (
                    <button 
                      className="action-btn add"
                      onClick={() => {
                        closeSpotDetail()
                        openAddToTripModal(selectedSpot)
                      }}
                    >
                      <FiPlus /> {t.common.addToTrip}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 내 여행에 추가 모달 */}
      {showAddToTripModal && spotToAdd && (
        <div className="modal-overlay" onClick={closeAddToTripModal}>
          <div className="add-trip-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeAddToTripModal}>
              <FiX />
            </button>
            
            <h2>{t.common.addToTrip}</h2>
            <p className="adding-spot-name">{spotToAdd.title}</p>
            
            {tripsLoading ? (
              <div className="loading-trips">
                <FiLoader className="loading-spinner" />
                <p>{t.ui.loading}</p>
              </div>
            ) : tripPlans.length === 0 ? (
              <div className="no-trips">
                <FiCalendar size={32} />
                <p>{t.common.noTrips}</p>
                <p className="sub-text">
                  {t.common.addDaysHint}
                </p>
              </div>
            ) : (
              <>
                <div className="trip-select-section">
                  <h3>1. {t.common.selectTrip}</h3>
                  <div className="trip-list">
                    {tripPlans.map(trip => (
                      <div 
                        key={trip.id}
                        className={`trip-item ${selectedTripId === trip.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedTripId(trip.id)
                          setSelectedDayId(null)
                        }}
                      >
                        <span className="trip-title">{trip.title}</span>
                        <span className="trip-days">{trip.days?.length || 0} {t.trip.days}</span>
                        {selectedTripId === trip.id && <FiCheck className="check-icon" />}
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedTripId && selectedTripDays.length > 0 && (
                  <div className="day-select-section">
                    <h3>2. {t.common.selectDay}</h3>
                    <div className="day-list">
                      {selectedTripDays.map((day, index) => (
                        <div 
                          key={day.id}
                          className={`day-item ${selectedDayId === day.id ? 'selected' : ''}`}
                          onClick={() => setSelectedDayId(day.id)}
                        >
                          <span className="day-number">Day {index + 1}</span>
                          {day.date && <span className="day-date">{day.date}</span>}
                          {selectedDayId === day.id && <FiCheck className="check-icon" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTripId && selectedTripDays.length === 0 && (
                  <div className="no-trips">
                    <p>{t.common.noDaysInTrip}</p>
                    <p className="hint">{t.common.addDaysHint}</p>
                  </div>
                )}
                
                <button 
                  className="confirm-add-btn"
                  onClick={handleAddToTrip}
                  disabled={!selectedDayId || addingToTrip}
                >
                  {addingToTrip ? (
                    <><FiLoader className="loading-spinner" /> {t.ui.loading}</>
                  ) : (
                    <><FiPlus /> {t.ui.add}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default LeisurePage
