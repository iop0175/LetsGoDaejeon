import { useState, useEffect, useMemo } from 'react'
import { FiMapPin, FiClock, FiLoader, FiX, FiCamera, FiPhone, FiExternalLink, FiNavigation, FiPlus, FiCalendar, FiCheck, FiSun } from 'react-icons/fi'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getTourSpots as getTourSpotsDb } from '../services/dbService'
import { getUserTripPlans, addTripPlace } from '../services/tripService'
import { handleImageError, getReliableImageUrl } from '../utils/imageUtils'
import './LeisurePage.css'

// 대전시 구 목록
const DISTRICTS = [
  { id: 'all', ko: '전체 지역', en: 'All Districts' },
  { id: '동구', ko: '동구', en: 'Dong-gu' },
  { id: '중구', ko: '중구', en: 'Jung-gu' },
  { id: '서구', ko: '서구', en: 'Seo-gu' },
  { id: '유성구', ko: '유성구', en: 'Yuseong-gu' },
  { id: '대덕구', ko: '대덕구', en: 'Daedeok-gu' }
]

const LeisurePage = () => {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [allSpots, setAllSpots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [districtFilter, setDistrictFilter] = useState('all')
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

  // 주소에서 구 추출
  const extractDistrict = (address) => {
    if (!address) return null
    const match = address.match(/(동구|중구|서구|유성구|대덕구)/)
    return match ? match[1] : null
  }

  // 구 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [districtFilter])

  // 구별 필터링
  const filteredSpots = useMemo(() => {
    if (districtFilter === 'all') return allSpots
    
    return allSpots.filter(item => {
      const district = extractDistrict(item.address)
      return district === districtFilter
    })
  }, [allSpots, districtFilter])

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
        alert(language === 'ko' ? '여행에 추가되었습니다!' : 'Added to your trip!')
        closeAddToTripModal()
      } else {
        alert(result.error || (language === 'ko' ? '추가에 실패했습니다.' : 'Failed to add.'))
      }
    } catch (err) {
      alert(language === 'ko' ? '오류가 발생했습니다.' : 'An error occurred.')
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
            contentTypeId: item.content_type_id
          }))
          setAllSpots(formattedSpots)
        } else {
          setError(language === 'ko' 
            ? '레포츠 데이터가 없습니다. 관리자 페이지에서 TourAPI 데이터를 먼저 동기화해주세요.' 
            : 'No leisure data. Please sync TourAPI data from admin page first.')
        }
      } catch (err) {
        console.error('레포츠 데이터 로드 실패:', err)
        setError(language === 'ko' ? '데이터를 불러오는데 실패했습니다.' : 'Failed to load data.')
      }
      
      setLoading(false)
    }

    loadSpots()
  }, [language])

  const totalPages = Math.ceil(filteredSpots.length / itemsPerPage)

  return (
    <div className="leisure-page">
      <div className="page-hero leisure-hero">
        <div className="page-hero-content">
          <h1><FiSun /> {language === 'ko' ? '레포츠' : 'Leisure & Sports'}</h1>
          <p>{language === 'ko' ? '대전의 다양한 레포츠 시설과 액티비티를 즐겨보세요' : 'Enjoy various leisure facilities and activities in Daejeon'}</p>
        </div>
      </div>
      
      <div className="container">
        {loading ? (
          <div className="loading-container">
            <FiLoader className="loading-spinner" />
            <p>{language === 'ko' ? '레포츠 정보를 불러오는 중...' : 'Loading leisure spots...'}</p>
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

            {/* 결과 수 */}
            <div className="results-count">
              {language === 'ko' 
                ? `총 ${filteredSpots.length}개의 레포츠 시설`
                : `${filteredSpots.length} leisure spots found`}
            </div>

            {/* 레포츠 카드 그리드 */}
            <div className="leisure-grid">
              {paginatedSpots.map((spot) => (
                <div key={spot.id} className="leisure-card" onClick={() => openSpotDetail(spot)}>
                  <div className="leisure-card-image">
                    {spot.image ? (
                      <img 
                        src={spot.image} 
                        alt={spot.title} 
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="no-image">
                        <FiCamera />
                        <span>{language === 'ko' ? '이미지 없음' : 'No Image'}</span>
                      </div>
                    )}
                  </div>
                  <div className="leisure-card-content">
                    <h3>{spot.title}</h3>
                    <p className="leisure-address">
                      <FiMapPin />
                      <span>{spot.address || (language === 'ko' ? '주소 정보 없음' : 'No address')}</span>
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
                    <span>{language === 'ko' ? '이미지 없음' : 'No Image'}</span>
                  </div>
                )}
              </div>
              
              <div className="modal-info">
                <h2>{selectedSpot.title}</h2>
                
                <div className="info-item">
                  <FiMapPin className="info-icon" />
                  <span>{selectedSpot.address || (language === 'ko' ? '주소 정보 없음' : 'No address')}</span>
                </div>
                
                {selectedSpot.phone && (
                  <div className="info-item">
                    <FiPhone className="info-icon" />
                    <a href={`tel:${selectedSpot.phone.replace(/-/g, '')}`}>{selectedSpot.phone}</a>
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
                      <FiNavigation /> {language === 'ko' ? '길찾기' : 'Directions'}
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
                      <FiPlus /> {language === 'ko' ? '내 여행에 추가' : 'Add to Trip'}
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
            
            <h2>{language === 'ko' ? '내 여행에 추가' : 'Add to My Trip'}</h2>
            <p className="adding-spot-name">{spotToAdd.title}</p>
            
            {tripsLoading ? (
              <div className="loading-trips">
                <FiLoader className="loading-spinner" />
                <p>{language === 'ko' ? '여행 목록 불러오는 중...' : 'Loading trips...'}</p>
              </div>
            ) : tripPlans.length === 0 ? (
              <div className="no-trips">
                <FiCalendar size={32} />
                <p>{language === 'ko' ? '추가할 수 있는 여행이 없습니다.' : 'No trips available.'}</p>
                <p className="sub-text">
                  {language === 'ko' ? '먼저 내 여행 페이지에서 새 여행을 만들어주세요.' : 'Please create a new trip first.'}
                </p>
              </div>
            ) : (
              <>
                <div className="trip-select-section">
                  <h3>{language === 'ko' ? '1. 여행 선택' : '1. Select Trip'}</h3>
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
                        <span className="trip-days">{trip.days?.length || 0}{language === 'ko' ? '일' : ' days'}</span>
                        {selectedTripId === trip.id && <FiCheck className="check-icon" />}
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedTripId && selectedTripDays.length > 0 && (
                  <div className="day-select-section">
                    <h3>{language === 'ko' ? '2. 일차 선택' : '2. Select Day'}</h3>
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
                    <p>{language === 'ko' ? '선택한 여행에 일정이 없습니다.' : 'No days in the selected trip.'}</p>
                    <p className="hint">
                      {language === 'ko'
                        ? '"나의 여행" 페이지에서 일정을 먼저 추가해주세요.'
                        : 'Please add days in the "My Trip" page first.'}
                    </p>
                  </div>
                )}
                
                <button 
                  className="confirm-add-btn"
                  onClick={handleAddToTrip}
                  disabled={!selectedDayId || addingToTrip}
                >
                  {addingToTrip ? (
                    <><FiLoader className="loading-spinner" /> {language === 'ko' ? '추가 중...' : 'Adding...'}</>
                  ) : (
                    <><FiPlus /> {language === 'ko' ? '추가하기' : 'Add'}</>
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
