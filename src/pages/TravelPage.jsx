import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMapPin, FiClock, FiLoader, FiX, FiCamera, FiPhone, FiExternalLink, FiNavigation, FiPlus, FiCalendar, FiCheck, FiChevronLeft, FiChevronRight, FiImage } from 'react-icons/fi'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getTourSpotImage, getTourApiImages } from '../services/api'
import { getAllDbData, getTourSpots as getTourSpotsDb } from '../services/dbService'
import { getUserTripPlans, addTripPlace } from '../services/tripService'
import { getReliableImageUrl, handleImageError, cleanIntroHtml, sanitizeIntroHtml } from '../utils/imageUtils'
import TravelCard from '../components/TravelCard/TravelCard'
import LicenseBadge from '../components/common/LicenseBadge'
import './TravelPage.css'

// 대전시 구 목록
const DISTRICTS = [
  { id: 'all', ko: '전체 지역', en: 'All Districts' },
  { id: '동구', ko: '동구', en: 'Dong-gu' },
  { id: '중구', ko: '중구', en: 'Jung-gu' },
  { id: '서구', ko: '서구', en: 'Seo-gu' },
  { id: '유성구', ko: '유성구', en: 'Yuseong-gu' },
  { id: '대덕구', ko: '대덕구', en: 'Daedeok-gu' }
]

const TravelPage = () => {
  const { language, t } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [allSpots, setAllSpots] = useState([]) // 전체 데이터
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [districtFilter, setDistrictFilter] = useState('all')
  const [dongFilter, setDongFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name') // 정렬 기준: 'name' | 'views'
  const itemsPerPage = 12

  // 상세 모달 상태
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [additionalImages, setAdditionalImages] = useState([])
  const [imagesLoading, setImagesLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  // 내 여행에 추가 모달 상태
  const [showAddToTripModal, setShowAddToTripModal] = useState(false)
  const [spotToAdd, setSpotToAdd] = useState(null)
  const [tripPlans, setTripPlans] = useState([])
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [selectedDayId, setSelectedDayId] = useState(null)
  const [tripsLoading, setTripsLoading] = useState(false)
  const [addingToTrip, setAddingToTrip] = useState(false)

  // 지역 추출 함수
  const extractDistrict = (address) => {
    if (!address) return { ko: '대전', en: 'Daejeon', district: null }
    // "대전광역시", "대전시", "대전" 모두 지원
    const match = address.match(/대전\s*(광역시|시)?\s*(\S+구)/)
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
    allSpots.forEach(item => {
      const location = extractDistrict(item.address)
      if (location.district === districtFilter) {
        const dong = getDongFromAddr(item.address)
        if (dong) dongs.add(dong)
      }
    })
    
    return Array.from(dongs).sort()
  }, [allSpots, districtFilter])

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
  const filteredSpots = useMemo(() => {
    let data = allSpots
    
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
      data = [...data].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'))
    } else if (sortBy === 'views') {
      data = [...data].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    }
    
    return data
  }, [allSpots, districtFilter, dongFilter, sortBy])

  // 현재 페이지에 해당하는 데이터
  const paginatedSpots = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredSpots.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredSpots, currentPage, itemsPerPage])

  // 관광지 상세 보기 (모달 열기)
  const openSpotDetail = async (spot) => {
    setSelectedSpot(spot)
    setAdditionalImages([])
    setCurrentImageIndex(0)
    
    // 추가 이미지 로드
    if (spot.contentId) {
      setImagesLoading(true)
      try {
        const result = await getTourApiImages(spot.contentId)
        if (result.success && result.items.length > 0) {
          setAdditionalImages(result.items)
        }
      } catch (err) {
        console.error('추가 이미지 로드 실패:', err)
      } finally {
        setImagesLoading(false)
      }
    }
  }

  // 모달 닫기
  const closeSpotDetail = () => {
    setSelectedSpot(null)
    setAdditionalImages([])
    setCurrentImageIndex(0)
  }
  
  // 이미지 갤러리 네비게이션
  const nextImage = () => {
    const totalImages = 1 + additionalImages.length // 대표이미지 + 추가이미지
    setCurrentImageIndex((prev) => (prev + 1) % totalImages)
  }
  
  const prevImage = () => {
    const totalImages = 1 + additionalImages.length
    setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages)
  }
  
  // 내 여행에 추가 모달 열기
  const openAddToTripModal = async (spot) => {
    setSpotToAdd(spot)
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
        placeType: 'travel',
        placeName: spotToAdd.title,
        placeAddress: spotToAdd.address,
        placeDescription: spotToAdd.summary,
        placeImage: spotToAdd.image,
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

  // DB에서 데이터 로드
  useEffect(() => {
    const loadSpots = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // 먼저 tour_spots에서 관광지(12) 데이터 시도
        const tourResult = await getTourSpotsDb('12', 1, 1000)
        
        if (tourResult.success && tourResult.items.length > 0) {
          // TourAPI 데이터 사용
          const formattedSpots = tourResult.items.map((item, index) => {
            const district = extractDistrict(item.addr1 || item.addr2)
            return {
              id: item.id || item.content_id || index + 1,
              contentId: item.content_id,
              contentTypeId: item.content_type_id,
              title: item.title,
              location: district,
              address: item.addr1 || item.addr2,
              summary: item.overview || '',
              phone: item.tel,
              image: getReliableImageUrl(item.firstimage || item.firstimage2, getTourSpotImage(item.title)),
              mapx: item.mapx,
              mapy: item.mapy,
              homepage: item.homepage,
              intro_info: item.intro_info // 소개정보 (이용시간, 주차 등)
            }
          })
          setAllSpots(formattedSpots)
        } else {
          // tour_spots에 데이터가 없으면 기존 travel_spots 테이블 시도
          const dbResult = await getAllDbData('travel')
          
          if (dbResult.success && dbResult.items.length > 0) {
            const formattedSpots = dbResult.items.map((item, index) => {
              const district = extractDistrict(item.tourspotAddr || item.tourspotDtlAddr)
              return {
                id: item._id || index + 1,
                title: item.tourspotNm,
                location: district,
                address: item.tourspotDtlAddr || item.tourspotAddr,
                summary: item.tourspotSumm,
                phone: item.refadNo,
                time: item.mngTime,
                fee: item.tourUtlzAmt,
                parking: item.pkgFclt,
                url: item.urlAddr,
                image: item.imageUrl || getTourSpotImage(item.tourspotNm),
                image_author: item.image_author,
                image_source: item.image_source
              }
            })
            setAllSpots(formattedSpots)
          } else {
            setError(language === 'ko' ? '관리자 페이지에서 TourAPI 데이터를 먼저 동기화해주세요.' : 'Please sync TourAPI data from admin page first.')
          }
        }
      } catch (err) {
        console.error('관광지 데이터 로드 실패:', err)
        setError(language === 'ko' ? '데이터를 불러오는데 실패했습니다.' : 'Failed to load data.')
      }
      
      setLoading(false)
    }

    loadSpots()
  }, [language])

  const totalPages = Math.ceil(filteredSpots.length / itemsPerPage)

  return (
    <div className="travel-page">
      <div className="page-hero">
        <div className="page-hero-content">
          <h1>{t.pages.travel.title}</h1>
          <p>{t.pages.travel.subtitle}</p>
        </div>
      </div>
      
      <div className="container">
        {loading ? (
          <div className="loading-container">
            <FiLoader className="loading-spinner" />
            <p>{language === 'ko' ? '관광지 정보를 불러오는 중...' : 'Loading attractions...'}</p>
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

            {/* 정렬 + 개수 표시 */}
            <div className="sort-count-row">
              <div className="sort-buttons">
                <button
                  className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => setSortBy('name')}
                >
                  {language === 'ko' ? '가나다순' : 'Name'}
                </button>
                <button
                  className={`sort-btn ${sortBy === 'views' ? 'active' : ''}`}
                  onClick={() => setSortBy('views')}
                >
                  {language === 'ko' ? '조회수순' : 'Views'}
                </button>
              </div>
              <div className="spots-count">
                {t.common.total} <strong>{filteredSpots.length}</strong>{language === 'ko' ? '개의 관광지' : ' attractions'}
              </div>
            </div>
            
            <div className="spots-grid">
              {paginatedSpots.map((spot) => (
                <div key={spot.id} className="spot-card-wrapper" onClick={() => navigate(`/spot/${spot.contentId}`)}>
                  <div className="spot-card">
                    <div className="spot-image">
                      <img 
                        src={spot.ktoImage || spot.image} 
                        alt={spot.title}
                        onError={(e) => {
                          e.target.src = '/images/no-image.svg'
                        }}
                      />
                      {(spot.image_author || spot.photographer) && (
                        <div className="spot-photographer">
                          <FiCamera />
                          <span>{spot.image_author || spot.photographer}</span>
                        </div>
                      )}
                    </div>
                    <div className="spot-content">
                      <h3 className="spot-title">{spot.title}</h3>
                      <p className="spot-summary">{spot.summary}</p>
                      <div className="spot-info">
                        <span className="spot-location">
                          <FiMapPin />
                          {spot.location[language]}
                        </span>
                        {spot.time && (
                          <span className="spot-time">
                            <FiClock />
                            {spot.time.replace(/<br\s*\/?>/gi, ' ')}
                          </span>
                        )}
                      </div>
                      {spot.address && (
                        <p className="spot-address">{spot.address}</p>
                      )}
                      {spot.phone && (
                        <p className="spot-phone">📞 {spot.phone}</p>
                      )}
                      {spot.url && (
                        <a 
                          href={spot.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="spot-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {language === 'ko' ? '홈페이지 방문' : 'Visit Website'} →
                        </a>
                      )}
                      
                      {/* 버튼 그룹 */}
                      <div className="spot-action-buttons">
                        {/* 내 여행에 추가 버튼 */}
                        <button
                          className="spot-add-trip-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            openAddToTripModal(spot)
                          }}
                        >
                          <FiPlus />
                          {language === 'ko' ? '내 여행에 추가' : 'Add to Trip'}
                        </button>
                        
                        {/* 길찾기 버튼 */}
                        {spot.address && (
                          <a 
                            href={`https://map.kakao.com/link/search/${encodeURIComponent(spot.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="spot-nav-btn"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FiNavigation />
                            {language === 'ko' ? '길찾기' : 'Directions'}
                          </a>
                        )}
                      </div>
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

      {/* 관광지 상세 모달 */}
      {selectedSpot && (
        <div className="spot-modal-overlay" onClick={closeSpotDetail}>
          <div className="spot-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeSpotDetail}>
              <FiX />
            </button>

            {/* 이미지 갤러리 */}
            <div className="modal-image-gallery">
              <div className="gallery-main-image">
                {currentImageIndex === 0 ? (
                  <img 
                    src={getReliableImageUrl(selectedSpot.image)}
                    alt={selectedSpot.title}
                    onError={handleImageError}
                  />
                ) : (
                  <img 
                    src={getReliableImageUrl(additionalImages[currentImageIndex - 1]?.originimgurl)}
                    alt={`${selectedSpot.title} - ${currentImageIndex}`}
                    onError={handleImageError}
                  />
                )}
                
                {/* 이미지 네비게이션 버튼 */}
                {additionalImages.length > 0 && (
                  <>
                    <button className="gallery-nav-btn prev" onClick={prevImage}>
                      <FiChevronLeft />
                    </button>
                    <button className="gallery-nav-btn next" onClick={nextImage}>
                      <FiChevronRight />
                    </button>
                    <div className="gallery-counter">
                      {currentImageIndex + 1} / {1 + additionalImages.length}
                    </div>
                  </>
                )}
                
                {/* 이미지 로딩 표시 */}
                {imagesLoading && (
                  <div className="gallery-loading">
                    <FiLoader className="spinning" />
                  </div>
                )}
              </div>
              
              {/* 썸네일 목록 */}
              {additionalImages.length > 0 && (
                <div className="gallery-thumbnails">
                  <div 
                    className={`thumbnail ${currentImageIndex === 0 ? 'active' : ''}`}
                    onClick={() => setCurrentImageIndex(0)}
                  >
                    <img 
                      src={getReliableImageUrl(selectedSpot.image)}
                      alt="대표"
                      onError={handleImageError}
                    />
                  </div>
                  {additionalImages.map((img, idx) => (
                    <div 
                      key={img.serialnum || idx}
                      className={`thumbnail ${currentImageIndex === idx + 1 ? 'active' : ''}`}
                      onClick={() => setCurrentImageIndex(idx + 1)}
                    >
                      <img 
                        src={getReliableImageUrl(img.smallimageurl || img.originimgurl)}
                        alt={img.imgname || `이미지 ${idx + 1}`}
                        onError={handleImageError}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 상세 정보 */}
            <div className="modal-content">
              <h2 className="modal-title">{selectedSpot.title}</h2>
              
              <p className="modal-summary">{selectedSpot.summary}</p>
              
              <div className="modal-info-grid">
                {selectedSpot.address && (
                  <div className="info-item">
                    <FiMapPin />
                    <div>
                      <strong>{language === 'ko' ? '주소' : 'Address'}</strong>
                      <p>{selectedSpot.address}</p>
                    </div>
                  </div>
                )}
                
                {/* 운영시간: 기존 time 또는 intro_info.usetime */}
                {(selectedSpot.time || selectedSpot.intro_info?.usetime) && (
                  <div className="info-item">
                    <FiClock />
                    <div>
                      <strong>{language === 'ko' ? '운영시간' : 'Hours'}</strong>
                      <p dangerouslySetInnerHTML={{ 
                        __html: sanitizeIntroHtml(selectedSpot.time || selectedSpot.intro_info?.usetime)
                      }} />
                    </div>
                  </div>
                )}
                
                {/* 쉬는날 (intro_info에서만) */}
                {selectedSpot.intro_info?.restdate && (
                  <div className="info-item">
                    <span className="icon-text">📅</span>
                    <div>
                      <strong>{language === 'ko' ? '쉬는날' : 'Closed'}</strong>
                      <p dangerouslySetInnerHTML={{ 
                        __html: sanitizeIntroHtml(selectedSpot.intro_info.restdate)
                      }} />
                    </div>
                  </div>
                )}
                
                {/* 전화번호: 기존 phone 또는 intro_info.infocenter */}
                {(selectedSpot.phone || selectedSpot.intro_info?.infocenter) && (
                  <div className="info-item">
                    <FiPhone />
                    <div>
                      <strong>{language === 'ko' ? '문의처' : 'Contact'}</strong>
                      <p dangerouslySetInnerHTML={{ 
                        __html: sanitizeIntroHtml(selectedSpot.phone || selectedSpot.intro_info?.infocenter)
                      }} />
                    </div>
                  </div>
                )}
                
                {selectedSpot.fee && (
                  <div className="info-item">
                    <span className="icon-text">💰</span>
                    <div>
                      <strong>{language === 'ko' ? '이용요금' : 'Fee'}</strong>
                      <p dangerouslySetInnerHTML={{ 
                        __html: sanitizeIntroHtml(selectedSpot.fee)
                      }} />
                    </div>
                  </div>
                )}
                
                {/* 주차시설: 기존 parking 또는 intro_info.parking */}
                {(selectedSpot.parking || selectedSpot.intro_info?.parking) && (
                  <div className="info-item">
                    <span className="icon-text">🅿️</span>
                    <div>
                      <strong>{language === 'ko' ? '주차시설' : 'Parking'}</strong>
                      <p dangerouslySetInnerHTML={{ 
                        __html: sanitizeIntroHtml(selectedSpot.parking || selectedSpot.intro_info?.parking)
                      }} />
                    </div>
                  </div>
                )}
                
                {/* 유모차대여 (intro_info에서만) */}
                {selectedSpot.intro_info?.chkbabycarriage && (
                  <div className="info-item">
                    <span className="icon-text">👶</span>
                    <div>
                      <strong>{language === 'ko' ? '유모차대여' : 'Stroller Rental'}</strong>
                      <p>{cleanIntroHtml(selectedSpot.intro_info.chkbabycarriage)}</p>
                    </div>
                  </div>
                )}
                
                {/* 애완동물 (intro_info에서만) */}
                {selectedSpot.intro_info?.chkpet && (
                  <div className="info-item">
                    <span className="icon-text">🐕</span>
                    <div>
                      <strong>{language === 'ko' ? '애완동물' : 'Pets'}</strong>
                      <p>{cleanIntroHtml(selectedSpot.intro_info.chkpet)}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedSpot.url && (
                <a 
                  href={selectedSpot.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="modal-website-btn"
                >
                  <FiExternalLink />
                  {language === 'ko' ? '홈페이지 방문하기' : 'Visit Website'}
                </a>
              )}

              {/* 사진 출처 및 저작권 안내 */}
              <div className="photo-credit">
                <FiCamera />
                <div className="photo-credit-content">
                  {selectedSpot.image_author || selectedSpot.image_source ? (
                    <>
                      {selectedSpot.image_author && (
                        <span className="credit-author">
                          {language === 'ko' ? '사진: ' : 'Photo by: '}{selectedSpot.image_author}
                        </span>
                      )}
                      {selectedSpot.image_author && selectedSpot.image_source && <span className="credit-divider">|</span>}
                      {selectedSpot.image_source && (
                        <span className="credit-source">
                          {language === 'ko' ? '출처: ' : 'Source: '}
                          {selectedSpot.image_source.startsWith('http') ? (
                            <a 
                              href={selectedSpot.image_source} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="source-link"
                              title={selectedSpot.image_source}
                            >
                              {selectedSpot.image_source}
                            </a>
                          ) : (
                            <span className="source-text">{selectedSpot.image_source}</span>
                          )}
                        </span>
                      )}
                    </>
                  ) : (
                    <span>
                      {language === 'ko' 
                        ? '사진 제공: 한국관광공사' 
                        : 'Photos by: Korea Tourism Organization'}
                    </span>
                  )}
                </div>
              </div>
              
              {/* 저작권 라이선스 표시 */}
              <LicenseBadge type="kto" />
            </div>
          </div>
        </div>
      )}
      
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
              <div className="spot-to-add">
                <div className="spot-to-add-image">
                  <img 
                    src={getReliableImageUrl(spotToAdd?.image)} 
                    alt={spotToAdd?.title}
                    onError={(e) => e.target.src = '/images/no-image.svg'}
                  />
                </div>
                <div className="spot-to-add-info">
                  <h4>{spotToAdd?.title}</h4>
                  <p><FiMapPin /> {spotToAdd?.address}</p>
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

export default TravelPage
