import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { FiArrowLeft, FiCalendar, FiMapPin, FiClock, FiUser, FiEye, FiHeart, FiShare2, FiNavigation, FiInfo, FiMap, FiEdit3, FiPhone } from 'react-icons/fi'
import { FaWalking, FaCar, FaBus, FaSubway } from 'react-icons/fa'
import { useLanguage } from '../context/LanguageContext'
import { getPublishedTripPlanDetail, toggleTripLike, checkTripLiked, getPlaceDetail } from '../services/tripService'
import { getCarRoute } from '../services/kakaoMobilityService'
import { getReliableImageUrl, DEFAULT_IMAGE } from '../utils/imageUtils'
import { generateSlug } from '../utils/slugUtils'
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

// 안정적인 이미지 컴포넌트
const SafeImage = ({ src, alt, fallback = DEFAULT_IMAGE, className = '' }) => {
  const [imgSrc, setImgSrc] = useState(() => getReliableImageUrl(src, fallback))
  const [hasError, setHasError] = useState(false)
  
  useEffect(() => {
    setImgSrc(getReliableImageUrl(src, fallback))
    setHasError(false)
  }, [src, fallback])
  
  const handleError = () => {
    if (!hasError) {
      setHasError(true)
      setImgSrc(fallback)
    }
  }
  
  return (
    <img 
      src={imgSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={handleError}
    />
  )
}

// 장소 카드 컴포넌트 - 모든 정보를 인라인으로 표시 (SEO 포함)
const PlaceCard = ({ place, placeIndex, dayIndex, dayColor, nextPlace, language, t, handleDirection }) => {
  const [placeDetail, setPlaceDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // 컴포넌트 마운트 시 상세 정보 로드
  useEffect(() => {
    const loadDetail = async () => {
      if (place.placeType && place.placeName) {
        setLoading(true)
        try {
          const result = await getPlaceDetail(place.placeType, place.placeName)
          if (result.success && result.detail) {
            setPlaceDetail(result.detail)
          }
        } catch (err) {
          console.error('Failed to load place detail:', err)
        }
        setLoading(false)
      } else {
        setLoading(false)
      }
    }
    loadDetail()
  }, [place.placeType, place.placeName])
  
  const address = placeDetail?.address || place.address || place.placeAddress
  const imageUrl = placeDetail?.imageUrl || place.placeImage
  
  // DB에서 가져온 교통 정보 파싱 (안전하게 처리)
  const parseTransportData = (data) => {
    if (!data) return null
    // 이미 객체인 경우
    if (typeof data === 'object') return data
    // 단순 문자열인 경우 (예: "walk", "bus", "car") - 타입만 반환
    if (typeof data === 'string') {
      // JSON 문자열인지 확인
      if (data.startsWith('{') || data.startsWith('[')) {
        try {
          return JSON.parse(data)
        } catch (e) {
          return { type: data }
        }
      }
      // 단순 타입 문자열
      return { type: data }
    }
    return null
  }
  
  const transportInfo = parseTransportData(place.transportToNext)
  const transitInfo = parseTransportData(place.transitToNext)
  
  // 디버그 로그 - 대중교통 데이터 확인
  useEffect(() => {
    if (transitInfo) {
      console.log(`[DEBUG] 장소: ${place.placeName}`)
      console.log('[DEBUG] transitInfo 전체:', JSON.stringify(transitInfo, null, 2))
      if (transitInfo.routeDetails) {
        transitInfo.routeDetails.forEach((route, idx) => {
          console.log(`[DEBUG] routeDetails[${idx}]:`, {
            type: route.type,
            busNo: route.busNo,
            lineName: route.lineName,
            startStation: route.startStation,
            endStation: route.endStation
          })
        })
      }
    }
  }, [transitInfo, place.placeName])
  
  // 상세페이지 URL 생성 (contentId 필요)
  // placeDetail에서 contentId를 가져오거나, 없으면 null
  const contentId = placeDetail?.contentId
  const detailUrl = contentId && place.placeName
    ? `/spot/${generateSlug(place.placeName, contentId)}`
    : null
  
  return (
    <article 
      id={`place-card-${dayIndex}-${placeIndex}`}
      className="place-card" 
      style={{ '--place-color': dayColor }}
    >
      {/* 카드 헤더 - 번호와 이름 */}
      <header className="place-card-header">
        <div className="place-order-badge" style={{ backgroundColor: dayColor }}>
          {placeIndex + 1}
        </div>
        {detailUrl ? (
          <Link href={detailUrl} className="place-card-title-link">
            <h4 className="place-card-title">{place.placeName}</h4>
          </Link>
        ) : (
          <h4 className="place-card-title">{place.placeName}</h4>
        )}
        {place.stayDuration && (
          <span className="place-duration">
            <FiClock /> {place.stayDuration}분
          </span>
        )}
      </header>
      
      {/* 이미지 - 클릭 시 상세페이지로 이동 */}
      {detailUrl ? (
        <Link href={detailUrl} className="place-card-image-link">
          <div className="place-card-image">
            <SafeImage 
              src={imageUrl || DEFAULT_IMAGE}
              alt={`${place.placeName} - 대전 여행 명소`}
              fallback={DEFAULT_IMAGE}
            />
          </div>
        </Link>
      ) : (
        <div className="place-card-image">
          <SafeImage 
            src={imageUrl || DEFAULT_IMAGE}
            alt={`${place.placeName} - 대전 관광지`}
            fallback={DEFAULT_IMAGE}
          />
        </div>
      )}
      
      {/* 모든 정보 표시 */}
      <div className="place-card-content">
        {/* 주소 */}
        {address && (
          <div className="place-info-row">
            <FiMapPin className="info-icon" />
            <span className="info-text">{address}</span>
          </div>
        )}
        
        {/* 메모 */}
        {place.memo && (
          <div className="place-memo-inline">
            <FiEdit3 className="info-icon" />
            <span className="memo-text">{place.memo}</span>
          </div>
        )}
        
        {/* 로딩 표시 */}
        {loading && (
          <div className="place-card-loading">
            <div className="loading-spinner small" />
          </div>
        )}
        
        {/* 상세 정보 - 바로 표시 (확장 없이) */}
        {!loading && placeDetail && (
          <div className="place-detail-info">
            {/* 전화번호 */}
            {placeDetail.tel && (
              <div className="place-info-row">
                <FiPhone className="info-icon" />
                <a href={`tel:${placeDetail.tel}`} className="info-link">{placeDetail.tel}</a>
              </div>
            )}
            
            {/* 운영시간 */}
            {placeDetail.operatingHours && (
              <div className="place-info-row">
                <FiClock className="info-icon" />
                <span><strong>{t.detail.hours}:</strong> {placeDetail.operatingHours}</span>
              </div>
            )}
            
            {/* 휴무일 */}
            {placeDetail.closedDays && (
              <div className="place-info-row">
                <FiCalendar className="info-icon" />
                <span><strong>{t.detail.closed}:</strong> {placeDetail.closedDays}</span>
              </div>
            )}
            
            {/* 이용요금 */}
            {placeDetail.fee && (
              <div className="place-info-row">
                <FiInfo className="info-icon" />
                <span><strong>{t.detail.fee}:</strong> {placeDetail.fee}</span>
              </div>
            )}
            
            {/* 축제/행사 기간 */}
            {placeDetail.period && (
              <div className="place-info-row">
                <FiCalendar className="info-icon" />
                <span><strong>{t.common.period}:</strong> {placeDetail.period}</span>
              </div>
            )}
            
            {/* 설명 */}
            {placeDetail.description && (
              <p className="place-description">{placeDetail.description}</p>
            )}
            
            {/* 홈페이지 */}
            {placeDetail.homepage && (
              <div className="place-info-row">
                <a 
                  href={placeDetail.homepage} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="info-link homepage-link"
                >
                  {t.common.visitWebsite} →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 액션 버튼 */}
      <div className="place-card-actions">
        <button 
          className="direction-btn"
          onClick={() => handleDirection(place)}
        >
          <FiNavigation />
          {t.common.getDirections}
        </button>
        
        {detailUrl && (
          <Link 
            href={detailUrl}
            className="detail-link-btn"
          >
            <FiInfo />
            {language === 'ko' ? '상세페이지' : 'Details'}
          </Link>
        )}
      </div>
      
      {/* 다음 장소로의 이동 정보 - DB 데이터 사용 */}
      {nextPlace && (
        <div className="next-place-transit">
          <div className="transit-line" style={{ backgroundColor: dayColor }}></div>
          <div className="transit-content">
            <div className="transit-header">
              <FiNavigation className="transit-icon" style={{ color: dayColor }} />
              <span className="transit-title">
                {language === 'ko' ? '다음 장소로 이동' : 'Next Destination'}
              </span>
            </div>
            <div className="transit-destination">
              → <strong>{nextPlace.placeName}</strong>
            </div>
            
            {/* DB에서 가져온 교통 정보 표시 */}
            {(transportInfo || transitInfo) && (
              <div className="transit-info-row">
                {/* 교통 수단 타입 (단순 문자열인 경우) */}
                {transportInfo?.type && (
                  <span className="transit-method">
                    {transportInfo.type === 'car' && <><FaCar className="transit-method-icon" /> {language === 'ko' ? '자동차' : 'Car'}</>}
                    {transportInfo.type === 'walk' && <><FaWalking className="transit-method-icon" /> {language === 'ko' ? '도보' : 'Walk'}</>}
                    {transportInfo.type === 'bus' && <><FaBus className="transit-method-icon" /> {language === 'ko' ? '버스' : 'Bus'}</>}
                    {transportInfo.type === 'subway' && <><FaSubway className="transit-method-icon" /> {language === 'ko' ? '지하철' : 'Subway'}</>}
                  </span>
                )}
                
                {/* 자동차 상세 정보 (JSON 객체인 경우) */}
                {transportInfo && !transportInfo.type && transportInfo.duration && (
                  <span className="transit-method">
                    <FaCar className="transit-method-icon" />
                    {Math.round(transportInfo.duration / 60)}분
                    {transportInfo.distance && ` (${(transportInfo.distance / 1000).toFixed(1)}km)`}
                  </span>
                )}
                
                {/* 도보 상세 정보 */}
                {transportInfo?.walkDuration && (
                  <span className="transit-method">
                    <FaWalking className="transit-method-icon" />
                    {Math.round(transportInfo.walkDuration / 60)}분
                  </span>
                )}
              </div>
            )}
            
            {/* 대중교통 상세 정보 (transitInfo가 상세 객체인 경우) */}
            {transitInfo && !transitInfo.type && (
              <div className="transit-public-info">
                {/* 총 정보 헤더 */}
                {(transitInfo.totalTime || transitInfo.totalDistance || transitInfo.payment) && (
                  <div className="transit-summary">
                    {transitInfo.totalTime && (
                      <span className="summary-item">
                        <FiClock className="summary-icon" />
                        {transitInfo.totalTime}{typeof transitInfo.totalTime === 'number' ? '분' : ''}
                      </span>
                    )}
                    {transitInfo.totalDistance && (
                      <span className="summary-item">
                        <FiMap className="summary-icon" />
                        {typeof transitInfo.totalDistance === 'number' 
                          ? `${(transitInfo.totalDistance / 1000).toFixed(1)}km`
                          : transitInfo.totalDistance
                        }
                      </span>
                    )}
                    {transitInfo.payment && (
                      <span className="summary-item">
                        {typeof transitInfo.payment === 'number' 
                          ? `${transitInfo.payment.toLocaleString()}원`
                          : transitInfo.payment
                        }
                      </span>
                    )}
                  </div>
                )}
                
                {/* 경로 상세 (routeDetails) */}
                {transitInfo.routeDetails && transitInfo.routeDetails.length > 0 && (
                  <div className="route-details-list">
                    {transitInfo.routeDetails.map((route, idx) => (
                      <div key={idx} className={`route-detail-item ${route.type}`}>
                        {/* 도보 구간 */}
                        {route.type === 'walk' && (
                          <>
                            <FaWalking className="route-detail-icon walk" />
                            <div className="route-detail-content">
                              <span className="route-label">{language === 'ko' ? '도보' : 'Walk'}</span>
                              <span className="route-info">
                                {route.sectionTime && `${route.sectionTime}분`}
                                {route.distance && ` · ${route.distance}m`}
                              </span>
                            </div>
                          </>
                        )}
                        
                        {/* 버스 구간 */}
                        {route.type === 'bus' && (
                          <>
                            <FaBus className="route-detail-icon bus" style={{ color: route.busColor || '#22C55E' }} />
                            <div className="route-detail-content">
                              <div className="route-header">
                                <span className="route-badge bus" style={{ backgroundColor: route.busColor || '#22C55E' }}>
                                  {route.busNo}
                                </span>
                                {route.availableBuses && route.availableBuses.length > 1 && (
                                  <span className="alt-routes">
                                    +{route.availableBuses.length - 1}개 노선
                                  </span>
                                )}
                              </div>
                              {/* 승하차 정류장 정보 */}
                              {(route.startStation || route.endStation) && (
                                <div className="route-stations-detail">
                                  <div className="station-row">
                                    <span className="station-marker start"></span>
                                    <span className="station-text">
                                      <span className="station-type">승차</span>
                                      {route.startStation || '정보없음'}
                                    </span>
                                  </div>
                                  <div className="station-row">
                                    <span className="station-marker end"></span>
                                    <span className="station-text">
                                      <span className="station-type">하차</span>
                                      {route.endStation || '정보없음'}
                                    </span>
                                  </div>
                                </div>
                              )}
                              <span className="route-info">
                                {route.sectionTime && `${route.sectionTime}분`}
                                {route.stationCount && ` · ${route.stationCount}정거장`}
                                {route.distance && ` · ${(route.distance / 1000).toFixed(1)}km`}
                              </span>
                            </div>
                          </>
                        )}
                        
                        {/* 지하철 구간 */}
                        {route.type === 'subway' && (
                          <>
                            <FaSubway className="route-detail-icon subway" style={{ color: route.lineColor || '#3B82F6' }} />
                            <div className="route-detail-content">
                              <div className="route-header">
                                <span className="route-badge subway" style={{ backgroundColor: route.lineColor || '#3B82F6' }}>
                                  {route.lineName}
                                </span>
                              </div>
                              {/* 승하차역 정보 */}
                              {(route.startStation || route.endStation) && (
                                <div className="route-stations-detail">
                                  <div className="station-row">
                                    <span className="station-marker start"></span>
                                    <span className="station-text">
                                      <span className="station-type">승차</span>
                                      {route.startStation || '정보없음'}역
                                    </span>
                                  </div>
                                  <div className="station-row">
                                    <span className="station-marker end"></span>
                                    <span className="station-text">
                                      <span className="station-type">하차</span>
                                      {route.endStation || '정보없음'}역
                                    </span>
                                  </div>
                                </div>
                              )}
                              <span className="route-info">
                                {route.sectionTime && `${route.sectionTime}분`}
                                {route.stationCount && ` · ${route.stationCount}역`}
                                {route.distance && ` · ${(route.distance / 1000).toFixed(1)}km`}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 구 버전 데이터 호환 (bus, subway 객체 - segments 포함) */}
                {!transitInfo.routeDetails && (transitInfo.bus || transitInfo.subway) && (
                  <>
                    {transitInfo.bus && (
                      <div className="transit-bus-section">
                        {/* 버스 헤더 - 버스번호 먼저, 시간 나중에 */}
                        <div className="transit-public-row">
                          <FaBus className="transit-public-icon bus" />
                          <div className="transit-public-detail">
                            {transitInfo.bus.routes && transitInfo.bus.routes.length > 0 && (
                              <span className="transit-routes">
                                {transitInfo.bus.routes.map((route, idx) => (
                                  <span key={idx} className="route-badge bus">{route}</span>
                                ))}
                              </span>
                            )}
                            <span className="transit-time">{transitInfo.bus.totalTime}분</span>
                          </div>
                        </div>
                        {/* 버스 구간별 승하차 정보 (segments) */}
                        {transitInfo.bus.segments && transitInfo.bus.segments.length > 0 && (
                          <div className="route-details-list">
                            {transitInfo.bus.segments.map((segment, idx) => (
                              <div key={idx} className="route-detail-item bus">
                                <FaBus className="route-detail-icon bus" />
                                <div className="route-detail-content">
                                  <div className="route-header">
                                    <span className="route-badge bus">
                                      {segment.busNo}
                                    </span>
                                    {segment.availableBuses && segment.availableBuses.length > 1 && (
                                      <span className="alt-routes">
                                        +{segment.availableBuses.length - 1}개 노선
                                      </span>
                                    )}
                                  </div>
                                  {/* 승하차 정류장 정보 */}
                                  {(segment.startStation || segment.endStation) && (
                                    <div className="route-stations-detail">
                                      <div className="station-row">
                                        <span className="station-marker start"></span>
                                        <span className="station-text">
                                          <span className="station-type">승차</span>
                                          {segment.startStation || '정보없음'}
                                        </span>
                                      </div>
                                      <div className="station-row">
                                        <span className="station-marker end"></span>
                                        <span className="station-text">
                                          <span className="station-type">하차</span>
                                          {segment.endStation || '정보없음'}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  <span className="route-info">
                                    {segment.sectionTime && `${segment.sectionTime}분`}
                                    {segment.stationCount && ` · ${segment.stationCount}정거장`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {transitInfo.subway && (
                      <div className="transit-subway-section">
                        {/* 지하철 헤더 - 노선 먼저, 시간 나중에 */}
                        <div className="transit-public-row">
                          <FaSubway className="transit-public-icon subway" />
                          <div className="transit-public-detail">
                            {transitInfo.subway.lines && transitInfo.subway.lines.length > 0 && (
                              <span className="transit-routes">
                                {transitInfo.subway.lines.map((line, idx) => (
                                  <span key={idx} className="route-badge subway">{line}</span>
                                ))}
                              </span>
                            )}
                            <span className="transit-time">{transitInfo.subway.totalTime || transitInfo.subway.time}분</span>
                          </div>
                        </div>
                        {/* 지하철 구간별 승하차 정보 (segments) */}
                        {transitInfo.subway.segments && transitInfo.subway.segments.length > 0 && (
                          <div className="route-details-list">
                            {transitInfo.subway.segments.map((segment, idx) => (
                              <div key={idx} className="route-detail-item subway">
                                <FaSubway className="route-detail-icon subway" />
                                <div className="route-detail-content">
                                  <div className="route-header">
                                    <span className="route-badge subway">
                                      {segment.lineName || '지하철'}
                                    </span>
                                  </div>
                                  {/* 승하차역 정보 */}
                                  {(segment.startStation || segment.endStation) && (
                                    <div className="route-stations-detail">
                                      <div className="station-row">
                                        <span className="station-marker start"></span>
                                        <span className="station-text">
                                          <span className="station-type">승차</span>
                                          {segment.startStation || '정보없음'}역
                                        </span>
                                      </div>
                                      <div className="station-row">
                                        <span className="station-marker end"></span>
                                        <span className="station-text">
                                          <span className="station-type">하차</span>
                                          {segment.endStation || '정보없음'}역
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  <span className="route-info">
                                    {segment.sectionTime && `${segment.sectionTime}분`}
                                    {segment.stationCount && ` · ${segment.stationCount}역`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                {/* 모든 대중교통 경로 옵션 (allRoutes) */}
                {transitInfo.allRoutes && transitInfo.allRoutes.length > 1 && (
                  <div className="all-routes-section">
                    <div className="all-routes-header">
                      <span className="all-routes-title">
                        {language === 'ko' ? '다른 경로 옵션' : 'Alternative Routes'}
                        <span className="routes-count">({transitInfo.allRoutes.length - 1})</span>
                      </span>
                    </div>
                    <div className="all-routes-list">
                      {transitInfo.allRoutes.slice(1).map((route, idx) => (
                        <div key={idx} className="alt-route-card">
                          <div className="alt-route-header">
                            <span className="alt-route-time">{route.totalTime}분</span>
                            {route.payment && (
                              <span className="alt-route-payment">{route.payment.toLocaleString()}원</span>
                            )}
                          </div>
                          <div className="alt-route-summary">
                            {route.busSummary && (
                              <span className="alt-route-type bus">
                                <FaBus /> {route.busSummary}
                              </span>
                            )}
                            {route.subwaySummary && (
                              <span className="alt-route-type subway">
                                <FaSubway /> {route.subwaySummary}
                              </span>
                            )}
                          </div>
                          {/* 상세 경로 표시 - 승하차 정류장 포함 */}
                          <div className="alt-route-details">
                            {route.routeDetails.map((detail, dIdx) => (
                              <div key={dIdx} className={`alt-route-step-block ${detail.type}`}>
                                <div className="alt-route-step-header">
                                  {detail.type === 'walk' && (
                                    <span className="alt-route-step-type">
                                      <FaWalking /> 도보 {detail.sectionTime}분
                                      {detail.distance && ` (${detail.distance}m)`}
                                    </span>
                                  )}
                                  {detail.type === 'bus' && (
                                    <>
                                      <span className="alt-route-step-type">
                                        <FaBus style={{ color: detail.busColor || '#22C55E' }} />
                                        <span className="alt-route-badge" style={{ backgroundColor: detail.busColor || '#22C55E' }}>
                                          {detail.busNo}
                                        </span>
                                        {detail.sectionTime}분 · {detail.stationCount}정거장
                                      </span>
                                      {(detail.startStation || detail.endStation) && (
                                        <div className="alt-route-stations">
                                          <span className="station-label">
                                            <span className="station-dot start"></span>
                                            승차: {detail.startStation || '정보없음'}
                                          </span>
                                          <span className="station-arrow">→</span>
                                          <span className="station-label">
                                            <span className="station-dot end"></span>
                                            하차: {detail.endStation || '정보없음'}
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {detail.type === 'subway' && (
                                    <>
                                      <span className="alt-route-step-type">
                                        <FaSubway style={{ color: detail.lineColor || '#3B82F6' }} />
                                        <span className="alt-route-badge" style={{ backgroundColor: detail.lineColor || '#3B82F6' }}>
                                          {detail.lineName}
                                        </span>
                                        {detail.sectionTime}분 · {detail.stationCount}역
                                      </span>
                                      {(detail.startStation || detail.endStation) && (
                                        <div className="alt-route-stations">
                                          <span className="station-label">
                                            <span className="station-dot start"></span>
                                            승차: {detail.startStation || '정보없음'}
                                          </span>
                                          <span className="station-arrow">→</span>
                                          <span className="station-label">
                                            <span className="station-dot end"></span>
                                            하차: {detail.endStation || '정보없음'}
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* 교통 정보가 없을 때 기본 메시지 */}
            {!transportInfo && !transitInfo && (
              <div className="transit-info-row">
                <span className="transit-no-info">
                  {language === 'ko' ? '이동 정보 없음' : 'No transit info'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

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
  const [selectedDay, setSelectedDay] = useState(0) // 선택된 일차 (지도용)
  const [mapReady, setMapReady] = useState(false)
  const [kakaoMapLoaded, setKakaoMapLoaded] = useState(!!window.kakao?.maps)
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
          
          // 클릭 이벤트 - 해당 카드로 스크롤
          markerContent.addEventListener('click', () => {
            const cardId = `place-card-${dayIndex}-${placeIndex}`
            const cardElement = document.getElementById(cardId)
            if (cardElement) {
              cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
              cardElement.classList.add('highlight')
              setTimeout(() => cardElement.classList.remove('highlight'), 2000)
            }
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
            ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${getReliableImageUrl(trip.thumbnailUrl)})`
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
          
          <div className="trip-layout trip-layout-cards">
            {/* 일정 목록 - 카드 기반 레이아웃 */}
            <div className="trip-schedule-cards">
              {trip.days && trip.days.length > 0 ? (
                trip.days.map((day, dayIndex) => (
                  <div 
                    key={dayIndex} 
                    className="day-section-card"
                    style={{ '--day-color': DAY_COLORS[dayIndex % DAY_COLORS.length] }}
                  >
                    <div className="day-header-card">
                      <span className="day-number-badge">
                        {language === 'ko' ? `${dayIndex + 1}${t.trip.day}` : `Day ${dayIndex + 1}`}
                      </span>
                    </div>
                    
                    <div className="places-grid">
                      {day.places && day.places.length > 0 ? (
                        day.places.map((place, placeIndex) => (
                          <PlaceCard 
                            key={placeIndex}
                            place={place}
                            placeIndex={placeIndex}
                            dayIndex={dayIndex}
                            dayColor={DAY_COLORS[dayIndex % DAY_COLORS.length]}
                            nextPlace={day.places[placeIndex + 1]}
                            language={language}
                            t={t}
                            handleDirection={handleDirection}
                          />
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
          </div>
        </div>
      </div>
      
      {/* SEO용 숨겨진 섹션 - 검색엔진 크롤러용 (사용자에게는 보이지 않음) */}
      <section className="seo-hidden-section" aria-hidden="true">
        <h2>{trip.title} - {language === 'ko' ? '대전 여행 코스' : 'Daejeon Travel Course'}</h2>
        {trip.description && <p>{trip.description}</p>}
        {trip.days?.map((day, dayIdx) => (
          <div key={dayIdx}>
            <h3>{language === 'ko' ? `${dayIdx + 1}일차` : `Day ${dayIdx + 1}`}</h3>
            {day.places?.map((place, placeIdx) => (
              <article key={placeIdx}>
                <h4>{placeIdx + 1}. {place.placeName}</h4>
                {(place.address || place.placeAddress) && <p>{place.address || place.placeAddress}</p>}
                {place.memo && <p>{place.memo}</p>}
              </article>
            ))}
          </div>
        ))}
        <p>{language === 'ko' 
          ? '대전 여행, 대전 관광, 대전 가볼만한곳, 대전 맛집, 대전 명소'
          : 'Daejeon travel, Daejeon tourism, places to visit in Daejeon'
        }</p>
      </section>
      
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