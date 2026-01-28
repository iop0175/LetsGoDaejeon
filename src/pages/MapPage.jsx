import { useState, useEffect, useMemo, useRef } from 'react'
import { FiMapPin, FiList, FiX, FiNavigation, FiPhone, FiClock, FiLoader } from 'react-icons/fi'
import { useLanguage } from '../context/LanguageContext'
import { getDaejeonParking } from '../services/api'
import { getAllDbData, getTourSpots as getTourSpotsDb } from '../services/dbService'
import { DISTRICTS, DISTRICT_NAMES, getDongFromAddr } from '../utils/constants'
import Icons from '../components/common/Icons'
import SEO, { SEO_DATA } from '../components/common/SEO'
// CSS는 pages/_app.jsx에서 import

const MapPage = () => {
  const { language, t } = useLanguage()
  const seoData = SEO_DATA.map[language] || SEO_DATA.map.ko
  const [activeTab, setActiveTab] = useState('tour')
  const [allPlaces, setAllPlaces] = useState([]) // 전체 데이터
  const [loading, setLoading] = useState(true)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [showList, setShowList] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [map, setMap] = useState(null)
  const [markers, setMarkers] = useState([])
  const [mapError, setMapError] = useState(null)
  const [infowindow, setInfowindow] = useState(null)
  
  // 필터 상태
  const [districtFilter, setDistrictFilter] = useState('all')
  const [dongFilter, setDongFilter] = useState('all')
  
  // 마커 참조 (최신 마커에 접근하기 위해)
  const markersRef = useRef([])
  // 선택된 장소 참조 (setBounds 실행 방지용)
  const selectedPlaceRef = useRef(null)

  // 카카오맵 API 키 (환경변수에서 로드) - Next.js + Vite 호환
  const KAKAO_MAP_KEY = typeof process !== 'undefined' 
    ? process.env.NEXT_PUBLIC_KAKAO_MAP_KEY 
    : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_KAKAO_MAP_KEY)

  // 주소에서 구 추출
  const getDistrictFromAddr = (addr) => {
    if (!addr) return null
    for (const district of DISTRICT_NAMES) {
      if (addr.includes(district)) return district
    }
    return null
  }

  // 선택된 구에 해당하는 동 목록 추출 (중복 제거)
  const availableDongs = useMemo(() => {
    if (districtFilter === 'all') return []
    
    const dongs = new Set()
    allPlaces.forEach(place => {
      const district = getDistrictFromAddr(place.address)
      if (district === districtFilter) {
        const dong = getDongFromAddr(place.address)
        if (dong) dongs.add(dong)
      }
    })
    
    return Array.from(dongs).sort()
  }, [allPlaces, districtFilter])

  // 필터링된 장소
  const places = useMemo(() => {
    let data = allPlaces
    
    if (districtFilter !== 'all') {
      data = data.filter(place => {
        const district = getDistrictFromAddr(place.address)
        return district === districtFilter
      })
    }
    
    if (dongFilter !== 'all') {
      data = data.filter(place => {
        const dong = getDongFromAddr(place.address)
        return dong === dongFilter
      })
    }
    
    return data
  }, [allPlaces, districtFilter, dongFilter])

  // 구/동 필터 변경 시 리셋
  useEffect(() => {
    setDongFilter('all')
    selectedPlaceRef.current = null
    setSelectedPlace(null)
  }, [districtFilter])

  useEffect(() => {
    selectedPlaceRef.current = null
    setSelectedPlace(null)
  }, [dongFilter])

  // 탭 변경 시 필터 리셋
  useEffect(() => {
    setDistrictFilter('all')
    setDongFilter('all')
    selectedPlaceRef.current = null
  }, [activeTab])

  // 카카오맵 SDK 로드
  useEffect(() => {
    const loadKakaoMap = () => {
      // 이미 로드되어 있으면 바로 사용
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        setMapLoaded(true)
        setMapError(null)
        return
      }

      if (!KAKAO_MAP_KEY) {
        setMapError('카카오맵 API 키가 설정되지 않았습니다.')
        return
      }

      // index.html에서 이미 로딩 중인 경우 이벤트 리스너로 대기
      const handleKakaoLoaded = () => {
        if (window.kakao && window.kakao.maps) {
          setMapLoaded(true)
          setMapError(null)
        }
      }

      window.addEventListener('kakaoMapLoaded', handleKakaoLoaded)

      // 이미 로드된 경우 바로 확인
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        setMapLoaded(true)
        setMapError(null)
        return
      }

      // 폴백: 스크립트가 아직 로드되지 않은 경우 직접 로드
      const existingScript = document.querySelector('script[src*="dapi.kakao.com"]')
      if (!existingScript) {
        const script = document.createElement('script')
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services`
        script.async = true
        
        script.onload = () => {
          if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(() => {
              setMapLoaded(true)
              setMapError(null)
            })
          }
        }
        
        script.onerror = () => {
          setMapError('카카오맵 스크립트 로드 실패. 도메인이 등록되었는지 확인해주세요.')
        }
        
        document.head.appendChild(script)
      }

      return () => {
        window.removeEventListener('kakaoMapLoaded', handleKakaoLoaded)
      }
    }

    loadKakaoMap()
  }, [KAKAO_MAP_KEY])

  // 지도 초기화
  useEffect(() => {
    if (!mapLoaded) return

    const container = document.getElementById('kakao-map')
    if (!container) return

    const options = {
      center: new window.kakao.maps.LatLng(36.3504, 127.3845), // 대전 중심
      level: 7
    }

    const newMap = new window.kakao.maps.Map(container, options)
    setMap(newMap)

    // 줌 컨트롤 추가
    const zoomControl = new window.kakao.maps.ZoomControl()
    newMap.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT)

  }, [mapLoaded])

  // 데이터 로드
  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    setSelectedPlace(null)
    
    try {
      let result
      switch (activeTab) {
        case 'tour':
          // 먼저 tour_spots에서 관광지(12) 데이터 시도
          result = await getTourSpotsDb('12', 1, 1000)
          console.log('[DEBUG] MapPage tour - 결과:', result)
          if (result.success && result.items.length > 0) {
            console.log('[DEBUG] MapPage tour - 샘플 mapx/mapy:', result.items[0].mapx, result.items[0].mapy)
            const tourPlaces = result.items.map(item => ({
              id: item.content_id || item.id,
              name: item.title,
              address: item.addr1 || item.addr2,
              summary: item.overview,
              type: 'tour',
              lat: parseCoord(item.mapy),
              lng: parseCoord(item.mapx)
            }))
            console.log('[DEBUG] MapPage tour - 변환된 샘플 lat/lng:', tourPlaces[0].lat, tourPlaces[0].lng)
            setAllPlaces(tourPlaces)
          } else {
            // 기존 travel_spots 테이블 시도
            result = await getAllDbData('travel')
            if (result.success) {
              const tourPlaces = result.items.map(item => ({
                id: item.tourspotNm,
                name: item.tourspotNm,
                address: item.tourspotAddr,
                summary: item.tourspotSumm,
                type: 'tour',
                lat: parseCoord(item.tourspotLat) || parseCoord(item.mapLat),
                lng: parseCoord(item.tourspotLng) || parseCoord(item.mapLot)
              }))
              setAllPlaces(tourPlaces)
            }
          }
          break
        case 'food':
          // 먼저 tour_spots에서 음식점(39) 데이터 시도
          result = await getTourSpotsDb('39', 1, 1000)
          if (result.success && result.items.length > 0) {
            setAllPlaces(result.items.map(item => ({
              id: item.content_id || item.id,
              name: item.title,
              address: item.addr1 || item.addr2,
              summary: item.overview,
              type: 'food',
              lat: parseCoord(item.mapy),
              lng: parseCoord(item.mapx)
            })))
          } else {
            // 기존 restaurants 테이블 시도
            result = await getAllDbData('food')
            if (result.success) {
              setAllPlaces(result.items.map(item => ({
                id: item.restrntNm,
                name: item.restrntNm,
                address: item.restrntAddr,
                summary: item.restrntSumm,
                menu: item.reprMenu,
                hours: item.salsTime,
                type: 'food',
                lat: parseCoord(item.mapLat),
                lng: parseCoord(item.mapLot)
              })))
            }
          }
          break
        case 'parking':
          result = await getDaejeonParking(1, 1000)
          if (result.success) {
            setAllPlaces(result.items.map(item => ({
              id: item.parkingId || item.name,
              name: item.name,
              address: item.addrRoad || item.addr,
              capacity: item.totalLot,
              fee: item.chargeInfo === '무료' ? '무료' : (item.basicCharge ? `${item.basicTime}분 ${item.basicCharge}원` : '정보없음'),
              parkingType: item.parkingType,
              type: 'parking',
              lat: item.lat,
              lng: item.lon
            })))
          }
          break
        default:
          break
      }
    } catch (error) {

    }
    
    setLoading(false)
  }

  // 좌표 파싱 (문자열 -> 숫자)
  const parseCoord = (coord) => {
    if (!coord) return null
    const num = parseFloat(coord)
    return isNaN(num) ? null : num
  }

  // 유효 좌표 체크
  const isValidCoord = (lat, lng) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return false
    if (Number.isNaN(lat) || Number.isNaN(lng)) return false
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  }

  // 대전시 대략 범위 (이상치 좌표 필터링용)
  const isWithinDaejeonBounds = (lat, lng) => {
    return lat >= 36.1 && lat <= 36.6 && lng >= 127.2 && lng <= 127.6
  }

  // 마커 업데이트
  useEffect(() => {
    if (!map || !places.length) return

    // 기존 마커 제거 (ref 사용)
    markersRef.current.forEach(marker => marker.setMap(null))
    
    // 기존 인포윈도우 닫기
    if (infowindow) {
      infowindow.close()
    }

    const newInfowindow = new window.kakao.maps.InfoWindow({ zIndex: 1 })
    setInfowindow(newInfowindow)
    
    const newMarkers = []
    const bounds = new window.kakao.maps.LatLngBounds()
    let hasValidCoords = false
    const markerMap = {} // place.id -> marker 매핑

    places.forEach((place, idx) => {
      if (place.lat == null || place.lng == null) return
      if (!isValidCoord(place.lat, place.lng)) return
      if (!isWithinDaejeonBounds(place.lat, place.lng)) return
      
      hasValidCoords = true
      const position = new window.kakao.maps.LatLng(place.lat, place.lng)
      bounds.extend(position)

      // 마커 이미지 (타입별 - 로컬 SVG 사용)
      const markerImageSrc = getMarkerIcon(place.type)
      const markerImage = new window.kakao.maps.MarkerImage(
        markerImageSrc,
        new window.kakao.maps.Size(32, 42),
        { offset: new window.kakao.maps.Point(16, 42) }
      )

      const marker = new window.kakao.maps.Marker({
        position,
        map,
        title: place.name,
        image: markerImage
      })

      // place id로 마커 매핑
      marker.placeId = place.id
      marker.place = place
      markerMap[place.id] = marker

      // 인포윈도우 내용
      const infoContent = `
        <div style="padding: 10px; min-width: 200px; max-width: 280px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;">${place.name}</h4>
          ${place.address ? `<p style="margin: 0; font-size: 12px; color: #666; line-height: 1.4;">${place.address}</p>` : ''}
          ${place.menu ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #888;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg> ${place.menu}</p>` : ''}
          ${place.capacity ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #888;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/><path d="M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/><path d="M5 17H3v-6l2-4h12l2 4v6h-2"/><path d="M9 17h6"/><path d="M3 11h18"/></svg> ${place.capacity}면 ${place.fee ? `| ${place.fee}` : ''}</p>` : ''}
          ${place.parkingType ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #4f46e5; font-weight: 500;">${place.parkingType}</p>` : ''}
        </div>
      `

      // 마커 클릭 이벤트 - 인포윈도우 표시
      window.kakao.maps.event.addListener(marker, 'click', () => {
        newInfowindow.setContent(infoContent)
        newInfowindow.open(map, marker)
        setSelectedPlace(place)
        map.panTo(position)
        map.setLevel(4)
      })

      // 마커 마우스오버 - 인포윈도우 미리보기
      window.kakao.maps.event.addListener(marker, 'mouseover', () => {
        newInfowindow.setContent(infoContent)
        newInfowindow.open(map, marker)
      })

      window.kakao.maps.event.addListener(marker, 'mouseout', () => {
        if (!selectedPlace || selectedPlace.id !== place.id) {
          newInfowindow.close()
        }
      })

      newMarkers.push(marker)
    })

    setMarkers(newMarkers)
    markersRef.current = newMarkers // ref도 동시에 업데이트

    // 지도 범위 조정 (선택된 장소가 없을 때만 - ref 사용으로 확실히 체크)
    if (hasValidCoords && newMarkers.length > 0 && !selectedPlaceRef.current) {
      map.setBounds(bounds)
      const level = map.getLevel()
      if (level > 7) {
        map.setLevel(7)
      }
    }

  }, [map, places])

  // 마커 아이콘 (타입별 - 로컬 SVG)
  const getMarkerIcon = (type) => {
    const icons = {
      tour: '/images/marker-tour.svg',
      food: '/images/marker-food.svg',
      parking: '/images/marker-parking.svg'
    }
    return icons[type] || icons.tour
  }

  // 장소 선택 (목록에서 클릭 시)
  const handlePlaceClick = (place) => {
    // ref도 동시에 업데이트 (setBounds 방지용)
    selectedPlaceRef.current = place
    setSelectedPlace(place)
    
    if (map && place.lat && place.lng) {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng)
      
      // 해당 마커 찾기 (ref 사용으로 최신 마커 참조)
      const targetMarker = markersRef.current.find(m => m.placeId === place.id)
      
      // 약간의 지연 후 지도 이동 (다른 지도 조작과 충돌 방지)
      setTimeout(() => {
        if (targetMarker && infowindow) {
          // 인포윈도우 내용 설정
          const infoContent = `
            <div style="padding: 10px; min-width: 200px; max-width: 280px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;">${place.name}</h4>
              ${place.address ? `<p style="margin: 0; font-size: 12px; color: #666; line-height: 1.4;">${place.address}</p>` : ''}
              ${place.menu ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #888;">${place.menu}</p>` : ''}
              ${place.capacity ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #888;">${place.capacity}면 ${place.fee ? `| ${place.fee}` : ''}</p>` : ''}
              ${place.parkingType ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #4f46e5; font-weight: 500;">${place.parkingType}</p>` : ''}
            </div>
          `
          infowindow.setContent(infoContent)
          infowindow.open(map, targetMarker)
        }
        
        // 지도 이동 및 줌
        map.setLevel(4)
        map.panTo(position)
      }, 50)
    }
  }

  // 탭 데이터
  const tabs = [
    { id: 'tour', label: t.pages.search.attractions, icon: <Icons.building size={16} /> },
    { id: 'food', label: t.pages.search.restaurants, icon: <Icons.food size={16} /> },
    { id: 'parking', label: t.nav.parking, icon: <Icons.parking size={16} /> }
  ]

  return (
    <>
      <SEO 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        url="/map"
      />
      <div className="map-page">
        {/* 상단 탭 */}
        <div className="map-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`map-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* 구/동 필터 버튼 */}
      <div className="map-filter-section">
        <div className="filter-group">
          <span className="filter-label">{t.pages.map.district}</span>
          <div className="filter-buttons">
            {DISTRICTS.map(district => (
              <button
                key={district.id}
                className={`filter-btn ${districtFilter === district.id ? 'active' : ''}`}
                onClick={() => setDistrictFilter(district.id)}
              >
                {language === 'ko' ? district.ko : district.en}
              </button>
            ))}
          </div>
        </div>
        
        {districtFilter !== 'all' && availableDongs.length > 0 && (
          <div className="filter-group dong-group">
            <span className="filter-label">{t.pages.map.area}</span>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${dongFilter === 'all' ? 'active' : ''}`}
                onClick={() => setDongFilter('all')}
              >
                {t.common.all}
              </button>
              {availableDongs.map(dong => (
                <button
                  key={dong}
                  className={`filter-btn ${dongFilter === dong ? 'active' : ''}`}
                  onClick={() => setDongFilter(dong)}
                >
                  {dong}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="map-container">
        {/* 사이드 리스트 */}
        <div className={`map-sidebar ${showList ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3>
              {tabs.find(tb => tb.id === activeTab)?.label}
              <span className="count">({places.length})</span>
            </h3>
            <button className="close-btn" onClick={() => setShowList(false)}>
              <FiX />
            </button>
          </div>
          
          <div className="place-list">
            {loading ? (
              <div className="list-loading">
                <FiLoader className="spinner" />
              </div>
            ) : (
              places.map((place, idx) => (
                <div
                  key={idx}
                  className={`place-item ${selectedPlace?.id === place.id ? 'selected' : ''}`}
                  onClick={() => handlePlaceClick(place)}
                >
                  <h4>{place.name}</h4>
                  <p className="place-address">
                    <FiMapPin />
                    {place.address || t.common.noAddress}
                  </p>
                  {place.menu && (
                    <p className="place-menu"><Icons.food size={14} /> {place.menu}</p>
                  )}
                  {place.capacity && (
                    <p className="place-capacity"><Icons.car size={14} /> {place.capacity}{t.pages.parking.spots}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 지도 영역 */}
        <div className="map-area">
          {!showList && (
            <button className="list-toggle" onClick={() => setShowList(true)}>
              <FiList />
              {t.pages.map.showList}
            </button>
          )}
          
          {mapError ? (
            <div className="map-placeholder">
              <p style={{color: '#ef4444'}}><Icons.warning size={16} /> {mapError}</p>
              <p className="map-notice">
                {language === 'ko' 
                  ? '카카오 개발자 사이트에서 도메인(localhost:3001)을 등록해주세요.'
                  : 'Please register your domain (localhost:3001) at Kakao Developers.'}
              </p>
            </div>
          ) : !mapLoaded ? (
            <div className="map-placeholder">
              <FiLoader className="spinner" />
              <p>{t.pages.map.loadingMap}</p>
              <p className="map-notice">
                {language === 'ko' 
                  ? '카카오맵 API 키가 필요합니다. 카카오 개발자 사이트에서 발급받으세요.'
                  : 'Kakao Map API key required. Get one from Kakao Developers.'}
              </p>
            </div>
          ) : (
            <div id="kakao-map" className="kakao-map"></div>
          )}
        </div>

        {/* 선택된 장소 정보 */}
        {selectedPlace && (
          <div className="place-detail">
            <button className="close-detail" onClick={() => setSelectedPlace(null)}>
              <FiX />
            </button>
            <h3>{selectedPlace.name}</h3>
            
            {selectedPlace.summary && (
              <p className="detail-summary">{selectedPlace.summary}</p>
            )}
            
            <div className="detail-info">
              {selectedPlace.address && (
                <div className="info-row">
                  <FiMapPin />
                  <span>{selectedPlace.address}</span>
                </div>
              )}
              
              {selectedPlace.menu && (
                <div className="info-row">
                  <span><Icons.food size={14} /></span>
                  <span>{selectedPlace.menu}</span>
                </div>
              )}
              
              {selectedPlace.hours && (
                <div className="info-row">
                  <FiClock />
                  <span>{selectedPlace.hours}</span>
                </div>
              )}
              
              {selectedPlace.capacity && (
                <div className="info-row">
                  <span><Icons.car size={14} /></span>
                  <span>{selectedPlace.capacity}{t.pages.map.spotsAvailable}</span>
                </div>
              )}
              
              {selectedPlace.fee && (
                <div className="info-row fee">
                  <span><Icons.money size={14} /></span>
                  <span>{selectedPlace.fee}</span>
                </div>
              )}
            </div>
            
            {selectedPlace.address && (
              <a
                href={`https://map.kakao.com/link/search/${encodeURIComponent(selectedPlace.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-btn"
              >
                <FiNavigation />
                {t.common.navigate}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  )
}

export default MapPage
