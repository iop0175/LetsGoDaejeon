import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FiHome, FiUsers, FiMap, FiCalendar, FiShoppingBag, FiSettings, FiLogOut, 
  FiMenu, FiX, FiBarChart2, FiDatabase, FiCoffee, FiHeart, 
  FiTruck, FiRefreshCw, FiExternalLink, FiActivity, FiTrendingUp, FiCloud,
  FiEdit2, FiTrash2, FiPlus, FiImage, FiSave, FiXCircle, FiLoader, FiSearch,
  FiNavigation, FiEye, FiToggleLeft, FiToggleRight
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { 
  getTourSpots, getFestivals, getRestaurants, getCulturalFacilities,
  getMedicalFacilities, getShoppingPlaces, getTourRooms, getDaejeonParking
} from '../services/api'
import { 
  getAllDbCounts, getHeroSlides, createHeroSlide, updateHeroSlide, 
  deleteHeroSlide, deleteDbItem, updateDbItem, getSupabaseUsageStats,
  getPageVisitStats, getTodayPageVisitStats, getMostVisitedPageDB,
  getPopularSearchQueries, getTodayPopularSearchQueries, getSearchStats,
  getPageVisitStatsByPeriod
} from '../services/dbService'
import {
  getAdminPublishedTrips, adminUpdateTripPublishStatus, adminUpdateTrip,
  adminDeleteTrip, getPublishedTripStats
} from '../services/tripService'
import { getApiStats, API_NAMES, PAGE_NAMES, getMostCalledApi, getMostVisitedPage, resetApiStats } from '../utils/apiStats'
import { StatCard, ApiStatsChart, DataTable, Pagination, EditModal, SupabaseUsageStats, ExternalApiStats } from '../components/admin'
import './AdminPage.css'

// 페이지 관리 설정
const PAGE_CONFIGS = {
  travel: {
    title: { ko: '관광지', en: 'Travel' },
    icon: FiMap,
    color: '#0066cc',
    fetchFn: getTourSpots,
    fields: ['tourspotNm', 'tourspotAddr', 'tourspotSumm', 'signguNm', 'imageUrl', 'image_author', 'image_source'],
    labels: { tourspotNm: '관광지명', tourspotAddr: '주소', tourspotSumm: '설명', signguNm: '구', imageUrl: '이미지', image_author: '사진 원작자', image_source: '이미지 출처' },
    tableName: 'travel_spots',
    uniqueField: 'tourspotNm'
  },
  festival: {
    title: { ko: '축제/행사', en: 'Festival' },
    icon: FiCalendar,
    color: '#9c27b0',
    fetchFn: getFestivals,
    fields: ['title', 'themeCdNm', 'placeCdNm', 'beginDt', 'endDt', 'imageUrl', 'image_author', 'image_source'],
    labels: { title: '행사명', themeCdNm: '테마', placeCdNm: '장소유형', beginDt: '시작일', endDt: '종료일', imageUrl: '이미지', image_author: '사진 원작자', image_source: '이미지 출처' },
    tableName: 'festivals',
    uniqueField: 'title'
  },
  food: {
    title: { ko: '맛집', en: 'Food' },
    icon: FiCoffee,
    color: '#ff6b35',
    fetchFn: getRestaurants,
    fields: ['restrntNm', 'restrntAddr', 'reprMenu', 'telNo', 'signguNm', 'imageUrl', 'image_author', 'image_source'],
    labels: { restrntNm: '식당명', restrntAddr: '주소', reprMenu: '대표메뉴', telNo: '전화', signguNm: '구', imageUrl: '이미지', image_author: '사진 원작자', image_source: '이미지 출처' },
    tableName: 'restaurants',
    uniqueField: 'restrntNm'
  },
  culture: {
    title: { ko: '문화시설', en: 'Culture' },
    icon: FiActivity,
    color: '#2196f3',
    fetchFn: getCulturalFacilities,
    fields: ['fcltyNm', 'locplc', 'fcltyKnd', 'operTime', 'imageUrl', 'image_author', 'image_source'],
    labels: { fcltyNm: '시설명', locplc: '주소', fcltyKnd: '종류', operTime: '운영시간', imageUrl: '이미지', image_author: '사진 원작자', image_source: '이미지 출처' },
    tableName: 'cultural_facilities',
    uniqueField: 'fcltyNm'
  },
  medical: {
    title: { ko: '의료시설', en: 'Medical' },
    icon: FiHeart,
    color: '#e91e63',
    fetchFn: getMedicalFacilities,
    fields: ['hsptlNm', 'locplc', 'hsptlKnd', 'fondSe', 'telno', 'imageUrl', 'image_author', 'image_source'],
    labels: { hsptlNm: '병원명', locplc: '주소', hsptlKnd: '종류', fondSe: '설립구분', telno: '전화', imageUrl: '이미지', image_author: '사진 원작자', image_source: '이미지 출처' },
    tableName: 'medical_facilities',
    uniqueField: 'hsptlNm'
  },
  shopping: {
    title: { ko: '쇼핑', en: 'Shopping' },
    icon: FiShoppingBag,
    color: '#4caf50',
    fetchFn: getShoppingPlaces,
    fields: ['shppgNm', 'shppgAddr', 'shppgIntro', 'telNo', 'imageUrl', 'image_author', 'image_source'],
    labels: { shppgNm: '상점명', shppgAddr: '주소', shppgIntro: '소개', telNo: '전화', imageUrl: '이미지', image_author: '사진 원작자', image_source: '이미지 출처' },
    tableName: 'shopping_places',
    uniqueField: 'shppgNm'
  },
  accommodation: {
    title: { ko: '숙박', en: 'Stay' },
    icon: FiHome,
    color: '#795548',
    fetchFn: getTourRooms,
    fields: ['romsNm', 'romsAddr', 'romsScl', 'romsRefadNo', 'imageUrl', 'image_author', 'image_source'],
    labels: { romsNm: '숙소명', romsAddr: '주소', romsScl: '유형', romsRefadNo: '전화', imageUrl: '이미지', image_author: '사진 원작자', image_source: '이미지 출처' },
    tableName: 'accommodations',
    uniqueField: 'romsNm'
  },
  parking: {
    title: { ko: '주차장', en: 'Parking' },
    icon: FiTruck,
    color: '#607d8b',
    fetchFn: getDaejeonParking,
    fields: ['name', 'addr', 'parkingType', 'totalLot', 'chargeInfo', 'imageUrl', 'image_author', 'image_source'],
    labels: { name: '주차장명', addr: '주소', parkingType: '유형', totalLot: '주차면수', chargeInfo: '요금', imageUrl: '이미지', image_author: '사진 원작자', image_source: '이미지 출처' },
    tableName: 'parking_lots',
    uniqueField: 'name'
  }
}

const AdminPage = () => {
  const { user, loading, login, logout, supabase } = useAuth()
  const { language } = useLanguage()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // 대시보드 통계
  const [stats, setStats] = useState({})          // API 데이터 개수
  const [dbStats, setDbStats] = useState({})      // DB 데이터 개수
  const [statsLoading, setStatsLoading] = useState(false)
  
  // API 호출 통계
  const [apiCallStats, setApiCallStats] = useState({})
  const [mostCalledApi, setMostCalledApi] = useState(null)
  const [mostVisitedPage, setMostVisitedPage] = useState(null)
  
  // 페이지 데이터
  const [pageData, setPageData] = useState([])
  const [pageTotalCount, setPageTotalCount] = useState(0)
  const [pageLoading, setPageLoading] = useState(false)
  const [selectedPage, setSelectedPage] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('') // DB 검색어
  const itemsPerPage = 20
  
  // Supabase 테이블 데이터
  const [tableData, setTableData] = useState([])
  const [tableLoading, setTableLoading] = useState(false)
  const [selectedTable, setSelectedTable] = useState('')
  
  // 저장된 아이템 추적
  const [savedItems, setSavedItems] = useState({})
  
  // Hero 슬라이드 관리
  const [heroSlides, setHeroSlides] = useState([])
  const [heroLoading, setHeroLoading] = useState(false)
  const [editingHero, setEditingHero] = useState(null) // 수정 중인 슬라이드
  const [heroForm, setHeroForm] = useState({
    title_ko: '',
    title_en: '',
    subtitle_ko: '',
    subtitle_en: '',
    description_ko: '',
    description_en: '',
    imageUrl: '',
    image_author: '',
    image_source: '',
    link: '/',
    sort_order: 0,
    is_active: true
  })
  
  // 데이터 아이템 수정 모달
  const [editingItem, setEditingItem] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)
  
  // Supabase 사용량 통계
  const [supabaseUsage, setSupabaseUsage] = useState(null)
  const [usageLoading, setUsageLoading] = useState(false)
  
  // 페이지 방문 통계 (DB)
  const [pageVisitStats, setPageVisitStats] = useState({})
  const [todayVisitStats, setTodayVisitStats] = useState({})
  const [mostVisitedPageDB, setMostVisitedPageDB] = useState(null)
  const [visitStatsLoading, setVisitStatsLoading] = useState(false)
  const [visitStatsPeriod, setVisitStatsPeriod] = useState('all') // 기간 필터
  
  // 검색 기록 통계 (DB)
  const [popularSearches, setPopularSearches] = useState([])
  const [todaySearches, setTodaySearches] = useState([])
  const [searchStats, setSearchStats] = useState(null)
  const [searchStatsLoading, setSearchStatsLoading] = useState(false)
  
  // 추천 여행 코스 관리
  const [publishedTrips, setPublishedTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(false)
  const [tripStats, setTripStats] = useState(null)
  const [editingTrip, setEditingTrip] = useState(null)
  const [tripForm, setTripForm] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    authorNickname: ''
  })

  // 날짜 파싱 함수 (YYYYMMDD 또는 YYYY-MM-DD -> Date)
  const parseDate = useCallback((dateStr) => {
    if (!dateStr) return null
    const str = String(dateStr).trim()
    
    // YYYY-MM-DD 형식
    if (str.includes('-')) {
      const parts = str.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1
        const day = parseInt(parts[2])
        return new Date(year, month, day)
      }
    }
    
    // YYYYMMDD 형식
    if (str.length === 8 && !isNaN(str)) {
      const year = parseInt(str.substring(0, 4))
      const month = parseInt(str.substring(4, 6)) - 1
      const day = parseInt(str.substring(6, 8))
      return new Date(year, month, day)
    }
    
    // 그 외 Date 파싱 시도
    const parsed = new Date(str)
    return isNaN(parsed.getTime()) ? null : parsed
  }, [])
  
  // API 데이터 통계 로드 여부
  const [apiStatsLoaded, setApiStatsLoaded] = useState(false)
  
  // DB 통계만 로드 (대시보드 진입 시 자동 호출)
  const loadDbStats = useCallback(async () => {
    try {
      const dbCounts = await getAllDbCounts()
      setDbStats(dbCounts)
    } catch (err) {

    }
  }, [])
  
  // API 통계 로드 (버튼 클릭 시 호출)
  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    const newStats = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (const [key, config] of Object.entries(PAGE_CONFIGS)) {
      try {
        // 축제/행사는 진행 중인 것만 카운트
        if (key === 'festival') {
          const result = await config.fetchFn(1, 500)
          if (result.success) {
            const activeEvents = (result.items || []).filter(item => {
              const endDate = parseDate(item.endDt)
              return !endDate || endDate >= today
            })
            newStats[key] = activeEvents.length
          } else {
            newStats[key] = 0
          }
        } else if (key === 'parking') {
          // 주차장은 전체 데이터를 가져와서 중복 제거
          let allItems = []
          const firstResult = await config.fetchFn(1, 200)
          if (firstResult.success && firstResult.items?.length > 0) {
            allItems = [...firstResult.items]
            const totalCount = firstResult.totalCount || 0
            
            if (totalCount > 200) {
              const totalPages = Math.ceil(totalCount / 200)
              for (let page = 2; page <= totalPages; page++) {
                const result = await config.fetchFn(page, 200)
                if (result.success && result.items?.length > 0) {
                  allItems = [...allItems, ...result.items]
                }
              }
            }
          }
          const uniqueSet = new Set(allItems.map(item => item[config.uniqueField]))
          newStats[key] = uniqueSet.size
        } else {
          // 다른 데이터는 한 번에 가져와서 중복 제거 후 개수 계산
          const result = await config.fetchFn(1, 200)
          if (result.success && result.items) {
            const uniqueField = config.uniqueField
            const uniqueSet = new Set(result.items.map(item => item[uniqueField]))
            newStats[key] = uniqueSet.size
          } else {
            newStats[key] = result.totalCount || 0
          }
        }
      } catch {
        newStats[key] = 0
      }
    }
    
    setStats(newStats)
    setApiStatsLoaded(true)
    
    // DB 데이터 개수도 함께 로드
    await loadDbStats()
    
    setStatsLoading(false)
  }, [parseDate, loadDbStats])
  
  // API 호출 통계 로드
  const loadApiStats = useCallback(() => {
    const stats = getApiStats()
    setApiCallStats(stats)
    setMostCalledApi(getMostCalledApi())
    setMostVisitedPage(getMostVisitedPage())
  }, [])
  
  // Supabase 사용량 통계 로드
  const loadSupabaseUsage = useCallback(async () => {
    setUsageLoading(true)
    try {
      const result = await getSupabaseUsageStats()
      if (result.success) {
        setSupabaseUsage(result.stats)
      }
    } catch (err) {

    }
    setUsageLoading(false)
  }, [])
  
  // 페이지 방문 통계 로드 (DB)
  const loadPageVisitStats = useCallback(async (period = 'all') => {
    setVisitStatsLoading(true)
    try {
      // 기간별 방문 통계
      const periodStats = await getPageVisitStatsByPeriod(period)
      if (periodStats.success) {
        setPageVisitStats(periodStats.stats)
      }
      
      // 오늘 방문 통계
      const todayStats = await getTodayPageVisitStats()
      if (todayStats.success) {
        setTodayVisitStats(todayStats.stats)
      }
      
      // 가장 많이 방문한 페이지
      const mostVisited = await getMostVisitedPageDB()
      if (mostVisited.success) {
        setMostVisitedPageDB(mostVisited)
      }
    } catch (err) {

    }
    setVisitStatsLoading(false)
  }, [])
  
  // 검색 기록 통계 로드 (DB)
  const loadSearchStats = useCallback(async () => {
    setSearchStatsLoading(true)
    try {
      // 인기 검색어 (전체)
      const popular = await getPopularSearchQueries(10)
      if (popular.success) {
        setPopularSearches(popular.items)
      }
      
      // 오늘 인기 검색어
      const today = await getTodayPopularSearchQueries(10)
      if (today.success) {
        setTodaySearches(today.items)
      }
      
      // 검색 통계 요약
      const stats = await getSearchStats()
      if (stats.success) {
        setSearchStats(stats)
      }
    } catch (err) {

    }
    setSearchStatsLoading(false)
  }, [])
  
  // 추천 여행 코스 로드
  const loadPublishedTrips = useCallback(async () => {
    setTripsLoading(true)
    try {
      const result = await getAdminPublishedTrips({ limit: 100 })
      if (result.success) {
        setPublishedTrips(result.trips)
      }
      
      const statsResult = await getPublishedTripStats()
      if (statsResult.success) {
        setTripStats(statsResult.stats)
      }
    } catch (err) {

    }
    setTripsLoading(false)
  }, [])
  
  // 여행 코스 게시 상태 토글
  const handleToggleTripPublish = useCallback(async (trip) => {
    const newStatus = !trip.isPublished
    const confirmMsg = newStatus
      ? (language === 'ko' ? '이 여행 코스를 게시하시겠습니까?' : 'Publish this trip?')
      : (language === 'ko' ? '이 여행 코스의 게시를 취소하시겠습니까?' : 'Unpublish this trip?')
    
    if (!window.confirm(confirmMsg)) return
    
    try {
      const result = await adminUpdateTripPublishStatus(trip.id, newStatus)
      if (result.success) {
        loadPublishedTrips()
      } else {
        alert(result.error || '오류가 발생했습니다.')
      }
    } catch (err) {
      alert(language === 'ko' ? '상태 변경 중 오류가 발생했습니다.' : 'Error changing status.')
    }
  }, [language, loadPublishedTrips])
  
  // 여행 코스 수정 시작
  const handleEditTrip = useCallback((trip) => {
    setEditingTrip(trip)
    setTripForm({
      title: trip.title || '',
      description: trip.description || '',
      thumbnailUrl: trip.thumbnailUrl || '',
      authorNickname: trip.authorNickname || ''
    })
  }, [])
  
  // 여행 코스 수정 저장
  const handleSaveTripEdit = useCallback(async () => {
    if (!editingTrip) return
    
    try {
      const result = await adminUpdateTrip(editingTrip.id, tripForm)
      if (result.success) {
        alert(language === 'ko' ? '수정되었습니다.' : 'Updated.')
        setEditingTrip(null)
        setTripForm({ title: '', description: '', thumbnailUrl: '', authorNickname: '' })
        loadPublishedTrips()
      } else {
        alert(result.error || '수정 실패')
      }
    } catch (err) {
      alert(language === 'ko' ? '수정 중 오류가 발생했습니다.' : 'Error occurred while updating.')
    }
  }, [editingTrip, tripForm, language, loadPublishedTrips])
  
  // 여행 코스 삭제
  const handleDeleteTrip = useCallback(async (trip) => {
    const confirmMsg = language === 'ko'
      ? `"${trip.title}" 여행 코스를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
      : `Delete "${trip.title}"?\nThis action cannot be undone.`
    
    if (!window.confirm(confirmMsg)) return
    
    try {
      const result = await adminDeleteTrip(trip.id)
      if (result.success) {
        alert(language === 'ko' ? '삭제되었습니다.' : 'Deleted.')
        loadPublishedTrips()
      } else {
        alert(result.error || '삭제 실패')
      }
    } catch (err) {
      alert(language === 'ko' ? '삭제 중 오류가 발생했습니다.' : 'Error occurred while deleting.')
    }
  }, [language, loadPublishedTrips])
  
  // Hero 슬라이드 로드
  const loadHeroSlides = useCallback(async () => {
    setHeroLoading(true)
    try {
      const result = await getHeroSlides()
      if (result.success) {
        setHeroSlides(result.items)
      }
    } catch (err) {

    }
    setHeroLoading(false)
  }, [])
  
  // Hero 슬라이드 저장 (추가/수정)
  const handleSaveHero = useCallback(async () => {
    if (!heroForm.title_ko || !heroForm.imageUrl) {
      alert(language === 'ko' ? '제목(한글)과 이미지 URL은 필수입니다.' : 'Title (Korean) and Image URL are required.')
      return
    }
    
    try {
      if (editingHero) {
        // 수정
        const result = await updateHeroSlide(editingHero.id, heroForm)
        if (result.success) {
          alert(language === 'ko' ? '슬라이드가 수정되었습니다.' : 'Slide updated.')
          setEditingHero(null)
          loadHeroSlides()
        } else {
          alert(result.error || '수정 실패')
        }
      } else {
        // 추가
        const result = await createHeroSlide(heroForm)
        if (result.success) {
          alert(language === 'ko' ? '슬라이드가 추가되었습니다.' : 'Slide added.')
          loadHeroSlides()
        } else {
          alert(result.error || '추가 실패')
        }
      }
      
      // 폼 초기화
      setHeroForm({
        title_ko: '',
        title_en: '',
        subtitle_ko: '',
        subtitle_en: '',
        description_ko: '',
        description_en: '',
        imageUrl: '',
        image_author: '',
        image_source: '',
        link: '/',
        sort_order: heroSlides.length,
        is_active: true
      })
    } catch (err) {

      alert(language === 'ko' ? '저장 중 오류가 발생했습니다.' : 'Error occurred while saving.')
    }
  }, [heroForm, editingHero, language, loadHeroSlides, heroSlides.length])
  
  // Hero 슬라이드 삭제
  const handleDeleteHero = useCallback(async (id) => {
    if (!window.confirm(language === 'ko' ? '이 슬라이드를 삭제하시겠습니까?' : 'Delete this slide?')) {
      return
    }
    
    try {
      const result = await deleteHeroSlide(id)
      if (result.success) {
        alert(language === 'ko' ? '삭제되었습니다.' : 'Deleted.')
        loadHeroSlides()
      } else {
        alert(result.error || '삭제 실패')
      }
    } catch (err) {

    }
  }, [language, loadHeroSlides])
  
  // Hero 슬라이드 수정 시작
  const handleEditHero = useCallback((slide) => {
    setEditingHero(slide)
    setHeroForm({
      title_ko: slide.title_ko || '',
      title_en: slide.title_en || '',
      subtitle_ko: slide.subtitle_ko || '',
      subtitle_en: slide.subtitle_en || '',
      description_ko: slide.description_ko || '',
      description_en: slide.description_en || '',
      imageUrl: slide.imageUrl || '',
      image_author: slide.image_author || '',
      image_source: slide.image_source || '',
      link: slide.link || '/',
      sort_order: slide.sort_order || 0,
      is_active: slide.is_active !== false
    })
  }, [])
  
  // Hero 슬라이드 수정 취소
  const handleCancelEditHero = useCallback(() => {
    setEditingHero(null)
    setHeroForm({
      title_ko: '',
      title_en: '',
      subtitle_ko: '',
      subtitle_en: '',
      description_ko: '',
      description_en: '',
      imageUrl: '',
      image_author: '',
      image_source: '',
      link: '/',
      sort_order: heroSlides.length,
      is_active: true
    })
  }, [heroSlides.length])
  
  // DB 아이템 수정 시작
  const handleEditItem = useCallback((item) => {
    setEditingItem(item)
    const config = PAGE_CONFIGS[selectedPage]
    if (config) {
      const form = {}
      config.fields.forEach(field => {
        form[field] = item[field] || ''
      })
      form._id = item._id || item.id
      setEditForm(form)
    }
  }, [selectedPage])
  
  // 데이터 새로고침 트리거
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // DB 아이템 수정 저장
  const handleSaveEditItem = useCallback(async () => {
    if (!editingItem || !selectedPage) return
    
    setEditSaving(true)
    try {
      const id = editForm._id
      const updates = { ...editForm }
      delete updates._id
      
      const result = await updateDbItem(selectedPage, id, updates)
      if (result.success) {
        alert(language === 'ko' ? '수정되었습니다.' : 'Updated.')
        setEditingItem(null)
        setEditForm({})
        // 데이터 새로고침 트리거
        setRefreshTrigger(prev => prev + 1)
        loadStats() // DB 통계도 새로고침
      } else {
        alert(result.error || '수정 실패')
      }
    } catch (err) {

      alert(language === 'ko' ? '수정 중 오류가 발생했습니다.' : 'Error occurred while updating.')
    }
    setEditSaving(false)
  }, [editingItem, editForm, selectedPage, language, loadStats])
  
  // DB 아이템 삭제
  const handleDeleteItem = useCallback(async (item) => {
    if (!selectedPage) return
    
    const config = PAGE_CONFIGS[selectedPage]
    const itemName = item[config.uniqueField] || 'this item'
    
    if (!window.confirm(language === 'ko' ? `"${itemName}"을(를) 삭제하시겠습니까?` : `Delete "${itemName}"?`)) {
      return
    }
    
    try {
      const id = item._id || item.id
      const result = await deleteDbItem(selectedPage, id)
      if (result.success) {
        alert(language === 'ko' ? '삭제되었습니다.' : 'Deleted.')
        // 데이터 새로고침 트리거
        setRefreshTrigger(prev => prev + 1)
        loadStats() // DB 통계도 새로고침
      } else {
        alert(result.error || '삭제 실패')
      }
    } catch (err) {

      alert(language === 'ko' ? '삭제 중 오류가 발생했습니다.' : 'Error occurred while deleting.')
    }
  }, [selectedPage, language, loadStats])
  
  // 통계 리셋
  const handleResetStats = useCallback(() => {
    if (window.confirm(language === 'ko' ? '오늘의 API 호출 통계를 초기화하시겠습니까?' : 'Reset today\'s API call statistics?')) {
      resetApiStats()
      loadApiStats()
    }
  }, [language, loadApiStats])
  
  // 페이지 데이터 로드
  // 축제/행사 필터 (지난 행사 제외)
  const filterPastEvents = useCallback((items) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return items.filter(item => {
      const endDate = parseDate(item.endDt)
      if (!endDate) return true // 종료일이 없으면 표시
      return endDate >= today // 오늘 이후 종료 행사만 표시
    })
  }, [parseDate])
  
  // 페이지 데이터 소스 상태 (api/db/both)
  const [dataSource, setDataSource] = useState('api')
  
  const loadPageData = useCallback(async (pageKey, page = 1, source = 'api', search = '') => {
    setPageLoading(true)
    setSelectedPage(pageKey)
    setCurrentPage(page)
    setDataSource(source)
    
    const config = PAGE_CONFIGS[pageKey]
    try {
      if (source === 'db') {
        // DB에서만 가져오기 (검색어 지원)
        const { getDbData } = await import('../services/dbService')
        const dbResult = await getDbData(pageKey, page, itemsPerPage, search)
        
        if (dbResult.success) {
          setPageData(dbResult.items)
          setPageTotalCount(dbResult.totalCount)
        } else {
          setPageData([])
          setPageTotalCount(0)
        }
      } else {
        // API에서 가져오기 (DB에 저장된 것 제외)
        
        // 항상 DB에서 저장된 아이템 목록 fresh하게 가져오기
        let currentSavedItems = []
        if (config.tableName) {
          try {
            const { data } = await supabase
              .from(config.tableName)
              .select(config.uniqueField)
            
            if (data && data.length > 0) {
              currentSavedItems = data.map(item => item[config.uniqueField])
              setSavedItems(prev => ({ ...prev, [pageKey]: currentSavedItems }))
            } else {
              // DB에 데이터가 없으면 빈 배열로 초기화
              setSavedItems(prev => ({ ...prev, [pageKey]: [] }))
            }
          } catch (err) {

          }
        }
        
        // 데이터 가져오기
        let items = []
        let totalApiCount = 0
        
        if (pageKey === 'festival') {
          // 축제/행사는 전체 불러와서 필터링
          const result = await config.fetchFn(1, 500)
          if (result.success) {
            items = filterPastEvents(result.items || [])
            totalApiCount = items.length
          }
        } else if (pageKey === 'parking') {
          // 주차장은 전체 페이지를 가져옴
          const firstResult = await config.fetchFn(1, 200)
          if (firstResult.success && firstResult.items?.length > 0) {
            items = [...firstResult.items]
            const apiTotal = firstResult.totalCount || 0
            
            if (apiTotal > 200) {
              const totalPages = Math.ceil(apiTotal / 200)
              for (let p = 2; p <= totalPages; p++) {
                const result = await config.fetchFn(p, 200)
                if (result.success && result.items?.length > 0) {
                  items = [...items, ...result.items]
                }
              }
            }
            totalApiCount = items.length
          }
        } else {
          // 다른 데이터는 200개씩 가져오기
          const result = await config.fetchFn(1, 200)
          if (result.success) {
            items = result.items || []
            totalApiCount = result.totalCount || items.length
          }
        }
        
        if (items.length > 0) {
          
          // API 데이터 중복 확인 및 제거
          const uniqueField = config.uniqueField
          const allNames = items.map(item => item[uniqueField])
          const uniqueNames = [...new Set(allNames)]
          if (allNames.length !== uniqueNames.length) {
            // 중복 제거
            const uniqueMap = new Map()
            items.forEach(item => {
              const key = item[uniqueField]
              if (key && !uniqueMap.has(key)) {
                uniqueMap.set(key, item)
              }
            })
            items = Array.from(uniqueMap.values())
          }
          
          // DB에 저장된 항목 제외
          if (currentSavedItems.length > 0) {
            items = items.filter(item => !currentSavedItems.includes(item[uniqueField]))
          }
          
          // 클라이언트 측 페이지네이션
          const startIdx = (page - 1) * itemsPerPage
          const paginatedItems = items.slice(startIdx, startIdx + itemsPerPage)
          
          setPageData(paginatedItems)
          setPageTotalCount(items.length) // DB에 없는 항목 수
        } else {
          setPageData([])
          setPageTotalCount(0)
        }
      }
    } catch (err) {

      setPageData([])
      setPageTotalCount(0)
    }
    
    setPageLoading(false)
  }, [filterPastEvents, itemsPerPage, savedItems, supabase])
  
  // refreshTrigger 변경 시 데이터 새로고침
  useEffect(() => {
    if (refreshTrigger > 0 && selectedPage) {
      loadPageData(selectedPage, currentPage, dataSource)
    }
  }, [refreshTrigger, selectedPage, currentPage, dataSource, loadPageData])
  
  // 페이지 변경 핸들러
  const handlePageChange = useCallback((page) => {
    if (selectedPage && page >= 1) {
      loadPageData(selectedPage, page, dataSource, dataSource === 'db' ? searchQuery : '')
    }
  }, [selectedPage, loadPageData, dataSource, searchQuery])
  
  // 데이터 소스 변경 핸들러
  const handleDataSourceChange = useCallback((source) => {
    if (selectedPage) {
      // 데이터 소스 변경 시 검색어 초기화
      if (source === 'api') {
        setSearchQuery('')
      }
      loadPageData(selectedPage, 1, source, source === 'db' ? searchQuery : '')
    }
  }, [selectedPage, loadPageData, searchQuery])
  
  // DB 검색 핸들러
  const handleDbSearch = useCallback((e) => {
    e.preventDefault()
    if (selectedPage && dataSource === 'db') {
      loadPageData(selectedPage, 1, 'db', searchQuery)
    }
  }, [selectedPage, dataSource, searchQuery, loadPageData])
  
  // 검색어 초기화 핸들러
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    if (selectedPage && dataSource === 'db') {
      loadPageData(selectedPage, 1, 'db', '')
    }
  }, [selectedPage, dataSource, loadPageData])
  
  // 총 페이지 수 계산
  const totalPages = useMemo(() => Math.ceil(pageTotalCount / itemsPerPage), [pageTotalCount, itemsPerPage])
  
  // Supabase 테이블 데이터 로드
  const loadTableData = useCallback(async (tableName) => {
    setTableLoading(true)
    setSelectedTable(tableName)
    
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(100)
      if (error) throw error
      setTableData(data || [])
    } catch {
      setTableData([])
    }
    setTableLoading(false)
  }, [supabase])
  
  // 저장된 아이템 로드 (페이지별)
  const loadSavedItems = useCallback(async (pageKey) => {
    const config = PAGE_CONFIGS[pageKey]
    if (!config?.tableName || !config?.uniqueField) return
    
    try {
      const { data, error } = await supabase
        .from(config.tableName)
        .select(config.uniqueField)
      
      if (error) throw error
      
      const savedIds = (data || []).map(item => item[config.uniqueField])
      setSavedItems(prev => ({ ...prev, [pageKey]: savedIds }))
    } catch (err) {

    }
  }, [supabase])
  
  // 개별 아이템 저장
  const handleSaveItem = useCallback(async (item) => {
    if (!selectedPage) return
    
    const config = PAGE_CONFIGS[selectedPage]
    if (!config?.tableName) {
      throw new Error('테이블 설정이 없습니다.')
    }
    
    // 저장할 데이터 구성 - 정의된 필드만 추출
    const saveData = {}
    config.fields.forEach(field => {
      if (item[field] !== undefined) {
        saveData[field] = item[field]
      }
    })
    
    // 메타데이터 추가
    saveData.page_type = selectedPage
    saveData.saved_at = new Date().toISOString()
    saveData.saved_by = user?.email || 'admin'
    saveData.raw_data = item // 전체 데이터를 JSON으로 저장
    
    const { error } = await supabase
      .from(config.tableName)
      .upsert(saveData, { onConflict: config.uniqueField })
    
    if (error) throw error
    
    // 저장된 아이템 목록 업데이트
    const itemId = item[config.uniqueField]
    setSavedItems(prev => ({
      ...prev,
      [selectedPage]: [...(prev[selectedPage] || []), itemId]
    }))
  }, [selectedPage, supabase, user])
  
  // 전체 저장 상태
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkSaveProgress, setBulkSaveProgress] = useState({ current: 0, total: 0 })
  
  // 전체 저장 함수
  const handleBulkSave = useCallback(async () => {
    if (!selectedPage) return
    
    const config = PAGE_CONFIGS[selectedPage]
    if (!config?.tableName) {
      alert('테이블 설정이 없습니다.')
      return
    }
    
    setBulkSaving(true)
    setBulkSaveProgress({ current: 0, total: 0 })
    
    try {
      // 전체 데이터 가져오기
      let allItems = []
      
      if (selectedPage === 'festival') {
        // 축제/행사는 전체 불러와서 필터링
        const result = await config.fetchFn(1, 500)
        if (result.success) {
          allItems = filterPastEvents(result.items || [])
        }
      } else if (selectedPage === 'parking') {
        // 주차장은 전체 데이터를 가져와야 함 (API totalCount 기준)
        const firstResult = await config.fetchFn(1, 200)
        if (firstResult.success && firstResult.items?.length > 0) {
          allItems = [...firstResult.items]
          const totalCount = firstResult.totalCount || 0
          
          // 나머지 페이지 가져오기
          if (totalCount > 200) {
            const totalPages = Math.ceil(totalCount / 200)
            for (let page = 2; page <= totalPages; page++) {
              const result = await config.fetchFn(page, 200)
              if (result.success && result.items?.length > 0) {
                allItems = [...allItems, ...result.items]
              }
            }
          }
        }
      } else {
        // 다른 데이터는 한 번에 200개씩 가져오기
        const result = await config.fetchFn(1, 200)
        if (result.success && result.items?.length > 0) {
          allItems = result.items
        }
      }
      
      // 중복 제거 (uniqueField 기준)
      const originalCount = allItems.length
      const uniqueMap = new Map()
      allItems.forEach(item => {
        const key = item[config.uniqueField]
        if (key && !uniqueMap.has(key)) {
          uniqueMap.set(key, item)
        }
      })
      allItems = Array.from(uniqueMap.values())
      const duplicateCount = originalCount - allItems.length
      
      // 확인 메시지 (중복 제거 후)
      const confirmMessage = language === 'ko'
        ? `${config.title.ko} 전체 데이터를 저장하시겠습니까?\n\n` +
          `• 원본 데이터: ${originalCount}개\n` +
          `• 중복 제거: ${duplicateCount}개\n` +
          `• 저장될 데이터: ${allItems.length}개\n\n` +
          `※ 많은 양의 데이터는 시간이 걸릴 수 있습니다.`
        : `Save all ${config.title.en} data?\n\n` +
          `• Original: ${originalCount}\n` +
          `• Duplicates removed: ${duplicateCount}\n` +
          `• To be saved: ${allItems.length}\n\n` +
          `Note: This may take time for large datasets.`
      
      const confirmed = window.confirm(confirmMessage)
      if (!confirmed) {
        setBulkSaving(false)
        return
      }
      
      setBulkSaveProgress({ current: 0, total: allItems.length })
      
      // 배치로 저장 (50개씩)
      const saveBatchSize = 50
      let savedCount = 0
      const newSavedIds = []
      
      for (let i = 0; i < allItems.length; i += saveBatchSize) {
        const batch = allItems.slice(i, i + saveBatchSize)
        
        // 정의된 필드만 추출하여 저장 데이터 구성
        const batchData = batch.map(item => {
          const saveData = {}
          config.fields.forEach(field => {
            if (item[field] !== undefined) {
              saveData[field] = item[field]
            }
          })
          saveData.page_type = selectedPage
          saveData.saved_at = new Date().toISOString()
          saveData.saved_by = user?.email || 'admin'
          saveData.raw_data = item // 전체 데이터를 JSON으로 저장
          return saveData
        })
        
        const { error } = await supabase
          .from(config.tableName)
          .upsert(batchData, { onConflict: config.uniqueField })
        
        if (error) {

        } else {
          batch.forEach(item => {
            newSavedIds.push(item[config.uniqueField])
          })
        }
        
        savedCount += batch.length
        setBulkSaveProgress({ current: savedCount, total: allItems.length })
      }
      
      // 저장된 아이템 목록 업데이트
      setSavedItems(prev => ({
        ...prev,
        [selectedPage]: [...new Set([...(prev[selectedPage] || []), ...newSavedIds])]
      }))
      
      alert(
        language === 'ko'
          ? `${savedCount}개 데이터가 저장되었습니다.`
          : `${savedCount} items have been saved.`
      )
    } catch (err) {

      alert(
        language === 'ko'
          ? '전체 저장 중 오류가 발생했습니다.'
          : 'An error occurred during bulk save.'
      )
    }
    
    setBulkSaving(false)
    setBulkSaveProgress({ current: 0, total: 0 })
  }, [selectedPage, pageTotalCount, filterPastEvents, supabase, user, language])
  
  // 대시보드 로드
  useEffect(() => {
    if (user && activeSection === 'dashboard') {
      loadDbStats() // DB 통계만 자동 로드
      loadApiStats()
      loadSupabaseUsage()
      loadPageVisitStats(visitStatsPeriod)
      loadSearchStats()
    }
  }, [user, activeSection, loadDbStats, loadApiStats, loadSupabaseUsage, loadPageVisitStats, loadSearchStats, visitStatsPeriod])
  
  // 페이지 선택 시 저장된 아이템 로드
  useEffect(() => {
    if (user && selectedPage && !savedItems[selectedPage]) {
      loadSavedItems(selectedPage)
    }
  }, [user, selectedPage, savedItems, loadSavedItems])
  
  // API 통계 주기적 업데이트
  useEffect(() => {
    if (user && activeSection === 'dashboard') {
      const interval = setInterval(loadApiStats, 10000) // 10초마다 갱신
      return () => clearInterval(interval)
    }
  }, [user, activeSection, loadApiStats])
  
  // 로그인 처리
  const handleLogin = useCallback(async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    
    try {
      await login(email, password)
    } catch {
      setLoginError(language === 'ko' ? '로그인에 실패했습니다.' : 'Login failed.')
    }
    setLoginLoading(false)
  }, [email, password, language, login])
  
  // 로그아웃 처리
  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/')
  }, [logout, navigate])
  
  // 로딩 중
  if (loading) {
    return (
      <div className={`admin-page ${isDark ? 'dark-theme' : ''}`}>
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>{language === 'ko' ? '로딩 중...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }
  
  // 로그인 안 됨
  if (!user) {
    return (
      <div className={`admin-page ${isDark ? 'dark-theme' : ''}`}>
        <div className="admin-login-container">
          <div className="admin-login-card">
            <div className="login-header">
              <h1>🏛️ {language === 'ko' ? '관리자 로그인' : 'Admin Login'}</h1>
              <p>{language === 'ko' ? '대전 관광 포털 관리 시스템' : 'Daejeon Tourism Portal Admin'}</p>
            </div>
            
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>{language === 'ko' ? '이메일' : 'Email'}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={language === 'ko' ? '이메일 입력' : 'Enter email'}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>{language === 'ko' ? '비밀번호' : 'Password'}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === 'ko' ? '비밀번호 입력' : 'Enter password'}
                  required
                />
              </div>
              
              {loginError && (
                <div className="login-error">{loginError}</div>
              )}
              
              <button 
                type="submit" 
                className="login-btn"
                disabled={loginLoading}
              >
                {loginLoading 
                  ? (language === 'ko' ? '로그인 중...' : 'Logging in...') 
                  : (language === 'ko' ? '로그인' : 'Login')
                }
              </button>
            </form>
            
            <div className="login-footer">
              <button onClick={() => navigate('/')} className="back-btn">
                <FiHome /> {language === 'ko' ? '메인으로' : 'Back to Home'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // 관리자 대시보드
  return (
    <div className={`admin-page ${isDark ? 'dark-theme' : ''}`}>
      {/* 사이드바 */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>🏛️ Admin</h2>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('dashboard')}
          >
            <FiBarChart2 />
            <span>{language === 'ko' ? '대시보드' : 'Dashboard'}</span>
          </button>
          
          <div className="nav-section-title">
            {language === 'ko' ? '콘텐츠 관리' : 'Content'}
          </div>
          
          <button 
            className={`nav-item ${activeSection === 'hero' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('hero')
              loadHeroSlides()
            }}
          >
            <FiImage style={{ color: activeSection === 'hero' ? 'white' : '#ff9800' }} />
            <span>{language === 'ko' ? '히어로 슬라이드' : 'Hero Slides'}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'courses' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('courses')
              loadPublishedTrips()
            }}
          >
            <FiNavigation style={{ color: activeSection === 'courses' ? 'white' : '#10b981' }} />
            <span>{language === 'ko' ? '추천 여행 코스' : 'Travel Courses'}</span>
          </button>
          
          <div className="nav-section-title">
            {language === 'ko' ? '페이지 관리' : 'Pages'}
          </div>
          
          {Object.entries(PAGE_CONFIGS).map(([key, config]) => {
            const Icon = config.icon
            return (
              <button 
                key={key}
                className={`nav-item ${activeSection === `page-${key}` ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection(`page-${key}`)
                  loadPageData(key)
                }}
              >
                <Icon style={{ color: activeSection === `page-${key}` ? 'white' : config.color }} />
                <span>{config.title[language]}</span>
              </button>
            )
          })}
          
          <div className="nav-section-title">
            {language === 'ko' ? '시스템' : 'System'}
          </div>
          
          <button 
            className={`nav-item ${activeSection === 'database' ? 'active' : ''}`}
            onClick={() => setActiveSection('database')}
          >
            <FiDatabase />
            <span>{language === 'ko' ? 'Supabase' : 'Supabase'}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveSection('settings')}
          >
            <FiSettings />
            <span>{language === 'ko' ? '설정' : 'Settings'}</span>
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-email">{user.email}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut />
            <span>{language === 'ko' ? '로그아웃' : 'Logout'}</span>
          </button>
        </div>
      </aside>
      
      {/* 메인 콘텐츠 */}
      <main className={`admin-main ${sidebarOpen ? '' : 'expanded'}`}>
        <header className="admin-header">
          <button 
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <FiMenu />
          </button>
          <h1>
            {activeSection === 'dashboard' && (language === 'ko' ? '대시보드' : 'Dashboard')}
            {activeSection === 'hero' && (language === 'ko' ? '히어로 슬라이드 관리' : 'Hero Slides')}
            {activeSection === 'courses' && (language === 'ko' ? '추천 여행 코스 관리' : 'Travel Courses')}
            {activeSection === 'database' && 'Supabase'}
            {activeSection === 'settings' && (language === 'ko' ? '설정' : 'Settings')}
            {activeSection.startsWith('page-') && PAGE_CONFIGS[activeSection.replace('page-', '')]?.title[language]}
          </h1>
          {activeSection === 'hero' && (
            <button className="refresh-btn" onClick={loadHeroSlides}>
              <FiRefreshCw />
            </button>
          )}
          {activeSection === 'courses' && (
            <button className="refresh-btn" onClick={loadPublishedTrips}>
              <FiRefreshCw />
            </button>
          )}
          {activeSection.startsWith('page-') && (
            <button className="refresh-btn" onClick={() => loadPageData(activeSection.replace('page-', ''))}>
              <FiRefreshCw />
            </button>
          )}
        </header>
        
        <div className="admin-content">
          {/* 대시보드 섹션 */}
          {activeSection === 'dashboard' && (
            <div className="dashboard-section">
              {/* API 조회 버튼 섹션 */}
              <div className="api-fetch-section">
                <div className="api-fetch-info">
                  <span className="api-fetch-label">
                    {language === 'ko' ? '외부 API 데이터 개수 조회' : 'Fetch External API Data Counts'}
                  </span>
                  <span className="api-fetch-desc">
                    {language === 'ko' 
                      ? '관광지, 축제, 맛집 등 외부 API 데이터를 조회합니다. (API 호출 발생)' 
                      : 'Fetch data from external APIs (Travel, Festival, Food, etc.). API calls will be made.'}
                  </span>
                </div>
                <button 
                  onClick={loadStats} 
                  disabled={statsLoading}
                  className={`api-fetch-btn ${apiStatsLoaded ? 'loaded' : ''}`}
                >
                  {statsLoading ? (
                    <>
                      <FiLoader className="spinning" /> 
                      {language === 'ko' ? '조회 중...' : 'Loading...'}
                    </>
                  ) : apiStatsLoaded ? (
                    <>
                      <FiRefreshCw /> 
                      {language === 'ko' ? '다시 조회' : 'Refresh'}
                    </>
                  ) : (
                    <>
                      <FiSearch /> 
                      {language === 'ko' ? 'API 조회' : 'Fetch API'}
                    </>
                  )}
                </button>
              </div>
              
              <div className="stats-grid">
                {Object.entries(PAGE_CONFIGS).map(([key, config]) => (
                  <StatCard
                    key={key}
                    title={config.title[language]}
                    value={apiStatsLoaded ? stats[key] : null}
                    dbValue={dbStats[key]}
                    icon={config.icon}
                    color={config.color}
                    loading={statsLoading}
                    apiNotLoaded={!apiStatsLoaded}
                    onClick={() => {
                      setActiveSection(`page-${key}`)
                      loadPageData(key)
                    }}
                  />
                ))}
              </div>
              
              {/* API 호출 통계 섹션 */}
              <div className="api-stats-section">
                <div className="api-stats-header">
                  <h3><FiTrendingUp /> {language === 'ko' ? '금일 API 호출 통계' : "Today's API Call Stats"}</h3>
                  <button onClick={handleResetStats} className="reset-stats-btn">
                    <FiRefreshCw /> {language === 'ko' ? '초기화' : 'Reset'}
                  </button>
                </div>
                
                {/* 최고 호출 API & 페이지 */}
                <div className="top-stats">
                  <div className="top-stat-card">
                    <span className="top-label">{language === 'ko' ? '최다 호출 API' : 'Most Called API'}</span>
                    {mostCalledApi ? (
                      <span className="top-value">{mostCalledApi.name} <strong>({mostCalledApi.count}회)</strong></span>
                    ) : (
                      <span className="top-value empty">{language === 'ko' ? '데이터 없음' : 'No data'}</span>
                    )}
                  </div>
                  <div className="top-stat-card">
                    <span className="top-label">{language === 'ko' ? '최다 방문 페이지' : 'Most Visited Page'}</span>
                    {mostVisitedPage ? (
                      <span className="top-value">{mostVisitedPage.name} <strong>({mostVisitedPage.count}회)</strong></span>
                    ) : (
                      <span className="top-value empty">{language === 'ko' ? '데이터 없음' : 'No data'}</span>
                    )}
                  </div>
                </div>
                
                {/* API 호출 수 목록 */}
                <div className="api-call-list">
                  {Object.entries(API_NAMES).map(([key, name]) => (
                    <div key={key} className="api-call-item">
                      <span className="api-name">{name}</span>
                      <div className="api-bar-container">
                        <div 
                          className="api-bar" 
                          style={{ 
                            width: `${Math.min((apiCallStats[key] || 0) * 10, 100)}%`,
                            backgroundColor: PAGE_CONFIGS[key]?.color || '#1976d2'
                          }}
                        />
                      </div>
                      <span className="api-count">{apiCallStats[key] || 0}회</span>
                    </div>
                  ))}
                </div>
                
                {/* Google Charts - API 호출 차트 */}
                <ApiStatsChart
                  apiCallStats={apiCallStats}
                  apiNames={API_NAMES}
                  pageConfigs={PAGE_CONFIGS}
                  language={language}
                />
              </div>
              
              {/* Supabase 사용량 통계 섹션 */}
              <SupabaseUsageStats
                usage={supabaseUsage}
                loading={usageLoading}
                onRefresh={loadSupabaseUsage}
                language={language}
                dashboardUrl="https://supabase.com/dashboard/project/geczvsuzwpvdxiwbxqtf"
              />
              
              {/* 외부 API 사용량 통계 섹션 (카카오, ODsay) */}
              <ExternalApiStats language={language} />
              
              {/* 페이지 방문 통계 섹션 (DB) */}
              <div className="dashboard-section visit-stats-section">
                <h3>
                  <FiTrendingUp />
                  {language === 'ko' ? '페이지 방문 통계' : 'Page Visit Statistics'}
                  {visitStatsLoading && <FiLoader className="loading-icon spinning" />}
                </h3>
                
                <div className="visit-stats-summary">
                  <div className="visit-stat-card">
                    <span className="visit-label">{language === 'ko' ? '최다 방문 페이지 (전체)' : 'Most Visited (All Time)'}</span>
                    {mostVisitedPageDB?.page ? (
                      <span className="visit-value">
                        {PAGE_NAMES[mostVisitedPageDB.page] || mostVisitedPageDB.page}
                        <strong> ({mostVisitedPageDB.count.toLocaleString()}회)</strong>
                      </span>
                    ) : (
                      <span className="visit-value empty">{language === 'ko' ? '데이터 없음' : 'No data'}</span>
                    )}
                  </div>
                  <div className="visit-stat-card">
                    <span className="visit-label">{language === 'ko' ? '오늘 총 방문' : 'Today Total Visits'}</span>
                    <span className="visit-value">
                      <strong>{Object.values(todayVisitStats).reduce((a, b) => a + b, 0).toLocaleString()}회</strong>
                    </span>
                  </div>
                  <div className="visit-stat-card">
                    <span className="visit-label">{language === 'ko' ? '전체 누적 방문' : 'Total Visits'}</span>
                    <span className="visit-value">
                      <strong>{Object.values(pageVisitStats).reduce((a, b) => a + b, 0).toLocaleString()}회</strong>
                    </span>
                  </div>
                </div>
                
                {/* 페이지별 방문 통계 차트 */}
                <div className="visit-chart-container">
                  <div className="visit-chart-header">
                    <h4>{language === 'ko' ? '페이지별 방문 횟수' : 'Visits by Page'}</h4>
                    <div className="period-filter-tabs">
                      <button 
                        className={`period-tab ${visitStatsPeriod === 'all' ? 'active' : ''}`}
                        onClick={() => setVisitStatsPeriod('all')}
                      >
                        {language === 'ko' ? '전체' : 'All'}
                      </button>
                      <button 
                        className={`period-tab ${visitStatsPeriod === 'year' ? 'active' : ''}`}
                        onClick={() => setVisitStatsPeriod('year')}
                      >
                        {language === 'ko' ? '년' : 'Year'}
                      </button>
                      <button 
                        className={`period-tab ${visitStatsPeriod === 'month' ? 'active' : ''}`}
                        onClick={() => setVisitStatsPeriod('month')}
                      >
                        {language === 'ko' ? '월' : 'Month'}
                      </button>
                      <button 
                        className={`period-tab ${visitStatsPeriod === 'week' ? 'active' : ''}`}
                        onClick={() => setVisitStatsPeriod('week')}
                      >
                        {language === 'ko' ? '주' : 'Week'}
                      </button>
                      <button 
                        className={`period-tab ${visitStatsPeriod === 'day' ? 'active' : ''}`}
                        onClick={() => setVisitStatsPeriod('day')}
                      >
                        {language === 'ko' ? '일' : 'Day'}
                      </button>
                    </div>
                  </div>
                  <div className="visit-bar-chart">
                    {Object.entries(PAGE_NAMES).map(([key, name]) => {
                      const totalVisits = Object.values(pageVisitStats).reduce((a, b) => a + b, 0) || 1
                      const visits = pageVisitStats[key] || 0
                      const percentage = (visits / totalVisits) * 100
                      return (
                        <div key={key} className="visit-bar-item">
                          <span className="visit-page-name">{name}</span>
                          <div className="visit-bar-container">
                            <div 
                              className="visit-bar" 
                              style={{ 
                                width: `${Math.max(percentage, 0)}%`,
                                backgroundColor: PAGE_CONFIGS[key]?.color || '#4f46e5'
                              }}
                            />
                          </div>
                          <span className="visit-count">{visits.toLocaleString()}회</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* 오늘의 방문 통계 */}
                <div className="today-visits-container">
                  <h4>{language === 'ko' ? '오늘의 페이지별 방문' : 'Today\'s Visits by Page'}</h4>
                  <div className="today-visits-grid">
                    {Object.entries(PAGE_NAMES).map(([key, name]) => (
                      <div key={key} className="today-visit-card">
                        <span className="today-page-name">{name}</span>
                        <span className="today-visit-count">{todayVisitStats[key] || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <button onClick={() => loadPageVisitStats(visitStatsPeriod)} className="refresh-btn">
                  <FiRefreshCw /> {language === 'ko' ? '새로고침' : 'Refresh'}
                </button>
              </div>
              
              {/* 검색 기록 통계 섹션 */}
              <div className="dashboard-section search-stats-section">
                <h3>
                  <FiSearch />
                  {language === 'ko' ? '검색 기록 통계' : 'Search Statistics'}
                  {searchStatsLoading && <FiLoader className="loading-icon spinning" />}
                </h3>
                
                <div className="search-stats-summary">
                  <div className="search-stat-card">
                    <span className="search-label">{language === 'ko' ? '총 검색 횟수' : 'Total Searches'}</span>
                    <span className="search-value">
                      <strong>{searchStats?.totalSearches?.toLocaleString() || 0}회</strong>
                    </span>
                  </div>
                  <div className="search-stat-card">
                    <span className="search-label">{language === 'ko' ? '고유 검색어' : 'Unique Queries'}</span>
                    <span className="search-value">
                      <strong>{searchStats?.uniqueQueries?.toLocaleString() || 0}개</strong>
                    </span>
                  </div>
                  <div className="search-stat-card">
                    <span className="search-label">{language === 'ko' ? '최다 검색어' : 'Top Search'}</span>
                    {searchStats?.topQuery ? (
                      <span className="search-value">
                        "{searchStats.topQuery.query}"
                        <strong> ({searchStats.topQuery.count}회)</strong>
                      </span>
                    ) : (
                      <span className="search-value empty">{language === 'ko' ? '데이터 없음' : 'No data'}</span>
                    )}
                  </div>
                </div>
                
                {/* 인기 검색어 목록 (전체 기간) */}
                <div className="popular-searches-container">
                  <h4>{language === 'ko' ? '인기 검색어 TOP 10 (전체 기간)' : 'Top 10 Popular Searches (All Time)'}</h4>
                  {popularSearches.length > 0 ? (
                    <div className="popular-searches-list">
                      {popularSearches.map((item, index) => (
                        <div key={item.query} className="popular-search-item">
                          <span className="search-rank">#{index + 1}</span>
                          <span className="search-query">{item.query}</span>
                          <span className="search-count">{item.count.toLocaleString()}회</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data-text">{language === 'ko' ? '검색 기록이 없습니다.' : 'No search records.'}</p>
                  )}
                </div>
                
                {/* 오늘의 검색어 */}
                <div className="today-searches-container">
                  <h4>{language === 'ko' ? '오늘의 인기 검색어' : 'Today\'s Popular Searches'}</h4>
                  {todaySearches.length > 0 ? (
                    <div className="today-searches-list">
                      {todaySearches.map((item, index) => (
                        <div key={item.query} className="today-search-tag">
                          <span className="tag-rank">#{index + 1}</span>
                          <span className="tag-query">{item.query}</span>
                          <span className="tag-count">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data-text">{language === 'ko' ? '오늘 검색 기록이 없습니다.' : 'No searches today.'}</p>
                  )}
                </div>
                
                <button onClick={loadSearchStats} className="refresh-btn">
                  <FiRefreshCw /> {language === 'ko' ? '새로고침' : 'Refresh'}
                </button>
              </div>
              
              <div className="dashboard-info">
                <div className="info-card">
                  <h3>{language === 'ko' ? '환영합니다!' : 'Welcome!'}</h3>
                  <p>
                    {language === 'ko' 
                      ? '대전 관광 포털 관리 시스템입니다. 위 카드를 클릭하거나 좌측 메뉴에서 관리할 페이지를 선택하세요.'
                      : 'Daejeon Tourism Portal Admin. Click a card or select from the menu.'
                    }
                  </p>
                  <div className="quick-links">
                    <a href="/" target="_blank" className="quick-link">
                      <FiHome /> {language === 'ko' ? '사이트 보기' : 'View Site'}
                    </a>
                    <button onClick={() => { loadStats(); loadApiStats(); }} className="quick-link">
                      <FiRefreshCw /> {language === 'ko' ? '새로고침' : 'Refresh'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 히어로 슬라이드 관리 */}
          {activeSection === 'hero' && (
            <div className="hero-management">
              {/* 히어로 슬라이드 추가/수정 폼 */}
              <div className="hero-form-section">
                <h3>
                  {editingHero 
                    ? (language === 'ko' ? '슬라이드 수정' : 'Edit Slide')
                    : (language === 'ko' ? '새 슬라이드 추가' : 'Add New Slide')
                  }
                </h3>
                <div className="hero-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>{language === 'ko' ? '제목 (한글) *' : 'Title (KO) *'}</label>
                      <input 
                        type="text" 
                        value={heroForm.title_ko}
                        onChange={(e) => setHeroForm({...heroForm, title_ko: e.target.value})}
                        placeholder="대전에 오신 것을 환영합니다"
                      />
                    </div>
                    <div className="form-group">
                      <label>{language === 'ko' ? '제목 (영문)' : 'Title (EN)'}</label>
                      <input 
                        type="text" 
                        value={heroForm.title_en}
                        onChange={(e) => setHeroForm({...heroForm, title_en: e.target.value})}
                        placeholder="Welcome to Daejeon"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{language === 'ko' ? '부제목 (한글)' : 'Subtitle (KO)'}</label>
                      <input 
                        type="text" 
                        value={heroForm.subtitle_ko}
                        onChange={(e) => setHeroForm({...heroForm, subtitle_ko: e.target.value})}
                        placeholder="과학과 자연이 어우러진 도시"
                      />
                    </div>
                    <div className="form-group">
                      <label>{language === 'ko' ? '부제목 (영문)' : 'Subtitle (EN)'}</label>
                      <input 
                        type="text" 
                        value={heroForm.subtitle_en}
                        onChange={(e) => setHeroForm({...heroForm, subtitle_en: e.target.value})}
                        placeholder="City of Science and Nature"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group full-width">
                      <label>{language === 'ko' ? '설명 (한글)' : 'Description (KO)'}</label>
                      <textarea 
                        value={heroForm.description_ko}
                        onChange={(e) => setHeroForm({...heroForm, description_ko: e.target.value})}
                        placeholder="대전의 아름다운 관광지를 만나보세요"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group full-width">
                      <label>{language === 'ko' ? '설명 (영문)' : 'Description (EN)'}</label>
                      <textarea 
                        value={heroForm.description_en}
                        onChange={(e) => setHeroForm({...heroForm, description_en: e.target.value})}
                        placeholder="Discover beautiful attractions in Daejeon"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group full-width">
                      <label>{language === 'ko' ? '이미지 URL *' : 'Image URL *'}</label>
                      <input 
                        type="text" 
                        value={heroForm.imageUrl}
                        onChange={(e) => setHeroForm({...heroForm, imageUrl: e.target.value})}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{language === 'ko' ? '사진 원작자' : 'Image Author'}</label>
                      <input 
                        type="text" 
                        value={heroForm.image_author}
                        onChange={(e) => setHeroForm({...heroForm, image_author: e.target.value})}
                        placeholder={language === 'ko' ? '촬영자 또는 저작권자' : 'Photographer or copyright holder'}
                      />
                    </div>
                    <div className="form-group">
                      <label>{language === 'ko' ? '이미지 출처' : 'Image Source'}</label>
                      <input 
                        type="text" 
                        value={heroForm.image_source}
                        onChange={(e) => setHeroForm({...heroForm, image_source: e.target.value})}
                        placeholder={language === 'ko' ? 'URL 또는 사이트명' : 'URL or site name'}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{language === 'ko' ? '링크' : 'Link'}</label>
                      <input 
                        type="text" 
                        value={heroForm.link}
                        onChange={(e) => setHeroForm({...heroForm, link: e.target.value})}
                        placeholder="/travel"
                      />
                    </div>
                    <div className="form-group">
                      <label>{language === 'ko' ? '순서' : 'Order'}</label>
                      <input 
                        type="number" 
                        value={heroForm.sort_order}
                        onChange={(e) => setHeroForm({...heroForm, sort_order: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="form-group checkbox-group">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={heroForm.is_active}
                          onChange={(e) => setHeroForm({...heroForm, is_active: e.target.checked})}
                        />
                        {language === 'ko' ? '활성화' : 'Active'}
                      </label>
                    </div>
                  </div>
                  
                  {heroForm.imageUrl && (
                    <div className="image-preview">
                      <img src={heroForm.imageUrl} alt="Preview" />
                    </div>
                  )}
                  
                  <div className="form-actions">
                    <button className="save-btn" onClick={handleSaveHero}>
                      <FiSave /> {editingHero ? (language === 'ko' ? '수정' : 'Update') : (language === 'ko' ? '추가' : 'Add')}
                    </button>
                    {editingHero && (
                      <button className="cancel-btn" onClick={handleCancelEditHero}>
                        <FiXCircle /> {language === 'ko' ? '취소' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 히어로 슬라이드 목록 */}
              <div className="hero-list-section">
                <h3>{language === 'ko' ? '슬라이드 목록' : 'Slide List'} ({heroSlides.length})</h3>
                {heroLoading ? (
                  <div className="hero-loading">
                    <div className="loading-spinner"></div>
                  </div>
                ) : heroSlides.length > 0 ? (
                  <div className="hero-cards">
                    {heroSlides.map((slide) => (
                      <div key={slide.id} className={`hero-card ${!slide.is_active ? 'inactive' : ''}`}>
                        <div className="hero-card-image">
                          <img src={slide.imageUrl} alt={slide.title_ko} />
                          {!slide.is_active && (
                            <span className="inactive-badge">{language === 'ko' ? '비활성' : 'Inactive'}</span>
                          )}
                        </div>
                        <div className="hero-card-content">
                          <h4>{slide.title_ko}</h4>
                          {slide.subtitle_ko && <p className="subtitle">{slide.subtitle_ko}</p>}
                          <div className="hero-card-meta">
                            <span>#{slide.sort_order}</span>
                            <span>{slide.link}</span>
                          </div>
                        </div>
                        <div className="hero-card-actions">
                          <button className="edit-btn" onClick={() => handleEditHero(slide)}>
                            <FiEdit2 />
                          </button>
                          <button className="delete-btn" onClick={() => handleDeleteHero(slide.id)}>
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-data">
                    <FiImage size={48} />
                    <p>{language === 'ko' ? '등록된 슬라이드가 없습니다.' : 'No slides registered.'}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 추천 여행 코스 관리 */}
          {activeSection === 'courses' && (
            <div className="courses-management">
              {/* 통계 카드 */}
              {tripStats && (
                <div className="trip-stats-cards">
                  <div className="trip-stat-card">
                    <FiNavigation className="stat-icon" />
                    <div className="stat-info">
                      <span className="stat-value">{tripStats.totalCount}</span>
                      <span className="stat-label">{language === 'ko' ? '게시된 코스' : 'Published Courses'}</span>
                    </div>
                  </div>
                  <div className="trip-stat-card">
                    <FiEye className="stat-icon" />
                    <div className="stat-info">
                      <span className="stat-value">{tripStats.totalViews?.toLocaleString()}</span>
                      <span className="stat-label">{language === 'ko' ? '총 조회수' : 'Total Views'}</span>
                    </div>
                  </div>
                  <div className="trip-stat-card">
                    <FiHeart className="stat-icon" />
                    <div className="stat-info">
                      <span className="stat-value">{tripStats.totalLikes?.toLocaleString()}</span>
                      <span className="stat-label">{language === 'ko' ? '총 좋아요' : 'Total Likes'}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 수정 폼 */}
              {editingTrip && (
                <div className="trip-edit-form">
                  <h3>{language === 'ko' ? '여행 코스 수정' : 'Edit Travel Course'}</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{language === 'ko' ? '제목' : 'Title'}</label>
                      <input
                        type="text"
                        value={tripForm.title}
                        onChange={(e) => setTripForm({...tripForm, title: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>{language === 'ko' ? '작성자' : 'Author'}</label>
                      <input
                        type="text"
                        value={tripForm.authorNickname}
                        onChange={(e) => setTripForm({...tripForm, authorNickname: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{language === 'ko' ? '설명' : 'Description'}</label>
                    <textarea
                      value={tripForm.description}
                      onChange={(e) => setTripForm({...tripForm, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label>{language === 'ko' ? '썸네일 URL' : 'Thumbnail URL'}</label>
                    <input
                      type="text"
                      value={tripForm.thumbnailUrl}
                      onChange={(e) => setTripForm({...tripForm, thumbnailUrl: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="form-actions">
                    <button className="btn-save" onClick={handleSaveTripEdit}>
                      <FiSave /> {language === 'ko' ? '저장' : 'Save'}
                    </button>
                    <button className="btn-cancel" onClick={() => setEditingTrip(null)}>
                      <FiXCircle /> {language === 'ko' ? '취소' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* 여행 코스 목록 */}
              {tripsLoading ? (
                <div className="loading-container">
                  <FiLoader className="spinning" size={32} />
                  <p>{language === 'ko' ? '로딩 중...' : 'Loading...'}</p>
                </div>
              ) : publishedTrips.length > 0 ? (
                <div className="trips-list">
                  <table className="trips-table">
                    <thead>
                      <tr>
                        <th>{language === 'ko' ? '썸네일' : 'Thumbnail'}</th>
                        <th>{language === 'ko' ? '제목' : 'Title'}</th>
                        <th>{language === 'ko' ? '작성자' : 'Author'}</th>
                        <th>{language === 'ko' ? '조회수' : 'Views'}</th>
                        <th>{language === 'ko' ? '좋아요' : 'Likes'}</th>
                        <th>{language === 'ko' ? '게시일' : 'Published'}</th>
                        <th>{language === 'ko' ? '관리' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {publishedTrips.map(trip => (
                        <tr key={trip.id}>
                          <td>
                            <div className="trip-thumbnail">
                              {trip.thumbnailUrl ? (
                                <img src={trip.thumbnailUrl} alt={trip.title} />
                              ) : (
                                <div className="no-thumbnail"><FiImage /></div>
                              )}
                            </div>
                          </td>
                          <td>
                            <a 
                              href={`/trip/shared/${trip.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="trip-title-link"
                            >
                              {trip.title}
                            </a>
                          </td>
                          <td>{trip.authorNickname}</td>
                          <td>{trip.viewCount?.toLocaleString()}</td>
                          <td>{trip.likeCount?.toLocaleString()}</td>
                          <td>
                            {trip.publishedAt 
                              ? new Date(trip.publishedAt).toLocaleDateString() 
                              : '-'}
                          </td>
                          <td>
                            <div className="trip-actions">
                              <button 
                                className="btn-edit" 
                                onClick={() => handleEditTrip(trip)}
                                title={language === 'ko' ? '수정' : 'Edit'}
                              >
                                <FiEdit2 />
                              </button>
                              <button 
                                className={`btn-toggle ${trip.isPublished ? 'published' : ''}`}
                                onClick={() => handleToggleTripPublish(trip)}
                                title={trip.isPublished 
                                  ? (language === 'ko' ? '게시 취소' : 'Unpublish')
                                  : (language === 'ko' ? '게시' : 'Publish')}
                              >
                                {trip.isPublished ? <FiToggleRight /> : <FiToggleLeft />}
                              </button>
                              <button 
                                className="btn-delete" 
                                onClick={() => handleDeleteTrip(trip)}
                                title={language === 'ko' ? '삭제' : 'Delete'}
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data">
                  <FiNavigation size={48} />
                  <p>{language === 'ko' ? '게시된 여행 코스가 없습니다.' : 'No published travel courses.'}</p>
                </div>
              )}
            </div>
          )}
          
          {/* 페이지 데이터 관리 */}
          {activeSection.startsWith('page-') && selectedPage && (
            <div className="page-management">
              {/* 데이터 소스 선택 탭 */}
              <div className="data-source-tabs">
                <button 
                  className={`source-tab ${dataSource === 'api' ? 'active' : ''}`}
                  onClick={() => handleDataSourceChange('api')}
                >
                  <FiCloud /> API {language === 'ko' ? '(미저장)' : '(Unsaved)'}
                  {dataSource === 'api' && <span className="source-count">({pageTotalCount.toLocaleString()}개)</span>}
                </button>
                <button 
                  className={`source-tab ${dataSource === 'db' ? 'active' : ''}`}
                  onClick={() => handleDataSourceChange('db')}
                >
                  <FiDatabase /> DB {language === 'ko' ? '(저장됨)' : '(Saved)'}
                  <span className="source-count">({(dbStats[selectedPage] || 0).toLocaleString()}개)</span>
                </button>
              </div>
              
              {/* DB 검색 바 (DB 소스일 때만 표시) */}
              {dataSource === 'db' && (
                <form className="db-search-bar" onSubmit={handleDbSearch}>
                  <div className="search-input-wrapper">
                    <FiSearch className="search-icon" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={language === 'ko' ? '이름, 주소, 설명 등으로 검색...' : 'Search by name, address, description...'}
                      className="db-search-input"
                    />
                    {searchQuery && (
                      <button 
                        type="button" 
                        className="search-clear-btn"
                        onClick={handleClearSearch}
                      >
                        <FiX />
                      </button>
                    )}
                  </div>
                  <button type="submit" className="search-submit-btn">
                    {language === 'ko' ? '검색' : 'Search'}
                  </button>
                </form>
              )}
              
              <div className="page-header">
                <span className="page-count">
                  {dataSource === 'api' 
                    ? (language === 'ko' ? '미저장 API 데이터' : 'Unsaved API Data')
                    : (language === 'ko' 
                        ? (searchQuery ? `검색 결과` : '저장된 DB 데이터')
                        : (searchQuery ? 'Search Results' : 'Saved DB Data'))
                  }: <strong>{pageTotalCount.toLocaleString()}</strong> {language === 'ko' ? '개' : 'items'}
                  {searchQuery && dataSource === 'db' && (
                    <span className="search-query-info">
                      {' '}("{searchQuery}")
                    </span>
                  )}
                  {pageTotalCount > 0 && (
                    <span className="page-info">
                      {' '}(페이지 {currentPage}/{totalPages})
                    </span>
                  )}
                </span>
                <div className="page-header-actions">
                  {dataSource === 'api' && (
                    <button 
                      className="bulk-save-btn"
                      onClick={handleBulkSave}
                      disabled={bulkSaving || pageLoading || pageTotalCount === 0}
                    >
                      {bulkSaving ? (
                        <>
                          <span className="saving-spinner"></span>
                          {language === 'ko' ? '저장 중...' : 'Saving...'} ({bulkSaveProgress.current}/{bulkSaveProgress.total})
                        </>
                      ) : (
                        <>
                          <FiDatabase /> {language === 'ko' ? '전체 저장' : 'Save All'}
                        </>
                      )}
                    </button>
                  )}
                  <a href={`/${selectedPage}`} target="_blank" className="view-page-btn">
                    <FiExternalLink /> {language === 'ko' ? '페이지 보기' : 'View'}
                  </a>
                </div>
              </div>
              
              <DataTable
                data={pageData}
                fields={PAGE_CONFIGS[selectedPage]?.fields || []}
                labels={PAGE_CONFIGS[selectedPage]?.labels || {}}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                loading={pageLoading}
                language={language}
                showSaveButton={dataSource === 'api'}
                showEditButton={dataSource === 'db' && selectedPage !== 'parking'}
                showDeleteButton={dataSource === 'db' && selectedPage !== 'parking'}
                onSaveItem={handleSaveItem}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                savedItems={savedItems[selectedPage] || []}
              />
              
              {/* 수정 모달 */}
              <EditModal
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                title={language === 'ko' ? '데이터 수정' : 'Edit Data'}
                fields={PAGE_CONFIGS[selectedPage]?.fields || []}
                labels={PAGE_CONFIGS[selectedPage]?.labels || {}}
                formData={editForm}
                onFormChange={setEditForm}
                onSave={handleSaveEditItem}
                saving={editSaving}
                language={language}
              />
              
              {!pageLoading && pageData.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  language={language}
                />
              )}
            </div>
          )}
          
          {/* Supabase 데이터베이스 섹션 */}
          {activeSection === 'database' && (
            <div className="database-section">
              <div className="table-selector">
                <h3>{language === 'ko' ? 'Supabase 테이블' : 'Supabase Tables'}</h3>
                <div className="table-buttons">
                  {['users', 'places', 'events', 'favorites', 'reviews'].map(table => (
                    <button
                      key={table}
                      className={`table-btn ${selectedTable === table ? 'active' : ''}`}
                      onClick={() => loadTableData(table)}
                    >
                      {table}
                    </button>
                  ))}
                </div>
                <a 
                  href="https://supabase.com/dashboard/project/geczvsuzwpvdxiwbxqtf" 
                  target="_blank" 
                  className="supabase-link"
                >
                  <FiExternalLink /> Supabase Dashboard
                </a>
              </div>
              
              {tableLoading ? (
                <div className="table-loading">
                  <div className="loading-spinner"></div>
                  <p>{language === 'ko' ? '데이터 로딩 중...' : 'Loading data...'}</p>
                </div>
              ) : selectedTable ? (
                <div className="data-table-container">
                  <h3>{selectedTable} {language === 'ko' ? '테이블' : 'Table'} ({tableData.length}{language === 'ko' ? '개' : ' rows'})</h3>
                  {tableData.length > 0 ? (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            {Object.keys(tableData[0]).map((key) => (
                              <th key={key}>{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.map((row, index) => (
                            <tr key={index}>
                              {Object.values(row).map((value, i) => (
                                <td key={i}>
                                  {typeof value === 'object' 
                                    ? JSON.stringify(value).substring(0, 50) + '...'
                                    : String(value).substring(0, 100)
                                  }
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="no-data">
                      <p>{language === 'ko' ? '데이터가 없습니다.' : 'No data found.'}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-table-selected">
                  <p>{language === 'ko' ? '위에서 테이블을 선택해주세요.' : 'Please select a table above.'}</p>
                </div>
              )}
            </div>
          )}
          
          {/* 사용자 관리 섹션 */}
          {activeSection === 'users' && (
            <div className="users-section">
              <div className="section-header">
                <h2>{language === 'ko' ? '사용자 목록' : 'User List'}</h2>
              </div>
              <div className="coming-soon">
                <FiUsers size={48} />
                <p>{language === 'ko' ? '사용자 관리 기능이 준비 중입니다.' : 'User management is coming soon.'}</p>
              </div>
            </div>
          )}
          
          {/* 장소 관리 섹션 */}
          {activeSection === 'places' && (
            <div className="places-section">
              <div className="section-header">
                <h2>{language === 'ko' ? '장소 관리' : 'Place Management'}</h2>
              </div>
              <div className="coming-soon">
                <FiMap size={48} />
                <p>{language === 'ko' ? '장소 관리 기능이 준비 중입니다.' : 'Place management is coming soon.'}</p>
              </div>
            </div>
          )}
          
          {/* 행사 관리 섹션 */}
          {activeSection === 'events' && (
            <div className="events-section">
              <div className="section-header">
                <h2>{language === 'ko' ? '행사 관리' : 'Event Management'}</h2>
              </div>
              <div className="coming-soon">
                <FiCalendar size={48} />
                <p>{language === 'ko' ? '행사 관리 기능이 준비 중입니다.' : 'Event management is coming soon.'}</p>
              </div>
            </div>
          )}
          
          {/* 설정 섹션 */}
          {activeSection === 'settings' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>{language === 'ko' ? '설정' : 'Settings'}</h2>
              </div>
              <div className="settings-content">
                <div className="setting-item">
                  <h3>{language === 'ko' ? '계정 정보' : 'Account Info'}</h3>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>ID:</strong> {user.id}</p>
                  <p><strong>{language === 'ko' ? '마지막 로그인' : 'Last Sign In'}:</strong> {new Date(user.last_sign_in_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminPage
