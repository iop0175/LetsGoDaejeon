import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { FiMapPin, FiClock, FiPhone, FiLoader, FiNavigation, FiPlus, FiCalendar, FiCheck, FiX } from 'react-icons/fi'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getAllDbData, getTourSpots as getTourSpotsDb } from '../services/dbService'
import { getUserTripPlans, addTripPlace } from '../services/tripService'
import { getReliableImageUrl, cleanIntroHtml } from '../utils/imageUtils'
import { DISTRICTS, extractDistrict, getDongFromAddr } from '../utils/constants'
import { generateSlug } from '../utils/slugUtils'
import Icons from '../components/common/Icons'
import SEO, { SEO_DATA } from '../components/common/SEO'
// CSS는 pages/_app.jsx에서 import

const FoodPage = () => {
  const { language, t } = useLanguage()
  const seoData = SEO_DATA.food[language] || SEO_DATA.food.ko
  const { user } = useAuth()
  const router = useRouter()
  const [allRestaurants, setAllRestaurants] = useState([]) // 전체 데이터
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [districtFilter, setDistrictFilter] = useState('all')
  const [dongFilter, setDongFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name') // 정렬 기준: 'name' | 'views'
  const itemsPerPage = 12
  
  // 내 여행에 추가 모달 상태
  const [showAddToTripModal, setShowAddToTripModal] = useState(false)
  const [restaurantToAdd, setRestaurantToAdd] = useState(null)
  const [tripPlans, setTripPlans] = useState([])
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [selectedDayId, setSelectedDayId] = useState(null)
  const [tripsLoading, setTripsLoading] = useState(false)
  const [addingToTrip, setAddingToTrip] = useState(false)

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

  // 필터/정렬 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [dongFilter, sortBy])

  // 구별 + 동별 필터링 + 정렬
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
    
    // 정렬 적용
    if (sortBy === 'name') {
      data = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'))
    } else if (sortBy === 'views') {
      data = [...data].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    }
    
    return data
  }, [allRestaurants, districtFilter, dongFilter, sortBy])

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
        // 먼저 tour_spots에서 음식점(39) 데이터 시도
        const tourResult = await getTourSpotsDb('39', 1, 1000)
        
        if (tourResult.success && tourResult.items.length > 0) {
          // TourAPI 데이터 사용
          const formattedRestaurants = tourResult.items.map((item, index) => {
            const district = extractDistrict(item.addr1 || item.addr2)
            return {
              id: item.id || item.content_id || index + 1,
              contentId: item.content_id,
              name: item.title,
              name_en: item.title_en, // 영어 이름
              location: district,
              address: item.addr1 || item.addr2,
              address_en: item.addr1_en, // 영어 주소
              summary: item.overview || '',
              summary_en: item.overview_en || '', // 영어 설명
              phone: item.tel,
              image: getReliableImageUrl(item.firstimage || item.firstimage2, '/images/no-image.svg'),
              mapx: item.mapx,
              mapy: item.mapy,
              homepage: item.homepage,
              homepage_en: item.homepage_en, // 영어 홈페이지
              intro_info: item.intro_info, // 소개정보 (영업시간, 쉬는날, 대표메뉴 등)
              _source: 'tourapi'
            }
          })
          setAllRestaurants(formattedRestaurants)
        } else {
          // tour_spots에 데이터가 없으면 기존 restaurants 테이블 시도
          const dbResult = await getAllDbData('food')
          
          if (dbResult.success && dbResult.items.length > 0) {
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
            setError(t.common.syncRequired)
          }
        }
      } catch (err) {
        console.error('음식점 데이터 로드 실패:', err)
        setError(t.common.loadFailed)
      }
      
      setLoading(false)
    }

    loadRestaurants()
  }, [language, t.common.syncRequired, t.common.loadFailed])
  
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
        placeDescription: restaurantToAdd.menu ? `${t.detail.signature}: ${restaurantToAdd.menu}` : restaurantToAdd.summary,
        placeImage: restaurantToAdd.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(restaurantToAdd.name)}/600/400`,
        orderIndex: 999, // 마지막에 추가
        visitTime: null,
        memo: null
      })
      
      if (result.success) {
        alert(t.common.addedToTrip)
        closeAddToTripModal()
      } else {
        alert(result.error || t.common.addFailed)
      }
    } catch (err) {
      alert(t.common.errorOccurred)
    }
    setAddingToTrip(false)
  }

  const totalPages = Math.ceil(filteredRestaurants.length / itemsPerPage)

  return (
    <>
      <SEO 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        url="/food"
      />
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
            <p>{t.common.loadingRestaurants}</p>
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
                    {t.common.allDong}
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
              <div className="food-count">
                {t.common.total} <strong>{filteredRestaurants.length}</strong> {t.common.restaurants}
              </div>
            </div>
            
            <div className="food-grid-page">
              {paginatedRestaurants.map((restaurant, index) => (
                <div key={restaurant.id} className="food-card-large" onClick={() => router.push(`/spot/${generateSlug(restaurant.name, restaurant.contentId)}`)} style={{ cursor: 'pointer' }}>
                  <div className="food-image-wrapper">
                    <Image 
                      src={getReliableImageUrl(restaurant.image) || '/images/no-image.svg'} 
                      alt={language === 'en' && restaurant.name_en ? restaurant.name_en : restaurant.name} 
                      width={350}
                      height={200}
                      style={{ objectFit: 'cover' }}
                      loading={index < 6 ? 'eager' : 'lazy'}
                    />
                  </div>
                  <div className="food-info-wrapper">
                    <div className="food-header-section">
                      <span className="food-location-badge">{restaurant.location[language]}</span>
                      <h3>{language === 'en' && restaurant.name_en ? restaurant.name_en : restaurant.name}</h3>
                    </div>
                    
                    {restaurant.menu && (
                      <div className="food-menu">
                        <strong><Icons.food size={16} /> {t.detail.signature}: </strong>
                        {restaurant.menu}
                      </div>
                    )}
                    
                    {/* intro_info에서 대표메뉴/인기메뉴 표시 */}
                    {!restaurant.menu && restaurant.intro_info?.firstmenu && (
                      <div className="food-menu">
                        <strong><Icons.food size={16} /> {t.detail.signature}: </strong>
                        <span>{cleanIntroHtml(restaurant.intro_info.firstmenu, ', ')}</span>
                      </div>
                    )}
                    
                    {/* intro_info에서 취급메뉴 표시 */}
                    {restaurant.intro_info?.treatmenu && (
                      <div className="food-menu treat-menu">
                        <strong><Icons.menu size={16} /> {t.detail.menu}: </strong>
                        <span>{cleanIntroHtml(restaurant.intro_info.treatmenu, ', ')}</span>
                      </div>
                    )}
                    
                    <div className="food-details">
                      <div className="detail-item">
                        <FiMapPin />
                        <span>{language === 'en' && restaurant.address_en ? restaurant.address_en : restaurant.address}</span>
                      </div>
                      
                      {/* 영업시간: intro_info.opentimefood 우선 */}
                      {(restaurant.hours || restaurant.intro_info?.opentimefood) && (
                        <div className="detail-item">
                          <FiClock />
                          <span>{cleanIntroHtml(restaurant.intro_info?.opentimefood || restaurant.hours, ' / ')}</span>
                        </div>
                      )}
                      
                      {/* 쉬는날: intro_info.restdatefood */}
                      {restaurant.intro_info?.restdatefood && (
                        <div className="detail-item holiday">
                          <span><Icons.calendar size={14} /> {t.detail.closed}: {cleanIntroHtml(restaurant.intro_info.restdatefood)}</span>
                        </div>
                      )}
                      
                      {/* 기존 휴일 정보 */}
                      {restaurant.holiday && !restaurant.intro_info?.restdatefood && (
                        <div className="detail-item holiday">
                          <span>{restaurant.holiday}</span>
                        </div>
                      )}
                      
                      {/* 전화번호: intro_info.infocenterfood 또는 phone */}
                      {(restaurant.phone || restaurant.intro_info?.infocenterfood) && (
                        <div className="detail-item">
                          <FiPhone />
                          <span>{cleanIntroHtml(restaurant.phone || restaurant.intro_info?.infocenterfood)}</span>
                        </div>
                      )}
                      
                      {/* 포장가능 여부 */}
                      {restaurant.intro_info?.packing && (
                        <div className="detail-item packing">
                          <span><Icons.takeout size={14} /> {t.detail.takeout}: {cleanIntroHtml(restaurant.intro_info.packing)}</span>
                        </div>
                      )}
                      
                      {/* 주차 정보 */}
                      {restaurant.intro_info?.parkingfood && (
                        <div className="detail-item parking">
                          <span><Icons.parking size={14} /> {cleanIntroHtml(restaurant.intro_info.parkingfood)}</span>
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
                        {t.common.addToTrip}
                      </button>
                      
                      {/* 길찾기 버튼 */}
                      {restaurant.address && (
                        <a 
                          href={`https://map.kakao.com/link/search/${encodeURIComponent(restaurant.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="food-nav-btn"
                        >
                          <FiNavigation />
                          {t.ui.directions}
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
          </>
        )}
      </div>
      
      {/* 내 여행에 추가 모달 */}
      {showAddToTripModal && (
        <div className="modal-overlay" onClick={closeAddToTripModal}>
          <div className="add-to-trip-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FiPlus /> {t.common.addToTrip}</h3>
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
                    <p className="menu-info"><Icons.food size={14} /> {restaurantToAdd.menu}</p>
                  )}
                </div>
              </div>
              
              {tripsLoading ? (
                <div className="loading-trips">
                  <FiLoader className="spinning" />
                  <span>{t.common.loadingData}</span>
                </div>
              ) : tripPlans.length === 0 ? (
                <div className="no-trips">
                  <p>{t.common.noTrips}</p>
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
                    <label>{t.common.selectTrip}</label>
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
                      <label>{t.common.selectDay}</label>
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
                </>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeAddToTripModal}>
                {t.ui.cancel}
              </button>
              <button 
                className="add-btn"
                onClick={handleAddToTrip}
                disabled={!selectedDayId || addingToTrip}
              >
                {addingToTrip ? (
                  <><FiLoader className="spinning" /> {t.ui.loading}</>
                ) : (
                  <><FiPlus /> {t.ui.add}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

export default FoodPage