import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  FiPlus, FiTrash2, FiEdit2, FiMapPin, FiCalendar, FiClock, 
  FiChevronDown, FiChevronUp, FiSave, FiX, FiMap, FiCoffee,
  FiStar, FiNavigation, FiUsers, FiGrid, FiList, FiShare2,
  FiMaximize2, FiMinimize2, FiHome, FiSearch
} from 'react-icons/fi'
import { 
  FaCar, FaBus, FaSubway, FaWalking, FaTaxi, FaBicycle, FaParking 
} from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getReliableImageUrl, escapeHtml } from '../utils/imageUtils'
import { 
  getUserTripPlans, createTripPlan, updateTripPlan, deleteTripPlan,
  addTripDay, updateTripDay, deleteTripDay,
  addTripPlace, updateTripPlace, deleteTripPlace
} from '../services/tripService'
import { getAllDbData } from '../services/dbService'
import { getRouteByTransport, getCoordinatesFromAddress, calculateDistance, getCarRoute } from '../services/kakaoMobilityService'
import { getDaejeonParking } from '../services/api'
import './MyTripPage.css'

// Polyline 좌표를 두꺼운 Polygon으로 변환하는 함수 (클릭 영역 확대용)
const createRoutePolygon = (pathCoords, width = 0.002) => {
  if (!pathCoords || pathCoords.length < 2) return null
  
  const polygonPath = []
  const reversePath = []
  
  for (let i = 0; i < pathCoords.length - 1; i++) {
    const p1 = pathCoords[i]
    const p2 = pathCoords[i + 1]
    
    // 방향 벡터 계산
    const dx = p2.getLng() - p1.getLng()
    const dy = p2.getLat() - p1.getLat()
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length === 0) continue
    
    // 수직 벡터 (왼쪽)
    const nx = -dy / length * width
    const ny = dx / length * width
    
    // 왼쪽/오른쪽 점 추가
    polygonPath.push(new window.kakao.maps.LatLng(p1.getLat() + ny, p1.getLng() + nx))
    reversePath.unshift(new window.kakao.maps.LatLng(p1.getLat() - ny, p1.getLng() - nx))
    
    // 마지막 점 처리
    if (i === pathCoords.length - 2) {
      polygonPath.push(new window.kakao.maps.LatLng(p2.getLat() + ny, p2.getLng() + nx))
      reversePath.unshift(new window.kakao.maps.LatLng(p2.getLat() - ny, p2.getLng() - nx))
    }
  }
  
  // 폴리곤 경로: 왼쪽 → 오른쪽 역순으로 연결
  return [...polygonPath, ...reversePath]
}

const MyTripPage = () => {
  const { isDark } = useTheme()
  const { language } = useLanguage()
  const { user, loginWithKakao, loading: authLoading } = useAuth()
  
  // 각 일차별 색상 (마커, 경로, 탭 모두 동일하게 사용)
  const dayColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
  // 1일차: 파란색, 2일차: 초록색, 3일차: 주황색, 4일차: 빨간색, 5일차: 보라색, 6일차: 핑크색
  
  // 일차 번호로 색상 가져오기
  const getDayColor = (dayNumber) => dayColors[(dayNumber - 1) % dayColors.length]
  
  // 여행 계획 목록
  const [tripPlans, setTripPlans] = useState([])
  const [loading, setLoading] = useState(true)
  
  // 현재 편집 중인 여행
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  
  // 새 여행 폼
  const [newTripForm, setNewTripForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    description: ''
  })
  
  // 장소 검색
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchCategory, setSearchCategory] = useState('travel')
  const [isSearching, setIsSearching] = useState(false)
  
  // 펼쳐진 일정 (day)
  const [expandedDays, setExpandedDays] = useState({})
  
  // 뷰 모드 (grid/list)
  const [viewMode, setViewMode] = useState('grid')
  
  // 이동 방법 편집 상태
  const [editingTransport, setEditingTransport] = useState(null) // { dayId, afterPlaceIndex }
  
  // 이동 시간 정보 저장
  const [routeInfo, setRouteInfo] = useState({}) // { "placeId": { duration, distance, loading } }
  
  // 장소 좌표 캐시 (마커 찍을 때 저장, 경로 검색 시 재사용)
  const [placeCoordinates, setPlaceCoordinates] = useState({}) // { "placeId": { lat, lng } }
  const [accommodationCoordinates, setAccommodationCoordinates] = useState(null) // { lat, lng }
  
  // 주차장 정보 저장
  const [nearbyParkings, setNearbyParkings] = useState({}) // { "placeId": { parkings: [], loading } }
  const [allParkings, setAllParkings] = useState([]) // 전체 주차장 데이터 캐시
  const [expandedParking, setExpandedParking] = useState(null) // 펼쳐진 주차장 목록의 placeId
  const [highlightedRoute, setHighlightedRoute] = useState(null) // 클릭된 경로 { placeId, dayId, type: 'place' | 'accommodation' }
  
  // 드래그 앤 드롭 상태
  const [draggedPlace, setDraggedPlace] = useState(null) // 드래그 중인 장소 { dayId, placeId, index }
  const [dragOverIndex, setDragOverIndex] = useState(null) // 드래그 오버 위치
  
  // 숙소 설정 상태
  const [showAccommodationModal, setShowAccommodationModal] = useState(false)
  const [accommodationForm, setAccommodationForm] = useState({ name: '', address: '' })
  const [accommodationSearchQuery, setAccommodationSearchQuery] = useState('')
  const [accommodationSearchResults, setAccommodationSearchResults] = useState([])
  const [isSearchingAccommodation, setIsSearchingAccommodation] = useState(false)
  
  // 숙소에서 출발 교통수단 정보 (2일차+) - localStorage에서 복원
  const [accommodationTransport, setAccommodationTransport] = useState(() => {
    try {
      const saved = localStorage.getItem('accommodationTransport')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  }) // { dayId: { transport: 'car' } }
  const [accommodationRouteInfo, setAccommodationRouteInfo] = useState({}) // { dayId: { duration, distance, loading } }
  const [editingAccommodationTransport, setEditingAccommodationTransport] = useState(null) // dayId
  
  // accommodationTransport가 변경될 때 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('accommodationTransport', JSON.stringify(accommodationTransport))
    } catch (err) {
      console.error('localStorage 저장 실패:', err)
    }
  }, [accommodationTransport])
  
  // 하이라이트된 경로가 변경되면 3초 후 자동으로 해제
  useEffect(() => {
    if (highlightedRoute) {
      const timer = setTimeout(() => {
        setHighlightedRoute(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [highlightedRoute])
  
  // 하이라이트된 경로의 폴리라인 스타일 변경
  useEffect(() => {
    // 모든 폴리라인 원래 스타일로 복원
    Object.entries(routePolylinesRef.current).forEach(([key, polylines]) => {
      if (Array.isArray(polylines)) {
        polylines.forEach(polyline => {
          if (polyline && typeof polyline.setOptions === 'function') {
            // 원래 스타일로 복원 (도보는 3, 버스/지하철은 5, 차량은 4)
            const currentOptions = polyline.getOptions ? polyline.getOptions() : {}
            const strokeStyle = currentOptions.strokeStyle || 'solid'
            const baseWeight = strokeStyle === 'dashed' ? 3 : (currentOptions.strokeWeight > 4 ? 5 : 4)
            polyline.setOptions({
              strokeWeight: baseWeight,
              strokeOpacity: strokeStyle === 'dashed' ? 0.8 : 0.9
            })
          }
        })
      }
    })
    
    // 하이라이트된 경로가 있으면 해당 폴리라인 강조
    if (highlightedRoute) {
      const routeKey = highlightedRoute.type === 'accommodation' 
        ? `acc_${highlightedRoute.dayId}` 
        : highlightedRoute.placeId
      
      const polylines = routePolylinesRef.current[routeKey]
      if (Array.isArray(polylines)) {
        polylines.forEach(polyline => {
          if (polyline && typeof polyline.setOptions === 'function') {
            polyline.setOptions({
              strokeWeight: 8,
              strokeOpacity: 1.0
            })
          }
        })
      }
    }
  }, [highlightedRoute])
  
  // 지도 관련 상태
  const [showMap, setShowMap] = useState(true) // 지도 패널 표시 여부
  const [mapExpanded, setMapExpanded] = useState(false) // 지도 확대 여부
  const [mapReady, setMapReady] = useState(false) // 지도 준비 완료 여부
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const polylineRef = useRef(null)
  const routePolylinesRef = useRef({}) // 경로별 폴리라인 참조 { placeId: polyline, `acc_${dayId}`: polyline }
  
  // 이동 방법 옵션
  const transportOptions = [
    { id: 'walk', icon: FaWalking, labelKo: '도보', labelEn: 'Walk' },
    { id: 'car', icon: FaCar, labelKo: '자동차', labelEn: 'Car' },
    { id: 'bus', icon: FaBus, labelKo: '버스', labelEn: 'Bus' },
    { id: 'subway', icon: FaSubway, labelKo: '지하철', labelEn: 'Subway' },
    { id: 'taxi', icon: FaTaxi, labelKo: '택시', labelEn: 'Taxi' },
    { id: 'bicycle', icon: FaBicycle, labelKo: '자전거', labelEn: 'Bicycle' }
  ]
  
  // 여행 계획 목록 로드
  const loadTripPlans = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const result = await getUserTripPlans(user.id)
      if (result.success) {
        setTripPlans(result.plans)
      }
    } catch (err) {
      console.error('여행 계획 로드 실패:', err)
    }
    setLoading(false)
  }, [user])
  
  useEffect(() => {
    loadTripPlans()
  }, [loadTripPlans])
  
  // 새 여행 계획 생성
  const handleCreateTrip = async () => {
    if (!newTripForm.title || !newTripForm.startDate || !newTripForm.endDate) {
      alert(language === 'ko' ? '제목과 날짜를 입력해주세요' : 'Please enter title and dates')
      return
    }
    
    try {
      const result = await createTripPlan({
        userId: user?.id,
        title: newTripForm.title,
        startDate: newTripForm.startDate,
        endDate: newTripForm.endDate,
        description: newTripForm.description
      })
      
      if (result.success) {
        // 일정 자동 생성 (날짜 수만큼)
        const start = new Date(newTripForm.startDate)
        const end = new Date(newTripForm.endDate)
        const dayCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
        
        const newTrip = {
          ...result.plan,
          days: []
        }
        
        for (let i = 0; i < dayCount; i++) {
          const dayDate = new Date(start)
          dayDate.setDate(dayDate.getDate() + i)
          
          const dayResult = await addTripDay({
            planId: result.plan.id,
            dayNumber: i + 1,
            date: dayDate.toISOString().split('T')[0]
          })
          
          if (dayResult.success) {
            newTrip.days.push({
              ...dayResult.day,
              places: []
            })
          }
        }
        
        setTripPlans(prev => [newTrip, ...prev])
        setSelectedTrip(newTrip)
        setIsCreating(false)
        setNewTripForm({ title: '', startDate: '', endDate: '', description: '' })
        
        // 첫 번째 날 펼치기
        if (newTrip.days.length > 0) {
          setExpandedDays({ [newTrip.days[0].id]: true })
        }
      }
    } catch (err) {
      console.error('여행 생성 실패:', err)
      alert(language === 'ko' ? '여행 계획 생성에 실패했습니다' : 'Failed to create trip plan')
    }
  }
  
  // 여행 삭제
  const handleDeleteTrip = async (tripId) => {
    if (!confirm(language === 'ko' ? '이 여행 계획을 삭제하시겠습니까?' : 'Delete this trip plan?')) {
      return
    }
    
    try {
      const result = await deleteTripPlan(tripId)
      if (result.success) {
        setTripPlans(prev => prev.filter(t => t.id !== tripId))
        if (selectedTrip?.id === tripId) {
          setSelectedTrip(null)
        }
      }
    } catch (err) {
      console.error('여행 삭제 실패:', err)
    }
  }
  
  // 장소 검색
  const handleSearchPlaces = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    try {
      let results = []
      
      switch (searchCategory) {
        case 'travel':
          const travelResult = await getAllDbData('travel')
          if (travelResult.success) {
            results = travelResult.items.filter(item => 
              item.tourspotNm?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.tourspotAddr?.toLowerCase().includes(searchQuery.toLowerCase())
            ).slice(0, 10).map(item => ({
              type: 'travel',
              name: item.tourspotNm,
              address: item.tourspotAddr,
              description: item.tourspotSumm,
              image: item.imageUrl
            }))
          }
          break
          
        case 'food':
          const foodResult = await getAllDbData('food')
          if (foodResult.success) {
            results = foodResult.items.filter(item =>
              item.restrntNm?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.reprMenu?.toLowerCase().includes(searchQuery.toLowerCase())
            ).slice(0, 10).map(item => ({
              type: 'food',
              name: item.restrntNm,
              address: item.restrntAddr,
              description: item.reprMenu,
              image: item.imageUrl
            }))
          }
          break
          
        case 'culture':
          const cultureResult = await getAllDbData('culture')
          if (cultureResult.success) {
            results = cultureResult.items.filter(item =>
              item.fcltyNm?.toLowerCase().includes(searchQuery.toLowerCase())
            ).slice(0, 10).map(item => ({
              type: 'culture',
              name: item.fcltyNm,
              address: item.locplc,
              description: item.fcltyKnd,
              image: item.imageUrl
            }))
          }
          break
      }
      
      setSearchResults(results)
    } catch (err) {
      console.error('장소 검색 실패:', err)
    }
    setIsSearching(false)
  }
  
  // 장소 추가
  const handleAddPlace = async (dayId, place) => {
    const day = selectedTrip?.days?.find(d => d.id === dayId)
    if (!day) return
    
    try {
      const result = await addTripPlace({
        dayId: dayId,
        placeType: place.type,
        placeName: place.name,
        placeAddress: place.address,
        placeDescription: place.description,
        placeImage: place.image,
        orderIndex: day.places?.length || 0,
        visitTime: null,
        memo: ''
      })
      
      if (result.success) {
        setSelectedTrip(prev => ({
          ...prev,
          days: prev.days.map(d => 
            d.id === dayId 
              ? { ...d, places: [...(d.places || []), result.place] }
              : d
          )
        }))
        
        // 검색 결과에서 제거
        setSearchResults([])
        setSearchQuery('')
      }
    } catch (err) {
      console.error('장소 추가 실패:', err)
    }
  }
  
  // 숙소 검색
  const handleSearchAccommodation = async () => {
    if (!accommodationSearchQuery.trim()) return
    
    setIsSearchingAccommodation(true)
    try {
      // 숙박시설 데이터 검색
      const accommResult = await getAllDbData('accommodation')
      if (accommResult.success) {
        const results = accommResult.items.filter(item =>
          item.name?.toLowerCase().includes(accommodationSearchQuery.toLowerCase()) ||
          item.address?.toLowerCase().includes(accommodationSearchQuery.toLowerCase())
        ).slice(0, 10).map(item => ({
          name: item.name,
          address: item.address
        }))
        setAccommodationSearchResults(results)
      }
    } catch (err) {
      console.error('숙소 검색 실패:', err)
    }
    setIsSearchingAccommodation(false)
  }
  
  // 숙소 선택
  const handleSelectAccommodation = (accommodation) => {
    setAccommodationForm({
      name: accommodation.name,
      address: accommodation.address
    })
    setAccommodationSearchResults([])
    setAccommodationSearchQuery('')
  }
  
  // 숙소 저장
  const handleSaveAccommodation = async () => {
    if (!accommodationForm.name || !accommodationForm.address) {
      alert(language === 'ko' ? '숙소 이름과 주소를 입력해주세요' : 'Please enter accommodation name and address')
      return
    }
    
    try {
      const result = await updateTripPlan(selectedTrip.id, {
        accommodationName: accommodationForm.name,
        accommodationAddress: accommodationForm.address
      })
      
      if (result.success) {
        setSelectedTrip(prev => ({
          ...prev,
          accommodationName: accommodationForm.name,
          accommodationAddress: accommodationForm.address
        }))
        setShowAccommodationModal(false)
        setAccommodationForm({ name: '', address: '' })
      }
    } catch (err) {
      console.error('숙소 저장 실패:', err)
    }
  }
  
  // 숙소 모달 열기
  const openAccommodationModal = () => {
    setAccommodationForm({
      name: selectedTrip?.accommodationName || '',
      address: selectedTrip?.accommodationAddress || ''
    })
    setShowAccommodationModal(true)
  }
  
  // 장소 삭제
  const handleDeletePlace = async (dayId, placeId) => {
    try {
      const result = await deleteTripPlace(placeId)
      if (result.success) {
        setSelectedTrip(prev => ({
          ...prev,
          days: prev.days.map(d =>
            d.id === dayId
              ? { ...d, places: d.places.filter(p => p.id !== placeId) }
              : d
          )
        }))
      }
    } catch (err) {
      console.error('장소 삭제 실패:', err)
    }
  }
  
  // 이동 방법 업데이트
  const handleUpdateTransport = async (dayId, placeId, transportType) => {
    try {
      const result = await updateTripPlace(placeId, { transportToNext: transportType })
      if (result.success) {
        setSelectedTrip(prev => ({
          ...prev,
          days: prev.days.map(d =>
            d.id === dayId
              ? { 
                  ...d, 
                  places: d.places.map(p => 
                    p.id === placeId 
                      ? { ...p, transportToNext: transportType }
                      : p
                  )
                }
              : d
          )
        }))
        
        // 이동 시간 조회 (저장된 좌표 사용)
        const day = selectedTrip?.days?.find(d => d.id === dayId)
        const placeIndex = day?.places?.findIndex(p => p.id === placeId)
        if (day && placeIndex !== -1 && placeIndex < day.places.length - 1) {
          const fromPlace = day.places[placeIndex]
          const toPlace = day.places[placeIndex + 1]
          const fromCoords = placeCoordinates[fromPlace.id] || null
          const toCoords = placeCoordinates[toPlace.id] || null
          fetchRouteInfo(placeId, fromPlace.placeAddress, toPlace.placeAddress, transportType, fromPlace.placeName, toPlace.placeName, fromCoords, toCoords)
        }
      }
    } catch (err) {
      console.error('이동 방법 업데이트 실패:', err)
    }
  }
  
  // 버스/대중교통 경로 선택 (여러 노선 중 하나 선택)
  const handleSelectRoute = (placeId, routeIndex) => {
    setRouteInfo(prev => {
      const info = prev[placeId]
      if (!info || !info.allRoutes || !info.allRoutes[routeIndex]) return prev
      
      const selectedRoute = info.allRoutes[routeIndex]
      return {
        ...prev,
        [placeId]: {
          ...info,
          duration: selectedRoute.totalTime,
          distance: selectedRoute.totalDistance,
          payment: selectedRoute.payment,
          routeDetails: selectedRoute.routeDetails,
          busTransitCount: selectedRoute.busTransitCount,
          subwayTransitCount: selectedRoute.subwayTransitCount,
          selectedRouteIndex: routeIndex
        }
      }
    })
  }
  
  // 숙소에서 첫 번째 장소까지의 교통수단 업데이트 (2일차+)
  const handleUpdateAccommodationTransport = async (dayId, transportType) => {
    setAccommodationTransport(prev => ({
      ...prev,
      [dayId]: { transport: transportType }
    }))
    
    // 이동 시간 조회 (저장된 좌표 사용)
    const day = selectedTrip?.days?.find(d => d.id === dayId)
    if (day && day.places?.length > 0 && selectedTrip.accommodationAddress) {
      const firstPlace = day.places[0]
      const fromCoords = accommodationCoordinates || null
      const toCoords = placeCoordinates[firstPlace.id] || null
      fetchAccommodationRouteInfo(dayId, selectedTrip.accommodationAddress, firstPlace.placeAddress, transportType, fromCoords, toCoords)
    }
  }
  
  // 숙소에서 첫 번째 장소까지 이동 시간 조회 (좌표가 있으면 직접 사용)
  const fetchAccommodationRouteInfo = async (dayId, fromAddress, toAddress, transportType, fromCoords = null, toCoords = null) => {
    if (!fromAddress || !toAddress) return
    
    setAccommodationRouteInfo(prev => ({
      ...prev,
      [dayId]: { loading: true }
    }))
    
    try {
      const result = await getRouteByTransport(fromAddress, toAddress, transportType, true, fromCoords, toCoords)
      
      if (result.success) {
        setAccommodationRouteInfo(prev => ({
          ...prev,
          [dayId]: {
            duration: result.duration,
            distance: result.distance,
            isEstimate: result.isEstimate,
            routeDetails: result.routeDetails || [], // 버스/지하철 상세 경로
            payment: result.payment, // 요금
            busTransitCount: result.busTransitCount, // 버스 환승 횟수
            subwayTransitCount: result.subwayTransitCount, // 지하철 환승 횟수
            noRoute: result.noRoute || false, // 노선 없음 플래그
            loading: false
          }
        }))
      } else {
        setAccommodationRouteInfo(prev => ({
          ...prev,
          [dayId]: { error: result.error, loading: false }
        }))
      }
    } catch (err) {
      console.error('숙소 이동 시간 조회 실패:', err)
      setAccommodationRouteInfo(prev => ({
        ...prev,
        [dayId]: { error: err.message, loading: false }
      }))
    }
  }
  
  // 이동 시간 조회 (좌표가 있으면 직접 사용)
  const fetchRouteInfo = async (placeId, fromAddress, toAddress, transportType, fromName = null, toName = null, fromCoords = null, toCoords = null) => {
    if (!fromAddress || !toAddress) return
    
    // 로딩 상태 설정
    setRouteInfo(prev => ({
      ...prev,
      [placeId]: { loading: true }
    }))
    
    try {
      // 좌표가 있으면 직접 전달, 없으면 주소 검색
      let result = await getRouteByTransport(fromAddress, toAddress, transportType, true, fromCoords, toCoords)
      
      // 부분 실패 시 실패한 쪽만 장소명으로 재시도 (성공한 좌표는 유지)
      if (!result.success && (fromName || toName)) {
        // 출발지만 실패한 경우
        if (result.originFailed && !result.destFailed) {
          const fromQuery = fromName ? `대전 ${fromName}` : fromAddress
          // 성공한 도착지 좌표는 유지
          const resolvedToCoords = result.resolvedDestCoords || toCoords
          result = await getRouteByTransport(fromQuery, toAddress, transportType, true, null, resolvedToCoords)
        }
        // 도착지만 실패한 경우
        else if (!result.originFailed && result.destFailed) {
          const toQuery = toName ? `대전 ${toName}` : toAddress
          // 성공한 출발지 좌표는 유지
          const resolvedFromCoords = result.resolvedOriginCoords || fromCoords
          result = await getRouteByTransport(fromAddress, toQuery, transportType, true, resolvedFromCoords, null)
        }
        // 둘 다 실패한 경우 - 장소명으로 재시도
        else if (result.originFailed && result.destFailed) {
          const fromQuery = fromName ? `대전 ${fromName}` : fromAddress
          const toQuery = toName ? `대전 ${toName}` : toAddress
          result = await getRouteByTransport(fromQuery, toQuery, transportType)
        }
      }
      
      if (result.success) {
        setRouteInfo(prev => ({
          ...prev,
          [placeId]: {
            duration: result.duration,
            distance: result.distance,
            isEstimate: result.isEstimate,
            routeDetails: result.routeDetails || [], // 버스/지하철 상세 경로
            allRoutes: result.allRoutes || [], // 모든 경로 옵션 (버스 노선 선택용)
            selectedRouteIndex: 0, // 선택된 경로 인덱스 (기본: 첫 번째)
            payment: result.payment, // 요금
            busTransitCount: result.busTransitCount, // 버스 환승 횟수
            subwayTransitCount: result.subwayTransitCount, // 지하철 환승 횟수
            noRoute: result.noRoute || false, // 노선 없음 플래그
            loading: false
          }
        }))
      } else {
        setRouteInfo(prev => ({
          ...prev,
          [placeId]: { error: result.error, loading: false }
        }))
      }
    } catch (err) {
      console.error('이동 시간 조회 실패:', err)
      setRouteInfo(prev => ({
        ...prev,
        [placeId]: { error: err.message, loading: false }
      }))
    }
  }
  
  // 이동 시간 자동 조회 (장소 목록 변경 시)
  useEffect(() => {
    if (!selectedTrip?.days) return
    
    selectedTrip.days.forEach(day => {
      if (!day.places) return
      
      day.places.forEach((place, idx) => {
        // 마지막 장소 제외, 이동 방법이 설정된 경우
        if (idx < day.places.length - 1 && place.transportToNext && !routeInfo[place.id]) {
          const nextPlace = day.places[idx + 1]
          const fromCoords = placeCoordinates[place.id] || null
          const toCoords = placeCoordinates[nextPlace.id] || null
          fetchRouteInfo(place.id, place.placeAddress, nextPlace.placeAddress, place.transportToNext, place.placeName, nextPlace.placeName, fromCoords, toCoords)
        }
      })
    })
  }, [selectedTrip?.days, placeCoordinates])
  
  // 숙소에서 첫 번째 장소까지 이동 시간 자동 조회 (여행 선택 또는 숙소 설정 변경 시)
  useEffect(() => {
    if (!selectedTrip?.days || !selectedTrip.accommodationAddress) return
    
    selectedTrip.days.forEach(day => {
      // 2일차 이상, 장소가 있고, 교통수단이 설정된 경우
      if (day.dayNumber > 1 && day.places?.length > 0 && accommodationTransport[day.id]?.transport) {
        const firstPlace = day.places[0]
        // 이미 조회된 경우 스킵
        if (!accommodationRouteInfo[day.id] || accommodationRouteInfo[day.id].error) {
          const fromCoords = accommodationCoordinates || null
          const toCoords = placeCoordinates[firstPlace.id] || null
          fetchAccommodationRouteInfo(
            day.id, 
            selectedTrip.accommodationAddress, 
            firstPlace.placeAddress, 
            accommodationTransport[day.id].transport,
            fromCoords,
            toCoords
          )
        }
      }
    })
  }, [selectedTrip, accommodationTransport, accommodationCoordinates, placeCoordinates])
  
  // 전체 주차장 데이터 로드 (최초 1회)
  useEffect(() => {
    const loadParkings = async () => {
      if (allParkings.length > 0) return
      
      try {
        const result = await getDaejeonParking(1, 500) // 최대 500개 로드
        if (result.success) {
          setAllParkings(result.items)
        }
      } catch (err) {
        console.error('주차장 데이터 로드 실패:', err)
      }
    }
    
    loadParkings()
  }, [])
  
  // 카카오맵 초기화
  useEffect(() => {
    if (!mapContainerRef.current || !selectedTrip || !showMap) return
    
    // 카카오맵 SDK 로드 확인
    if (!window.kakao || !window.kakao.maps) {
      console.error('카카오맵 SDK가 로드되지 않았습니다')
      return
    }
    
    // SDK가 완전히 로드된 후 지도 생성
    window.kakao.maps.load(() => {
      // 지도 생성 (대전 중심)
      const mapOption = {
        center: new window.kakao.maps.LatLng(36.3504, 127.3845),
        level: 7
      }
      
      const map = new window.kakao.maps.Map(mapContainerRef.current, mapOption)
      mapRef.current = map
      
      // 지도 컨트롤 추가
      const zoomControl = new window.kakao.maps.ZoomControl()
      map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT)
      
      // 지도 준비 완료 표시
      setMapReady(true)
    })
    
    // cleanup
    return () => {
      setMapReady(false)
      markersRef.current.forEach(marker => {
        if (marker.type === 'overlay') {
          marker.overlay.setMap(null)
        } else {
          marker.setMap(null)
        }
      })
      markersRef.current = []
      if (polylineRef.current) {
        // polylineRef가 배열인 경우 처리
        if (Array.isArray(polylineRef.current)) {
          polylineRef.current.forEach(pl => pl.setMap(null))
        } else {
          polylineRef.current.setMap(null)
        }
        polylineRef.current = null
      }
    }
  }, [selectedTrip, showMap])
  
  // 선택된 여행의 장소들을 지도에 표시
  useEffect(() => {
    if (!mapRef.current || !selectedTrip || !mapReady) return
    
    // 비동기 작업 취소 플래그
    let isCancelled = false
    
    // 기존 마커 제거
    markersRef.current.forEach(marker => {
      if (marker.type === 'overlay') {
        marker.overlay.setMap(null)
      } else {
        marker.setMap(null)
      }
    })
    markersRef.current = []
    
    // 기존 경로선 제거
    if (polylineRef.current) {
      if (Array.isArray(polylineRef.current)) {
        polylineRef.current.forEach(pl => pl.setMap(null))
      } else {
        polylineRef.current.setMap(null)
      }
      polylineRef.current = null
    }
    
    // 확장된 날짜의 장소들만 표시
    const expandedDayIds = Object.keys(expandedDays).filter(id => expandedDays[id])
    
    // 일별로 장소 분리 (경로선 그리기 위함)
    const dayPlaces = {} // { dayNumber: [places] }
    
    selectedTrip.days?.forEach(day => {
      // day.id는 문자열로 비교
      const dayIdStr = String(day.id)
      if (expandedDayIds.includes(dayIdStr) && day.places?.length > 0) {
        dayPlaces[day.dayNumber] = day.places.map((place, idx) => ({
          ...place,
          dayNumber: day.dayNumber,
          orderInDay: idx + 1
        }))
      }
    })
    
    const placesToShow = Object.values(dayPlaces).flat()
    
    if (placesToShow.length === 0) return
    
    // 장소들의 좌표를 조회하고 마커 추가
    const addMarkersAndRoute = async () => {
      // 비동기 작업 중 취소되었는지 확인하는 헬퍼 함수
      const checkCancelled = () => {
        if (isCancelled) return true
        return false
      }
      
      const bounds = new window.kakao.maps.LatLngBounds()
      const positions = []
      // 각 일차별 마커 색상 - 컴포넌트 상단의 dayColors 사용
      
      // 이동수단별 경로 색상 오프셋 (일차별 색상에서 변형)
      // 도보: 회색 계열로 어둡게, 버스/지하철/자동차: 일차별 색상 유지
      const transportColorModifiers = {
        walk: { useGray: true, opacity: 0.7 },    // 도보: 회색 계열
        bus: { darken: 0, opacity: 0.9 },         // 버스: 기본
        subway: { darken: -20, opacity: 0.9 },    // 지하철: 약간 밝게
        car: { darken: 20, opacity: 0.9 }         // 자동차: 약간 어둡게
      }
      
      // 색상 조절 함수 (밝기 조절)
      const adjustColor = (hexColor, amount) => {
        const hex = hexColor.replace('#', '')
        const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount))
        const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount))
        const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount))
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      }
      
      // 일차와 이동수단에 따른 경로 색상 계산
      const getRouteColor = (dayNumber, transportType) => {
        const baseColor = getDayColor(dayNumber)
        const modifier = transportColorModifiers[transportType] || transportColorModifiers.car
        
        if (modifier.useGray) {
          return '#6B7280' // 도보는 회색으로 통일
        }
        
        return adjustColor(baseColor, modifier.darken || 0)
      }
      
      // 숙소 마커 추가 (2일차 이후가 펼쳐진 경우)
      const has2DayOrLater = placesToShow.some(p => p.dayNumber > 1)
      if (has2DayOrLater && selectedTrip.accommodationAddress) {
        if (checkCancelled()) return // 취소 확인
        try {
          // 주소로 좌표 검색
          let accCoords = await getCoordinatesFromAddress(selectedTrip.accommodationAddress)
          if (checkCancelled()) return // 비동기 후 취소 확인
          
          // 주소 검색 실패 시 숙소명 + 대전으로 재시도
          if (!accCoords.success && selectedTrip.accommodationName) {
            accCoords = await getCoordinatesFromAddress(`대전 ${selectedTrip.accommodationName}`)
            if (checkCancelled()) return // 비동기 후 취소 확인
          }
          
          if (accCoords.success) {
            const accPosition = new window.kakao.maps.LatLng(accCoords.lat, accCoords.lng)
            bounds.extend(accPosition)
            
            // 숙소 좌표 캐시에 저장
            setAccommodationCoordinates({ lat: accCoords.lat, lng: accCoords.lng })
            
            // 숙소 마커 생성 (집 아이콘)
            const accMarkerContent = document.createElement('div')
            accMarkerContent.className = 'custom-map-marker accommodation-marker'
            accMarkerContent.innerHTML = `
              <div class="marker-pin accommodation-pin">
                <span class="marker-icon">🏨</span>
              </div>
              <div class="marker-label accommodation-label">${escapeHtml(selectedTrip.accommodationName)}</div>
            `
            
            const accOverlay = new window.kakao.maps.CustomOverlay({
              position: accPosition,
              content: accMarkerContent,
              yAnchor: 1.3
            })
            
            accOverlay.setMap(mapRef.current)
            markersRef.current.push(accOverlay)
          }
        } catch (err) {
          console.error('숙소 좌표 조회 실패:', err)
        }
      }
      
      for (const place of placesToShow) {
        if (checkCancelled()) return // 각 장소 마커 처리 전 취소 확인
        try {
          // 주소로 좌표 검색
          let coords = await getCoordinatesFromAddress(place.placeAddress)
          if (checkCancelled()) return // 비동기 후 취소 확인
          
          // 주소 검색 실패 시 장소명 + 대전으로 재시도
          if (!coords.success && place.placeName) {
            coords = await getCoordinatesFromAddress(`대전 ${place.placeName}`)
            if (checkCancelled()) return // 비동기 후 취소 확인
          }
          
          if (coords.success) {
            const position = new window.kakao.maps.LatLng(coords.lat, coords.lng)
            positions.push(position)
            bounds.extend(position)
            
            // 좌표 캐시에 저장 (경로 검색 시 재사용)
            setPlaceCoordinates(prev => ({
              ...prev,
              [place.id]: { lat: coords.lat, lng: coords.lng }
            }))
            
            // 커스텀 마커 생성 (dayColors 사용)
            const markerColor = getDayColor(place.dayNumber)
            const markerContent = document.createElement('div')
            markerContent.className = 'custom-map-marker'
            markerContent.innerHTML = `
              <div class="marker-pin" style="background-color: ${markerColor}">
                <span class="marker-number">${place.orderInDay}</span>
              </div>
              <div class="marker-label">${escapeHtml(place.placeName)}</div>
            `
            
            const customOverlay = new window.kakao.maps.CustomOverlay({
              position: position,
              content: markerContent,
              yAnchor: 1.3
            })
            
            customOverlay.setMap(mapRef.current)
            markersRef.current.push(customOverlay)
          }
        } catch (err) {
          console.error('좌표 조회 실패:', place.placeName, err)
        }
      }
      
      // 경로선 그리기 (일별로 분리, 2일차부터는 숙소에서 시작)
      // 실제 도로 경로를 가져와서 그림
      const polylines = []
      
      // routePolylinesRef 초기화 (탭 클릭 시 경로 하이라이트에 사용)
      routePolylinesRef.current = {}
      
      // 숙소 좌표 조회 (2일차 이후 사용)
      let accommodationCoords = null
      if (selectedTrip.accommodationAddress) {
        if (checkCancelled()) return // 취소 확인
        try {
          // 주소로 좌표 검색
          let accResult = await getCoordinatesFromAddress(selectedTrip.accommodationAddress)
          if (checkCancelled()) return // 비동기 후 취소 확인
          
          // 주소 검색 실패 시 숙소명 + 대전으로 재시도
          if (!accResult.success && selectedTrip.accommodationName) {
            accResult = await getCoordinatesFromAddress(`대전 ${selectedTrip.accommodationName}`)
            if (checkCancelled()) return // 비동기 후 취소 확인
          }
          
          if (accResult.success) {
            accommodationCoords = { lat: accResult.lat, lng: accResult.lng }
          }
        } catch (err) {
          console.error('숙소 좌표 조회 실패:', err)
        }
      }
      
      // 일별로 경로 처리
      const sortedDays = Object.keys(dayPlaces).sort((a, b) => Number(a) - Number(b))
      
      for (const dayNum of sortedDays) {
        if (checkCancelled()) return // 각 일차 처리 전 취소 확인
        const dayPlaceList = dayPlaces[dayNum]
        if (!dayPlaceList || dayPlaceList.length === 0) continue
        
        const dayColor = getDayColor(Number(dayNum))
        
        // 현재 일차의 dayId 찾기 (숙소 경로 정보에 사용)
        const currentDayData = selectedTrip.days?.find(d => d.dayNumber === Number(dayNum))
        const currentDayId = currentDayData?.id
        
        // 경로 시작점 결정
        let prevCoords = null
        let prevPlace = null // 이전 장소 정보 저장
        let isFromAccommodation = false // 숙소에서 시작하는지 여부
        
        // 2일차 이후이고 숙소가 있으면 숙소에서 시작
        if (Number(dayNum) > 1 && accommodationCoords) {
          prevCoords = accommodationCoords
          isFromAccommodation = true // 첫 번째 장소까지는 숙소에서 시작
        }
        
        // 일정 내 장소들 순회하며 실제 도로 경로 그리기
        for (let i = 0; i < dayPlaceList.length; i++) {
          if (checkCancelled()) return // 각 장소 처리 전 취소 확인
          const place = dayPlaceList[i]
          
          try {
            // 주소로 좌표 검색
            let coords = await getCoordinatesFromAddress(place.placeAddress)
            if (checkCancelled()) return // 비동기 후 취소 확인
            
            // 주소 검색 실패 시 장소명 + 대전으로 재시도
            if (!coords.success && place.placeName) {
              coords = await getCoordinatesFromAddress(`대전 ${place.placeName}`)
              if (checkCancelled()) return // 비동기 후 취소 확인
            }
            
            if (coords.success) {
              const currentCoords = { lat: coords.lat, lng: coords.lng }
              
              // 이전 좌표가 있으면 경로 그리기 (이전 장소 → 현재 장소)
              if (prevCoords) {
                // 숙소에서 시작하는 경우 accommodationRouteInfo와 accommodationTransport 사용
                // 그 외에는 이전 장소의 transportToNext와 routeInfo 사용
                let prevRouteInfo, transportType
                
                if (isFromAccommodation && currentDayId) {
                  // 숙소 → 첫 번째 장소
                  prevRouteInfo = accommodationRouteInfo[currentDayId] || null
                  transportType = accommodationTransport[currentDayId]?.transport || null
                } else {
                  // 장소 → 장소
                  prevRouteInfo = prevPlace ? routeInfo[prevPlace.id] : null
                  transportType = prevPlace ? prevPlace.transportToNext : null
                }
                
                // 버스/지하철 경로가 로딩 중인 경우 경로 그리기 스킵 (로딩 완료 후 다시 그려짐)
                if ((transportType === 'bus' || transportType === 'subway') && prevRouteInfo?.loading) {
                  // 로딩 중이면 경로 그리기 스킵
                  prevCoords = currentCoords
                  prevPlace = place
                  isFromAccommodation = false // 다음은 장소에서 시작
                  continue
                }
                
                // 버스/지하철 경로가 있는 경우 ODSay 좌표 사용
                if ((transportType === 'bus' || transportType === 'subway') && 
                    prevRouteInfo?.routeDetails?.length > 0 && 
                    !prevRouteInfo.noRoute && 
                    !prevRouteInfo.isEstimate) {
                  
                  const routeDetails = prevRouteInfo.routeDetails
                  
                  // 출발지 좌표 (이전 장소)
                  const startCoord = prevCoords
                  // 목적지 좌표 (현재 장소)
                  const endCoord = currentCoords
                  
                  // 버스/지하철 경로 그리기
                  for (let detailIdx = 0; detailIdx < routeDetails.length; detailIdx++) {
                    const detail = routeDetails[detailIdx]
                    
                    // 도보 구간 처리
                    if (detail.type === 'walk') {
                      // 도보 시작/끝 좌표 계산
                      let walkStartCoord = null
                      let walkEndCoord = null
                      
                      if (detailIdx === 0) {
                        // 첫 번째 도보: 출발지 → 첫 번째 대중교통 정류장
                        walkStartCoord = { lat: startCoord.lat, lng: startCoord.lng }
                        const nextDetail = routeDetails[detailIdx + 1]
                        if (nextDetail?.stationCoords?.[0]) {
                          walkEndCoord = { lat: nextDetail.stationCoords[0].y, lng: nextDetail.stationCoords[0].x }
                        } else if (nextDetail?.startY && nextDetail?.startX) {
                          walkEndCoord = { lat: nextDetail.startY, lng: nextDetail.startX }
                        }
                      } else if (detailIdx === routeDetails.length - 1) {
                        // 마지막 도보: 마지막 대중교통 정류장 → 목적지
                        const prevDetail = routeDetails[detailIdx - 1]
                        if (prevDetail?.stationCoords?.length > 0) {
                          const lastStation = prevDetail.stationCoords[prevDetail.stationCoords.length - 1]
                          walkStartCoord = { lat: lastStation.y, lng: lastStation.x }
                        } else if (prevDetail?.endY && prevDetail?.endX) {
                          walkStartCoord = { lat: prevDetail.endY, lng: prevDetail.endX }
                        }
                        walkEndCoord = { lat: endCoord.lat, lng: endCoord.lng }
                      } else {
                        // 중간 도보: 이전 대중교통 끝 → 다음 대중교통 시작
                        const prevDetail = routeDetails[detailIdx - 1]
                        const nextDetail = routeDetails[detailIdx + 1]
                        
                        if (prevDetail?.stationCoords?.length > 0) {
                          const lastStation = prevDetail.stationCoords[prevDetail.stationCoords.length - 1]
                          walkStartCoord = { lat: lastStation.y, lng: lastStation.x }
                        } else if (prevDetail?.endY && prevDetail?.endX) {
                          walkStartCoord = { lat: prevDetail.endY, lng: prevDetail.endX }
                        }
                        
                        if (nextDetail?.stationCoords?.[0]) {
                          walkEndCoord = { lat: nextDetail.stationCoords[0].y, lng: nextDetail.stationCoords[0].x }
                        } else if (nextDetail?.startY && nextDetail?.startX) {
                          walkEndCoord = { lat: nextDetail.startY, lng: nextDetail.startX }
                        }
                      }
                      
                      // 좌표가 있으면 도보 경로 그리기
                      if (walkStartCoord && walkEndCoord) {
                        const walkPath = [
                          new window.kakao.maps.LatLng(walkStartCoord.lat, walkStartCoord.lng),
                          new window.kakao.maps.LatLng(walkEndCoord.lat, walkEndCoord.lng)
                        ]
                        
                        // 경로 키 생성 (탭에서 클릭 시 하이라이트에 사용)
                        const routeKey = isFromAccommodation ? `acc_${currentDayId}` : (prevPlace?.id || null)
                        
                        // 실제 보이는 도보 경로 (점선, 일차별 색상 + 투명도)
                        const walkPolyline = new window.kakao.maps.Polyline({
                          path: walkPath,
                          strokeWeight: 3,
                          strokeColor: dayColor, // 일차별 색상 적용
                          strokeOpacity: 0.6, // 도보는 투명도 높여 구분
                          strokeStyle: 'dashed'
                        })
                        walkPolyline.setMap(mapRef.current)
                        polylines.push(walkPolyline)
                        
                        // 경로 키가 있으면 routePolylinesRef에 저장
                        if (routeKey) {
                          if (!routePolylinesRef.current[routeKey]) {
                            routePolylinesRef.current[routeKey] = []
                          }
                          routePolylinesRef.current[routeKey].push(walkPolyline)
                        }
                        
                        // 클릭/호버 감지용 폴리곤 생성
                        const walkPolygonPath = createRoutePolygon(walkPath, 0.002)
                        let walkClickPolygon = null
                        if (walkPolygonPath) {
                          walkClickPolygon = new window.kakao.maps.Polygon({
                            path: walkPolygonPath,
                            strokeWeight: 0,
                            strokeOpacity: 0,
                            fillColor: '#6B7280', // 도보 폴리곤: 회색
                            fillOpacity: 0.01
                          })
                          walkClickPolygon.setMap(mapRef.current)
                          polylines.push(walkClickPolygon) // 폴리곤도 정리 대상에 추가
                          
                          // 호버 효과: 마우스 올리면 경로 강조
                          window.kakao.maps.event.addListener(walkClickPolygon, 'mouseover', function() {
                            walkPolyline.setOptions({
                              strokeWeight: 6,
                              strokeOpacity: 1.0
                            })
                          })
                          window.kakao.maps.event.addListener(walkClickPolygon, 'mouseout', function() {
                            walkPolyline.setOptions({
                              strokeWeight: 3,
                              strokeOpacity: 0.8
                            })
                          })
                        }
                        
                        // 도보 경로 클릭 정보 표시
                        const walkInfoBox = new window.kakao.maps.CustomOverlay({
                          content: `<div class="route-overlay" style="
                            background: white;
                            padding: 12px 16px;
                            border-radius: 10px;
                            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                            font-size: 13px;
                            min-width: 150px;
                            border-left: 4px solid #6B7280;
                            z-index: 9999;
                          ">
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                              <div style="display:flex;align-items:center;gap:6px;color:#6B7280;font-weight:600;">
                                🚶 도보 이동
                              </div>
                              <span style="color:#aaa;font-size:10px;">클릭하여 닫기</span>
                            </div>
                            <div style="color:#666;">
                              약 ${detail.sectionTime || 5}분
                            </div>
                          </div>`,
                          position: new window.kakao.maps.LatLng(
                            (walkStartCoord.lat + walkEndCoord.lat) / 2,
                            (walkStartCoord.lng + walkEndCoord.lng) / 2
                          ),
                          yAnchor: 1.2,
                          zIndex: 9999
                        })
                        
                        // 폴리곤 클릭 이벤트로 토글
                        let walkInfoVisible = false
                        const currentWalkMap = mapRef.current
                        // 클릭 시 하이라이트를 위한 정보 캡처
                        const walkCapturedPlaceId = isFromAccommodation ? null : (prevPlace?.id || null)
                        const walkCapturedDayId = currentDayId
                        const walkCapturedIsAccommodation = isFromAccommodation
                        
                        if (walkClickPolygon) {
                          window.kakao.maps.event.addListener(walkClickPolygon, 'click', function(mouseEvent) {
                            // 해당 이동수단 섹션 하이라이트
                            setHighlightedRoute({
                              placeId: walkCapturedPlaceId,
                              dayId: walkCapturedDayId,
                              type: walkCapturedIsAccommodation ? 'accommodation' : 'place'
                            })
                            
                            if (walkInfoVisible) {
                              walkInfoBox.setMap(null)
                            } else {
                              walkInfoBox.setPosition(mouseEvent.latLng)
                              walkInfoBox.setMap(currentWalkMap)
                            }
                            walkInfoVisible = !walkInfoVisible
                          })
                        }
                        markersRef.current.push({ type: 'overlay', overlay: walkInfoBox })
                      }
                    } else if (detail.stationCoords && detail.stationCoords.length > 0) {
                      // 버스/지하철: 정류장/역 좌표로 경로 그리기
                      const stationPath = detail.stationCoords.map(s => 
                        new window.kakao.maps.LatLng(s.y, s.x)
                      )
                      
                      // 일차별 색상 적용 (버스/지하철 고유 색상 대신)
                      const lineColor = dayColor
                      
                      const lastIdx = detail.stationCoords.length - 1
                      
                      // 경로 키 생성 (탭에서 클릭 시 하이라이트에 사용)
                      const transitRouteKey = isFromAccommodation ? `acc_${currentDayId}` : (prevPlace?.id || null)
                      
                      // 실제 보이는 경로 라인
                      const polyline = new window.kakao.maps.Polyline({
                        path: stationPath,
                        strokeWeight: 5,
                        strokeColor: lineColor,
                        strokeOpacity: 0.9,
                        strokeStyle: 'solid'
                      })
                      polyline.setMap(mapRef.current)
                      polylines.push(polyline)
                      
                      // 경로 키가 있으면 routePolylinesRef에 저장
                      if (transitRouteKey) {
                        if (!routePolylinesRef.current[transitRouteKey]) {
                          routePolylinesRef.current[transitRouteKey] = []
                        }
                        routePolylinesRef.current[transitRouteKey].push(polyline)
                      }
                      
                      // 클릭/호버 감지용 폴리곤 생성
                      const busPolygonPath = createRoutePolygon(stationPath, 0.002)
                      let busClickPolygon = null
                      if (busPolygonPath) {
                        busClickPolygon = new window.kakao.maps.Polygon({
                          path: busPolygonPath,
                          strokeWeight: 0,
                          strokeOpacity: 0,
                          fillColor: lineColor,
                          fillOpacity: 0.01
                        })
                        busClickPolygon.setMap(mapRef.current)
                        polylines.push(busClickPolygon) // 폴리곤도 정리 대상에 추가
                        
                        // 호버 효과: 마우스 올리면 경로 강조
                        window.kakao.maps.event.addListener(busClickPolygon, 'mouseover', function() {
                          polyline.setOptions({
                            strokeWeight: 8,
                            strokeOpacity: 1.0
                          })
                        })
                        window.kakao.maps.event.addListener(busClickPolygon, 'mouseout', function() {
                          polyline.setOptions({
                            strokeWeight: 5,
                            strokeOpacity: 0.9
                          })
                        })
                      }
                      
                      // 경로 정보 텍스트박스 (폴리곤 클릭 시 표시)
                      const routeInfoBox = new window.kakao.maps.CustomOverlay({
                        content: `<div class="route-overlay" style="
                          background: white;
                          padding: 14px 18px;
                          border-radius: 12px;
                          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                          font-size: 13px;
                          min-width: 200px;
                          border-left: 4px solid ${lineColor};
                          z-index: 9999;
                        ">
                          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                              <span style="
                                background:${lineColor};
                                color:white;
                                padding:3px 10px;
                                border-radius:5px;
                                font-weight:600;
                                font-size:13px;
                              ">${escapeHtml(detail.busNo || '')}</span>
                              <span style="color:#666;font-size:12px;">${detail.type === 'bus' ? '버스' : '지하철'}</span>
                            </div>
                            <span style="color:#aaa;font-size:10px;">클릭하여 닫기</span>
                          </div>
                          <div style="color:#333;line-height:1.6;">
                            <div>🚏 승차: ${escapeHtml(detail.startStation || '')}</div>
                            <div>🚏 하차: ${escapeHtml(detail.endStation || '')}</div>
                          </div>
                          <div style="color:#888;font-size:12px;margin-top:8px;padding-top:8px;border-top:1px solid #eee;">
                            📍 ${detail.stationCount}정거장 · ⏱ ${detail.sectionTime}분
                          </div>
                        </div>`,
                        position: new window.kakao.maps.LatLng(
                          (detail.stationCoords[0].y + detail.stationCoords[lastIdx].y) / 2,
                          (detail.stationCoords[0].x + detail.stationCoords[lastIdx].x) / 2
                        ),
                        yAnchor: 1.2,
                        zIndex: 9999
                      })
                      
                      // 폴리곤 클릭으로 토글
                      let busInfoVisible = false
                      const currentMap = mapRef.current // 클로저 문제 방지
                      // 클릭 시 하이라이트를 위한 정보 캡처
                      const capturedPlaceId = isFromAccommodation ? null : (prevPlace?.id || null)
                      const capturedDayId = currentDayId
                      const capturedIsAccommodation = isFromAccommodation
                      
                      if (busClickPolygon) {
                        window.kakao.maps.event.addListener(busClickPolygon, 'click', function(mouseEvent) {
                          // 해당 이동수단 섹션 하이라이트
                          setHighlightedRoute({
                            placeId: capturedPlaceId,
                            dayId: capturedDayId,
                            type: capturedIsAccommodation ? 'accommodation' : 'place'
                          })
                          
                          if (busInfoVisible) {
                            routeInfoBox.setMap(null)
                          } else {
                            // 클릭한 위치에 정보박스 표시
                            routeInfoBox.setPosition(mouseEvent.latLng)
                            routeInfoBox.setMap(currentMap)
                          }
                          busInfoVisible = !busInfoVisible
                        })
                      }
                      
                      // 정보박스를 ref에 저장하여 나중에 정리
                      markersRef.current.push({ type: 'overlay', overlay: routeInfoBox })
                    } else if (detail.startX && detail.startY && detail.endX && detail.endY && detail.type !== 'walk') {
                      // 버스/지하철: 정류장 좌표가 없고 시작/끝 좌표만 있는 경우 직선 연결
                      const sectionPath = [
                        new window.kakao.maps.LatLng(detail.startY, detail.startX),
                        new window.kakao.maps.LatLng(detail.endY, detail.endX)
                      ]
                      
                      const lineColor = detail.type === 'bus' 
                        ? (detail.busColor || '#52c41a')
                        : (detail.lineColor || '#1a5dc8')
                      
                      const polyline = new window.kakao.maps.Polyline({
                        path: sectionPath,
                        strokeWeight: 5,
                        strokeColor: lineColor,
                        strokeOpacity: 0.9,
                        strokeStyle: 'solid'
                      })
                      polyline.setMap(mapRef.current)
                      polylines.push(polyline)
                    }
                  }
                } else {
                  // 기본: 차량 경로 가져오기
                  try {
                    const routeResult = await getCarRoute(
                      { lat: prevCoords.lat, lng: prevCoords.lng },
                      { lat: currentCoords.lat, lng: currentCoords.lng },
                      true // includePath = true로 경로 좌표 포함
                    )
                    if (checkCancelled()) return // 비동기 후 취소 확인
                    
                    // 이동 정보 (있으면 사용)
                    const duration = prevRouteInfo?.duration || routeResult.duration || 0
                    const distance = prevRouteInfo?.distance || routeResult.distance || 0
                    // 숙소에서 시작하는 경우 출발지 이름을 숙소명으로 설정
                    const fromName = isFromAccommodation 
                      ? (selectedTrip.accommodationName || '숙소') 
                      : (prevPlace?.placeName || '출발지')
                    const toName = place.placeName || '도착지'
                    
                    // 선택된 이동수단 가져오기
                    const selectedTransport = transportType || 'car'
                    const transportIcons = { car: '🚗', bus: '🚌', subway: '🚇', walk: '🚶' }
                    const transportLabels = { car: '자동차', bus: '버스', subway: '지하철', walk: '도보' }
                    const transportIcon = transportIcons[selectedTransport] || '🚗'
                    const transportLabel = transportLabels[selectedTransport] || '자동차'
                    // 일차별 + 이동수단별 경로 색상 적용
                    const routeColor = getRouteColor(Number(dayNum), selectedTransport)
                    
                    // 경로 키 생성 (탭에서 클릭 시 하이라이트에 사용)
                    const carRouteKey = isFromAccommodation ? `acc_${currentDayId}` : (prevPlace?.id || null)
                    
                    if (routeResult.success && routeResult.path && routeResult.path.length > 0) {
                      // 실제 도로 경로로 그리기
                      const path = routeResult.path.map(p => 
                        new window.kakao.maps.LatLng(p.lat, p.lng)
                      )
                      
                      // 실제 보이는 경로 라인
                      const polyline = new window.kakao.maps.Polyline({
                        path: path,
                        strokeWeight: 4,
                        strokeColor: routeColor,
                        strokeOpacity: 0.8,
                        strokeStyle: 'solid'
                      })
                      polyline.setMap(mapRef.current)
                      polylines.push(polyline)
                      
                      // 경로 키가 있으면 routePolylinesRef에 저장
                      if (carRouteKey) {
                        if (!routePolylinesRef.current[carRouteKey]) {
                          routePolylinesRef.current[carRouteKey] = []
                        }
                        routePolylinesRef.current[carRouteKey].push(polyline)
                      }
                      
                      // 클릭/호버 감지용 폴리곤 생성
                      const carPolygonPath = createRoutePolygon(path, 0.002)
                      let carClickPolygon = null
                      if (carPolygonPath) {
                        carClickPolygon = new window.kakao.maps.Polygon({
                          path: carPolygonPath,
                          strokeWeight: 0,
                          strokeOpacity: 0,
                          fillColor: routeColor,
                          fillOpacity: 0.01
                        })
                        carClickPolygon.setMap(mapRef.current)
                        polylines.push(carClickPolygon) // 폴리곤도 정리 대상에 추가
                        
                        // 호버 효과: 마우스 올리면 경로 강조
                        window.kakao.maps.event.addListener(carClickPolygon, 'mouseover', function() {
                          polyline.setOptions({
                            strokeWeight: 7,
                            strokeOpacity: 1.0
                          })
                        })
                        window.kakao.maps.event.addListener(carClickPolygon, 'mouseout', function() {
                          polyline.setOptions({
                            strokeWeight: 4,
                            strokeOpacity: 0.8
                          })
                        })
                      }
                      
                      // 경로 클릭 정보 (선택된 이동수단에 맞춰 표시)
                      const midIdx = Math.floor(path.length / 2)
                      const carInfoBox = new window.kakao.maps.CustomOverlay({
                        content: `<div class="route-overlay" style="
                          background: white;
                          padding: 14px 18px;
                          border-radius: 12px;
                          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                          font-size: 13px;
                          min-width: 180px;
                          border-left: 4px solid ${routeColor};
                          z-index: 9999;
                          position: relative;
                        ">
                          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                            <div style="display:flex;align-items:center;gap:6px;color:${routeColor};font-weight:600;">
                              ${transportIcon} ${transportLabel} 이동
                            </div>
                            <span style="color:#aaa;font-size:10px;">클릭하여 닫기</span>
                          </div>
                          <div style="color:#333;font-size:12px;line-height:1.6;">
                            <div>📍 ${escapeHtml(fromName)}</div>
                            <div style="color:#888;padding-left:8px;">↓</div>
                            <div>📍 ${escapeHtml(toName)}</div>
                          </div>
                          <div style="color:#666;margin-top:10px;padding-top:8px;border-top:1px solid #eee;font-size:12px;">
                            ${duration > 0 ? `⏱ 약 ${duration}분` : ''}${duration > 0 && distance > 0 ? ' · ' : ''}${distance > 0 ? `📏 ${(distance/1000).toFixed(1)}km` : ''}
                          </div>
                        </div>`,
                        position: routeResult.path[midIdx] 
                          ? new window.kakao.maps.LatLng(routeResult.path[midIdx].lat, routeResult.path[midIdx].lng)
                          : new window.kakao.maps.LatLng((prevCoords.lat + currentCoords.lat) / 2, (prevCoords.lng + currentCoords.lng) / 2),
                        yAnchor: 1.2,
                        zIndex: 9999
                      })
                      
                      // 폴리곤 클릭으로 토글
                      let carInfoVisible = false
                      const currentCarMap = mapRef.current
                      // 클릭 시 하이라이트를 위한 정보 캡처
                      const carCapturedPlaceId = isFromAccommodation ? null : (prevPlace?.id || null)
                      const carCapturedDayId = currentDayId
                      const carCapturedIsAccommodation = isFromAccommodation
                      
                      if (carClickPolygon) {
                        window.kakao.maps.event.addListener(carClickPolygon, 'click', function(mouseEvent) {
                          // 해당 이동수단 섹션 하이라이트
                          setHighlightedRoute({
                            placeId: carCapturedPlaceId,
                            dayId: carCapturedDayId,
                            type: carCapturedIsAccommodation ? 'accommodation' : 'place'
                          })
                          
                          if (carInfoVisible) {
                            carInfoBox.setMap(null)
                          } else {
                            carInfoBox.setPosition(mouseEvent.latLng)
                            carInfoBox.setMap(currentCarMap)
                          }
                          carInfoVisible = !carInfoVisible
                        })
                      }
                      markersRef.current.push({ type: 'overlay', overlay: carInfoBox })
                    } else {
                      // 실패 시 직선으로 연결
                      const path = [
                        new window.kakao.maps.LatLng(prevCoords.lat, prevCoords.lng),
                        new window.kakao.maps.LatLng(currentCoords.lat, currentCoords.lng)
                      ]
                      
                      // 실제 보이는 점선
                      const polyline = new window.kakao.maps.Polyline({
                        path: path,
                        strokeWeight: 4,
                        strokeColor: routeColor,
                        strokeOpacity: 0.5,
                        strokeStyle: 'dashed'
                      })
                      polyline.setMap(mapRef.current)
                      polylines.push(polyline)
                      
                      // 경로 키가 있으면 routePolylinesRef에 저장
                      if (carRouteKey) {
                        if (!routePolylinesRef.current[carRouteKey]) {
                          routePolylinesRef.current[carRouteKey] = []
                        }
                        routePolylinesRef.current[carRouteKey].push(polyline)
                      }
                      
                      // 클릭/호버 감지용 폴리곤
                      const fallbackPolygonPath = createRoutePolygon(path, 0.002)
                      let fallbackClickPolygon = null
                      if (fallbackPolygonPath) {
                        fallbackClickPolygon = new window.kakao.maps.Polygon({
                          path: fallbackPolygonPath,
                          strokeWeight: 0,
                          strokeOpacity: 0,
                          fillColor: routeColor,
                          fillOpacity: 0.01
                        })
                        fallbackClickPolygon.setMap(mapRef.current)
                        polylines.push(fallbackClickPolygon) // 폴리곤도 정리 대상에 추가
                        
                        // 호버 효과
                        window.kakao.maps.event.addListener(fallbackClickPolygon, 'mouseover', function() {
                          polyline.setOptions({
                            strokeWeight: 7,
                            strokeOpacity: 0.8
                          })
                        })
                        window.kakao.maps.event.addListener(fallbackClickPolygon, 'mouseout', function() {
                          polyline.setOptions({
                            strokeWeight: 4,
                            strokeOpacity: 0.5
                          })
                        })
                      }
                      
                      // 직선 경로 클릭 정보
                      const lineInfoBox = new window.kakao.maps.CustomOverlay({
                        content: `<div class="route-overlay" style="
                          background: white;
                          padding: 14px 18px;
                          border-radius: 12px;
                          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                          font-size: 13px;
                          min-width: 160px;
                          border-left: 4px solid ${routeColor};
                          z-index: 9999;
                        ">
                          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                            <div style="color:${routeColor};font-weight:600;">
                              ${transportIcon} ${transportLabel} 이동
                            </div>
                            <span style="color:#aaa;font-size:10px;">클릭하여 닫기</span>
                          </div>
                          <div style="color:#333;font-size:12px;">
                            ${escapeHtml(fromName)} → ${escapeHtml(toName)}
                          </div>
                        </div>`,
                        position: new window.kakao.maps.LatLng(
                          (prevCoords.lat + currentCoords.lat) / 2,
                          (prevCoords.lng + currentCoords.lng) / 2
                        ),
                        yAnchor: 1.2,
                        zIndex: 9999
                      })
                      
                      // 폴리곤 클릭으로 토글
                      let lineInfoVisible = false
                      const currentFallbackMap = mapRef.current
                      // 클릭 시 하이라이트를 위한 정보 캡처
                      const fallbackCapturedPlaceId = isFromAccommodation ? null : (prevPlace?.id || null)
                      const fallbackCapturedDayId = currentDayId
                      const fallbackCapturedIsAccommodation = isFromAccommodation
                      
                      if (fallbackClickPolygon) {
                        window.kakao.maps.event.addListener(fallbackClickPolygon, 'click', function(mouseEvent) {
                          // 해당 이동수단 섹션 하이라이트
                          setHighlightedRoute({
                            placeId: fallbackCapturedPlaceId,
                            dayId: fallbackCapturedDayId,
                            type: fallbackCapturedIsAccommodation ? 'accommodation' : 'place'
                          })
                          
                          if (lineInfoVisible) {
                            lineInfoBox.setMap(null)
                          } else {
                            lineInfoBox.setPosition(mouseEvent.latLng)
                            lineInfoBox.setMap(currentFallbackMap)
                          }
                          lineInfoVisible = !lineInfoVisible
                        })
                      }
                      markersRef.current.push({ type: 'overlay', overlay: lineInfoBox })
                    }
                  } catch (routeErr) {
                    console.error('경로 조회 실패:', routeErr)
                    // 실패 시 직선으로 연결
                    // 숙소에서 시작하는 경우 출발지 이름을 숙소명으로 설정
                    const fromName = isFromAccommodation 
                      ? (selectedTrip.accommodationName || '숙소') 
                      : (prevPlace?.placeName || '출발지')
                    const toName = place.placeName || '도착지'
                    
                    // 이동수단 정보
                    const errorTransport = transportType || 'car'
                    const errorTransportIcons = { car: '🚗', bus: '🚌', subway: '🚇', walk: '🚶' }
                    const errorTransportLabels = { car: '자동차', bus: '버스', subway: '지하철', walk: '도보' }
                    const errorIcon = errorTransportIcons[errorTransport] || '🚗'
                    const errorLabel = errorTransportLabels[errorTransport] || '자동차'
                    const errorColor = getRouteColor(Number(dayNum), errorTransport)
                    
                    const path = [
                      new window.kakao.maps.LatLng(prevCoords.lat, prevCoords.lng),
                      new window.kakao.maps.LatLng(currentCoords.lat, currentCoords.lng)
                    ]
                    
                    // 실제 보이는 점선
                    const polyline = new window.kakao.maps.Polyline({
                      path: path,
                      strokeWeight: 4,
                      strokeColor: errorColor,
                      strokeOpacity: 0.5,
                      strokeStyle: 'dashed'
                    })
                    polyline.setMap(mapRef.current)
                    polylines.push(polyline)
                    
                    // 클릭/호버 감지용 폴리곤
                    const errorPolygonPath = createRoutePolygon(path, 0.002)
                    let errorClickPolygon = null
                    if (errorPolygonPath) {
                      errorClickPolygon = new window.kakao.maps.Polygon({
                        path: errorPolygonPath,
                        strokeWeight: 0,
                        strokeOpacity: 0,
                        fillColor: errorColor,
                        fillOpacity: 0.01
                      })
                      errorClickPolygon.setMap(mapRef.current)
                      polylines.push(errorClickPolygon) // 폴리곤도 정리 대상에 추가
                      
                      // 호버 효과
                      window.kakao.maps.event.addListener(errorClickPolygon, 'mouseover', function() {
                        polyline.setOptions({
                          strokeWeight: 7,
                          strokeOpacity: 0.8
                        })
                      })
                      window.kakao.maps.event.addListener(errorClickPolygon, 'mouseout', function() {
                        polyline.setOptions({
                          strokeWeight: 4,
                          strokeOpacity: 0.5
                        })
                      })
                    }
                    
                    // 직선 경로 클릭 정보
                    const errorInfoBox = new window.kakao.maps.CustomOverlay({
                      content: `<div class="route-overlay" style="
                        background: white;
                        padding: 14px 18px;
                        border-radius: 12px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                        font-size: 13px;
                        min-width: 160px;
                        border-left: 4px solid ${errorColor};
                        z-index: 9999;
                      ">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                          <div style="color:${errorColor};font-weight:600;">
                            ${errorIcon} ${errorLabel} 이동
                          </div>
                          <span style="color:#aaa;font-size:10px;">클릭하여 닫기</span>
                        </div>
                        <div style="color:#333;font-size:12px;">
                          ${escapeHtml(fromName)} → ${escapeHtml(toName)}
                        </div>
                      </div>`,
                      position: new window.kakao.maps.LatLng(
                        (prevCoords.lat + currentCoords.lat) / 2,
                        (prevCoords.lng + currentCoords.lng) / 2
                      ),
                      yAnchor: 1.2,
                      zIndex: 9999
                    })
                    
                    // 폴리곤 클릭으로 토글
                    let errorInfoVisible = false
                    const currentErrorMap = mapRef.current
                    // 클릭 시 하이라이트를 위한 정보 캡처
                    const errorCapturedPlaceId = isFromAccommodation ? null : (prevPlace?.id || null)
                    const errorCapturedDayId = currentDayId
                    const errorCapturedIsAccommodation = isFromAccommodation
                    
                    if (errorClickPolygon) {
                      window.kakao.maps.event.addListener(errorClickPolygon, 'click', function(mouseEvent) {
                        // 해당 이동수단 섹션 하이라이트
                        setHighlightedRoute({
                          placeId: errorCapturedPlaceId,
                          dayId: errorCapturedDayId,
                          type: errorCapturedIsAccommodation ? 'accommodation' : 'place'
                        })
                        
                        if (errorInfoVisible) {
                          errorInfoBox.setMap(null)
                        } else {
                          errorInfoBox.setPosition(mouseEvent.latLng)
                          errorInfoBox.setMap(currentErrorMap)
                        }
                        errorInfoVisible = !errorInfoVisible
                      })
                    }
                    markersRef.current.push({ type: 'overlay', overlay: errorInfoBox })
                  }
                }
              }
              
              prevCoords = currentCoords
              prevPlace = place // 이전 장소 정보 업데이트
              isFromAccommodation = false // 첫 번째 장소 이후는 장소에서 시작
            }
          } catch (err) {
            console.error('좌표 조회 실패:', place.placeName, err)
          }
        }
      }
      
      // 기존 polylineRef 대신 polylines 배열 사용
      if (!isCancelled) {
        polylineRef.current = polylines
        
        // 모든 마커가 보이도록 지도 범위 조정
        if (positions.length > 0) {
          mapRef.current.setBounds(bounds)
        }
      }
    }
    
    addMarkersAndRoute()
    
    // cleanup 함수 - 다음 effect 실행 또는 언마운트 시 호출
    return () => {
      isCancelled = true
    }
  }, [selectedTrip, expandedDays, mapReady, routeInfo, accommodationRouteInfo, accommodationTransport])
  
  // 장소 근처 주차장 조회 (5km 이내)
  const fetchNearbyParkings = async (placeId, address) => {
    if (nearbyParkings[placeId] && !nearbyParkings[placeId].loading) {
      // 이미 조회된 경우 토글
      setExpandedParking(expandedParking === placeId ? null : placeId)
      return
    }
    
    setNearbyParkings(prev => ({
      ...prev,
      [placeId]: { loading: true, parkings: [] }
    }))
    setExpandedParking(placeId)
    
    try {
      // 장소 좌표 조회
      const coords = await getCoordinatesFromAddress(address)
      if (!coords.success) {
        setNearbyParkings(prev => ({
          ...prev,
          [placeId]: { loading: false, parkings: [], error: '좌표를 찾을 수 없습니다' }
        }))
        return
      }
      
      // 5km 이내 주차장 필터링
      const nearby = allParkings
        .filter(p => p.lat && p.lon)
        .map(p => ({
          ...p,
          distance: calculateDistance(coords.lat, coords.lng, p.lat, p.lon)
        }))
        .filter(p => p.distance <= 5) // 5km 이내
        .sort((a, b) => a.distance - b.distance) // 가까운 순 정렬
        .slice(0, 10) // 최대 10개
      
      setNearbyParkings(prev => ({
        ...prev,
        [placeId]: { loading: false, parkings: nearby }
      }))
    } catch (err) {
      console.error('주차장 조회 실패:', err)
      setNearbyParkings(prev => ({
        ...prev,
        [placeId]: { loading: false, parkings: [], error: err.message }
      }))
    }
  }
  
  // 드래그 시작
  const handleDragStart = (e, dayId, placeId, index) => {
    setDraggedPlace({ dayId, placeId, index })
    e.dataTransfer.effectAllowed = 'move'
    // 드래그 이미지 설정 (반투명하게)
    e.target.style.opacity = '0.5'
  }
  
  // 드래그 종료
  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
    setDraggedPlace(null)
    setDragOverIndex(null)
  }
  
  // 드래그 오버
  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }
  
  // 드롭
  const handleDrop = async (e, dayId, targetIndex) => {
    e.preventDefault()
    
    if (!draggedPlace || draggedPlace.dayId !== dayId) {
      // 다른 날짜로의 이동은 지원하지 않음 (복잡도 증가)
      setDraggedPlace(null)
      setDragOverIndex(null)
      return
    }
    
    const sourceIndex = draggedPlace.index
    if (sourceIndex === targetIndex) {
      setDraggedPlace(null)
      setDragOverIndex(null)
      return
    }
    
    // 이동 전 경로에 영향받는 장소들의 ID 수집
    const day = selectedTrip?.days?.find(d => d.id === dayId)
    const affectedPlaceIds = new Set()
    
    if (day && day.places) {
      // 영향받는 인덱스 범위 계산 (source와 target 사이 + 인접 장소)
      const minIdx = Math.max(0, Math.min(sourceIndex, targetIndex) - 1)
      const maxIdx = Math.min(day.places.length - 1, Math.max(sourceIndex, targetIndex))
      
      // 영향받는 범위의 모든 장소 ID 수집
      for (let i = minIdx; i <= maxIdx; i++) {
        if (day.places[i]) {
          affectedPlaceIds.add(day.places[i].id)
        }
      }
    }
    
    // 로컬 상태 업데이트
    setSelectedTrip(prev => {
      const newDays = prev.days.map(d => {
        if (d.id !== dayId) return d
        
        const newPlaces = [...d.places]
        const [movedPlace] = newPlaces.splice(sourceIndex, 1)
        newPlaces.splice(targetIndex, 0, movedPlace)
        
        // orderIndex 업데이트
        const updatedPlaces = newPlaces.map((place, idx) => ({
          ...place,
          orderIndex: idx
        }))
        
        return { ...d, places: updatedPlaces }
      })
      
      return { ...prev, days: newDays }
    })
    
    // 영향받는 경로 정보만 삭제 (나머지는 유지)
    setRouteInfo(prev => {
      const newRouteInfo = { ...prev }
      affectedPlaceIds.forEach(id => {
        delete newRouteInfo[id]
      })
      return newRouteInfo
    })
    
    // 2일차 이상에서 첫 번째 장소가 변경된 경우 숙소 경로도 재계산
    const targetDay = selectedTrip?.days?.find(d => d.id === dayId)
    if (targetDay && targetDay.dayNumber > 1 && (sourceIndex === 0 || targetIndex === 0)) {
      // 첫 번째 장소가 변경되면 숙소 → 첫 번째 장소 경로 재계산 필요
      setAccommodationRouteInfo(prev => {
        const newInfo = { ...prev }
        delete newInfo[dayId]
        return newInfo
      })
    }
    
    // DB 업데이트 (각 장소의 orderIndex 변경)
    if (day) {
      const newPlaces = [...day.places]
      const [movedPlace] = newPlaces.splice(sourceIndex, 1)
      newPlaces.splice(targetIndex, 0, movedPlace)
      
      // 모든 장소의 orderIndex 업데이트
      for (let i = 0; i < newPlaces.length; i++) {
        try {
          await updateTripPlace(newPlaces[i].id, { orderIndex: i })
        } catch (err) {
          console.error('순서 업데이트 실패:', err)
        }
      }
    }
    
    setDraggedPlace(null)
    setDragOverIndex(null)
  }
  
  // 날짜 펼치기/접기
  const toggleDay = (dayId) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayId]: !prev[dayId]
    }))
  }
  
  // 일정 총 일수 계산
  const getTripDuration = (trip) => {
    if (!trip.startDate || !trip.endDate) return 0
    const start = new Date(trip.startDate)
    const end = new Date(trip.endDate)
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
  }

  // 카카오 로그인 핸들러
  const handleKakaoLogin = async () => {
    try {
      await loginWithKakao()
    } catch (err) {
      console.error('카카오 로그인 실패:', err)
      alert(language === 'ko' ? '로그인에 실패했습니다. 다시 시도해주세요.' : 'Login failed. Please try again.')
    }
  }
  
  // 인증 로딩 중
  if (authLoading) {
    return (
      <div className={`my-trip-page ${isDark ? 'dark-theme' : ''}`}>
        <div className="trip-login-required">
          <div className="auth-loading">
            <div className="loading-spinner"></div>
            <p>{language === 'ko' ? '로그인 확인 중...' : 'Checking login status...'}</p>
          </div>
        </div>
      </div>
    )
  }
  
  // 로그인 필요
  if (!user) {
    return (
      <div className={`my-trip-page ${isDark ? 'dark-theme' : ''}`}>
        <div className="trip-login-required">
          <FiMap className="login-icon" />
          <h2>{language === 'ko' ? '로그인이 필요합니다' : 'Login Required'}</h2>
          <p>{language === 'ko' ? '나만의 여행 계획을 만들려면 카카오 계정으로 로그인해주세요' : 'Please login with Kakao to create your trip plans'}</p>
          <button className="kakao-login-btn" onClick={handleKakaoLogin}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.463 2 10.71c0 2.754 1.826 5.168 4.568 6.528-.16.57-.622 2.234-.714 2.584-.112.43.158.424.332.308.137-.09 2.173-1.474 3.056-2.074.254.038.515.058.78.072h-.02c.332.02.665.03 1 .03 5.523 0 10-3.463 10-7.448S17.523 3 12 3z"/>
            </svg>
            {language === 'ko' ? '카카오로 시작하기' : 'Continue with Kakao'}
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`my-trip-page ${isDark ? 'dark-theme' : ''}`}>
      <div className="trip-container">
        {/* 헤더 */}
        <header className="trip-header">
          <div className="trip-header-content">
            <h1>
              <FiMap />
              {language === 'ko' ? '나의 여행 계획' : 'My Trip Plans'}
            </h1>
            <p>{language === 'ko' ? '대전에서의 특별한 여행을 계획해보세요' : 'Plan your special trip in Daejeon'}</p>
          </div>
          <div className="trip-header-actions">
            <div className="view-toggle">
              <button 
                className={viewMode === 'grid' ? 'active' : ''} 
                onClick={() => setViewMode('grid')}
              >
                <FiGrid />
              </button>
              <button 
                className={viewMode === 'list' ? 'active' : ''} 
                onClick={() => setViewMode('list')}
              >
                <FiList />
              </button>
            </div>
            <button className="create-trip-btn" onClick={() => setIsCreating(true)}>
              <FiPlus /> {language === 'ko' ? '새 여행 계획' : 'New Trip'}
            </button>
          </div>
        </header>
        
        {/* 새 여행 생성 모달 */}
        {isCreating && (
          <div className="trip-modal-overlay">
            <div className="trip-modal">
              <div className="modal-header">
                <h2>{language === 'ko' ? '새 여행 계획 만들기' : 'Create New Trip'}</h2>
                <button className="modal-close" onClick={() => setIsCreating(false)}>
                  <FiX />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>{language === 'ko' ? '여행 제목' : 'Trip Title'}</label>
                  <input
                    type="text"
                    value={newTripForm.title}
                    onChange={(e) => setNewTripForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={language === 'ko' ? '예: 대전 봄 여행' : 'e.g., Spring Trip to Daejeon'}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{language === 'ko' ? '시작일' : 'Start Date'}</label>
                    <input
                      type="date"
                      value={newTripForm.startDate}
                      onChange={(e) => setNewTripForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>{language === 'ko' ? '종료일' : 'End Date'}</label>
                    <input
                      type="date"
                      value={newTripForm.endDate}
                      min={newTripForm.startDate}
                      onChange={(e) => setNewTripForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>{language === 'ko' ? '설명 (선택)' : 'Description (optional)'}</label>
                  <textarea
                    value={newTripForm.description}
                    onChange={(e) => setNewTripForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={language === 'ko' ? '여행에 대한 간단한 설명...' : 'Brief description of your trip...'}
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setIsCreating(false)}>
                  {language === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button className="save-btn" onClick={handleCreateTrip}>
                  <FiSave /> {language === 'ko' ? '생성하기' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 숙소 설정 모달 */}
        {showAccommodationModal && (
          <div className="trip-modal-overlay">
            <div className="trip-modal accommodation-modal">
              <div className="modal-header">
                <h2>
                  <FiHome />
                  {language === 'ko' ? '숙소 설정' : 'Set Accommodation'}
                </h2>
                <button className="modal-close" onClick={() => setShowAccommodationModal(false)}>
                  <FiX />
                </button>
              </div>
              <div className="modal-body">
                {/* 숙소 검색 */}
                <div className="form-group">
                  <label>{language === 'ko' ? '숙소 검색' : 'Search Accommodation'}</label>
                  <div className="accommodation-search-wrapper">
                    <input
                      type="text"
                      value={accommodationSearchQuery}
                      onChange={(e) => setAccommodationSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchAccommodation()}
                      placeholder={language === 'ko' ? '숙소 이름 또는 주소 검색...' : 'Search by name or address...'}
                    />
                    <button onClick={handleSearchAccommodation} disabled={isSearchingAccommodation}>
                      <FiSearch />
                    </button>
                  </div>
                </div>
                
                {/* 검색 결과 */}
                {accommodationSearchResults.length > 0 && (
                  <div className="accommodation-search-results">
                    {accommodationSearchResults.map((acc, idx) => (
                      <div 
                        key={idx} 
                        className="accommodation-result-item"
                        onClick={() => handleSelectAccommodation(acc)}
                      >
                        <FiHome />
                        <div>
                          <strong>{acc.name}</strong>
                          <small>{acc.address}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="form-divider">
                  <span>{language === 'ko' ? '또는 직접 입력' : 'or enter manually'}</span>
                </div>
                
                <div className="form-group">
                  <label>{language === 'ko' ? '숙소 이름' : 'Accommodation Name'}</label>
                  <input
                    type="text"
                    value={accommodationForm.name}
                    onChange={(e) => setAccommodationForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={language === 'ko' ? '예: 대전 호텔' : 'e.g., Daejeon Hotel'}
                  />
                </div>
                <div className="form-group">
                  <label>{language === 'ko' ? '숙소 주소' : 'Address'}</label>
                  <input
                    type="text"
                    value={accommodationForm.address}
                    onChange={(e) => setAccommodationForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder={language === 'ko' ? '예: 대전시 중구 대종로 480' : 'e.g., 480 Daejong-ro, Jung-gu, Daejeon'}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setShowAccommodationModal(false)}>
                  {language === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button className="save-btn" onClick={handleSaveAccommodation}>
                  <FiSave /> {language === 'ko' ? '저장' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 메인 콘텐츠 */}
        <div className="trip-main">
          {/* 왼쪽: 여행 목록 */}
          <aside className={`trip-sidebar ${selectedTrip ? 'collapsed' : ''}`}>
            <h3>{language === 'ko' ? '내 여행 목록' : 'My Trips'}</h3>
            
            {loading ? (
              <div className="trip-loading">
                <div className="loading-spinner" />
                <span>{language === 'ko' ? '로딩중...' : 'Loading...'}</span>
              </div>
            ) : tripPlans.length === 0 ? (
              <div className="no-trips">
                <FiCalendar />
                <p>{language === 'ko' ? '아직 여행 계획이 없습니다' : 'No trip plans yet'}</p>
                <button onClick={() => setIsCreating(true)}>
                  <FiPlus /> {language === 'ko' ? '첫 여행 만들기' : 'Create First Trip'}
                </button>
              </div>
            ) : (
              <div className={`trip-list ${viewMode}`}>
                {tripPlans.map(trip => (
                  <div 
                    key={trip.id} 
                    className={`trip-card ${selectedTrip?.id === trip.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTrip(trip)}
                  >
                    <div className="trip-card-header">
                      <h4>{trip.title}</h4>
                      <button 
                        className="delete-trip-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTrip(trip.id)
                        }}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    <div className="trip-card-info">
                      <span className="trip-dates">
                        <FiCalendar />
                        {trip.startDate} ~ {trip.endDate}
                      </span>
                      <span className="trip-duration">
                        {getTripDuration(trip)}{language === 'ko' ? '일' : ' days'}
                      </span>
                    </div>
                    {trip.description && (
                      <p className="trip-description">{trip.description}</p>
                    )}
                    <div className="trip-card-stats">
                      <span>
                        <FiMapPin />
                        {trip.days?.reduce((acc, day) => acc + (day.places?.length || 0), 0) || 0}
                        {language === 'ko' ? '개 장소' : ' places'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
          
          {/* 오른쪽: 선택된 여행 상세 */}
          {selectedTrip && (
            <>
            <div className="trip-detail">
              <div className="trip-detail-header">
                <div className="trip-detail-title">
                  <h2>{selectedTrip.title}</h2>
                  <span className="trip-period">
                    <FiCalendar />
                    {selectedTrip.startDate} ~ {selectedTrip.endDate}
                    ({getTripDuration(selectedTrip)}{language === 'ko' ? '일' : ' days'})
                  </span>
                </div>
                <button className="close-detail" onClick={() => setSelectedTrip(null)}>
                  <FiX />
                </button>
              </div>
              
              {/* 숙소 설정 섹션 */}
              <div className="accommodation-section">
                <div className="accommodation-header">
                  <h3>
                    <FiHome />
                    {language === 'ko' ? '숙소' : 'Accommodation'}
                  </h3>
                  <button 
                    className="accommodation-edit-btn"
                    onClick={openAccommodationModal}
                  >
                    {selectedTrip.accommodationName 
                      ? <><FiEdit2 /> {language === 'ko' ? '수정' : 'Edit'}</>
                      : <><FiPlus /> {language === 'ko' ? '설정' : 'Set'}</>
                    }
                  </button>
                </div>
                {selectedTrip.accommodationName ? (
                  <div className="accommodation-info">
                    <strong>{selectedTrip.accommodationName}</strong>
                    <p>{selectedTrip.accommodationAddress}</p>
                  </div>
                ) : (
                  <div className="accommodation-empty">
                    <p>{language === 'ko' ? '숙소를 설정하면 2일차부터 숙소에서 출발합니다' : 'Set accommodation to start from hotel on Day 2+'}</p>
                  </div>
                )}
              </div>
              
              {/* 장소 검색 */}
              <div className="place-search-section">
                <h3>
                  <FiMapPin />
                  {language === 'ko' ? '장소 추가하기' : 'Add Places'}
                </h3>
                <div className="search-controls">
                  <select 
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                  >
                    <option value="travel">{language === 'ko' ? '관광지' : 'Tourist Spots'}</option>
                    <option value="food">{language === 'ko' ? '맛집' : 'Restaurants'}</option>
                    <option value="culture">{language === 'ko' ? '문화시설' : 'Culture'}</option>
                  </select>
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchPlaces()}
                      placeholder={language === 'ko' ? '장소 검색...' : 'Search places...'}
                    />
                    <button onClick={handleSearchPlaces} disabled={isSearching}>
                      {isSearching ? '...' : language === 'ko' ? '검색' : 'Search'}
                    </button>
                  </div>
                </div>
                
                {/* 검색 결과 */}
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((place, idx) => (
                      <div key={idx} className="search-result-item">
                        <div className="result-info">
                          <span className="result-type">
                            {place.type === 'travel' && <FiMapPin />}
                            {place.type === 'food' && <FiCoffee />}
                            {place.type === 'culture' && <FiStar />}
                          </span>
                          <div className="result-text">
                            <strong>{place.name}</strong>
                            <small>{place.address}</small>
                          </div>
                        </div>
                        <div className="result-actions">
                          {selectedTrip.days?.map(day => (
                            <button
                              key={day.id}
                              className="add-to-day-btn"
                              onClick={() => handleAddPlace(day.id, place)}
                            >
                              Day {day.dayNumber}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* 일정 목록 */}
              <div className="trip-days">
                {selectedTrip.days?.sort((a, b) => a.dayNumber - b.dayNumber).map(day => (
                  <div key={day.id} className={`trip-day ${expandedDays[day.id] ? 'expanded' : ''}`}>
                    <div className="day-header" onClick={() => toggleDay(day.id)}>
                      <div className="day-info">
                        <span className="day-number">Day {day.dayNumber}</span>
                        <span className="day-date">{day.date}</span>
                        <span className="day-place-count">
                          ({day.places?.length || 0}{language === 'ko' ? '개 장소' : ' places'})
                        </span>
                      </div>
                      {expandedDays[day.id] ? <FiChevronUp /> : <FiChevronDown />}
                    </div>
                    
                    {expandedDays[day.id] && (
                      <div className="day-content">
                        {/* 2일차 이후 숙소에서 시작 표시 */}
                        {day.dayNumber > 1 && selectedTrip.accommodationName && (
                          <div className="day-start-accommodation">
                            <div className="accommodation-start-marker">
                              <FiHome className="accommodation-icon" />
                              <div className="accommodation-start-info">
                                <span className="start-label">{language === 'ko' ? '출발' : 'Start'}</span>
                                <strong>{selectedTrip.accommodationName}</strong>
                                <small>{selectedTrip.accommodationAddress}</small>
                              </div>
                            </div>
                            
                            {/* 숙소에서 첫 번째 장소까지 교통수단 (장소가 있을 때만) */}
                            {day.places?.length > 0 && (
                              <div className={`transport-connector ${highlightedRoute?.type === 'accommodation' && highlightedRoute?.dayId === day.id ? 'highlighted' : ''}`}>
                                {editingAccommodationTransport === day.id ? (
                                  <div className="transport-selector">
                                    <span className="transport-label">
                                      {language === 'ko' ? '이동 방법:' : 'Transport:'}
                                    </span>
                                    <div className="transport-options">
                                      {transportOptions.map(opt => {
                                        const IconComponent = opt.icon
                                        return (
                                          <button
                                            key={opt.id}
                                            className={`transport-option ${accommodationTransport[day.id]?.transport === opt.id ? 'selected' : ''}`}
                                            onClick={() => {
                                              handleUpdateAccommodationTransport(day.id, opt.id)
                                              setEditingAccommodationTransport(null)
                                            }}
                                            title={language === 'ko' ? opt.labelKo : opt.labelEn}
                                          >
                                            <IconComponent />
                                          </button>
                                        )
                                      })}
                                    </div>
                                    <button 
                                      className="transport-cancel"
                                      onClick={() => setEditingAccommodationTransport(null)}
                                    >
                                      <FiX />
                                    </button>
                                  </div>
                                ) : (
                                  <div 
                                    className="transport-display"
                                    onClick={() => {
                                      // 지도에서 해당 경로 하이라이트
                                      setHighlightedRoute({
                                        placeId: null,
                                        dayId: day.id,
                                        type: 'accommodation'
                                      })
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <div className="transport-line" />
                                    <div className="transport-icon-wrapper">
                                      {accommodationTransport[day.id]?.transport ? (
                                        (() => {
                                          const opt = transportOptions.find(o => o.id === accommodationTransport[day.id].transport)
                                          const info = accommodationRouteInfo[day.id]
                                          if (opt) {
                                            const IconComponent = opt.icon
                                            return (
                                              <>
                                                <IconComponent className="transport-icon" />
                                                <div className="transport-details">
                                                  <span className="transport-text">
                                                    {language === 'ko' ? opt.labelKo : opt.labelEn}
                                                  </span>
                                                  {/* 버스/지하철 선택 시 노선이 없으면 "노선 없음"만 표시 */}
                                                  {(accommodationTransport[day.id]?.transport === 'subway' || accommodationTransport[day.id]?.transport === 'bus') && info?.noRoute ? (
                                                    <div className="no-route-message">
                                                      <span>{accommodationTransport[day.id]?.transport === 'subway' 
                                                        ? (language === 'ko' ? '이용 가능한 지하철 노선이 없습니다' : 'No subway route available')
                                                        : (language === 'ko' ? '이용 가능한 버스 노선이 없습니다' : 'No bus route available')
                                                      }</span>
                                                    </div>
                                                  ) : (
                                                    <>
                                                      {info?.loading ? (
                                                        <span className="transport-time loading">...</span>
                                                      ) : info?.duration ? (
                                                        <span className="transport-time">
                                                          {info.isEstimate ? '약 ' : ''}{info.duration}{language === 'ko' ? '분' : 'min'}
                                                          <small>({info.distance}km)</small>
                                                          {info.payment && !info.isEstimate && (
                                                            <small className="payment-info">
                                                              {language === 'ko' ? ` / ${info.payment.toLocaleString()}원` : ` / ₩${info.payment.toLocaleString()}`}
                                                            </small>
                                                          )}
                                                        </span>
                                                      ) : null}
                                                      {/* 버스/지하철 상세 경로 표시 */}
                                                      {info?.routeDetails && info.routeDetails.length > 0 && !info.isEstimate && (
                                                        <div className="route-details">
                                                          {info.routeDetails.map((detail, detailIdx) => (
                                                            <div key={detailIdx} className={`route-detail-item ${detail.type}`}>
                                                              {detail.type === 'bus' && (
                                                                <>
                                                                  <span className="route-badge bus" style={{ backgroundColor: getDayColor(day.dayNumber) }}>
                                                                    {detail.busNo}
                                                                  </span>
                                                                  <span className="route-stations">
                                                                    {detail.startStation} → {detail.endStation}
                                                                    <small>({detail.stationCount}{language === 'ko' ? '정거장' : 'stops'})</small>
                                                                  </span>
                                                                </>
                                                              )}
                                                              {detail.type === 'subway' && (
                                                                <>
                                                                  <span className="route-badge subway" style={{ backgroundColor: getDayColor(day.dayNumber) }}>
                                                                    {detail.lineName}
                                                                  </span>
                                                                  <span className="route-stations">
                                                                    {detail.startStation} → {detail.endStation}
                                                                    <small>({detail.stationCount}{language === 'ko' ? '역' : 'stations'})</small>
                                                                  </span>
                                                                </>
                                                              )}
                                                              {detail.type === 'walk' && (
                                                                <span className="route-walk">
                                                                  🚶 {language === 'ko' ? '도보' : 'Walk'} {detail.sectionTime}{language === 'ko' ? '분' : 'min'}
                                                                </span>
                                                              )}
                                                            </div>
                                                          ))}
                                                        </div>
                                                      )}
                                                      {info?.isEstimate && (accommodationTransport[day.id].transport === 'bus' || accommodationTransport[day.id].transport === 'subway') && (
                                                        <small className="estimate-note">
                                                          {language === 'ko' ? ' (예상)' : ' (est.)'}
                                                        </small>
                                                      )}
                                                    </>
                                                  )}
                                                </div>
                                                {/* 편집 버튼 */}
                                                <button
                                                  className="transport-change-btn"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditingAccommodationTransport(day.id)
                                                  }}
                                                  title={language === 'ko' ? '이동수단 변경' : 'Change transport'}
                                                >
                                                  <FiEdit2 />
                                                </button>
                                              </>
                                            )
                                          }
                                          return <FiPlus className="transport-add" />
                                        })()
                                      ) : (
                                        <>
                                          <FiPlus className="transport-add" onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingAccommodationTransport(day.id)
                                          }} />
                                          <span className="transport-hint" onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingAccommodationTransport(day.id)
                                          }}>
                                            {language === 'ko' ? '이동 방법 추가' : 'Add transport'}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    <div className="transport-line" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {day.places?.length === 0 ? (
                          <div className="no-places">
                            <p>{language === 'ko' ? '아직 추가된 장소가 없습니다' : 'No places added yet'}</p>
                            <small>{language === 'ko' ? '위에서 장소를 검색하여 추가해보세요' : 'Search and add places above'}</small>
                          </div>
                        ) : (
                          <div className="places-list">
                            {day.places?.map((place, idx) => (
                              <div 
                                key={place.id}
                                className={`place-wrapper ${dragOverIndex === idx && draggedPlace?.dayId === day.id ? 'drag-over' : ''}`}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDrop={(e) => handleDrop(e, day.id, idx)}
                              >
                                <div 
                                  className={`place-item ${draggedPlace?.placeId === place.id ? 'dragging' : ''}`}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, day.id, place.id, idx)}
                                  onDragEnd={handleDragEnd}
                                >
                                  <div className="drag-handle" title={language === 'ko' ? '드래그하여 순서 변경' : 'Drag to reorder'}>
                                    <FiGrid />
                                  </div>
                                  <div className="place-order">{idx + 1}</div>
                                  {place.placeImage && (
                                    <div 
                                      className="place-image"
                                      style={{ backgroundImage: `url(${getReliableImageUrl(place.placeImage)})` }}
                                    />
                                  )}
                                  <div className="place-info">
                                    <h5>
                                      {place.placeType === 'travel' && <FiMapPin />}
                                      {place.placeType === 'food' && <FiCoffee />}
                                      {place.placeType === 'culture' && <FiStar />}
                                      {place.placeName}
                                    </h5>
                                    <p>{place.placeAddress}</p>
                                    {place.placeDescription && (
                                      <small>{place.placeDescription}</small>
                                    )}
                                  </div>
                                  <div className="place-actions">
                                    <button 
                                      className={`parking-btn ${expandedParking === place.id ? 'active' : ''}`}
                                      onClick={() => fetchNearbyParkings(place.id, place.placeAddress)}
                                      title={language === 'ko' ? '주변 주차장' : 'Nearby Parking'}
                                    >
                                      <FaParking />
                                    </button>
                                    <button 
                                      className="remove-place"
                                      onClick={() => handleDeletePlace(day.id, place.id)}
                                    >
                                      <FiTrash2 />
                                    </button>
                                  </div>
                                </div>
                                
                                {/* 주변 주차장 목록 */}
                                {expandedParking === place.id && (
                                  <div className="parking-list">
                                    {nearbyParkings[place.id]?.loading ? (
                                      <div className="parking-loading">
                                        <span>{language === 'ko' ? '주차장 검색 중...' : 'Searching parking...'}</span>
                                      </div>
                                    ) : nearbyParkings[place.id]?.parkings?.length > 0 ? (
                                      <>
                                        <div className="parking-header">
                                          <FaParking />
                                          <span>{language === 'ko' ? '5km 이내 주차장' : 'Parking within 5km'}</span>
                                          <button onClick={() => setExpandedParking(null)}>
                                            <FiX />
                                          </button>
                                        </div>
                                        {nearbyParkings[place.id].parkings.map((parking, pIdx) => (
                                          <div key={pIdx} className="parking-item">
                                            <div className="parking-info">
                                              <strong>{parking.name}</strong>
                                              <span className="parking-distance">
                                                {parking.distance.toFixed(1)}km
                                              </span>
                                            </div>
                                            <div className="parking-details">
                                              <span className={`parking-type ${parking.parkingType === '공영' ? 'public' : 'private'}`}>
                                                {parking.parkingType}
                                              </span>
                                              <span className={`parking-charge ${parking.chargeInfo === '무료' ? 'free' : 'paid'}`}>
                                                {parking.chargeInfo}
                                              </span>
                                              {parking.totalLot && (
                                                <span className="parking-capacity">
                                                  {parking.totalLot}{language === 'ko' ? '면' : ' spots'}
                                                </span>
                                              )}
                                            </div>
                                            {parking.addr && (
                                              <small className="parking-addr">{parking.addr}</small>
                                            )}
                                          </div>
                                        ))}
                                      </>
                                    ) : (
                                      <div className="parking-empty">
                                        <FaParking />
                                        <span>{language === 'ko' ? '근처에 주차장이 없습니다' : 'No parking nearby'}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* 이동 방법 표시 (마지막 장소 제외) */}
                                {idx < day.places.length - 1 && (
                                  <div className={`transport-connector ${highlightedRoute?.type === 'place' && highlightedRoute?.placeId === place.id ? 'highlighted' : ''}`}>
                                    {editingTransport?.dayId === day.id && editingTransport?.afterPlaceIndex === idx ? (
                                      <div className="transport-selector">
                                        <span className="transport-label">
                                          {language === 'ko' ? '이동 방법:' : 'Transport:'}
                                        </span>
                                        <div className="transport-options">
                                          {transportOptions.map(opt => {
                                            const IconComponent = opt.icon
                                            return (
                                              <button
                                                key={opt.id}
                                                className={`transport-option ${place.transportToNext === opt.id ? 'selected' : ''}`}
                                                onClick={() => {
                                                  handleUpdateTransport(day.id, place.id, opt.id)
                                                  setEditingTransport(null)
                                                }}
                                                title={language === 'ko' ? opt.labelKo : opt.labelEn}
                                              >
                                                <IconComponent />
                                              </button>
                                            )
                                          })}
                                        </div>
                                        <button 
                                          className="transport-cancel"
                                          onClick={() => setEditingTransport(null)}
                                        >
                                          <FiX />
                                        </button>
                                      </div>
                                    ) : (
                                      <div 
                                        className="transport-display"
                                        onClick={() => {
                                          // 지도에서 해당 경로 하이라이트
                                          setHighlightedRoute({
                                            placeId: place.id,
                                            dayId: day.id,
                                            type: 'place'
                                          })
                                        }}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <div className="transport-line" />
                                        <div 
                                          className="transport-icon-wrapper"
                                          onClick={!place.transportToNext ? (e) => {
                                            e.stopPropagation()
                                            setEditingTransport({ dayId: day.id, afterPlaceIndex: idx })
                                          } : undefined}
                                        >
                                          {place.transportToNext ? (
                                            (() => {
                                              const opt = transportOptions.find(o => o.id === place.transportToNext)
                                              const info = routeInfo[place.id]
                                              if (opt) {
                                                const IconComponent = opt.icon
                                                return (
                                                  <>
                                                    <IconComponent className="transport-icon" />
                                                    <div className="transport-details">
                                                      <span className="transport-text">
                                                        {language === 'ko' ? opt.labelKo : opt.labelEn}
                                                      </span>
                                                      {/* 버스/지하철 선택 시 노선이 없으면 "노선 없음"만 표시 */}
                                                      {(place.transportToNext === 'subway' || place.transportToNext === 'bus') && info?.noRoute ? (
                                                        <div className="no-route-message">
                                                          <span>{place.transportToNext === 'subway' 
                                                            ? (language === 'ko' ? '이용 가능한 지하철 노선이 없습니다' : 'No subway route available')
                                                            : (language === 'ko' ? '이용 가능한 버스 노선이 없습니다' : 'No bus route available')
                                                          }</span>
                                                        </div>
                                                      ) : (
                                                        <>
                                                          {info?.loading ? (
                                                            <span className="transport-time loading">...</span>
                                                          ) : info?.duration ? (
                                                            <span className="transport-time">
                                                              {info.isEstimate ? '약 ' : ''}{info.duration}{language === 'ko' ? '분' : 'min'}
                                                              <small>({info.distance}km)</small>
                                                              {info.payment && !info.isEstimate && (
                                                                <small className="payment-info">
                                                                  {language === 'ko' ? ` / ${info.payment.toLocaleString()}원` : ` / ₩${info.payment.toLocaleString()}`}
                                                                </small>
                                                              )}
                                                            </span>
                                                          ) : null}
                                                          {/* 버스/지하철 상세 경로 표시 */}
                                                          {info?.routeDetails && info.routeDetails.length > 0 && !info.isEstimate && (
                                                            <div className="route-details">
                                                              {info.routeDetails.map((detail, detailIdx) => (
                                                                <div key={detailIdx} className={`route-detail-item ${detail.type}`}>
                                                                  {detail.type === 'bus' && (
                                                                    <>
                                                                      <span className="route-badge bus" style={{ backgroundColor: getDayColor(day.dayNumber) }}>
                                                                        {detail.busNo}
                                                                      </span>
                                                                      <span className="route-stations">
                                                                        {detail.startStation} → {detail.endStation}
                                                                        <small>({detail.stationCount}{language === 'ko' ? '정거장' : 'stops'})</small>
                                                                      </span>
                                                                      {/* 같은 구간에서 이용 가능한 다른 버스들 표시 */}
                                                                      {detail.availableBuses && detail.availableBuses.length > 1 && (
                                                                        <span className="available-buses">
                                                                          <small>
                                                                            {language === 'ko' ? '또는 ' : 'or '}
                                                                            {detail.availableBuses.slice(1, 4).map((bus, i) => (
                                                                              <span key={i} className="alt-bus" style={{ backgroundColor: getDayColor(day.dayNumber), opacity: 0.7 }}>
                                                                                {bus.busNo}
                                                                              </span>
                                                                            ))}
                                                                            {detail.availableBuses.length > 4 && 
                                                                              <span className="more-buses">+{detail.availableBuses.length - 4}</span>
                                                                            }
                                                                          </small>
                                                                        </span>
                                                                      )}
                                                                    </>
                                                                  )}
                                                                  {detail.type === 'subway' && (
                                                                    <>
                                                                      <span className="route-badge subway" style={{ backgroundColor: getDayColor(day.dayNumber) }}>
                                                                        {detail.lineName}
                                                                      </span>
                                                                      <span className="route-stations">
                                                                        {detail.startStation} → {detail.endStation}
                                                                        <small>({detail.stationCount}{language === 'ko' ? '역' : 'stations'})</small>
                                                                      </span>
                                                                    </>
                                                                  )}
                                                                  {detail.type === 'walk' && (
                                                                    <span className="route-walk">
                                                                      🚶 {language === 'ko' ? '도보' : 'Walk'} {detail.sectionTime}{language === 'ko' ? '분' : 'min'}
                                                                    </span>
                                                                  )}
                                                                </div>
                                                              ))}
                                                            </div>
                                                          )}
                                                          {/* 다른 경로 옵션 표시 (버스/지하철만) */}
                                                          {info?.allRoutes && info.allRoutes.length > 1 && (place.transportToNext === 'bus' || place.transportToNext === 'subway') && (
                                                            <div className="route-alternatives">
                                                              <div className="route-alternatives-header">
                                                                <small>{language === 'ko' ? '다른 경로' : 'Other routes'} ({info.allRoutes.length - 1})</small>
                                                              </div>
                                                              <div className="route-alternatives-list">
                                                                {info.allRoutes.slice(0, 5).map((route, routeIdx) => (
                                                                  routeIdx !== (info.selectedRouteIndex || 0) && (
                                                                    <button
                                                                      key={routeIdx}
                                                                      className="route-alternative-item"
                                                                      onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleSelectRoute(place.id, routeIdx)
                                                                      }}
                                                                    >
                                                                      <span className="route-alt-time">{route.totalTime}분</span>
                                                                      <span className="route-alt-summary">
                                                                        {route.busSummary || route.subwaySummary || '-'}
                                                                      </span>
                                                                    </button>
                                                                  )
                                                                ))}
                                                              </div>
                                                            </div>
                                                          )}
                                                          {info?.isEstimate && (place.transportToNext === 'bus' || place.transportToNext === 'subway') && (
                                                            <small className="estimate-note">
                                                              {language === 'ko' ? ' (예상 시간)' : ' (estimated)'}
                                                            </small>
                                                          )}
                                                        </>
                                                      )}
                                                    </div>
                                                    {/* 바꾸기 버튼 */}
                                                    <button 
                                                      className="transport-change-btn"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        setEditingTransport({ dayId: day.id, afterPlaceIndex: idx })
                                                      }}
                                                      title={language === 'ko' ? '이동수단 바꾸기' : 'Change transport'}
                                                    >
                                                      <FiEdit2 />
                                                    </button>
                                                  </>
                                                )
                                              }
                                              return <FiPlus className="transport-add" />
                                            })()
                                          ) : (
                                            <>
                                              <FiPlus className="transport-add" />
                                              <span className="transport-hint">
                                                {language === 'ko' ? '이동 방법 추가' : 'Add transport'}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        <div className="transport-line" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* 오른쪽 지도 패널 */}
            {showMap && (
              <div className={`trip-map-panel ${mapExpanded ? 'expanded' : ''}`}>
                <div className="map-panel-header">
                  <h3>
                    <FiMap />
                    {language === 'ko' ? '경로 지도' : 'Route Map'}
                  </h3>
                  <div className="map-panel-actions">
                    <button 
                      className="map-toggle-btn"
                      onClick={() => setMapExpanded(!mapExpanded)}
                      title={mapExpanded ? (language === 'ko' ? '축소' : 'Minimize') : (language === 'ko' ? '확대' : 'Expand')}
                    >
                      {mapExpanded ? <FiMinimize2 /> : <FiMaximize2 />}
                    </button>
                    <button 
                      className="map-close-btn"
                      onClick={() => setShowMap(false)}
                      title={language === 'ko' ? '닫기' : 'Close'}
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
                <div className="map-container" ref={mapContainerRef}>
                  {/* 카카오맵이 여기에 렌더링됨 */}
                </div>
                <div className="map-legend">
                  <span className="legend-item">
                    <span className="legend-marker">1</span>
                    {language === 'ko' ? '방문 순서' : 'Visit Order'}
                  </span>
                  <span className="legend-item">
                    <span className="legend-line"></span>
                    {language === 'ko' ? '이동 경로' : 'Route'}
                  </span>
                </div>
                <div className="map-tip">
                  {language === 'ko' 
                    ? '💡 일정을 펼치면 해당 날짜의 장소들이 지도에 표시됩니다' 
                    : '💡 Expand a day to see its places on the map'}
                </div>
              </div>
            )}
            
            {/* 지도 토글 버튼 (지도가 닫혀있을 때) */}
            {!showMap && (
              <button 
                className="show-map-btn"
                onClick={() => setShowMap(true)}
              >
                <FiMap />
                {language === 'ko' ? '지도 보기' : 'Show Map'}
              </button>
            )}
            </>
          )}
          
          {/* 여행 선택 안내 */}
          {!selectedTrip && tripPlans.length > 0 && (
            <div className="trip-placeholder">
              <FiNavigation />
              <h3>{language === 'ko' ? '여행을 선택해주세요' : 'Select a trip'}</h3>
              <p>{language === 'ko' ? '왼쪽 목록에서 여행을 선택하면 상세 일정을 볼 수 있습니다' : 'Select a trip from the list to view details'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyTripPage
