import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { FiArrowLeft, FiCalendar, FiMapPin, FiClock, FiUser, FiEye, FiHeart, FiShare2, FiNavigation, FiX, FiInfo, FiMap } from 'react-icons/fi'
import { FaBus, FaSubway, FaWalking, FaCar, FaBicycle } from 'react-icons/fa'
import { useLanguage } from '../context/LanguageContext'
import { getPublishedTripPlanDetail, toggleTripLike, checkTripLiked, getPlaceDetail } from '../services/tripService'
import { getPublicTransitRoute } from '../services/odsayService'
import { getCoordinatesFromAddress, getCarRoute } from '../services/kakaoMobilityService'
// CSS는 pages/_app.jsx에서 import

// 일차별 경로 색상
const DAY_COLORS = [
  '#3B82F6', // 파랑
  '#10B981', // 초록
  '#F59E0B', // 주황
  '#EF4444', // 빨강
  '#8B5CF6', // 보라
  '#EC4899', // 분홍
  '#06b6d4', // 청록
]

const SharedTripPage = () => {
  const router = useRouter()
  const { tripId } = router.query
  const { language, t } = useLanguage()
  
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likingInProgress, setLikingInProgress] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [placeDetail, setPlaceDetail] = useState(null) // DB에서 가져온 장소 상세 정보
  const [detailLoading, setDetailLoading] = useState(false)
  const [transitInfo, setTransitInfo] = useState(null)
  const [transitLoading, setTransitLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0) // 선택된 일차 (지도용)
  const [mapReady, setMapReady] = useState(false)
  const [kakaoMapLoaded, setKakaoMapLoaded] = useState(!!window.kakao?.maps)
  const detailCardRef = useRef(null)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const polylinesRef = useRef([])
  const overlaysRef = useRef([])
  
  // 카카오맵 SDK 로드 대기
  useEffect(() => {
    if (window.kakao?.maps) {
      setKakaoMapLoaded(true)
      return
    }
    
    const handleKakaoLoad = () => {
      setKakaoMapLoaded(true)
    }
    
    window.addEventListener('kakaoMapLoaded', handleKakaoLoad)
    return () => window.removeEventListener('kakaoMapLoaded', handleKakaoLoad)
  }, [])
  
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
  
  // 카카오맵 초기화
  useEffect(() => {
    if (!trip || !kakaoMapLoaded || !window.kakao?.maps) {
      return
    }
    
    // 이미 맵이 생성되어 있으면 다시 생성하지 않음
    if (mapInstanceRef.current) {
      return
    }
    
    // DOM이 렌더링될 때까지 약간의 지연
    const initMap = () => {
      // 이미 맵이 생성되어 있으면 다시 생성하지 않음
      if (mapInstanceRef.current) {
        return
      }
      
      const container = mapRef.current
      if (!container) {
        setTimeout(initMap, 100)
        return
      }
      
      const { maps } = window.kakao
      
      // 모든 일차의 장소 좌표 수집
      const allPlaces = trip.days?.flatMap(day => day.places || []) || []
      const validPlaces = allPlaces.filter(p => p.lat && p.lng)
      
      if (validPlaces.length === 0) {
        return
      }
      
      // 중심점 계산
      const avgLat = validPlaces.reduce((sum, p) => sum + p.lat, 0) / validPlaces.length
      const avgLng = validPlaces.reduce((sum, p) => sum + p.lng, 0) / validPlaces.length
      
      const options = {
        center: new maps.LatLng(avgLat, avgLng),
        level: 6
      }
      
      const map = new maps.Map(container, options)
      mapInstanceRef.current = map
      
      // 지도 로드 완료
      maps.event.addListener(map, 'tilesloaded', () => {
        setMapReady(true)
      })
      
      // 컨트롤 추가
      const zoomControl = new maps.ZoomControl()
      map.addControl(zoomControl, maps.ControlPosition.RIGHT)
      
      setMapReady(true)
    }
    
    initMap()
  }, [trip, kakaoMapLoaded])
  
  // 선택된 일차의 경로 표시 (실제 자동차 경로)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !trip?.days) {
      return
    }
    
    const { maps } = window.kakao
    const map = mapInstanceRef.current
    
    // 기존 마커/오버레이/경로선 제거
    markersRef.current.forEach(m => m.setMap(null))
    overlaysRef.current.forEach(o => o.setMap(null))
    polylinesRef.current.forEach(p => p.setMap(null))
    markersRef.current = []
    overlaysRef.current = []
    polylinesRef.current = []
    
    const bounds = new maps.LatLngBounds()
    
    // 비동기 경로 그리기 함수
    const drawRoutes = async () => {
      // 일차별로 경로 표시
      for (let dayIndex = 0; dayIndex < trip.days.length; dayIndex++) {
        const day = trip.days[dayIndex]
        const places = day.places || []
        const validPlaces = places.filter(p => p.lat && p.lng)
        
        if (validPlaces.length === 0) {
          continue
        }
        
        const dayColor = DAY_COLORS[dayIndex % DAY_COLORS.length]
        const isSelected = dayIndex === selectedDay
        const opacity = isSelected ? 1 : 0.3
        
        // 마커 및 오버레이 생성
        validPlaces.forEach((place, placeIndex) => {
          const position = new maps.LatLng(place.lat, place.lng)
          bounds.extend(position)
          
          // 커스텀 마커 오버레이 (번호 원)
          const markerContent = document.createElement('div')
          markerContent.innerHTML = `
            <div style="
              background: ${dayColor};
              color: white;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 14px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              opacity: ${opacity};
              border: 3px solid white;
              cursor: pointer;
              transition: transform 0.2s;
            ">${placeIndex + 1}</div>
          `
          
          const overlay = new maps.CustomOverlay({
            position,
            content: markerContent,
            yAnchor: 0.5,
            xAnchor: 0.5,
            zIndex: 999,
            map: mapInstanceRef.current
          })
          overlaysRef.current.push(overlay)
          
          // 클릭 이벤트
          markerContent.addEventListener('click', () => {
            handlePlaceClick(place, dayIndex, placeIndex)
          })
          
          // 호버 효과
          markerContent.addEventListener('mouseenter', () => {
            markerContent.firstElementChild.style.transform = 'scale(1.2)'
          })
          markerContent.addEventListener('mouseleave', () => {
            markerContent.firstElementChild.style.transform = 'scale(1)'
          })
        })
        
        // 실제 자동차 경로 가져와서 그리기
        for (let i = 0; i < validPlaces.length - 1; i++) {
          const origin = validPlaces[i]
          const destination = validPlaces[i + 1]
          
          try {
            // 실제 자동차 경로 API 호출
            const routeResult = await getCarRoute(
              { lat: origin.lat, lng: origin.lng },
              { lat: destination.lat, lng: destination.lng },
              true // includePath: 경로 좌표 포함
            )
            
            if (routeResult.success && routeResult.path && routeResult.path.length > 0) {
              // 실제 도로 경로로 폴리라인 그리기
              const path = routeResult.path.map(coord => 
                new maps.LatLng(coord.lat, coord.lng)
              )
              
              const polyline = new maps.Polyline({
                path,
                strokeWeight: isSelected ? 5 : 3,
                strokeColor: dayColor,
                strokeOpacity: isSelected ? 0.9 : 0.3,
                strokeStyle: 'solid'
              })
              polyline.setMap(map)
              polylinesRef.current.push(polyline)
            } else {
              // 경로 실패시 직선으로 연결
              const linePath = [
                new maps.LatLng(origin.lat, origin.lng),
                new maps.LatLng(destination.lat, destination.lng)
              ]
              const polyline = new maps.Polyline({
                path: linePath,
                strokeWeight: isSelected ? 5 : 3,
                strokeColor: dayColor,
                strokeOpacity: isSelected ? 0.9 : 0.3,
                strokeStyle: 'dashed' // 직선 경로는 점선으로 표시
              })
              polyline.setMap(map)
              polylinesRef.current.push(polyline)
            }
          } catch (err) {
            // 에러 시 직선 연결
            const linePath = [
              new maps.LatLng(origin.lat, origin.lng),
              new maps.LatLng(destination.lat, destination.lng)
            ]
            const polyline = new maps.Polyline({
              path: linePath,
              strokeWeight: isSelected ? 5 : 3,
              strokeColor: dayColor,
              strokeOpacity: isSelected ? 0.9 : 0.3,
              strokeStyle: 'dashed'
            })
            polyline.setMap(map)
            polylinesRef.current.push(polyline)
          }
        }
      }
      
      // 지도 범위 조정
      if (bounds.isEmpty() === false) {
        map.setBounds(bounds)
      }
    }
    
    drawRoutes()
  }, [mapReady, trip, selectedDay])
  
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
        alert(t.common.linkCopied)
      } catch (err) {
        // 복사 실패
      }
    }
  }
  
  // 장소 길찾기
  const handleDirection = async (place) => {
    const address = place.address || place.placeAddress
    
    if (address) {
      // 주소로 검색
      const kakaoSearchUrl = `https://map.kakao.com/link/search/${encodeURIComponent(address)}`
      window.open(kakaoSearchUrl, '_blank')
    } else {
      // 주소가 없으면 장소 이름으로 검색
      const kakaoSearchUrl = `https://map.kakao.com/link/search/${encodeURIComponent(place.placeName)}`
      window.open(kakaoSearchUrl, '_blank')
    }
  }
  
  // 다음 장소까지의 이동 정보 조회 (저장된 정보 우선 사용)
  const fetchTransitInfo = async (currentPlace, nextPlace) => {
    const transportType = currentPlace?.transportToNext
    
    setTransitLoading(true)
    
    try {
      // 1. 먼저 DB에 저장된 경로 정보 확인 (모든 이동 수단)
      if (currentPlace?.transitToNext) {
        const savedInfo = currentPlace.transitToNext
        
        // 대중교통이 아닌 경우 (도보, 자전거, 자가용, 택시)
        const nonTransitTypes = ['walk', 'bicycle', 'car', 'taxi']
        if (nonTransitTypes.includes(transportType)) {
          setTransitInfo({
            transportType: savedInfo.transportType || transportType,
            duration: savedInfo.duration,
            distance: savedInfo.distance,
            isEstimate: savedInfo.isEstimate,
            bus: null,
            subway: null,
            nextPlaceName: nextPlace.placeName
          })
          setTransitLoading(false)
          return
        }
        
        // 대중교통(버스/지하철)인 경우
        // savedInfo에 bus/subway 상세가 없으면 기본 정보만 표시
        let busInfo = savedInfo.bus || null
        let subwayInfo = savedInfo.subway || null
        
        // bus 타입인데 bus 상세 정보가 없으면 기본 카드만 표시하도록 설정
        if (transportType === 'bus' && !busInfo) {
          busInfo = {
            totalTime: savedInfo.duration,
            distance: savedInfo.distance,
            payment: savedInfo.payment,
            busRoutes: [],
            routeDetails: []
          }
        }
        
        // subway 타입인데 subway 상세 정보가 없으면 기본 카드만 표시하도록 설정
        if (transportType === 'subway' && !subwayInfo) {
          subwayInfo = {
            totalTime: savedInfo.duration,
            distance: savedInfo.distance,
            payment: savedInfo.payment,
            lines: [],
            routeDetails: []
          }
        }
        
        setTransitInfo({
          transportType: savedInfo.transportType || transportType,
          duration: savedInfo.duration,
          distance: savedInfo.distance,
          bus: busInfo,
          subway: subwayInfo,
          nextPlaceName: nextPlace.placeName
        })
        setTransitLoading(false)
        return
      }
      
      // 2. 저장된 정보가 없고, 대중교통이 아닌 경우 - 정보 없음 표시
      const nonTransitTypes = ['walk', 'bicycle', 'car', 'taxi']
      if (nonTransitTypes.includes(transportType)) {
        setTransitInfo({
          transportType,
          duration: null,
          distance: null,
          bus: null,
          subway: null,
          nextPlaceName: nextPlace.placeName
        })
        setTransitLoading(false)
        return
      }
      
      // 3. 저장된 정보가 없고, 대중교통인 경우 - API로 조회
      
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
      
      if (!currentLat || !currentLng || !nextLat || !nextLng) {
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
      
      // 지하철 경로 조회
      const subwayResult = await getPublicTransitRoute(
        currentLng, currentLat,
        nextLng, nextLat,
        'subway'
      )
      
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
  
  // 장소 선택 토글 및 상세 정보 로드
  const handlePlaceClick = async (place, dayIndex, placeIndex) => {
    if (selectedPlace?.dayIndex === dayIndex && selectedPlace?.placeIndex === placeIndex) {
      setSelectedPlace(null) // 같은 장소 클릭 시 닫기
      setTransitInfo(null)
      setPlaceDetail(null)
    } else {
      setSelectedPlace({ ...place, dayIndex, placeIndex })
      setPlaceDetail(null)
      
      // DB에서 장소 상세 정보 로드
      if (place.placeType && place.placeName) {
        setDetailLoading(true)
        try {
          const result = await getPlaceDetail(place.placeType, place.placeName)
          if (result.success && result.detail) {
            setPlaceDetail(result.detail)
          }
        } catch (err) {
          console.error('Failed to load place detail:', err)
        }
        setDetailLoading(false)
      }
      
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
          setPlaceDetail(null)
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
          <p>{t.common.loadingTrip}</p>
        </div>
      </div>
    )
  }
  
  if (error || !trip) {
    return (
      <div className="shared-trip-page">
        <div className="shared-trip-error">
          <h2>{t.ui.error}</h2>
          <p>{error || t.common.tripNotFound}</p>
          <Link href="/" className="back-home-btn">
            <FiArrowLeft /> {t.common.backToHome}
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
        <button className="back-btn" onClick={() => router.back()}>
          <FiArrowLeft />
          {t.ui.back}
        </button>
        
        <div className="hero-content">
          <h1 className="trip-title">{trip.title}</h1>
          
          <div className="trip-meta">
            <span className="meta-item">
              <FiUser /> {trip.authorNickname || t.ui.anonymous}
            </span>
            <span className="meta-item">
              <FiCalendar /> {trip.days?.length || 1}{t.trip.days}
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
              {t.ui.share}
            </button>
          </div>
        </div>
      </div>
      
      {/* 일정 내용 */}
      <div className="shared-trip-content">
        <div className="container">
          {/* 지도 섹션 */}
          <div className="trip-map-section">
            <div className="map-header">
              <h2><FiMap /> {t.trip.route}</h2>
              <div className="day-selector">
                {trip.days?.map((_, idx) => (
                  <button
                    key={idx}
                    className={`day-btn ${selectedDay === idx ? 'active' : ''}`}
                    style={{
                      '--day-color': DAY_COLORS[idx % DAY_COLORS.length]
                    }}
                    onClick={() => setSelectedDay(idx)}
                  >
                    {language === 'ko' ? `${idx + 1}${t.trip.day}` : `Day ${idx + 1}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="trip-map-container">
              <div ref={mapRef} className="trip-map"></div>
              <div className="map-legend">
                {trip.days?.map((day, idx) => (
                  <div key={idx} className="legend-item" style={{ opacity: selectedDay === idx ? 1 : 0.5 }}>
                    <span className="legend-color" style={{ backgroundColor: DAY_COLORS[idx % DAY_COLORS.length] }}></span>
                    <span>{language === 'ko' ? `${idx + 1}${t.trip.day}` : `Day ${idx + 1}`} ({day.places?.length || 0}{t.trip.places})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="trip-layout">
            {/* 왼쪽: 일정 목록 */}
            <div className="trip-schedule">
              {trip.days && trip.days.length > 0 ? (
                trip.days.map((day, dayIndex) => (
                  <div 
                    key={dayIndex} 
                    className={`day-section ${selectedDay === dayIndex ? 'active' : ''}`}
                    onClick={() => setSelectedDay(dayIndex)}
                  >
                    <div className="day-header" style={{ '--day-color': DAY_COLORS[dayIndex % DAY_COLORS.length] }}>
                      <span className="day-number">
                        {language === 'ko' ? `${dayIndex + 1}${t.trip.day}` : `Day ${dayIndex + 1}`}
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
                          <p>{t.trip.noPlaces}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-trip">
                  <FiMapPin />
                  <p>{t.trip.noItinerary}</p>
                </div>
              )}
            </div>
            
            {/* 오른쪽: 장소 상세 정보 카드 */}
            <div className={`place-detail-panel ${selectedPlace ? 'visible' : ''}`}>
              {selectedPlace && (
                <div ref={detailCardRef} className="place-detail-card">
                  <button className="close-detail-btn" onClick={() => { setSelectedPlace(null); setTransitInfo(null); setPlaceDetail(null); }}>
                    <FiX />
                  </button>
                  
                  {/* 장소 이미지 */}
                  {(placeDetail?.imageUrl || selectedPlace.placeImage) && (
                    <div className="detail-image">
                      <img 
                        src={placeDetail?.imageUrl || selectedPlace.placeImage} 
                        alt={selectedPlace.placeName}
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    </div>
                  )}
                  
                  <h3 className="detail-place-name">{selectedPlace.placeName}</h3>
                  
                  {/* 로딩 중 */}
                  {detailLoading && (
                    <div className="detail-loading">
                      <div className="loading-spinner small" />
                      <span>{t.common.loadingDetails}</span>
                    </div>
                  )}
                  
                  {/* DB 상세 정보 */}
                  {placeDetail && !detailLoading && (
                    <div className="db-detail-section">
                      {placeDetail.description && (
                        <div className="detail-description">
                          <p>{placeDetail.description}</p>
                        </div>
                      )}
                      
                      {placeDetail.tel && (
                        <div className="detail-row">
                          <FiInfo />
                          <span>{t.detail.phone}: {placeDetail.tel}</span>
                        </div>
                      )}
                      
                      {placeDetail.operatingHours && (
                        <div className="detail-row">
                          <FiClock />
                          <span>{t.detail.hours}: {placeDetail.operatingHours}</span>
                        </div>
                      )}
                      
                      {placeDetail.closedDays && (
                        <div className="detail-row">
                          <FiCalendar />
                          <span>{t.detail.closed}: {placeDetail.closedDays}</span>
                        </div>
                      )}
                      
                      {(placeDetail.fee || placeDetail.price) && (
                        <div className="detail-row">
                          <FiInfo />
                          <span>{t.detail.fee}: {placeDetail.fee || placeDetail.price}</span>
                        </div>
                      )}
                      
                      {placeDetail.menu && (
                        <div className="detail-row">
                          <FiInfo />
                          <span>{t.detail.menu}: {placeDetail.menu}</span>
                        </div>
                      )}
                      
                      {placeDetail.period && (
                        <div className="detail-row">
                          <FiCalendar />
                          <span>{t.common.period}: {placeDetail.period}</span>
                        </div>
                      )}
                      
                      {placeDetail.homepage && (
                        <div className="detail-row">
                          <FiInfo />
                          <a href={placeDetail.homepage} target="_blank" rel="noopener noreferrer" className="detail-link">
                            {t.common.visitWebsite}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 주소 */}
                  {(selectedPlace.address || placeDetail?.address) && (
                    <div className="detail-row">
                      <FiMapPin />
                      <span>{placeDetail?.address || selectedPlace.address}</span>
                    </div>
                  )}
                  
                  {selectedPlace.stayDuration && (
                    <div className="detail-row">
                      <FiClock />
                      <span>{selectedPlace.stayDuration}{t.transport.minutes} {t.transport.estimated}</span>
                    </div>
                  )}
                  
                  {selectedPlace.memo && (
                    <div className="detail-memo">
                      <strong>{t.trip.memo}</strong>
                      <p>{selectedPlace.memo}</p>
                    </div>
                  )}
                  
                  <button 
                    className="detail-direction-btn"
                    onClick={() => handleDirection(selectedPlace)}
                  >
                    <FiNavigation />
                    {t.common.getDirections}
                  </button>
                  
                  {/* 다음 장소로 이동하는 대중교통 정보 */}
                  {transitLoading && (
                    <div className="transit-loading">
                      <div className="loading-spinner small" />
                      <span>{t.transport.loadingTransit}</span>
                    </div>
                  )}
                  
                  {transitInfo && !transitLoading && (
                    <div className="transit-info-section">
                      <h4 className="transit-title">
                        <FiNavigation />
                        {language === 'ko' 
                          ? `${transitInfo.nextPlaceName}${t.transport.toPlace}`
                          : `${t.transport.toPlace} ${transitInfo.nextPlaceName}`
                        }
                      </h4>
                      
                      {/* 버스 정보 */}
                      {transitInfo.bus && !transitInfo.bus.noRoute && (
                        <div className="transit-card bus">
                          <div className="transit-header">
                            <FaBus className="transit-icon bus" />
                            <span className="transit-type">{t.transport.bus}</span>
                            <span className="transit-time">
                              {transitInfo.bus.totalTime}{t.transport.minutes}
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
                                {t.transport.availableRoutes}:
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
                            <span className="transit-type">{t.transport.subway}</span>
                            <span className="transit-time">
                              {transitInfo.subway.totalTime}{t.transport.minutes}
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
                                {t.transport.line}:
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
                      
                      {/* 비대중교통 이동수단 (택시, 도보, 자전거, 자가용) */}
                      {['taxi', 'car', 'walk', 'bicycle'].includes(transitInfo.transportType) && (
                        <div className={`transit-card ${transitInfo.transportType}`}>
                          <div className="transit-header">
                            {transitInfo.transportType === 'taxi' && <FaCar className="transit-icon taxi" />}
                            {transitInfo.transportType === 'car' && <FaCar className="transit-icon car" />}
                            {transitInfo.transportType === 'walk' && <FaWalking className="transit-icon walk" />}
                            {transitInfo.transportType === 'bicycle' && <FaBicycle className="transit-icon bicycle" />}
                            <span className="transit-type">
                              {transitInfo.transportType === 'taxi' && t.transport.taxi}
                              {transitInfo.transportType === 'car' && t.transport.car}
                              {transitInfo.transportType === 'walk' && t.transport.walk}
                              {transitInfo.transportType === 'bicycle' && t.transport.bicycle}
                            </span>
                            {transitInfo.duration && (
                              <span className="transit-time">
                                {transitInfo.duration}{t.transport.minutes}
                              </span>
                            )}
                          </div>
                          {transitInfo.distance && (
                            <div className="transit-details">
                              <span className="transit-distance">
                                {t.transport.distance}: {typeof transitInfo.distance === 'number' && transitInfo.distance >= 1 
                                  ? `${transitInfo.distance.toFixed(1)}km`
                                  : `${Math.round((transitInfo.distance || 0) * 1000)}m`}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 대중교통 경로가 없고 비대중교통도 아닐 때 */}
                      {(!transitInfo.bus || transitInfo.bus.noRoute) && 
                       (!transitInfo.subway || transitInfo.subway.noRoute) &&
                       !['taxi', 'car', 'walk', 'bicycle'].includes(transitInfo.transportType) && (
                        <div className="no-transit">
                          <FaWalking />
                          <span>{t.transport.walkOrDrive}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {!selectedPlace && (
                <div className="no-selection">
                  <FiInfo />
                  <p>{t.trip.clickToViewDetails}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 하단 CTA */}
      <div className="shared-trip-cta">
        <div className="container">
          <p>{t.trip.createYourOwn}</p>
          <Link href="/my-trip" className="create-trip-btn">
            {t.trip.createMyTrip}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SharedTripPage
