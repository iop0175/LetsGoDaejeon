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
import { 
  getUserTripPlans, createTripPlan, updateTripPlan, deleteTripPlan,
  addTripDay, updateTripDay, deleteTripDay,
  addTripPlace, updateTripPlace, deleteTripPlace
} from '../services/tripService'
import { getAllDbData } from '../services/dbService'
import { getRouteByTransport, getCoordinatesFromAddress, calculateDistance, getCarRoute } from '../services/kakaoMobilityService'
import { getDaejeonParking } from '../services/api'
import './MyTripPage.css'

const MyTripPage = () => {
  const { isDarkMode } = useTheme()
  const { language } = useLanguage()
  const { user } = useAuth()
  
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
  
  // 주차장 정보 저장
  const [nearbyParkings, setNearbyParkings] = useState({}) // { "placeId": { parkings: [], loading } }
  const [allParkings, setAllParkings] = useState([]) // 전체 주차장 데이터 캐시
  const [expandedParking, setExpandedParking] = useState(null) // 펼쳐진 주차장 목록의 placeId
  
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
  
  // 지도 관련 상태
  const [showMap, setShowMap] = useState(true) // 지도 패널 표시 여부
  const [mapExpanded, setMapExpanded] = useState(false) // 지도 확대 여부
  const [mapReady, setMapReady] = useState(false) // 지도 준비 완료 여부
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const polylineRef = useRef(null)
  
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
        
        // 이동 시간 조회
        const day = selectedTrip?.days?.find(d => d.id === dayId)
        const placeIndex = day?.places?.findIndex(p => p.id === placeId)
        if (day && placeIndex !== -1 && placeIndex < day.places.length - 1) {
          const fromPlace = day.places[placeIndex]
          const toPlace = day.places[placeIndex + 1]
          fetchRouteInfo(placeId, fromPlace.placeAddress, toPlace.placeAddress, transportType)
        }
      }
    } catch (err) {
      console.error('이동 방법 업데이트 실패:', err)
    }
  }
  
  // 숙소에서 첫 번째 장소까지의 교통수단 업데이트 (2일차+)
  const handleUpdateAccommodationTransport = async (dayId, transportType) => {
    setAccommodationTransport(prev => ({
      ...prev,
      [dayId]: { transport: transportType }
    }))
    
    // 이동 시간 조회
    const day = selectedTrip?.days?.find(d => d.id === dayId)
    if (day && day.places?.length > 0 && selectedTrip.accommodationAddress) {
      const firstPlace = day.places[0]
      fetchAccommodationRouteInfo(dayId, selectedTrip.accommodationAddress, firstPlace.placeAddress, transportType)
    }
  }
  
  // 숙소에서 첫 번째 장소까지 이동 시간 조회
  const fetchAccommodationRouteInfo = async (dayId, fromAddress, toAddress, transportType) => {
    if (!fromAddress || !toAddress) return
    
    setAccommodationRouteInfo(prev => ({
      ...prev,
      [dayId]: { loading: true }
    }))
    
    try {
      const result = await getRouteByTransport(fromAddress, toAddress, transportType)
      
      if (result.success) {
        setAccommodationRouteInfo(prev => ({
          ...prev,
          [dayId]: {
            duration: result.duration,
            distance: result.distance,
            isEstimate: result.isEstimate,
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
  
  // 이동 시간 조회
  const fetchRouteInfo = async (placeId, fromAddress, toAddress, transportType) => {
    if (!fromAddress || !toAddress) return
    
    // 로딩 상태 설정
    setRouteInfo(prev => ({
      ...prev,
      [placeId]: { loading: true }
    }))
    
    try {
      const result = await getRouteByTransport(fromAddress, toAddress, transportType)
      
      if (result.success) {
        setRouteInfo(prev => ({
          ...prev,
          [placeId]: {
            duration: result.duration,
            distance: result.distance,
            isEstimate: result.isEstimate,
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
          fetchRouteInfo(place.id, place.placeAddress, nextPlace.placeAddress, place.transportToNext)
        }
      })
    })
  }, [selectedTrip?.days])
  
  // 숙소에서 첫 번째 장소까지 이동 시간 자동 조회 (여행 선택 또는 숙소 설정 변경 시)
  useEffect(() => {
    if (!selectedTrip?.days || !selectedTrip.accommodationAddress) return
    
    selectedTrip.days.forEach(day => {
      // 2일차 이상, 장소가 있고, 교통수단이 설정된 경우
      if (day.dayNumber > 1 && day.places?.length > 0 && accommodationTransport[day.id]?.transport) {
        const firstPlace = day.places[0]
        // 이미 조회된 경우 스킵
        if (!accommodationRouteInfo[day.id] || accommodationRouteInfo[day.id].error) {
          fetchAccommodationRouteInfo(
            day.id, 
            selectedTrip.accommodationAddress, 
            firstPlace.placeAddress, 
            accommodationTransport[day.id].transport
          )
        }
      }
    })
  }, [selectedTrip, accommodationTransport])
  
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
      markersRef.current.forEach(marker => marker.setMap(null))
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
    
    // 기존 마커 제거
    markersRef.current.forEach(marker => marker.setMap(null))
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
      const bounds = new window.kakao.maps.LatLngBounds()
      const positions = []
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
      
      // 숙소 마커 추가 (2일차 이후가 펼쳐진 경우)
      const has2DayOrLater = placesToShow.some(p => p.dayNumber > 1)
      if (has2DayOrLater && selectedTrip.accommodationAddress) {
        try {
          const accCoords = await getCoordinatesFromAddress(selectedTrip.accommodationAddress)
          if (accCoords.success) {
            const accPosition = new window.kakao.maps.LatLng(accCoords.lat, accCoords.lng)
            bounds.extend(accPosition)
            
            // 숙소 마커 생성 (집 아이콘)
            const accMarkerContent = document.createElement('div')
            accMarkerContent.className = 'custom-map-marker accommodation-marker'
            accMarkerContent.innerHTML = `
              <div class="marker-pin accommodation-pin">
                <span class="marker-icon">🏨</span>
              </div>
              <div class="marker-label accommodation-label">${selectedTrip.accommodationName}</div>
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
        try {
          const coords = await getCoordinatesFromAddress(place.placeAddress)
          if (coords.success) {
            const position = new window.kakao.maps.LatLng(coords.lat, coords.lng)
            positions.push(position)
            bounds.extend(position)
            
            // 커스텀 마커 생성
            const markerColor = colors[(place.dayNumber - 1) % colors.length]
            const markerContent = document.createElement('div')
            markerContent.className = 'custom-map-marker'
            markerContent.innerHTML = `
              <div class="marker-pin" style="background-color: ${markerColor}">
                <span class="marker-number">${place.orderInDay}</span>
              </div>
              <div class="marker-label">${place.placeName}</div>
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
      
      // 숙소 좌표 조회 (2일차 이후 사용)
      let accommodationCoords = null
      if (selectedTrip.accommodationAddress) {
        try {
          const accResult = await getCoordinatesFromAddress(selectedTrip.accommodationAddress)
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
        const dayPlaceList = dayPlaces[dayNum]
        if (!dayPlaceList || dayPlaceList.length === 0) continue
        
        const dayColor = colors[(Number(dayNum) - 1) % colors.length]
        
        // 경로 시작점 결정
        let prevCoords = null
        
        // 2일차 이후이고 숙소가 있으면 숙소에서 시작
        if (Number(dayNum) > 1 && accommodationCoords) {
          prevCoords = accommodationCoords
        }
        
        // 일정 내 장소들 순회하며 실제 도로 경로 그리기
        for (let i = 0; i < dayPlaceList.length; i++) {
          const place = dayPlaceList[i]
          
          try {
            const coords = await getCoordinatesFromAddress(place.placeAddress)
            if (coords.success) {
              const currentCoords = { lat: coords.lat, lng: coords.lng }
              
              // 이전 좌표가 있으면 경로 그리기
              if (prevCoords) {
                // 실제 도로 경로 가져오기
                try {
                  const routeResult = await getCarRoute(
                    { lat: prevCoords.lat, lng: prevCoords.lng },
                    { lat: currentCoords.lat, lng: currentCoords.lng },
                    true // includePath = true로 경로 좌표 포함
                  )
                  
                  if (routeResult.success && routeResult.path && routeResult.path.length > 0) {
                    // 실제 도로 경로로 그리기
                    const path = routeResult.path.map(p => 
                      new window.kakao.maps.LatLng(p.lat, p.lng)
                    )
                    
                    const polyline = new window.kakao.maps.Polyline({
                      path: path,
                      strokeWeight: 4,
                      strokeColor: dayColor,
                      strokeOpacity: 0.8,
                      strokeStyle: 'solid'
                    })
                    polyline.setMap(mapRef.current)
                    polylines.push(polyline)
                  } else {
                    // 실패 시 직선으로 연결
                    const path = [
                      new window.kakao.maps.LatLng(prevCoords.lat, prevCoords.lng),
                      new window.kakao.maps.LatLng(currentCoords.lat, currentCoords.lng)
                    ]
                    
                    const polyline = new window.kakao.maps.Polyline({
                      path: path,
                      strokeWeight: 4,
                      strokeColor: dayColor,
                      strokeOpacity: 0.5,
                      strokeStyle: 'dashed' // 직선은 점선으로 표시
                    })
                    polyline.setMap(mapRef.current)
                    polylines.push(polyline)
                  }
                } catch (routeErr) {
                  console.error('경로 조회 실패:', routeErr)
                  // 실패 시 직선으로 연결
                  const path = [
                    new window.kakao.maps.LatLng(prevCoords.lat, prevCoords.lng),
                    new window.kakao.maps.LatLng(currentCoords.lat, currentCoords.lng)
                  ]
                  
                  const polyline = new window.kakao.maps.Polyline({
                    path: path,
                    strokeWeight: 4,
                    strokeColor: dayColor,
                    strokeOpacity: 0.5,
                    strokeStyle: 'dashed'
                  })
                  polyline.setMap(mapRef.current)
                  polylines.push(polyline)
                }
              }
              
              prevCoords = currentCoords
            }
          } catch (err) {
            console.error('좌표 조회 실패:', place.placeName, err)
          }
        }
      }
      
      // 기존 polylineRef 대신 polylines 배열 사용
      polylineRef.current = polylines
      
      // 모든 마커가 보이도록 지도 범위 조정
      if (positions.length > 0) {
        mapRef.current.setBounds(bounds)
      }
    }
    
    addMarkersAndRoute()
  }, [selectedTrip, expandedDays, mapReady])
  
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
    
    // 로컬 상태 업데이트
    setSelectedTrip(prev => {
      const newDays = prev.days.map(day => {
        if (day.id !== dayId) return day
        
        const newPlaces = [...day.places]
        const [movedPlace] = newPlaces.splice(sourceIndex, 1)
        newPlaces.splice(targetIndex, 0, movedPlace)
        
        // orderIndex 업데이트
        const updatedPlaces = newPlaces.map((place, idx) => ({
          ...place,
          orderIndex: idx
        }))
        
        return { ...day, places: updatedPlaces }
      })
      
      return { ...prev, days: newDays }
    })
    
    // DB 업데이트 (각 장소의 orderIndex 변경)
    const day = selectedTrip?.days?.find(d => d.id === dayId)
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
  
  // 로그인 필요
  if (!user) {
    return (
      <div className={`my-trip-page ${isDarkMode ? 'dark-theme' : ''}`}>
        <div className="trip-login-required">
          <FiMap className="login-icon" />
          <h2>{language === 'ko' ? '로그인이 필요합니다' : 'Login Required'}</h2>
          <p>{language === 'ko' ? '나만의 여행 계획을 만들려면 로그인해주세요' : 'Please login to create your trip plans'}</p>
          <Link to="/admin" className="login-link">
            {language === 'ko' ? '로그인하기' : 'Login'}
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`my-trip-page ${isDarkMode ? 'dark-theme' : ''}`}>
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
                              <div className="transport-connector">
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
                                    onClick={() => setEditingAccommodationTransport(day.id)}
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
                                                  {info?.loading ? (
                                                    <span className="transport-time loading">...</span>
                                                  ) : info?.duration ? (
                                                    <span className="transport-time">
                                                      {info.isEstimate ? '약 ' : ''}{info.duration}{language === 'ko' ? '분' : 'min'}
                                                      <small>({info.distance}km)</small>
                                                      {info.isEstimate && (accommodationTransport[day.id].transport === 'bus' || accommodationTransport[day.id].transport === 'subway') && (
                                                        <small className="estimate-note">
                                                          {language === 'ko' ? ' (예상)' : ' (est.)'}
                                                        </small>
                                                      )}
                                                    </span>
                                                  ) : null}
                                                </div>
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
                                      style={{ backgroundImage: `url(${place.placeImage})` }}
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
                                  <div className="transport-connector">
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
                                        onClick={() => setEditingTransport({ dayId: day.id, afterPlaceIndex: idx })}
                                      >
                                        <div className="transport-line" />
                                        <div className="transport-icon-wrapper">
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
                                                      {info?.loading ? (
                                                        <span className="transport-time loading">...</span>
                                                      ) : info?.duration ? (
                                                        <span className="transport-time">
                                                          {info.isEstimate ? '약 ' : ''}{info.duration}{language === 'ko' ? '분' : 'min'}
                                                          <small>({info.distance}km)</small>
                                                          {info.isEstimate && (place.transportToNext === 'bus' || place.transportToNext === 'subway') && (
                                                            <small className="estimate-note">
                                                              {language === 'ko' ? ' (예상)' : ' (est.)'}
                                                            </small>
                                                          )}
                                                        </span>
                                                      ) : null}
                                                    </div>
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
