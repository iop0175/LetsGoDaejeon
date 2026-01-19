import { useState, useEffect, useMemo } from 'react'
import { FiFilter, FiMapPin, FiClock, FiLoader, FiX, FiChevronLeft, FiChevronRight, FiCamera, FiPhone, FiExternalLink, FiImage, FiNavigation } from 'react-icons/fi'
import { useLanguage } from '../context/LanguageContext'
import { getTourSpotImage, getDaejeonPhotoGallery } from '../services/api'
import { getAllDbData } from '../services/dbService'
import TravelCard from '../components/TravelCard/TravelCard'
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
  const [allSpots, setAllSpots] = useState([]) // 전체 데이터
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [districtFilter, setDistrictFilter] = useState('all')
  const [dongFilter, setDongFilter] = useState('all')
  const itemsPerPage = 12

  // 상세 모달 상태
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [photoGallery, setPhotoGallery] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

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

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [dongFilter])

  // 구별 + 동별 필터링
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
    
    return data
  }, [allSpots, districtFilter, dongFilter])

  // 현재 페이지에 해당하는 데이터
  const paginatedSpots = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredSpots.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredSpots, currentPage, itemsPerPage])

  // 관광지 상세 보기 (모달 열기)
  const openSpotDetail = async (spot) => {
    setSelectedSpot(spot)
    setGalleryLoading(true)
    setCurrentPhotoIndex(0)
    
    // 한국관광공사 사진 갤러리 로드
    try {
      const result = await getDaejeonPhotoGallery(spot.title, 20)
      if (result.success && result.items.length > 0) {
        setPhotoGallery(result.items)
      } else {
        // 기본 이미지 사용
        setPhotoGallery([{
          imageUrl: spot.image,
          title: spot.title,
          photographer: '대전사진누리',
          location: '대전광역시'
        }])
      }
    } catch (error) {
      console.error('사진 갤러리 로드 오류:', error)
      setPhotoGallery([{
        imageUrl: spot.image,
        title: spot.title,
        photographer: '대전사진누리',
        location: '대전광역시'
      }])
    }
    
    setGalleryLoading(false)
  }

  // 모달 닫기
  const closeSpotDetail = () => {
    setSelectedSpot(null)
    setPhotoGallery([])
    setCurrentPhotoIndex(0)
  }

  // 이전/다음 사진
  const prevPhoto = () => {
    setCurrentPhotoIndex(prev => 
      prev === 0 ? photoGallery.length - 1 : prev - 1
    )
  }

  const nextPhoto = () => {
    setCurrentPhotoIndex(prev => 
      prev === photoGallery.length - 1 ? 0 : prev + 1
    )
  }

  // DB에서 데이터 로드
  useEffect(() => {
    const loadSpots = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // DB에서 데이터 가져오기
        const dbResult = await getAllDbData('travel')
        
        if (dbResult.success && dbResult.items.length > 0) {
          // DB 데이터 사용
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
              image: item.imageUrl || getTourSpotImage(item.tourspotNm)
            }
          })
          setAllSpots(formattedSpots)
        } else {
          // DB에 데이터가 없으면 메시지 표시
          setError(language === 'ko' ? '관리자 페이지에서 데이터를 먼저 저장해주세요.' : 'Please save data from admin page first.')
        }
      } catch (err) {
        console.error('데이터 로드 실패:', err)
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

            <div className="spots-count">
              {t.common.total} <strong>{filteredSpots.length}</strong>{language === 'ko' ? '개의 관광지' : ' attractions'}
            </div>
            
            <div className="spots-grid">
              {paginatedSpots.map((spot) => (
                <div key={spot.id} className="spot-card-wrapper" onClick={() => openSpotDetail(spot)}>
                  <div className="spot-card">
                    <div className="spot-image">
                      <img 
                        src={spot.ktoImage || spot.image} 
                        alt={spot.title}
                        onError={(e) => {
                          e.target.src = '/images/no-image.svg'
                        }}
                      />
                      {spot.photographer && (
                        <div className="spot-photographer">
                          <FiCamera />
                          <span>{spot.photographer}</span>
                        </div>
                      )}
                      <div className="spot-image-overlay">
                        <FiImage />
                        <span>{language === 'ko' ? '사진 더보기' : 'View Photos'}</span>
                      </div>
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
                      
                      {/* 길찾기 버튼 */}
                      {spot.address && (
                        <a 
                          href={`https://map.kakao.com/link/search/${encodeURIComponent(spot.title + ' ' + spot.address)}`}
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

            {/* 사진 갤러리 */}
            <div className="modal-gallery">
              {galleryLoading ? (
                <div className="gallery-loading">
                  <FiLoader className="loading-spinner" />
                  <p>{language === 'ko' ? '사진을 불러오는 중...' : 'Loading photos...'}</p>
                </div>
              ) : (
                <>
                  <div className="gallery-main">
                    <img 
                      src={photoGallery[currentPhotoIndex]?.imageUrl}
                      alt={photoGallery[currentPhotoIndex]?.title}
                      onError={(e) => {
                        e.target.src = '/images/no-image.svg'
                      }}
                    />
                    
                    {photoGallery.length > 1 && (
                      <>
                        <button className="gallery-nav prev" onClick={prevPhoto}>
                          <FiChevronLeft />
                        </button>
                        <button className="gallery-nav next" onClick={nextPhoto}>
                          <FiChevronRight />
                        </button>
                      </>
                    )}
                    
                    <div className="gallery-info">
                      <FiCamera />
                      <span>{photoGallery[currentPhotoIndex]?.photographer || '한국관광공사'}</span>
                    </div>
                    
                    <div className="gallery-counter">
                      {currentPhotoIndex + 1} / {photoGallery.length}
                    </div>
                  </div>

                  {/* 썸네일 목록 */}
                  {photoGallery.length > 1 && (
                    <div className="gallery-thumbnails">
                      {photoGallery.map((photo, index) => (
                        <div 
                          key={index}
                          className={`thumbnail ${index === currentPhotoIndex ? 'active' : ''}`}
                          onClick={() => setCurrentPhotoIndex(index)}
                        >
                          <img 
                            src={photo.imageUrl} 
                            alt={`${photo.title} ${index + 1}`}
                            onError={(e) => {
                              e.target.src = '/images/no-image.svg'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
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
                
                {selectedSpot.time && (
                  <div className="info-item">
                    <FiClock />
                    <div>
                      <strong>{language === 'ko' ? '운영시간' : 'Hours'}</strong>
                      <p>{selectedSpot.time.replace(/<br\s*\/?>/gi, ' ')}</p>
                    </div>
                  </div>
                )}
                
                {selectedSpot.phone && (
                  <div className="info-item">
                    <FiPhone />
                    <div>
                      <strong>{language === 'ko' ? '전화번호' : 'Phone'}</strong>
                      <p>{selectedSpot.phone}</p>
                    </div>
                  </div>
                )}
                
                {selectedSpot.fee && (
                  <div className="info-item">
                    <span className="icon-text">💰</span>
                    <div>
                      <strong>{language === 'ko' ? '이용요금' : 'Fee'}</strong>
                      <p>{selectedSpot.fee}</p>
                    </div>
                  </div>
                )}
                
                {selectedSpot.parking && (
                  <div className="info-item">
                    <span className="icon-text">🅿️</span>
                    <div>
                      <strong>{language === 'ko' ? '주차시설' : 'Parking'}</strong>
                      <p>{selectedSpot.parking}</p>
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

              {/* 사진 출처 안내 */}
              <div className="photo-credit">
                <FiCamera />
                <span>
                  {language === 'ko' 
                    ? '사진 제공: 한국관광공사 / 대전사진누리' 
                    : 'Photos by: Korea Tourism Organization / Daejeon Photo'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TravelPage
