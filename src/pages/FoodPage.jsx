import { useState, useEffect, useMemo } from 'react'
import { FiMapPin, FiClock, FiPhone, FiLoader, FiNavigation, FiPlus, FiCalendar, FiCheck, FiX } from 'react-icons/fi'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getAllDbData } from '../services/dbService'
import { getUserTripPlans, addTripPlace } from '../services/tripService'
import { getReliableImageUrl } from '../utils/imageUtils'
import './FoodPage.css'

// 대전시 구 목록
const DISTRICTS = [
  { id: 'all', ko: '전체 지역', en: 'All Districts' },
  { id: '동구', ko: '동구', en: 'Dong-gu' },
  { id: '중구', ko: '중구', en: 'Jung-gu' },
  { id: '서구', ko: '서구', en: 'Seo-gu' },
  { id: '유성구', ko: '유성구', en: 'Yuseong-gu' },
  { id: '대덕구', ko: '대덕구', en: 'Daedeok-gu' }
]

const FoodPage = () => {
  const { language, t } = useLanguage()
  const { user } = useAuth()
  const [allRestaurants, setAllRestaurants] = useState([]) // 전체 데이터
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [districtFilter, setDistrictFilter] = useState('all')
  const [dongFilter, setDongFilter] = useState('all')
  const itemsPerPage = 12
  
  // 내 여행에 추가 모달 상태
  const [showAddToTripModal, setShowAddToTripModal] = useState(false)
  const [restaurantToAdd, setRestaurantToAdd] = useState(null)
  const [tripPlans, setTripPlans] = useState([])
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [selectedDayId, setSelectedDayId] = useState(null)
  const [tripsLoading, setTripsLoading] = useState(false)
  const [addingToTrip, setAddingToTrip] = useState(false)

  // 지역 추출 함수
  const extractDistrict = (address) => {
    if (!address) return { ko: '대전', en: 'Daejeon', district: null }
    const match = address.match(/대전\s*(시)?\s*(\S+구)/)
    if (match) {
      const district = match[2]
      const districtMap = {
        '유성구': 'Yuseong-gu',
        '서구': 'Seo-gu',
        '중구': 'Jung-gu',
        '동구': 'Dong-gu',
        '대덕구': 'Daedeok-gu'
      }
      return { ko: district, en: districtMap[district] || district, district }
    }
    return { ko: '대전', en: 'Daejeon', district: null }
  }

  // 주소에서 동 추출
  const getDongFromAddr = (addr) => {
    if (!addr) return null
    const dongMatch = addr.match(/([가-힣]+동)/)
    return dongMatch ? dongMatch[1] : null
  }

  // 선택된 구에 해당하는 동 목록 추출 (중복 제거)
  const availableDongs = useMemo(() => {
    if (districtFilter === 'all') return []
    
    const dongs = new Set()
    allRestaurants.forEach(item => {
      const location = extractDistrict(item.address)
      if (location.district === districtFilter) {
        const dong = getDongFromAddr(item.address)
        if (dong) dongs.add(dong)
      }
    })
    
    return Array.from(dongs).sort()
  }, [allRestaurants, districtFilter])

  // 구 변경 시 동 필터 초기화 및 페이지 리셋
  useEffect(() => {
    setDongFilter('all')
    setCurrentPage(1)
  }, [districtFilter])

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [dongFilter])

  // 구별 + 동별 필터링
  const filteredRestaurants = useMemo(() => {
    let data = allRestaurants
    
    // 구별 필터링
    if (districtFilter !== 'all') {
      data = data.filter(item => {
        const location = extractDistrict(item.address)
        return location.district === districtFilter
      })
    }
    
    // 동별 필터링
    if (dongFilter !== 'all') {
      data = data.filter(item => {
        const dong = getDongFromAddr(item.address)
        return dong === dongFilter
      })
    }
    
    return data
  }, [allRestaurants, districtFilter, dongFilter])

  // 현재 페이지에 해당하는 데이터
  const paginatedRestaurants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredRestaurants.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredRestaurants, currentPage, itemsPerPage])

  // DB 데이터 로드
  useEffect(() => {
    const loadRestaurants = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // DB에서 데이터 가져오기
        const dbResult = await getAllDbData('food')
        
        if (dbResult.success && dbResult.items.length > 0) {
          // DB 데이터 사용
          const formattedRestaurants = dbResult.items.map((item, index) => {
            const district = extractDistrict(item.restrntAddr)
            return {
              id: item._id || index + 1,
              name: item.restrntNm,
              location: district,
              address: item.restrntDtlAddr || item.restrntAddr,
              summary: item.restrntSumm,
              phone: item.restrntInqrTel || item.telNo,
              menu: item.rprsFod || item.reprMenu,
              hours: item.salsTime,
              holiday: item.hldyGuid,
              lat: item.mapLat,
              lng: item.mapLot,
              image: item.imageUrl
            }
          })
          setAllRestaurants(formattedRestaurants)
        } else {
          // DB에 데이터가 없으면 메시지 표시
          setError(language === 'ko' ? '관리자 페이지에서 데이터를 먼저 저장해주세요.' : 'Please save data from admin page first.')
        }
      } catch (err) {

        setError(language === 'ko' ? '데이터를 불러오는데 실패했습니다.' : 'Failed to load data.')
      }
      
      setLoading(false)
    }

    loadRestaurants()
  }, [language])
  
  // 내 여행에 추가 모달 열기
  const openAddToTripModal = async (restaurant) => {
    setRestaurantToAdd(restaurant)
    setShowAddToTripModal(true)
    setSelectedTripId(null)
    setSelectedDayId(null)
    
    // 사용자의 여행 목록 로드
    setTripsLoading(true)
    try {
      const result = await getUserTripPlans(user?.id || 'anonymous')
      if (result.success) {
        // 일차 정보가 있는 여행만 필터링
        const tripsWithDays = result.plans.filter(plan => plan.days && plan.days.length > 0)
        setTripPlans(tripsWithDays)
      }
    } catch (err) {
      console.error('Failed to load trips:', err)
    }
    setTripsLoading(false)
  }
  
  // 내 여행에 추가 모달 닫기
  const closeAddToTripModal = () => {
    setShowAddToTripModal(false)
    setRestaurantToAdd(null)
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
    if (!selectedDayId || !restaurantToAdd) return
    
    setAddingToTrip(true)
    try {
      const result = await addTripPlace({
        dayId: selectedDayId,
        placeType: 'food',
        placeName: restaurantToAdd.name,
        placeAddress: restaurantToAdd.address,
        placeDescription: restaurantToAdd.menu ? `대표메뉴: ${restaurantToAdd.menu}` : restaurantToAdd.summary,
        placeImage: restaurantToAdd.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(restaurantToAdd.name)}/600/400`,
        orderIndex: 999, // 마지막에 추가
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

  const totalPages = Math.ceil(filteredRestaurants.length / itemsPerPage)

  return (
    <div className="food-page">
      <div className="page-hero food-hero">
        <div className="page-hero-content">
          <h1>{t.pages.food.title}</h1>
          <p>{t.pages.food.subtitle}</p>
        </div>
      </div>
      
      <div className="container">
        {loading ? (
          <div className="loading-container">
            <FiLoader className="loading-spinner" />
            <p>{language === 'ko' ? '맛집 정보를 불러오는 중...' : 'Loading restaurants...'}</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* 구/동 필터 */}
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

              {districtFilter !== 'all' && availableDongs.length > 0 && (
                <div className="dong-buttons">
                  <button
                    className={`dong-btn ${dongFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setDongFilter('all')}
                  >
                    {language === 'ko' ? '전체 동' : 'All Dong'}
                  </button>
                  {availableDongs.map(dong => (
                    <button
                      key={dong}
                      className={`dong-btn ${dongFilter === dong ? 'active' : ''}`}
                      onClick={() => setDongFilter(dong)}
                    >
                      {dong}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="food-count">
              {t.common.total} <strong>{filteredRestaurants.length}</strong>{language === 'ko' ? '개의 맛집' : ' restaurants'}
            </div>
            
            <div className="food-grid-page">
              {paginatedRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="food-card-large">
                  <div className="food-image-wrapper">
                    <img 
                      src={`https://picsum.photos/seed/${encodeURIComponent(restaurant.name)}/600/400`} 
                      alt={restaurant.name} 
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = '/images/no-image.svg'
                      }}
                    />
                  </div>
                  <div className="food-info-wrapper">
                    <div className="food-header-section">
                      <span className="food-location-badge">{restaurant.location[language]}</span>
                      <h3>{restaurant.name}</h3>
                    </div>
                    <p className="food-summary">{restaurant.summary}</p>
                    
                    {restaurant.menu && (
                      <div className="food-menu">
                        <strong>🍽️ {language === 'ko' ? '대표메뉴' : 'Signature'}: </strong>
                        {restaurant.menu}
                      </div>
                    )}
                    
                    <div className="food-details">
                      <div className="detail-item">
                        <FiMapPin />
                        <span>{restaurant.address}</span>
                      </div>
                      {restaurant.hours && (
                        <div className="detail-item">
                          <FiClock />
                          <span>{restaurant.hours}</span>
                        </div>
                      )}
                      {restaurant.holiday && (
                        <div className="detail-item holiday">
                          <span>{restaurant.holiday}</span>
                        </div>
                      )}
                      {restaurant.phone && (
                        <div className="detail-item">
                          <FiPhone />
                          <span>{restaurant.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 버튼 그룹 */}
                    <div className="food-action-buttons">
                      {/* 내 여행에 추가 버튼 */}
                      <button
                        className="food-add-trip-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          openAddToTripModal(restaurant)
                        }}
                      >
                        <FiPlus />
                        {language === 'ko' ? '내 여행에 추가' : 'Add to Trip'}
                      </button>
                      
                      {/* 길찾기 버튼 */}
                      {restaurant.lat && restaurant.lng && (
                        <a 
                          href={`https://map.kakao.com/link/to/${encodeURIComponent(restaurant.name)},${restaurant.lat},${restaurant.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="food-nav-btn"
                        >
                          <FiNavigation />
                          {language === 'ko' ? '길찾기' : 'Directions'}
                        </a>
                      )}
                    </div>
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
      
      {/* 내 여행에 추가 모달 */}
      {showAddToTripModal && (
        <div className="modal-overlay" onClick={closeAddToTripModal}>
          <div className="add-to-trip-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FiPlus /> {language === 'ko' ? '내 여행에 추가' : 'Add to My Trip'}</h3>
              <button className="modal-close" onClick={closeAddToTripModal}>
                <FiX />
              </button>
            </div>
            
            <div className="modal-body">
              {/* 추가할 장소 정보 */}
              <div className="restaurant-to-add">
                <div className="restaurant-to-add-image">
                  <img 
                    src={getReliableImageUrl(restaurantToAdd?.imageUrl) || `https://picsum.photos/seed/${encodeURIComponent(restaurantToAdd?.name || '')}/600/400`}
                    alt={restaurantToAdd?.name}
                    onError={(e) => e.target.src = '/images/no-image.svg'}
                  />
                </div>
                <div className="restaurant-to-add-info">
                  <h4>{restaurantToAdd?.name}</h4>
                  <p><FiMapPin /> {restaurantToAdd?.address}</p>
                  {restaurantToAdd?.menu && (
                    <p className="menu-info">🍽️ {restaurantToAdd.menu}</p>
                  )}
                </div>
              </div>
              
              {tripsLoading ? (
                <div className="loading-trips">
                  <FiLoader className="spinning" />
                  <span>{language === 'ko' ? '여행 목록 불러오는 중...' : 'Loading trips...'}</span>
                </div>
              ) : tripPlans.length === 0 ? (
                <div className="no-trips">
                  <p>{language === 'ko' ? '저장된 여행이 없습니다.' : 'No saved trips.'}</p>
                  <p className="hint">
                    {language === 'ko' 
                      ? '먼저 "나의 여행" 페이지에서 여행을 만들어주세요.' 
                      : 'Please create a trip in "My Trip" page first.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* 여행 선택 */}
                  <div className="trip-select-section">
                    <label>{language === 'ko' ? '여행 선택' : 'Select Trip'}</label>
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
                          <div className="trip-item-info">
                            <span className="trip-title">{trip.title}</span>
                            <span className="trip-date">
                              <FiCalendar />
                              {trip.startDate} ~ {trip.endDate}
                            </span>
                          </div>
                          {selectedTripId === trip.id && <FiCheck className="check-icon" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* 일차 선택 */}
                  {selectedTripId && selectedTripDays.length > 0 && (
                    <div className="day-select-section">
                      <label>{language === 'ko' ? '일차 선택' : 'Select Day'}</label>
                      <div className="day-list">
                        {selectedTripDays.map(day => (
                          <div
                            key={day.id}
                            className={`day-item ${selectedDayId === day.id ? 'selected' : ''}`}
                            onClick={() => setSelectedDayId(day.id)}
                          >
                            <span className="day-number">
                              {language === 'ko' ? `${day.dayNumber}일차` : `Day ${day.dayNumber}`}
                            </span>
                            <span className="day-date">{day.date}</span>
                            {selectedDayId === day.id && <FiCheck className="check-icon" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeAddToTripModal}>
                {language === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button 
                className="add-btn"
                onClick={handleAddToTrip}
                disabled={!selectedDayId || addingToTrip}
              >
                {addingToTrip ? (
                  <><FiLoader className="spinning" /> {language === 'ko' ? '추가 중...' : 'Adding...'}</>
                ) : (
                  <><FiPlus /> {language === 'ko' ? '추가하기' : 'Add'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FoodPage
