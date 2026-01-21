import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiCalendar, FiMapPin, FiClock, FiUser, FiEye, FiHeart, FiShare2, FiNavigation, FiX, FiInfo } from 'react-icons/fi'
import { FaBus, FaSubway, FaWalking } from 'react-icons/fa'
import { useLanguage } from '../context/LanguageContext'
import { getPublishedTripPlanDetail, toggleTripLike, checkTripLiked } from '../services/tripService'
import { getPublicTransitRoute } from '../services/odsayService'
import { getCoordinatesFromAddress } from '../services/kakaoMobilityService'
import './SharedTripPage.css'

const SharedTripPage = () => {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { language } = useLanguage()
  
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likingInProgress, setLikingInProgress] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [transitInfo, setTransitInfo] = useState(null)
  const [transitLoading, setTransitLoading] = useState(false)
  const detailCardRef = useRef(null)
  
  // 여행 계획 로드
  useEffect(() => {
    const loadTrip = async () => {
      try {
        // tripId를 숫자로 변환 (URL 파라미터는 문자열)
        const numericTripId = parseInt(tripId, 10)
        if (isNaN(numericTripId)) {
          setError('잘못된 여행 계획 ID입니다.')
          setLoading(false)
          return
        }
        
        const result = await getPublishedTripPlanDetail(numericTripId)
        if (result.success) {
          setTrip(result.plan)
          setLikeCount(result.plan.likeCount || 0)
          
          // 좋아요 상태 확인
          const likedResult = await checkTripLiked(numericTripId)
          if (likedResult.success) {
            setIsLiked(likedResult.liked)
          }
        } else {
          setError(result.error || '여행 계획을 불러오는데 실패했습니다.')
        }
      } catch (err) {
        setError('여행 계획을 불러오는데 실패했습니다.')
      }
      setLoading(false)
    }
    
    if (tripId) {
      loadTrip()
    }
  }, [tripId])
  
  // 좋아요 토글
  const handleLike = async () => {
    if (likingInProgress) return
    
    setLikingInProgress(true)
    try {
      const numericTripId = parseInt(tripId, 10)
      const result = await toggleTripLike(numericTripId)
      if (result.success) {
        setIsLiked(result.liked)
        setLikeCount(prev => result.liked ? prev + 1 : Math.max(0, prev - 1))
      }
    } catch (err) {
      // 에러 무시
    }
    setLikingInProgress(false)
  }
  
  // 공유하기
  const handleShare = async () => {
    const shareUrl = window.location.href
    const shareText = `${trip.title} - 대전 여행 코스`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: trip.title,
          text: shareText,
          url: shareUrl
        })
      } catch (err) {
        // 공유 취소됨
      }
    } else {
      // 클립보드에 복사
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert(language === 'ko' ? '링크가 복사되었습니다!' : 'Link copied!')
      } catch (err) {
        // 복사 실패
      }
    }
  }
  
  // 장소 길찾기
  const handleDirection = async (place) => {
    let lat = place.lat
    let lng = place.lng
    
    // 좌표가 없으면 주소에서 조회
    if ((!lat || !lng) && (place.address || place.placeAddress)) {
      const coordResult = await getCoordinatesFromAddress(place.address || place.placeAddress)
      if (coordResult.success) {
        lat = coordResult.lat
        lng = coordResult.lng
      }
    }
    
    if (lat && lng) {
      const kakaoMapUrl = `https://map.kakao.com/link/to/${encodeURIComponent(place.placeName)},${lat},${lng}`
      window.open(kakaoMapUrl, '_blank')
    } else {
      // 좌표가 없으면 장소 이름으로 검색
      const kakaoSearchUrl = `https://map.kakao.com/link/search/${encodeURIComponent(place.placeName)}`
      window.open(kakaoSearchUrl, '_blank')
    }
  }
  
  // 다음 장소까지의 대중교통 정보 조회 (저장된 정보 우선 사용)
  const fetchTransitInfo = async (currentPlace, nextPlace) => {
    setTransitLoading(true)
    
    try {
      // 1. 먼저 DB에 저장된 대중교통 정보 확인
      if (currentPlace?.transitToNext) {
        console.log('Using saved transit info:', currentPlace.transitToNext)
        setTransitInfo({
          bus: currentPlace.transitToNext.bus || null,
          subway: currentPlace.transitToNext.subway || null,
          nextPlaceName: nextPlace.placeName
        })
        setTransitLoading(false)
        return
      }
      
      // 2. 저장된 정보가 없으면 API 호출
      console.log('No saved transit info, fetching from API...')
      
      // 좌표가 없으면 주소에서 조회
      let currentLat = currentPlace?.lat
      let currentLng = currentPlace?.lng
      let nextLat = nextPlace?.lat
      let nextLng = nextPlace?.lng
      
      const currentAddr = currentPlace?.address || currentPlace?.placeAddress
      const nextAddr = nextPlace?.address || nextPlace?.placeAddress
      
      // 현재 장소 좌표 조회 (주소 실패 시 장소명으로 재시도)
      if (!currentLat || !currentLng) {
        if (currentAddr) {
          const coordResult = await getCoordinatesFromAddress(currentAddr)
          if (coordResult.success) {
            currentLat = coordResult.lat
            currentLng = coordResult.lng
          }
        }
        
        if ((!currentLat || !currentLng) && currentPlace?.placeName) {
          const coordResult = await getCoordinatesFromAddress(`대전 ${currentPlace.placeName}`)
          if (coordResult.success) {
            currentLat = coordResult.lat
            currentLng = coordResult.lng
          }
        }
      }
      
      // 다음 장소 좌표 조회 (주소 실패 시 장소명으로 재시도)
      if (!nextLat || !nextLng) {
        if (nextAddr) {
          const coordResult = await getCoordinatesFromAddress(nextAddr)
          if (coordResult.success) {
            nextLat = coordResult.lat
            nextLng = coordResult.lng
          }
        }
        
        if ((!nextLat || !nextLng) && nextPlace?.placeName) {
          const coordResult = await getCoordinatesFromAddress(`대전 ${nextPlace.placeName}`)
          if (coordResult.success) {
            nextLat = coordResult.lat
            nextLng = coordResult.lng
          }
        }
      }
      
      console.log('Transit search coords:', { currentLat, currentLng, nextLat, nextLng })
      
      if (!currentLat || !currentLng || !nextLat || !nextLng) {
        console.log('Missing coordinates, skipping transit search')
        setTransitInfo(null)
        setTransitLoading(false)
        return
      }
      
      // 버스 경로 조회
      const busResult = await getPublicTransitRoute(
        currentLng, currentLat,
        nextLng, nextLat,
        'bus'
      )
      console.log('Bus result:', busResult)
      
      // 지하철 경로 조회
      const subwayResult = await getPublicTransitRoute(
        currentLng, currentLat,
        nextLng, nextLat,
        'subway'
      )
      console.log('Subway result:', subwayResult)
      
      setTransitInfo({
        bus: busResult.success ? busResult : null,
        subway: subwayResult.success ? subwayResult : null,
        nextPlaceName: nextPlace.placeName
      })
    } catch (err) {
      setTransitInfo(null)
    }
    setTransitLoading(false)
  }
  
  // 장소 선택 토글
  const handlePlaceClick = async (place, dayIndex, placeIndex) => {
    if (selectedPlace?.dayIndex === dayIndex && selectedPlace?.placeIndex === placeIndex) {
      setSelectedPlace(null) // 같은 장소 클릭 시 닫기
      setTransitInfo(null)
    } else {
      setSelectedPlace({ ...place, dayIndex, placeIndex })
      
      // 다음 장소가 있으면 대중교통 정보 조회
      const day = trip?.days?.[dayIndex]
      const nextPlace = day?.places?.[placeIndex + 1]
      if (nextPlace) {
        await fetchTransitInfo(place, nextPlace)
      } else {
        setTransitInfo(null)
      }
    }
  }
  
  // 외부 클릭 시 상세 카드 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (detailCardRef.current && !detailCardRef.current.contains(e.target)) {
        // 클릭한 요소가 place-item이 아닌 경우에만 닫기
        if (!e.target.closest('.place-item')) {
          setSelectedPlace(null)
          setTransitInfo(null)
        }
      }
    }
    
    if (selectedPlace) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedPlace])
  
  if (loading) {
    return (
      <div className="shared-trip-page">
        <div className="shared-trip-loading">
          <div className="loading-spinner" />
          <p>{language === 'ko' ? '여행 계획을 불러오는 중...' : 'Loading trip plan...'}</p>
        </div>
      </div>
    )
  }
  
  if (error || !trip) {
    return (
      <div className="shared-trip-page">
        <div className="shared-trip-error">
          <h2>{language === 'ko' ? '오류' : 'Error'}</h2>
          <p>{error || (language === 'ko' ? '여행 계획을 찾을 수 없습니다.' : 'Trip plan not found.')}</p>
          <Link to="/" className="back-home-btn">
            <FiArrowLeft /> {language === 'ko' ? '홈으로 돌아가기' : 'Back to Home'}
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="shared-trip-page">
      {/* 헤더 영역 */}
      <div 
        className="shared-trip-hero"
        style={{ 
          backgroundImage: trip.thumbnailUrl 
            ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${trip.thumbnailUrl})`
            : 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))'
        }}
      >
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft />
          {language === 'ko' ? '뒤로' : 'Back'}
        </button>
        
        <div className="hero-content">
          <h1 className="trip-title">{trip.title}</h1>
          
          <div className="trip-meta">
            <span className="meta-item">
              <FiUser /> {trip.authorNickname || (language === 'ko' ? '익명' : 'Anonymous')}
            </span>
            <span className="meta-item">
              <FiCalendar /> {trip.days?.length || 1}{language === 'ko' ? '일' : ' day(s)'}
            </span>
            <span className="meta-item">
              <FiEye /> {trip.viewCount || 0}
            </span>
          </div>
          
          <div className="trip-actions">
            <button 
              className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
              onClick={handleLike}
              disabled={likingInProgress}
            >
              <FiHeart className={isLiked ? 'filled' : ''} />
              {likeCount}
            </button>
            <button className="action-btn share-btn" onClick={handleShare}>
              <FiShare2 />
              {language === 'ko' ? '공유' : 'Share'}
            </button>
          </div>
        </div>
      </div>
      
      {/* 일정 내용 */}
      <div className="shared-trip-content">
        <div className="container">
          <div className="trip-layout">
            {/* 왼쪽: 일정 목록 */}
            <div className="trip-schedule">
              {trip.days && trip.days.length > 0 ? (
                trip.days.map((day, dayIndex) => (
                  <div key={dayIndex} className="day-section">
                    <div className="day-header">
                      <span className="day-number">
                        {language === 'ko' ? `${dayIndex + 1}일차` : `Day ${dayIndex + 1}`}
                      </span>
                      {day.date && (
                        <span className="day-date">
                          {new Date(day.date).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short'
                          })}
                        </span>
                      )}
                    </div>
                    
                    <div className="places-timeline">
                      {day.places && day.places.length > 0 ? (
                        day.places.map((place, placeIndex) => (
                          <div 
                            key={placeIndex} 
                            className={`place-item ${selectedPlace?.dayIndex === dayIndex && selectedPlace?.placeIndex === placeIndex ? 'selected' : ''}`}
                            onClick={() => handlePlaceClick(place, dayIndex, placeIndex)}
                          >
                            <div className="place-order">{placeIndex + 1}</div>
                            <span className="place-name-badge">{place.placeName}</span>
                            <FiInfo className="place-info-icon" />
                          </div>
                        ))
                      ) : (
                        <div className="no-places">
                          <FiMapPin />
                          <p>{language === 'ko' ? '이 날에는 장소가 없습니다.' : 'No places for this day.'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-trip">
                  <FiMapPin />
                  <p>{language === 'ko' ? '아직 일정이 없습니다.' : 'No itinerary yet.'}</p>
                </div>
              )}
            </div>
            
            {/* 오른쪽: 장소 상세 정보 카드 */}
            <div className={`place-detail-panel ${selectedPlace ? 'visible' : ''}`}>
              {selectedPlace && (
                <div ref={detailCardRef} className="place-detail-card">
                  <button className="close-detail-btn" onClick={() => { setSelectedPlace(null); setTransitInfo(null); }}>
                    <FiX />
                  </button>
                  
                  <h3 className="detail-place-name">{selectedPlace.placeName}</h3>
                  
                  {selectedPlace.address && (
                    <div className="detail-row">
                      <FiMapPin />
                      <span>{selectedPlace.address}</span>
                    </div>
                  )}
                  
                  {selectedPlace.stayDuration && (
                    <div className="detail-row">
                      <FiClock />
                      <span>{selectedPlace.stayDuration}{language === 'ko' ? '분 예상' : ' min estimated'}</span>
                    </div>
                  )}
                  
                  {selectedPlace.memo && (
                    <div className="detail-memo">
                      <strong>{language === 'ko' ? '메모' : 'Note'}</strong>
                      <p>{selectedPlace.memo}</p>
                    </div>
                  )}
                  
                  <button 
                    className="detail-direction-btn"
                    onClick={() => handleDirection(selectedPlace)}
                  >
                    <FiNavigation />
                    {language === 'ko' ? '카카오맵으로 길찾기' : 'Get Directions'}
                  </button>
                  
                  {/* 다음 장소로 이동하는 대중교통 정보 */}
                  {transitLoading && (
                    <div className="transit-loading">
                      <div className="loading-spinner small" />
                      <span>{language === 'ko' ? '대중교통 정보 조회 중...' : 'Loading transit info...'}</span>
                    </div>
                  )}
                  
                  {transitInfo && !transitLoading && (
                    <div className="transit-info-section">
                      <h4 className="transit-title">
                        <FiNavigation />
                        {language === 'ko' 
                          ? `${transitInfo.nextPlaceName}까지 이동`
                          : `To ${transitInfo.nextPlaceName}`
                        }
                      </h4>
                      
                      {/* 버스 정보 */}
                      {transitInfo.bus && !transitInfo.bus.noRoute && (
                        <div className="transit-card bus">
                          <div className="transit-header">
                            <FaBus className="transit-icon bus" />
                            <span className="transit-type">{language === 'ko' ? '버스' : 'Bus'}</span>
                            <span className="transit-time">
                              {transitInfo.bus.totalTime}{language === 'ko' ? '분' : ' min'}
                            </span>
                          </div>
                          
                          {/* 저장된 데이터: segments 사용 */}
                          {transitInfo.bus.segments?.length > 0 && (
                            <div className="transit-details">
                              {transitInfo.bus.segments.map((seg, idx) => (
                                <div key={idx} className="transit-segment">
                                  <div className="segment-routes">
                                    {(seg.availableBuses || [seg.busNo]).slice(0, 5).map((bus, i) => (
                                      <span key={i} className="bus-badge">{bus}</span>
                                    ))}
                                  </div>
                                  <div className="segment-stations">
                                    <span className="station-name">{seg.startStation}</span>
                                    <span className="station-arrow">→</span>
                                    <span className="station-name">{seg.endStation}</span>
                                    <span className="station-count">({seg.stationCount}정거장)</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* API 응답: routeDetails 사용 (fallback) */}
                          {!transitInfo.bus.segments && transitInfo.bus.routeDetails?.filter(r => r.type === 'bus').length > 0 && (
                            <div className="transit-details">
                              {transitInfo.bus.routeDetails.filter(r => r.type === 'bus').map((seg, idx) => (
                                <div key={idx} className="transit-segment">
                                  <div className="segment-routes">
                                    {(seg.availableBuses || [{ busNo: seg.busNo }]).slice(0, 5).map((bus, i) => (
                                      <span key={i} className="bus-badge">{bus.busNo || bus}</span>
                                    ))}
                                  </div>
                                  <div className="segment-stations">
                                    <span className="station-name">{seg.startStation}</span>
                                    <span className="station-arrow">→</span>
                                    <span className="station-name">{seg.endStation}</span>
                                    <span className="station-count">({seg.stationCount}정거장)</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* 간단 노선 목록 (segments/routeDetails 없을 때) */}
                          {!transitInfo.bus.segments && !transitInfo.bus.routeDetails && transitInfo.bus.routes?.length > 0 && (
                            <div className="transit-routes">
                              <span className="routes-label">
                                {language === 'ko' ? '이용 가능 노선' : 'Available routes'}:
                              </span>
                              <div className="bus-routes">
                                {transitInfo.bus.routes.slice(0, 5).map((busNo, idx) => (
                                  <span key={idx} className="bus-badge">{busNo}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 지하철 정보 */}
                      {transitInfo.subway && !transitInfo.subway.noRoute && (
                        <div className="transit-card subway">
                          <div className="transit-header">
                            <FaSubway className="transit-icon subway" />
                            <span className="transit-type">{language === 'ko' ? '지하철' : 'Subway'}</span>
                            <span className="transit-time">
                              {transitInfo.subway.totalTime}{language === 'ko' ? '분' : ' min'}
                            </span>
                          </div>
                          
                          {/* 저장된 데이터: segments 사용 */}
                          {transitInfo.subway.segments?.length > 0 && (
                            <div className="transit-details">
                              {transitInfo.subway.segments.map((seg, idx) => (
                                <div key={idx} className="transit-segment">
                                  <div className="segment-routes">
                                    <span 
                                      className="subway-badge"
                                      style={{ backgroundColor: seg.lineColor || '#1a5dc8' }}
                                    >
                                      {seg.lineName}
                                    </span>
                                  </div>
                                  <div className="segment-stations">
                                    <span className="station-name">{seg.startStation}</span>
                                    <span className="station-arrow">→</span>
                                    <span className="station-name">{seg.endStation}</span>
                                    <span className="station-count">({seg.stationCount}역)</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* API 응답: routeDetails 사용 (fallback) */}
                          {!transitInfo.subway.segments && transitInfo.subway.routeDetails?.filter(r => r.type === 'subway').length > 0 && (
                            <div className="transit-details">
                              {transitInfo.subway.routeDetails.filter(r => r.type === 'subway').map((seg, idx) => (
                                <div key={idx} className="transit-segment">
                                  <div className="segment-routes">
                                    <span 
                                      className="subway-badge"
                                      style={{ backgroundColor: seg.lineColor || '#1a5dc8' }}
                                    >
                                      {seg.lineName}
                                    </span>
                                  </div>
                                  <div className="segment-stations">
                                    <span className="station-name">{seg.startStation}</span>
                                    <span className="station-arrow">→</span>
                                    <span className="station-name">{seg.endStation}</span>
                                    <span className="station-count">({seg.stationCount}역)</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* 간단 노선 목록 (segments/routeDetails 없을 때) */}
                          {!transitInfo.subway.segments && !transitInfo.subway.routeDetails && transitInfo.subway.lines?.length > 0 && (
                            <div className="transit-routes">
                              <span className="routes-label">
                                {language === 'ko' ? '이용 노선' : 'Line'}:
                              </span>
                              <div className="subway-lines">
                                {transitInfo.subway.lines.map((line, idx) => (
                                  <span key={idx} className="subway-badge">{line}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 대중교통 경로가 없을 때 */}
                      {(!transitInfo.bus || transitInfo.bus.noRoute) && 
                       (!transitInfo.subway || transitInfo.subway.noRoute) && (
                        <div className="no-transit">
                          <FaWalking />
                          <span>{language === 'ko' ? '도보 또는 자가용 이용' : 'Walk or drive'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {!selectedPlace && (
                <div className="no-selection">
                  <FiInfo />
                  <p>{language === 'ko' ? '장소를 클릭하면 상세 정보를 볼 수 있습니다' : 'Click a place to view details'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 하단 CTA */}
      <div className="shared-trip-cta">
        <div className="container">
          <p>{language === 'ko' ? '나만의 여행 계획을 만들어보세요!' : 'Create your own travel plan!'}</p>
          <Link to="/my-trip" className="create-trip-btn">
            {language === 'ko' ? '내 여행 만들기' : 'Create My Trip'}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SharedTripPage
