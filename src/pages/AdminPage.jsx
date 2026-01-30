import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import { 
  FiHome, FiUsers, FiMap, FiCalendar, FiShoppingBag, FiSettings, FiLogOut, 
  FiMenu, FiX, FiBarChart2, FiDatabase, FiCoffee, FiHeart, FiCloud,
  FiTruck, FiRefreshCw, FiExternalLink, FiActivity, FiTrendingUp,
  FiEdit2, FiTrash2, FiPlus, FiImage, FiSave, FiXCircle, FiLoader, FiSearch,
  FiNavigation, FiEye, FiToggleLeft, FiToggleRight, FiMusic, FiDownload,
  FiGlobe, FiSun, FiInfo, FiServer, FiArrowUp, FiArrowDown
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { 
  getMedicalFacilities, getDaejeonParking,
  getCulturalPerformances,
  getTourApiSpots, getTourApiFestivals, getTourApiCounts,
  getTourApiDetail,
  getTourApiSpotsEng,
  getTourApiDetailEng,
  CONTENT_TYPE_KOR_TO_ENG
} from '../services/api'
import { 
  getAllDbCounts, getHeroSlides, createHeroSlide, updateHeroSlide, 
  deleteHeroSlide, deleteDbItem, updateDbItem, getSupabaseUsageStats,
  getPageVisitStats, getTodayPageVisitStats, getMostVisitedPageDB,
  getPopularSearchQueries, getTodayPopularSearchQueries, getSearchStats,
  getPageVisitStatsByPeriod,
  getDbPerformances, savePerformances, deletePerformance, deleteExpiredPerformances,
  getPerformanceCount,
  saveTourSpots, deleteTourSpots, getTourSpotsCount,
  saveTourFestivals, deleteAllTourFestivals, deleteExpiredTourFestivals, getTourFestivalsCount,
  getTourApiStats, syncTourSpotsOverview, getTourSpotsWithoutOverviewCount,
  syncTourSpotsIntroInfo, getTourSpotsWithoutIntroCount,
  syncTourSpotsEnglish, getTourSpotsWithoutEngCount,
  syncTourSpotsRoomInfo, getTourSpotsWithoutRoomCount,
  getTourSpotsWithoutEng, mapTourSpotEnglish, clearTourSpotEnglish,
  getMappedEngContentIds,
  getRestaurantsWithoutAiDescCount, getRestaurantsWithoutAiDesc, sendRestaurantsToN8n,
  getSpotsByTypeWithoutAiDescCount, getSpotsByTypeWithoutAiDesc, sendSpotsToN8nByType,
  getOrphanedTourSpots, deleteTourSpotsByIds
} from '../services/dbService'
import {
  getAdminPublishedTrips, adminUpdateTripPublishStatus, adminUpdateTrip,
  adminDeleteTrip, getPublishedTripStats
} from '../services/tripService'
import { uploadResizedImage, deleteImage } from '../services/blobService'
import { PAGE_NAMES } from '../utils/apiStats'
import { toSecureUrl } from '../utils/imageUtils'
import { StatCard, DataTable, Pagination, EditModal, SupabaseUsageStats, ExternalApiStats } from '../components/admin'
import Icons from '../components/common/Icons'
// CSS는 pages/_app.jsx에서 import

// 페이지 관리 설정 (TourAPI에 없는 데이터만 유지)
const PAGE_CONFIGS = {
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
  const router = useRouter()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // 관리자 권한 상태
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCheckLoading, setAdminCheckLoading] = useState(true)
  
  // 대시보드 통계
  const [stats, setStats] = useState({})          // API 데이터 개수
  const [dbStats, setDbStats] = useState({})      // DB 데이터 개수
  const [statsLoading, setStatsLoading] = useState(false)
  
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
  
  // 사용자 활동 통계 (리뷰, 좋아요, 프로필)
  const [userActivityStats, setUserActivityStats] = useState({
    totalProfiles: 0,
    totalReviews: 0,
    totalLikes: 0,
    todayReviews: 0,
    todayLikes: 0,
    recentReviews: [],
    topRatedSpots: []
  })
  const [userActivityLoading, setUserActivityLoading] = useState(false)
  
  // 리뷰 관리 상태
  const [allReviews, setAllReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsPage, setReviewsPage] = useState(1)
  const [reviewsTotalCount, setReviewsTotalCount] = useState(0)
  const [reviewsFilter, setReviewsFilter] = useState('all') // all, recent, low-rating
  const [deletingReviewId, setDeletingReviewId] = useState(null)
  
  // 프로필 관리 상태
  const [allProfiles, setAllProfiles] = useState([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [profilesPage, setProfilesPage] = useState(1)
  const [profilesTotalCount, setProfilesTotalCount] = useState(0)
  const [profileSearch, setProfileSearch] = useState('')
  
  // 페이지 방문 통계 관리 상태
  const [pageVisits, setPageVisits] = useState([])
  const [pageVisitsLoading, setPageVisitsLoading] = useState(false)
  const [pageVisitsPage, setPageVisitsPage] = useState(1)
  const [pageVisitsTotalCount, setPageVisitsTotalCount] = useState(0)
  const [pageVisitsPeriod, setPageVisitsPeriod] = useState('today')
  const [pageVisitsSummary, setPageVisitsSummary] = useState({}) // 페이지별 요약
  
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
  const [tripThumbnailFile, setTripThumbnailFile] = useState(null) // 여행 썸네일 파일
  const [tripThumbnailPreview, setTripThumbnailPreview] = useState(null) // 여행 썸네일 미리보기
  const [tripImageUploading, setTripImageUploading] = useState(false) // 업로드 중 상태

  // 공연 관리 상태
  const [dbPerformances, setDbPerformances] = useState([]) // DB에 저장된 공연 목록
  const [apiPerformances, setApiPerformances] = useState([]) // KCISA API에서 불러온 공연 목록
  const [performancesLoading, setPerformancesLoading] = useState(false)
  const [performanceSyncLoading, setPerformanceSyncLoading] = useState(false)
  const [performanceDeleteLoading, setPerformanceDeleteLoading] = useState(false)
  const [performanceDbCount, setPerformanceDbCount] = useState(0)

  // TourAPI 관리 상태
  const [tourApiCounts, setTourApiCounts] = useState({}) // API에서 가져온 각 타입별 개수
  const [tourDbCounts, setTourDbCounts] = useState({})   // DB에 저장된 각 타입별 개수
  const [tourApiLoading, setTourApiLoading] = useState(false)
  const [tourSyncLoading, setTourSyncLoading] = useState({}) // 각 타입별 동기화 로딩 상태
  const [overviewSyncLoading, setOverviewSyncLoading] = useState(false) // overview 동기화 로딩
  const [overviewSyncProgress, setOverviewSyncProgress] = useState({ current: 0, total: 0, item: '' }) // 진행 상태
  const [noOverviewCount, setNoOverviewCount] = useState(0) // overview 없는 항목 개수
  const [introSyncLoading, setIntroSyncLoading] = useState(false) // intro_info 동기화 로딩
  const [introSyncProgress, setIntroSyncProgress] = useState({ current: 0, total: 0, item: '' }) // 진행 상태
  const [noIntroCount, setNoIntroCount] = useState(0) // intro_info 없는 항목 개수
  const [roomSyncLoading, setRoomSyncLoading] = useState(false) // room_info 동기화 로딩
  const [roomSyncProgress, setRoomSyncProgress] = useState({ current: 0, total: 0, item: '' }) // 진행 상태
  const [noRoomCount, setNoRoomCount] = useState(0) // room_info 없는 숙박 항목 개수
  const [engSyncLoading, setEngSyncLoading] = useState(false) // 영문 데이터 동기화 로딩
  const [engSyncProgress, setEngSyncProgress] = useState({ current: 0, total: 0, item: '' }) // 영문 동기화 진행
  const [noEngCount, setNoEngCount] = useState(0) // 영문 데이터 없는 항목 개수
  
  // API에 없고 DB에만 있는 항목(orphaned) 관리
  const [orphanedModalOpen, setOrphanedModalOpen] = useState(false)
  const [orphanedItems, setOrphanedItems] = useState([])
  const [orphanedLoading, setOrphanedLoading] = useState(false)
  const [orphanedSelectedType, setOrphanedSelectedType] = useState(null)
  const [orphanedSelectedIds, setOrphanedSelectedIds] = useState(new Set())
  
  // AI Description 생성 상태 (n8n)
  const [aiDescSyncLoading, setAiDescSyncLoading] = useState(false)
  const [aiDescSyncProgress, setAiDescSyncProgress] = useState({ current: 0, total: 0, item: '' })
  const [noAiDescCount, setNoAiDescCount] = useState(0) // AI description 없는 음식점 개수
  const [aiDescLogs, setAiDescLogs] = useState([]) // AI description 생성 로그
  const [aiDescBatchSize, setAiDescBatchSize] = useState(10) // 한 번에 처리할 개수
  const [aiDescSelectedType, setAiDescSelectedType] = useState('39') // 선택된 카테고리 타입
  
  // 카테고리별 n8n webhook URL (production URL - test URL이 아님!)
  const [aiDescWebhookUrls, setAiDescWebhookUrls] = useState({
    '12': 'http://localhost:5678/webhook/d714ad13-cad9-4026-a359-7f68dde0f86f', // 관광지
    '14': 'http://localhost:5678/webhook/937fec8f-1ed2-42e4-ac40-ecf76a0488bf', // 문화시설
    '28': 'http://localhost:5678/webhook/08e38f13-de9e-4d8a-b3a4-d2361c213e8f', // 레포츠
    '32': 'http://localhost:5678/webhook/f5dbf2fc-9dae-4034-9652-f6df17840a4b', // 숙박
    '38': 'http://localhost:5678/webhook/24e7e818-2328-45fd-9dfa-e4b88bcc7a6c', // 쇼핑
    '39': 'http://localhost:5678/webhook/30db0f61-ac62-49eb-9e55-80436fb7c6c1'  // 음식점
  })
  
  // 카테고리별 AI description 없는 개수
  const [aiDescCountByType, setAiDescCountByType] = useState({
    '12': 0, '14': 0, '28': 0, '32': 0, '38': 0, '39': 0
  })
  
  // 영문 수동 매핑 상태
  const [engMappingData, setEngMappingData] = useState([]) // 영문 없는 국문 데이터 목록
  const [engMappingLoading, setEngMappingLoading] = useState(false)
  const [engApiData, setEngApiData] = useState([]) // 영문 API 데이터 목록
  const [engApiLoading, setEngApiLoading] = useState(false)
  const [engMappingSelectedKor, setEngMappingSelectedKor] = useState(null) // 선택된 국문 항목
  const [engMappingSelectedEng, setEngMappingSelectedEng] = useState(null) // 선택된 영문 항목
  const [engMappingSearchKor, setEngMappingSearchKor] = useState('') // 국문 검색어
  const [engMappingSearchEng, setEngMappingSearchEng] = useState('') // 영문 검색어
  const [engApiSelectedType, setEngApiSelectedType] = useState('76') // 선택된 영문 타입
  const [korApiSelectedType, setKorApiSelectedType] = useState('') // 선택된 국문 타입 (빈값=전체)
  
  // TourAPI DB 데이터 관리 상태
  const [tourDbData, setTourDbData] = useState([])
  const [tourDbDataLoading, setTourDbDataLoading] = useState(false)
  const [tourDbDataPage, setTourDbDataPage] = useState(1)
  const [tourDbDataTotalCount, setTourDbDataTotalCount] = useState(0)
  const [tourDbSelectedType, setTourDbSelectedType] = useState('12') // 기본 관광지
  const [tourDbSearchQuery, setTourDbSearchQuery] = useState('')
  const [tourDbEditItem, setTourDbEditItem] = useState(null) // 편집 중인 아이템
  const [tourDbViewMode, setTourDbViewMode] = useState('sync') // 'sync' 또는 'manage'
  const [tourDbSortField, setTourDbSortField] = useState('updated_at') // 정렬 필드
  const [tourDbSortOrder, setTourDbSortOrder] = useState('desc') // 'asc' 또는 'desc'
  const [tourDbEngFilter, setTourDbEngFilter] = useState('all') // 'all', 'hasEng', 'noEng'
  
  const TOUR_CONTENT_TYPES = {
    '12': { name: '관광지', icon: FiMap, color: '#0066cc' },
    '14': { name: '문화시설', icon: FiActivity, color: '#2196f3' },
    '28': { name: '레포츠', icon: FiSun, color: '#ff9800' },
    '32': { name: '숙박', icon: FiHome, color: '#795548' },
    '38': { name: '쇼핑', icon: FiShoppingBag, color: '#4caf50' },
    '39': { name: '음식점', icon: FiCoffee, color: '#ff6b35' },
    '15': { name: '행사/축제', icon: FiCalendar, color: '#9c27b0' }
  }

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
  
  // 관리자 권한 체크
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false)
        setAdminCheckLoading(false)
        return
      }
      
      try {
        // admin_users 테이블에서 현재 사용자 확인
        const { data, error } = await supabase
          .from('admin_users')
          .select('id, role, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()
        
        if (error || !data) {
          setIsAdmin(false)
        } else {
          setIsAdmin(true)
        }
      } catch (err) {
        setIsAdmin(false)
      }
      setAdminCheckLoading(false)
    }
    
    checkAdminRole()
  }, [user, supabase])
  
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
  
  // 사용자 활동 통계 로드 (프로필, 리뷰, 좋아요)
  const loadUserActivityStats = useCallback(async () => {
    setUserActivityLoading(true)
    try {
      // 프로필 수
      const { count: profileCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      
      // 리뷰 수
      const { count: reviewCount } = await supabase
        .from('spot_reviews')
        .select('*', { count: 'exact', head: true })
      
      // 좋아요 수
      const { count: likeCount } = await supabase
        .from('spot_likes')
        .select('*', { count: 'exact', head: true })
      
      // 오늘 리뷰 수
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count: todayReviewCount } = await supabase
        .from('spot_reviews')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
      
      // 오늘 좋아요 수
      const { count: todayLikeCount } = await supabase
        .from('spot_likes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
      
      // 최근 리뷰 5개 - 기본 컬럼만 조회
      const { data: recentReviews, error: reviewError } = await supabase
        .from('spot_reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (reviewError) {
        console.error('최근 리뷰 조회 실패:', reviewError)
      }
      
      // 조회수 높은 장소 TOP 5 (spot_stats 기준)
      const { data: topViewed, error: statsError } = await supabase
        .from('spot_stats')
        .select('content_id, view_count, like_count')
        .gt('view_count', 0)
        .order('view_count', { ascending: false })
        .limit(5)
      
      if (statsError) {
        console.error('통계 조회 실패:', statsError)
      }
      
      // 장소명 가져오기 (DB tour_spots 또는 tour_festivals에서 조회)
      let topViewedWithNames = topViewed || []
      if (topViewed && topViewed.length > 0) {
        const contentIds = topViewed.map(s => s.content_id)
        
        // tour_spots에서 먼저 조회
        const { data: spotNames } = await supabase
          .from('tour_spots')
          .select('content_id, title')
          .in('content_id', contentIds)
        
        // tour_festivals에서도 조회
        const { data: festivalNames } = await supabase
          .from('tour_festivals')
          .select('content_id, title')
          .in('content_id', contentIds)
        
        const nameMap = {}
        if (spotNames) {
          spotNames.forEach(s => {
            nameMap[s.content_id] = s.title
          })
        }
        if (festivalNames) {
          festivalNames.forEach(s => {
            if (!nameMap[s.content_id]) {
              nameMap[s.content_id] = s.title
            }
          })
        }
        
        // 없는 것은 API에서 조회 시도
        const missingIds = contentIds.filter(id => !nameMap[id])
        if (missingIds.length > 0) {
          for (const id of missingIds) {
            try {
              const { success, item } = await getTourApiDetail(id, false)
              if (success && item?.title) {
                nameMap[id] = item.title
              }
            } catch {
              // 무시
            }
          }
        }
        
        topViewedWithNames = topViewed.map(spot => ({
          ...spot,
          title: nameMap[spot.content_id] || `ID: ${spot.content_id}`
        }))
      }
      
      setUserActivityStats({
        totalProfiles: profileCount || 0,
        totalReviews: reviewCount || 0,
        totalLikes: likeCount || 0,
        todayReviews: todayReviewCount || 0,
        todayLikes: todayLikeCount || 0,
        recentReviews: recentReviews || [],
        topRatedSpots: topViewedWithNames
      })
    } catch (err) {
      console.error('사용자 활동 통계 로드 실패:', err)
    }
    setUserActivityLoading(false)
  }, [supabase])
  
  // 모든 리뷰 로드 (관리용)
  const loadAllReviews = useCallback(async (page = 1, filter = 'all') => {
    setReviewsLoading(true)
    setReviewsPage(page)
    setReviewsFilter(filter)
    
    try {
      const itemsPerPage = 20
      const offset = (page - 1) * itemsPerPage
      
      // 총 개수 가져오기
      const { count } = await supabase
        .from('spot_reviews')
        .select('*', { count: 'exact', head: true })
      
      setReviewsTotalCount(count || 0)
      
      // 리뷰 데이터 가져오기 (foreign key 관계가 없으므로 단순 조회)
      let query = supabase
        .from('spot_reviews')
        .select('*')
        .range(offset, offset + itemsPerPage - 1)
      
      // 필터 적용
      if (filter === 'recent') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('created_at', weekAgo.toISOString())
      } else if (filter === 'low-rating') {
        query = query.lte('rating', 2)
      }
      
      query = query.order('created_at', { ascending: false })
      
      const { data: reviews, error } = await query
      
      if (error) throw error
      
      // 리뷰 작성자들의 프로필 정보 가져오기
      if (reviews && reviews.length > 0) {
        const userIds = [...new Set(reviews.map(r => r.user_id).filter(Boolean))]
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nickname, avatar_url')
            .in('id', userIds)
          
          // 프로필 맵 생성
          const profileMap = {}
          if (profiles) {
            profiles.forEach(p => {
              profileMap[p.id] = { nickname: p.nickname, avatar_url: p.avatar_url }
            })
          }
          
          // 리뷰에 프로필 정보 추가
          const reviewsWithProfiles = reviews.map(r => ({
            ...r,
            profiles: profileMap[r.user_id] || null
          }))
          
          setAllReviews(reviewsWithProfiles)
        } else {
          setAllReviews(reviews)
        }
      } else {
        setAllReviews([])
      }
    } catch (err) {
      console.error('리뷰 로드 실패:', err)
      setAllReviews([])
    }
    setReviewsLoading(false)
  }, [supabase])
  
  // 리뷰 삭제 (관리자)
  const handleDeleteReview = useCallback(async (reviewId) => {
    if (!confirm(language === 'ko' ? '이 리뷰를 삭제하시겠습니까?' : 'Delete this review?')) {
      return
    }
    
    setDeletingReviewId(reviewId)
    try {
      const { error } = await supabase
        .from('spot_reviews')
        .delete()
        .eq('id', reviewId)
      
      if (error) throw error
      
      // 목록에서 제거
      setAllReviews(prev => prev.filter(r => r.id !== reviewId))
      setReviewsTotalCount(prev => prev - 1)
      
      alert(language === 'ko' ? '리뷰가 삭제되었습니다.' : 'Review deleted.')
    } catch (err) {
      console.error('리뷰 삭제 실패:', err)
      alert(language === 'ko' ? '삭제 실패' : 'Delete failed')
    }
    setDeletingReviewId(null)
  }, [supabase, language])
  
  // 모든 프로필 로드 (관리용)
  const loadAllProfiles = useCallback(async (page = 1, search = '') => {
    setProfilesLoading(true)
    setProfilesPage(page)
    setProfileSearch(search)
    
    try {
      const itemsPerPage = 20
      const offset = (page - 1) * itemsPerPage
      
      // 검색어가 있으면 필터링
      let countQuery = supabase.from('profiles').select('*', { count: 'exact', head: true })
      let dataQuery = supabase.from('profiles').select('*')
      
      if (search) {
        countQuery = countQuery.ilike('nickname', `%${search}%`)
        dataQuery = dataQuery.ilike('nickname', `%${search}%`)
      }
      
      const { count } = await countQuery
      setProfilesTotalCount(count || 0)
      
      const { data, error } = await dataQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + itemsPerPage - 1)
      
      if (error) throw error
      setAllProfiles(data || [])
    } catch (err) {
      console.error('프로필 로드 실패:', err)
      setAllProfiles([])
    }
    setProfilesLoading(false)
  }, [supabase])
  
  // 페이지 방문 통계 로드
  const loadPageVisits = useCallback(async (page = 1, period = 'today') => {
    setPageVisitsLoading(true)
    setPageVisitsPage(page)
    setPageVisitsPeriod(period)
    
    try {
      const itemsPerPage = 20
      const offset = (page - 1) * itemsPerPage
      
      // 기간에 따라 날짜 필터 설정
      let dateFilter = null
      const now = new Date()
      
      switch (period) {
        case 'today':
          dateFilter = new Date(now.setHours(0, 0, 0, 0)).toISOString()
          break
        case 'week':
          dateFilter = new Date(now.setDate(now.getDate() - 7)).toISOString()
          break
        case 'month':
          dateFilter = new Date(now.setMonth(now.getMonth() - 1)).toISOString()
          break
        default:
          dateFilter = null
      }
      
      // 총 개수 조회
      let countQuery = supabase.from('page_visits').select('*', { count: 'exact', head: true })
      if (dateFilter) {
        countQuery = countQuery.gte('visited_at', dateFilter)
      }
      const { count } = await countQuery
      setPageVisitsTotalCount(count || 0)
      
      // 데이터 조회
      let dataQuery = supabase.from('page_visits').select('*')
      if (dateFilter) {
        dataQuery = dataQuery.gte('visited_at', dateFilter)
      }
      
      const { data, error } = await dataQuery
        .order('visited_at', { ascending: false })
        .range(offset, offset + itemsPerPage - 1)
      
      if (error) throw error
      setPageVisits(data || [])
      
      // 페이지별 방문 수 요약 조회 (전체 기간 데이터로)
      let summaryQuery = supabase.from('page_visits').select('page_name')
      if (dateFilter) {
        summaryQuery = summaryQuery.gte('visited_at', dateFilter)
      }
      const { data: summaryData } = await summaryQuery
      
      // 페이지별로 그룹화
      const summary = {}
      if (summaryData) {
        summaryData.forEach(visit => {
          const pageName = visit.page_name || 'unknown'
          summary[pageName] = (summary[pageName] || 0) + 1
        })
      }
      setPageVisitsSummary(summary)
    } catch (err) {
      console.error('페이지 방문 통계 로드 실패:', err)
      setPageVisits([])
    }
    setPageVisitsLoading(false)
  }, [supabase])
  
  // TourAPI DB 데이터 로드 (tour_spots 또는 tour_festivals)
  const loadTourDbData = useCallback(async (typeId = '12', page = 1, search = '', sortField = 'updated_at', sortOrder = 'desc', engFilter = 'all') => {
    setTourDbDataLoading(true)
    setTourDbDataPage(page)
    setTourDbSelectedType(typeId)
    setTourDbSearchQuery(search)
    setTourDbSortField(sortField)
    setTourDbSortOrder(sortOrder)
    setTourDbEngFilter(engFilter)
    
    try {
      const itemsPerPage = 20
      const offset = (page - 1) * itemsPerPage
      const tableName = typeId === '15' ? 'tour_festivals' : 'tour_spots'
      
      // 총 개수 조회
      let countQuery = supabase.from(tableName).select('*', { count: 'exact', head: true })
      
      if (typeId !== '15') {
        countQuery = countQuery.eq('content_type_id', typeId)
      }
      
      if (search.trim()) {
        countQuery = countQuery.or(`title.ilike.%${search}%,addr1.ilike.%${search}%`)
      }
      
      // 영문 필터 적용
      if (engFilter === 'hasEng' && typeId !== '15') {
        countQuery = countQuery.not('title_en', 'is', null)
      } else if (engFilter === 'noEng' && typeId !== '15') {
        countQuery = countQuery.is('title_en', null)
      }
      
      const { count } = await countQuery
      setTourDbDataTotalCount(count || 0)
      
      // 데이터 조회
      let dataQuery = supabase.from(tableName).select('*')
      
      if (typeId !== '15') {
        dataQuery = dataQuery.eq('content_type_id', typeId)
      }
      
      if (search.trim()) {
        dataQuery = dataQuery.or(`title.ilike.%${search}%,addr1.ilike.%${search}%`)
      }
      
      // 영문 필터 적용
      if (engFilter === 'hasEng' && typeId !== '15') {
        dataQuery = dataQuery.not('title_en', 'is', null)
      } else if (engFilter === 'noEng' && typeId !== '15') {
        dataQuery = dataQuery.is('title_en', null)
      }
      
      const { data, error } = await dataQuery
        .order(sortField, { ascending: sortOrder === 'asc' })
        .range(offset, offset + itemsPerPage - 1)
      
      if (error) throw error
      setTourDbData(data || [])
    } catch (err) {
      console.error('TourAPI DB 데이터 로드 실패:', err)
      setTourDbData([])
    }
    setTourDbDataLoading(false)
  }, [supabase])
  
  // 정렬 토글 함수
  const handleTourDbSort = useCallback((field) => {
    const newOrder = (tourDbSortField === field && tourDbSortOrder === 'desc') ? 'asc' : 'desc'
    loadTourDbData(tourDbSelectedType, 1, tourDbSearchQuery, field, newOrder, tourDbEngFilter)
  }, [tourDbSortField, tourDbSortOrder, tourDbSelectedType, tourDbSearchQuery, tourDbEngFilter, loadTourDbData])
  
  // TourAPI DB 아이템 삭제
  const handleDeleteTourDbItem = useCallback(async (item) => {
    if (!confirm(language === 'ko' 
      ? `"${item.title}" 항목을 삭제하시겠습니까?` 
      : `Delete "${item.title}"?`)) {
      return
    }
    
    try {
      const tableName = tourDbSelectedType === '15' ? 'tour_festivals' : 'tour_spots'
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('content_id', item.content_id)
      
      if (error) throw error
      
      // 목록에서 제거
      setTourDbData(prev => prev.filter(i => i.content_id !== item.content_id))
      setTourDbDataTotalCount(prev => prev - 1)
      
      alert(language === 'ko' ? '삭제되었습니다.' : 'Deleted.')
    } catch (err) {
      console.error('TourAPI DB 아이템 삭제 실패:', err)
      alert(language === 'ko' ? '삭제 실패' : 'Delete failed')
    }
  }, [supabase, language, tourDbSelectedType])
  
  // TourAPI DB 아이템 수정
  const handleUpdateTourDbItem = useCallback(async (item) => {
    if (!tourDbEditItem) return
    
    try {
      const tableName = tourDbSelectedType === '15' ? 'tour_festivals' : 'tour_spots'
      const { error } = await supabase
        .from(tableName)
        .update({
          title: tourDbEditItem.title,
          addr1: tourDbEditItem.addr1,
          tel: tourDbEditItem.tel,
          overview: tourDbEditItem.overview,
          updated_at: new Date().toISOString()
        })
        .eq('content_id', item.content_id)
      
      if (error) throw error
      
      // 목록 업데이트
      setTourDbData(prev => prev.map(i => 
        i.content_id === item.content_id 
          ? { ...i, ...tourDbEditItem, updated_at: new Date().toISOString() }
          : i
      ))
      
      setTourDbEditItem(null)
      alert(language === 'ko' ? '수정되었습니다.' : 'Updated.')
    } catch (err) {
      console.error('TourAPI DB 아이템 수정 실패:', err)
      alert(language === 'ko' ? '수정 실패' : 'Update failed')
    }
  }, [supabase, language, tourDbSelectedType, tourDbEditItem])
  
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
    setTripThumbnailFile(null)
    setTripThumbnailPreview(trip.thumbnailUrl || null)
  }, [])
  
  // 여행 썸네일 파일 선택 처리
  const handleTripThumbnailChange = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // 이미지 파일 타입 확인
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert(language === 'ko' ? '지원되지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP만 가능)' : 'Unsupported file type.')
      return
    }
    
    // 파일 크기 확인 (최대 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(language === 'ko' ? '파일 크기가 10MB를 초과합니다.' : 'File size exceeds 10MB.')
      return
    }
    
    setTripThumbnailFile(file)
    // 미리보기 생성
    const reader = new FileReader()
    reader.onload = (e) => setTripThumbnailPreview(e.target.result)
    reader.readAsDataURL(file)
    // URL 필드 초기화
    setTripForm(prev => ({ ...prev, thumbnailUrl: '' }))
  }, [language])
  
  // 여행 썸네일 제거
  const handleRemoveTripThumbnail = useCallback(() => {
    setTripThumbnailFile(null)
    setTripThumbnailPreview(null)
    setTripForm(prev => ({ ...prev, thumbnailUrl: '' }))
  }, [])
  
  // 여행 코스 수정 저장
  const handleSaveTripEdit = useCallback(async () => {
    if (!editingTrip) return
    
    try {
      setTripImageUploading(true)
      
      let thumbnailUrl = tripForm.thumbnailUrl
      
      // 새 파일이 선택된 경우 업로드
      if (tripThumbnailFile) {
        // 기존 Blob 이미지가 있으면 삭제
        if (editingTrip.thumbnailUrl && 
            (editingTrip.thumbnailUrl.includes('vercel-storage.com') || 
             editingTrip.thumbnailUrl.includes('blob.vercel-storage.com'))) {
          try {
            await deleteImage(editingTrip.thumbnailUrl)
          } catch (deleteErr) {
            console.warn('기존 썸네일 삭제 실패:', deleteErr.message)
          }
        }
        
        const uploadResult = await uploadResizedImage(tripThumbnailFile, 'trip-thumbnails', {
          maxWidth: 800,
          maxHeight: 600,
          quality: 0.85
        })
        
        if (!uploadResult.success) {
          alert(uploadResult.error || (language === 'ko' ? '이미지 업로드 실패' : 'Image upload failed'))
          setTripImageUploading(false)
          return
        }
        
        thumbnailUrl = uploadResult.url
      } else if (!tripThumbnailPreview && editingTrip.thumbnailUrl) {
        // 미리보기가 제거되었으면 기존 이미지 삭제
        if (editingTrip.thumbnailUrl.includes('vercel-storage.com') || 
            editingTrip.thumbnailUrl.includes('blob.vercel-storage.com')) {
          try {
            await deleteImage(editingTrip.thumbnailUrl)
          } catch (deleteErr) {
            console.warn('기존 썸네일 삭제 실패:', deleteErr.message)
          }
        }
        thumbnailUrl = ''
      }
      
      const result = await adminUpdateTrip(editingTrip.id, { ...tripForm, thumbnailUrl })
      if (result.success) {
        alert(language === 'ko' ? '수정되었습니다.' : 'Updated.')
        setEditingTrip(null)
        setTripForm({ title: '', description: '', thumbnailUrl: '', authorNickname: '' })
        setTripThumbnailFile(null)
        setTripThumbnailPreview(null)
        loadPublishedTrips()
      } else {
        alert(result.error || '수정 실패')
      }
    } catch (err) {
      alert(language === 'ko' ? '수정 중 오류가 발생했습니다.' : 'Error occurred while updating.')
    } finally {
      setTripImageUploading(false)
    }
  }, [editingTrip, tripForm, tripThumbnailFile, tripThumbnailPreview, language, loadPublishedTrips])
  
  // 여행 코스 삭제
  const handleDeleteTrip = useCallback(async (trip) => {
    const confirmMsg = language === 'ko'
      ? `"${trip.title}" 여행 코스를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
      : `Delete "${trip.title}"?\nThis action cannot be undone.`
    
    if (!window.confirm(confirmMsg)) return
    
    try {
      // Blob에 업로드된 이미지가 있으면 삭제
      if (trip.thumbnailUrl && 
          (trip.thumbnailUrl.includes('vercel-storage.com') || 
           trip.thumbnailUrl.includes('blob.vercel-storage.com'))) {
        try {
          await deleteImage(trip.thumbnailUrl)
        } catch (deleteErr) {
          console.warn('썸네일 삭제 실패:', deleteErr.message)
        }
      }
      
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
  
  // ==================== 공연 관리 함수 ====================
  
  // DB에 저장된 공연 목록 로드
  const loadDbPerformances = useCallback(async () => {
    setPerformancesLoading(true)
    try {
      const performances = await getDbPerformances(false) // 전체 조회
      setDbPerformances(performances)
      const count = await getPerformanceCount()
      setPerformanceDbCount(count)
    } catch (err) {
      console.error('공연 목록 로드 실패:', err)
    }
    setPerformancesLoading(false)
  }, [])
  
  // KCISA API에서 공연 데이터 가져오기
  const loadApiPerformances = useCallback(async () => {
    setPerformanceSyncLoading(true)
    try {
      // 대전 키워드로 검색하여 API 레벨에서 필터링
      const result = await getCulturalPerformances({ numOfRows: 100, title: '대전' })
      if (result.success && result.items) {
        // 종료일 지나지 않은 것만 추가 필터링
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
        const todayNum = parseInt(today)
        
        const filtered = result.items.filter(item => {
          // 장소(eventSite)에 "대전"이 포함된 것만
          const siteHasDaejeon = (item.eventSite || '').includes('대전')
          if (!siteHasDaejeon) return false
          
          // 종료일 체크 (eventPeriod: "20260123 ~ 20260125" 형식)
          if (item.eventPeriod) {
            const parts = item.eventPeriod.split(' ~ ')
            const endDateStr = parts[1]?.trim() || parts[0]?.trim()
            if (endDateStr && endDateStr.length === 8) {
              const endDateNum = parseInt(endDateStr)
              if (endDateNum < todayNum) return false
            }
          }
          
          return true
        })
        
        setApiPerformances(filtered)
        return { success: true, count: filtered.length }
      }
      return { success: false }
    } catch (err) {
      console.error('KCISA API 호출 실패:', err)
      return { success: false, error: err.message }
    } finally {
      setPerformanceSyncLoading(false)
    }
  }, [])
  
  // API 공연 데이터를 DB에 저장
  const handleSyncPerformances = useCallback(async () => {
    if (apiPerformances.length === 0) {
      // 먼저 API에서 데이터 로드
      const loadResult = await loadApiPerformances()
      if (!loadResult.success) {
        alert(language === 'ko' ? 'API에서 공연 데이터를 불러오지 못했습니다.' : 'Failed to load performance data from API.')
        return
      }
    }
    
    const confirmMsg = language === 'ko'
      ? `${apiPerformances.length}개의 대전 지역 공연을 DB에 저장하시겠습니까?`
      : `Save ${apiPerformances.length} Daejeon performances to DB?`
    
    if (!window.confirm(confirmMsg)) return
    
    setPerformanceSyncLoading(true)
    try {
      const result = await savePerformances(apiPerformances)
      if (result.success) {
        alert(language === 'ko' 
          ? `${result.savedCount}개 공연이 저장되었습니다.` 
          : `${result.savedCount} performances saved.`)
        loadDbPerformances()
      } else {
        alert(result.error || '저장 실패')
      }
    } catch (err) {
      alert(language === 'ko' ? '저장 중 오류가 발생했습니다.' : 'Error saving performances.')
    }
    setPerformanceSyncLoading(false)
  }, [apiPerformances, language, loadApiPerformances, loadDbPerformances])
  
  // 만료된 공연 삭제
  const handleDeleteExpiredPerformances = useCallback(async () => {
    const confirmMsg = language === 'ko'
      ? '종료일이 지난 모든 공연을 삭제하시겠습니까?'
      : 'Delete all expired performances?'
    
    if (!window.confirm(confirmMsg)) return
    
    setPerformanceDeleteLoading(true)
    try {
      const result = await deleteExpiredPerformances()
      if (result.success) {
        alert(language === 'ko' 
          ? `${result.deletedCount}개의 만료된 공연이 삭제되었습니다.` 
          : `${result.deletedCount} expired performances deleted.`)
        loadDbPerformances()
      } else {
        alert(result.error || '삭제 실패')
      }
    } catch (err) {
      alert(language === 'ko' ? '삭제 중 오류가 발생했습니다.' : 'Error deleting performances.')
    }
    setPerformanceDeleteLoading(false)
  }, [language, loadDbPerformances])
  
  // 개별 공연 삭제
  const handleDeletePerformance = useCallback(async (performance) => {
    const confirmMsg = language === 'ko'
      ? `"${performance.title}" 공연을 삭제하시겠습니까?`
      : `Delete "${performance.title}"?`
    
    if (!window.confirm(confirmMsg)) return
    
    try {
      const result = await deletePerformance(performance.id)
      if (result.success) {
        alert(language === 'ko' ? '삭제되었습니다.' : 'Deleted.')
        loadDbPerformances()
      } else {
        alert(result.error || '삭제 실패')
      }
    } catch (err) {
      alert(language === 'ko' ? '삭제 중 오류가 발생했습니다.' : 'Error deleting performance.')
    }
  }, [language, loadDbPerformances])
  
  // ============================================================
  // TourAPI 관련 함수들
  // ============================================================
  
  // TourAPI 데이터 개수 로드 (API + DB)
  const loadTourApiStats = useCallback(async () => {
    setTourApiLoading(true)
    try {
      console.log('[DEBUG] loadTourApiStats - 시작')
      
      // API에서 각 타입별 개수 가져오기
      const apiCounts = await getTourApiCounts()
      console.log('[DEBUG] loadTourApiStats - apiCounts:', apiCounts)
      setTourApiCounts(apiCounts)
      
      // DB에서 각 타입별 개수 가져오기
      const dbStats = await getTourApiStats()
      console.log('[DEBUG] loadTourApiStats - dbStats:', dbStats)
      
      if (dbStats.success) {
        console.log('[DEBUG] loadTourApiStats - dbStats.stats:', dbStats.stats)
        setTourDbCounts(dbStats.stats)
      }
      
      // overview 없는 항목 개수 가져오기
      const noOverview = await getTourSpotsWithoutOverviewCount()
      setNoOverviewCount(noOverview)
      
      // intro_info 없는 항목 개수 가져오기
      const noIntro = await getTourSpotsWithoutIntroCount()
      setNoIntroCount(noIntro)
      
      // room_info 없는 숙박 항목 개수 가져오기
      const noRoom = await getTourSpotsWithoutRoomCount()
      setNoRoomCount(noRoom)
      
      // 영문 데이터 없는 항목 개수 가져오기
      const noEng = await getTourSpotsWithoutEngCount()
      setNoEngCount(noEng)
      
      // AI description 없는 음식점 개수 가져오기
      const noAiDesc = await getRestaurantsWithoutAiDescCount()
      setNoAiDescCount(noAiDesc)
      
      // 각 카테고리별 AI description 없는 개수 가져오기
      const typeIds = ['12', '14', '28', '32', '38', '39']
      const aiCountPromises = typeIds.map(id => getSpotsByTypeWithoutAiDescCount(id))
      const aiCounts = await Promise.all(aiCountPromises)
      const aiCountObj = {}
      typeIds.forEach((id, idx) => { aiCountObj[id] = aiCounts[idx] })
      setAiDescCountByType(aiCountObj)
    } catch (err) {
      console.error('TourAPI 통계 로드 실패:', err)
    }
    setTourApiLoading(false)
  }, [])
  
  // TourAPI 특정 타입 데이터를 DB에 동기화
  const handleSyncTourData = useCallback(async (contentTypeId) => {
    const typeName = TOUR_CONTENT_TYPES[contentTypeId]?.name || contentTypeId
    const confirmMsg = language === 'ko'
      ? `${typeName} 데이터를 API에서 가져와 DB에 동기화하시겠습니까?\n(기존 상세정보는 보존됩니다)`
      : `Sync ${typeName} data from API to DB?\n(Existing detail info will be preserved)`
    
    if (!window.confirm(confirmMsg)) return
    
    setTourSyncLoading(prev => ({ ...prev, [contentTypeId]: true }))
    try {
      if (contentTypeId === '15') {
        // 행사/축제는 별도 처리
        // 1년 전부터 시작하는 행사 가져오기 (종료되지 않은 것 포함)
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        const startDate = oneYearAgo.toISOString().slice(0, 10).replace(/-/g, '')
        console.log('[DEBUG] 행사/축제 동기화 - eventStartDate:', startDate)
        
        let allItems = []
        let pageNo = 1
        let hasMore = true
        
        while (hasMore) {
          const result = await getTourApiFestivals({
            pageNo,
            numOfRows: 100,
            eventStartDate: startDate
          })
          console.log('[DEBUG] 행사/축제 동기화 - page:', pageNo, 'items:', result.items?.length, 'total:', result.totalCount)
          
          if (result.success && result.items.length > 0) {
            allItems = [...allItems, ...result.items]
            pageNo++
            hasMore = result.items.length === 100
          } else {
            hasMore = false
          }
        }
        
        // 스마트 동기화: 삭제 없이 upsert만 (기존 데이터 보존)
        // await deleteAllTourFestivals() // 삭제하지 않음
        
        // 새 데이터 저장 (upsert)
        if (allItems.length > 0) {
          const saveResult = await saveTourFestivals(allItems)
          if (saveResult.success) {
            alert(language === 'ko'
              ? `${saveResult.savedCount}개의 ${typeName} 데이터가 동기화되었습니다.\n(기존 상세정보는 보존됨)`
              : `${saveResult.savedCount} ${typeName} items synced.\n(Existing details preserved)`)
          } else {
            throw new Error(saveResult.error)
          }
        } else {
          alert(language === 'ko' ? '저장할 데이터가 없습니다.' : 'No data to save.')
        }
      } else {
        // 일반 관광정보 처리
        let allItems = []
        let pageNo = 1
        let hasMore = true
        
        while (hasMore) {
          const result = await getTourApiSpots({
            contentTypeId,
            pageNo,
            numOfRows: 100
          })
          
          if (result.success && result.items.length > 0) {
            allItems = [...allItems, ...result.items]
            pageNo++
            hasMore = result.items.length === 100
          } else {
            hasMore = false
          }
        }
        
        // 스마트 동기화: 삭제 없이 upsert만 (기존 상세정보 보존)
        // await deleteTourSpots(contentTypeId) // 삭제하지 않음
        
        // 새 데이터 저장 (upsert)
        if (allItems.length > 0) {
          const saveResult = await saveTourSpots(allItems)
          if (saveResult.success) {
            alert(language === 'ko'
              ? `${saveResult.savedCount}개의 ${typeName} 데이터가 동기화되었습니다.\n(기존 상세정보는 보존됨)`
              : `${saveResult.savedCount} ${typeName} items synced.\n(Existing details preserved)`)
          } else {
            throw new Error(saveResult.error)
          }
        } else {
          alert(language === 'ko' ? '저장할 데이터가 없습니다.' : 'No data to save.')
        }
      }
      
      // 통계 새로고침
      await loadTourApiStats()
    } catch (err) {
      console.error(`${typeName} 동기화 실패:`, err)
      alert(language === 'ko'
        ? `${typeName} 동기화 중 오류가 발생했습니다: ${err.message}`
        : `Error syncing ${typeName}: ${err.message}`)
    }
    setTourSyncLoading(prev => ({ ...prev, [contentTypeId]: false }))
  }, [language, loadTourApiStats])
  
  // 만료된 행사 삭제
  const handleDeleteExpiredTourFestivals = useCallback(async () => {
    const confirmMsg = language === 'ko'
      ? '종료일이 지난 모든 행사/축제를 삭제하시겠습니까?'
      : 'Delete all expired festivals?'
    
    if (!window.confirm(confirmMsg)) return
    
    try {
      const result = await deleteExpiredTourFestivals()
      if (result.success) {
        alert(language === 'ko'
          ? `${result.deletedCount}개의 만료된 행사가 삭제되었습니다.`
          : `${result.deletedCount} expired festivals deleted.`)
        await loadTourApiStats()
      } else {
        alert(result.error || '삭제 실패')
      }
    } catch (err) {
      alert(language === 'ko' ? '삭제 중 오류가 발생했습니다.' : 'Error deleting expired festivals.')
    }
  }, [language, loadTourApiStats])
  
  // 전체 TourAPI 데이터 동기화
  const handleSyncAllTourData = useCallback(async () => {
    const confirmMsg = language === 'ko'
      ? '모든 TourAPI 데이터를 동기화하시겠습니까?\n(기존 상세정보는 보존됩니다. 시간이 걸릴 수 있습니다.)'
      : 'Sync all TourAPI data?\n(Existing details will be preserved. This may take a while.)'
    
    if (!window.confirm(confirmMsg)) return
    
    for (const typeId of Object.keys(TOUR_CONTENT_TYPES)) {
      await handleSyncTourData(typeId)
    }
  }, [handleSyncTourData, language])
  
  // TourAPI overview 동기화
  const handleSyncOverview = useCallback(async () => {
    const confirmMsg = language === 'ko'
      ? `${noOverviewCount}개 항목의 상세정보(overview)를 가져오시겠습니까?\n(시간이 오래 걸릴 수 있습니다)`
      : `Fetch detail info (overview) for ${noOverviewCount} items?\n(This may take a while)`
    
    if (!window.confirm(confirmMsg)) return
    
    setOverviewSyncLoading(true)
    setOverviewSyncProgress({ current: 0, total: noOverviewCount, item: '' })
    
    try {
      const result = await syncTourSpotsOverview(null, (current, total, item) => {
        setOverviewSyncProgress({ current, total, item })
      })
      
      if (result.success) {
        let alertMsg = language === 'ko'
          ? `상세정보 동기화 완료!\n- 성공: ${result.updatedCount}개\n- 실패: ${result.failedCount}개`
          : `Overview sync complete!\n- Success: ${result.updatedCount}\n- Failed: ${result.failedCount}`
        
        // 실패 항목이 있으면 콘솔에 상세 로그 출력
        if (result.failedItems && result.failedItems.length > 0) {
          console.group('[FAIL] 상세정보 동기화 실패 항목')
          result.failedItems.forEach(item => {
            console.warn(`${item.title} (content_id: ${item.content_id}, type: ${item.content_type_id})`)
            console.log(`  └ 이유: ${item.reason}`)
          })
          console.groupEnd()
          
          alertMsg += language === 'ko' 
            ? `\n\n실패 항목 상세는 개발자 도구(F12) 콘솔에서 확인하세요.`
            : `\n\nSee browser console (F12) for failed item details.`
        }
        
        alert(alertMsg)
      } else {
        alert(result.error || 'Sync failed')
      }
      
      // 통계 새로고침
      await loadTourApiStats()
    } catch (err) {
      console.error('Overview 동기화 실패:', err)
      alert(language === 'ko'
        ? `상세정보 동기화 중 오류: ${err.message}`
        : `Error syncing overview: ${err.message}`)
    }
    
    setOverviewSyncLoading(false)
    setOverviewSyncProgress({ current: 0, total: 0, item: '' })
  }, [language, noOverviewCount, loadTourApiStats])
  
  // TourAPI intro_info (소개정보) 동기화
  const handleSyncIntroInfo = useCallback(async () => {
    const confirmMsg = language === 'ko'
      ? `${noIntroCount}개 항목의 소개정보(이용시간, 주차 등)를 가져오시겠습니까?\n(시간이 오래 걸릴 수 있습니다)`
      : `Fetch intro info (hours, parking, etc.) for ${noIntroCount} items?\n(This may take a while)`
    
    if (!window.confirm(confirmMsg)) return
    
    setIntroSyncLoading(true)
    setIntroSyncProgress({ current: 0, total: noIntroCount, item: '' })
    
    try {
      const result = await syncTourSpotsIntroInfo(null, (current, total, item) => {
        setIntroSyncProgress({ current, total, item })
      })
      
      if (result.success) {
        let alertMsg = language === 'ko'
          ? `소개정보 동기화 완료!\n- 성공: ${result.updatedCount}개\n- 실패: ${result.failedCount}개`
          : `Intro sync complete!\n- Success: ${result.updatedCount}\n- Failed: ${result.failedCount}`
        
        // 실패 항목이 있으면 콘솔에 상세 로그 출력
        if (result.failedItems && result.failedItems.length > 0) {
          console.group('[FAIL] 소개정보 동기화 실패 항목')
          result.failedItems.forEach(item => {
            console.warn(`${item.title} (content_id: ${item.content_id}, type: ${item.content_type_id})`)
            console.log(`  └ 이유: ${item.reason}`)
          })
          console.groupEnd()
          
          alertMsg += language === 'ko' 
            ? `\n\n실패 항목 상세는 개발자 도구(F12) 콘솔에서 확인하세요.`
            : `\n\nSee browser console (F12) for failed item details.`
        }
        
        alert(alertMsg)
      } else {
        alert(result.error || 'Sync failed')
      }
      
      // 통계 새로고침
      await loadTourApiStats()
    } catch (err) {
      console.error('Intro info 동기화 실패:', err)
      alert(language === 'ko'
        ? `소개정보 동기화 중 오류: ${err.message}`
        : `Error syncing intro info: ${err.message}`)
    }
    
    setIntroSyncLoading(false)
    setIntroSyncProgress({ current: 0, total: 0, item: '' })
  }, [language, noIntroCount, loadTourApiStats])
  
  // AI Description 생성 (n8n으로 카테고리별 데이터 전송)
  const handleSyncAiDescription = useCallback(async () => {
    const webhookUrl = aiDescWebhookUrls[aiDescSelectedType]
    const typeCount = aiDescCountByType[aiDescSelectedType] || 0
    const typeName = TOUR_CONTENT_TYPES[aiDescSelectedType]?.name || aiDescSelectedType
    
    if (!webhookUrl) {
      alert(language === 'ko' ? 'n8n Webhook URL을 입력하세요.' : 'Please enter n8n Webhook URL.')
      return
    }
    
    const confirmMsg = language === 'ko'
      ? `${Math.min(aiDescBatchSize, typeCount)}개 ${typeName}의 AI 설명을 생성하시겠습니까?\n(n8n 워크플로우가 실행 중이어야 합니다)`
      : `Generate AI descriptions for ${Math.min(aiDescBatchSize, typeCount)} ${typeName}?\n(n8n workflow must be running)`
    
    if (!window.confirm(confirmMsg)) return
    
    setAiDescSyncLoading(true)
    setAiDescLogs([])
    setAiDescSyncProgress({ current: 0, total: 0, item: '' })
    
    try {
      // 선택된 타입에서 AI description이 없는 항목 가져오기
      const items = await getSpotsByTypeWithoutAiDesc(aiDescSelectedType, aiDescBatchSize)
      
      if (items.length === 0) {
        alert(language === 'ko' ? `AI 설명이 필요한 ${typeName}이(가) 없습니다.` : `No ${typeName} needs AI description.`)
        setAiDescSyncLoading(false)
        return
      }
      
      const addLog = (type, message, data = null) => {
        const timestamp = new Date().toLocaleTimeString('ko-KR')
        const logEntry = { timestamp, type, message, data }
        setAiDescLogs(prev => [...prev, logEntry])
        
        // 콘솔에도 출력
        const consoleMsg = `[${timestamp}] ${message}`
        if (type === 'error') {
          console.error(consoleMsg, data || '')
        } else if (type === 'success') {
          console.log('%c' + consoleMsg, 'color: green', data || '')
        } else {
          console.log(consoleMsg, data || '')
        }
      }
      
      addLog('info', `🚀 AI Description 생성 시작 (${items.length}개 ${typeName})`)
      addLog('info', `📡 n8n Webhook: ${webhookUrl}`)
      
      const result = await sendSpotsToN8nByType(
        webhookUrl,
        items,
        aiDescSelectedType,
        (current, total, item) => {
          setAiDescSyncProgress({ current, total, item })
        },
        addLog
      )
      
      addLog('info', `📊 전송 완료: 성공 ${result.sentCount}개, 실패 ${result.failedCount}개`)
      
      if (result.failedItems && result.failedItems.length > 0) {
        console.group('[FAIL] AI Description 전송 실패 항목')
        result.failedItems.forEach(item => {
          console.warn(`${item.title} (content_id: ${item.content_id})`)
          console.log(`  └ 이유: ${item.error}`)
        })
        console.groupEnd()
      }
      
      alert(language === 'ko'
        ? `AI 설명 생성 요청 완료!\n- 전송: ${result.sentCount}개\n- 실패: ${result.failedCount}개\n\nn8n에서 처리 후 자동 저장됩니다.`
        : `AI description request complete!\n- Sent: ${result.sentCount}\n- Failed: ${result.failedCount}\n\nWill be auto-saved after n8n processing.`)
      
      // 통계 새로고침
      await loadTourApiStats()
    } catch (err) {
      console.error('AI Description 전송 실패:', err)
      alert(language === 'ko'
        ? `AI 설명 생성 요청 중 오류: ${err.message}`
        : `Error requesting AI descriptions: ${err.message}`)
    }
    
    setAiDescSyncLoading(false)
    setAiDescSyncProgress({ current: 0, total: 0, item: '' })
  }, [language, aiDescWebhookUrls, aiDescSelectedType, aiDescBatchSize, aiDescCountByType, loadTourApiStats])
  
  // TourAPI 숙박 객실정보(room_info) 동기화
  const handleSyncRoomInfo = useCallback(async () => {
    const confirmMsg = language === 'ko'
      ? `${noRoomCount}개 숙박시설의 객실정보를 가져오시겠습니까?\n(시간이 오래 걸릴 수 있습니다)`
      : `Fetch room info for ${noRoomCount} accommodations?\n(This may take a while)`
    
    if (!window.confirm(confirmMsg)) return
    
    setRoomSyncLoading(true)
    setRoomSyncProgress({ current: 0, total: noRoomCount, item: '' })
    
    try {
      const result = await syncTourSpotsRoomInfo((current, total, item) => {
        setRoomSyncProgress({ current, total, item })
      })
      
      if (result.success) {
        let alertMsg = language === 'ko'
          ? `객실정보 동기화 완료!\n- 성공: ${result.updatedCount}개\n- 실패: ${result.failedCount}개`
          : `Room info sync complete!\n- Success: ${result.updatedCount}\n- Failed: ${result.failedCount}`
        
        if (result.failedItems && result.failedItems.length > 0) {
          console.group('[FAIL] 객실정보 동기화 실패 항목')
          result.failedItems.forEach(item => {
            console.warn(`${item.title} (content_id: ${item.content_id})`)
            console.log(`  └ 이유: ${item.reason}`)
          })
          console.groupEnd()
          
          alertMsg += language === 'ko' 
            ? `\n\n실패 항목 상세는 개발자 도구(F12) 콘솔에서 확인하세요.`
            : `\n\nSee browser console (F12) for failed item details.`
        }
        
        alert(alertMsg)
      } else {
        alert(result.error || 'Sync failed')
      }
      
      await loadTourApiStats()
    } catch (err) {
      console.error('Room info 동기화 실패:', err)
      alert(language === 'ko'
        ? `객실정보 동기화 중 오류: ${err.message}`
        : `Error syncing room info: ${err.message}`)
    }
    
    setRoomSyncLoading(false)
    setRoomSyncProgress({ current: 0, total: 0, item: '' })
  }, [language, noRoomCount, loadTourApiStats])
  
  // TourAPI 영문 데이터 동기화
  const handleSyncEnglish = useCallback(async () => {
    const confirmMsg = language === 'ko'
      ? `${noEngCount}개 항목의 영문 데이터를 가져오시겠습니까?\n(이름 매칭 방식으로 동기화됩니다)`
      : `Fetch English data for ${noEngCount} items?\n(Will use name matching)`
    
    if (!window.confirm(confirmMsg)) return
    
    setEngSyncLoading(true)
    setEngSyncProgress({ current: 0, total: noEngCount, item: '' })
    
    try {
      const result = await syncTourSpotsEnglish(null, (current, total, item) => {
        setEngSyncProgress({ current, total, item })
      })
      
      if (result.success) {
        let alertMsg = language === 'ko'
          ? `영문 데이터 동기화 완료!\n- 매칭 성공: ${result.updatedCount}개\n- 매칭 실패: ${result.failedCount}개`
          : `English sync complete!\n- Matched: ${result.updatedCount}\n- Unmatched: ${result.failedCount}`
        
        if (result.matchedItems && result.matchedItems.length > 0) {
          console.group('[OK] 영문 데이터 매칭 결과')
          result.matchedItems.forEach(item => {
            console.log(`${item.korTitle} → ${item.engTitle}`)
          })
          console.groupEnd()
        }
        
        alert(alertMsg)
      } else {
        alert(result.error || 'Sync failed')
      }
      
      // 통계 새로고침
      await loadTourApiStats()
    } catch (err) {
      console.error('영문 데이터 동기화 실패:', err)
      alert(language === 'ko'
        ? `영문 데이터 동기화 중 오류: ${err.message}`
        : `Error syncing English data: ${err.message}`)
    }
    
    setEngSyncLoading(false)
    setEngSyncProgress({ current: 0, total: 0, item: '' })
  }, [language, noEngCount, loadTourApiStats])
  
  // API에 없고 DB에만 있는 항목 조회
  const handleCheckOrphaned = useCallback(async (contentTypeId) => {
    const typeName = TOUR_CONTENT_TYPES[contentTypeId]?.name || contentTypeId
    setOrphanedLoading(true)
    setOrphanedSelectedType(contentTypeId)
    setOrphanedItems([])
    setOrphanedSelectedIds(new Set())
    
    try {
      // API에서 현재 데이터 목록 가져오기
      let allApiItems = []
      let pageNo = 1
      let hasMore = true
      
      while (hasMore) {
        const result = await getTourApiSpots({
          contentTypeId,
          pageNo,
          numOfRows: 100
        })
        
        if (result.success && result.items.length > 0) {
          allApiItems = [...allApiItems, ...result.items]
          pageNo++
          hasMore = result.items.length === 100
        } else {
          hasMore = false
        }
      }
      
      // API content_id 목록
      const apiContentIds = allApiItems.map(item => item.contentid)
      
      // DB에만 있는 항목 조회
      const result = await getOrphanedTourSpots(contentTypeId, apiContentIds)
      
      if (result.success) {
        setOrphanedItems(result.items)
        setOrphanedModalOpen(true)
        
        if (result.items.length === 0) {
          alert(language === 'ko'
            ? `${typeName}: API에 없는 항목이 없습니다.`
            : `${typeName}: No orphaned items found.`)
        }
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error('Orphaned 항목 조회 실패:', err)
      alert(language === 'ko'
        ? `조회 중 오류: ${err.message}`
        : `Error: ${err.message}`)
    }
    
    setOrphanedLoading(false)
  }, [language])
  
  // Orphaned 항목 선택 토글
  const handleToggleOrphanedSelect = useCallback((id) => {
    setOrphanedSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])
  
  // Orphaned 항목 전체 선택/해제
  const handleToggleAllOrphaned = useCallback(() => {
    if (orphanedSelectedIds.size === orphanedItems.length) {
      setOrphanedSelectedIds(new Set())
    } else {
      setOrphanedSelectedIds(new Set(orphanedItems.map(item => item.id)))
    }
  }, [orphanedItems, orphanedSelectedIds.size])
  
  // 선택한 Orphaned 항목 삭제
  const handleDeleteOrphaned = useCallback(async () => {
    if (orphanedSelectedIds.size === 0) {
      alert(language === 'ko' ? '삭제할 항목을 선택하세요.' : 'Select items to delete.')
      return
    }
    
    const confirmMsg = language === 'ko'
      ? `선택한 ${orphanedSelectedIds.size}개 항목을 삭제하시겠습니까?\n(이 작업은 되돌릴 수 없습니다)`
      : `Delete ${orphanedSelectedIds.size} selected items?\n(This cannot be undone)`
    
    if (!window.confirm(confirmMsg)) return
    
    try {
      const result = await deleteTourSpotsByIds(Array.from(orphanedSelectedIds))
      
      if (result.success) {
        alert(language === 'ko'
          ? `${result.deletedCount}개 항목이 삭제되었습니다.`
          : `${result.deletedCount} items deleted.`)
        
        // 목록에서 삭제된 항목 제거
        setOrphanedItems(prev => prev.filter(item => !orphanedSelectedIds.has(item.id)))
        setOrphanedSelectedIds(new Set())
        
        // 통계 새로고침
        await loadTourApiStats()
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error('삭제 실패:', err)
      alert(language === 'ko'
        ? `삭제 중 오류: ${err.message}`
        : `Error deleting: ${err.message}`)
    }
  }, [language, orphanedSelectedIds, loadTourApiStats])
  
  // 영문 매핑 - 국문 데이터 로드
  const loadEngMappingData = useCallback(async (typeId = '') => {
    setEngMappingLoading(true)
    try {
      const result = await getTourSpotsWithoutEng(typeId || null, engMappingSearchKor, 100)
      if (result.success) {
        setEngMappingData(result.items)
      }
    } catch (err) {
      console.error('영문 매핑 데이터 로드 실패:', err)
    }
    setEngMappingLoading(false)
  }, [engMappingSearchKor])
  
  // 영문 매핑 - 영문 API 데이터 로드 (이미 매핑된 항목 제외)
  const loadEngApiData = useCallback(async (typeId = '76') => {
    setEngApiLoading(true)
    try {
      // 이미 매핑된 영문 content_id 목록 조회
      const mappedResult = await getMappedEngContentIds(typeId)
      const mappedIds = mappedResult.success ? mappedResult.ids : []
      
      // 영문 API 데이터 조회
      const result = await getTourApiSpotsEng({ contentTypeId: typeId, numOfRows: 200 })
      if (result.success) {
        // 이미 매핑된 항목 필터링
        const filteredItems = (result.items || []).filter(
          item => !mappedIds.includes(String(item.contentid))
        )
        setEngApiData(filteredItems)
        console.log(`영문 데이터 로드: ${result.items?.length || 0}개 중 ${filteredItems.length}개 표시 (${mappedIds.length}개 이미 매핑됨)`)
      }
    } catch (err) {
      console.error('영문 API 데이터 로드 실패:', err)
    }
    setEngApiLoading(false)
  }, [])
  
  // 영문 매핑 - 수동 매핑 수행
  const handleEngMapping = useCallback(async () => {
    if (!engMappingSelectedKor || !engMappingSelectedEng) {
      alert(language === 'ko' ? '국문 항목과 영문 항목을 모두 선택하세요.' : 'Select both Korean and English items.')
      return
    }
    
    const confirmMsg = language === 'ko'
      ? `"${engMappingSelectedKor.title}"을(를)\n"${engMappingSelectedEng.title}"와 매핑하시겠습니까?`
      : `Map "${engMappingSelectedKor.title}" to\n"${engMappingSelectedEng.title}"?`
    
    if (!window.confirm(confirmMsg)) return
    
    try {
      // 영문 상세정보 조회
      const detailResult = await getTourApiDetailEng(engMappingSelectedEng.contentid)
      const engDetail = detailResult.success ? detailResult.item : engMappingSelectedEng
      
      const mappedEngContentId = engMappingSelectedEng.contentid
      const mappedKorId = engMappingSelectedKor.id
      
      const result = await mapTourSpotEnglish(mappedKorId, {
        content_id_en: mappedEngContentId,
        title_en: engMappingSelectedEng.title,
        addr1_en: engMappingSelectedEng.addr1 || '',
        overview_en: engDetail?.overview || '',
        homepage_en: engDetail?.homepage || ''
      })
      
      if (result.success) {
        alert(language === 'ko' ? '매핑 완료!' : 'Mapping complete!')
        // 국문 목록에서 제거
        setEngMappingData(prev => prev.filter(item => item.id !== mappedKorId))
        // 영문 목록에서도 제거
        setEngApiData(prev => prev.filter(item => item.contentid !== mappedEngContentId))
        // 선택 해제
        setEngMappingSelectedKor(null)
        setEngMappingSelectedEng(null)
      } else {
        alert(result.error || 'Mapping failed')
      }
    } catch (err) {
      console.error('영문 매핑 실패:', err)
      alert(err.message)
    }
  }, [language, engMappingSelectedKor, engMappingSelectedEng])
  
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
      loadSupabaseUsage()
      loadPageVisitStats(visitStatsPeriod)
      loadSearchStats()
      loadUserActivityStats() // 사용자 활동 통계 추가
    }
  }, [user, activeSection, loadDbStats, loadSupabaseUsage, loadPageVisitStats, loadSearchStats, loadUserActivityStats, visitStatsPeriod])
  
  // 페이지 선택 시 저장된 아이템 로드
  useEffect(() => {
    if (user && selectedPage && !savedItems[selectedPage]) {
      loadSavedItems(selectedPage)
    }
  }, [user, selectedPage, savedItems, loadSavedItems])
  
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
    router.push('/')
  }, [logout, router])
  
  // 로딩 중
  if (loading || adminCheckLoading) {
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
              <h1><Icons.admin size={24} /> {language === 'ko' ? '관리자 로그인' : 'Admin Login'}</h1>
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
              <button onClick={() => router.push('/')} className="back-btn">
                <FiHome /> {language === 'ko' ? '메인으로' : 'Back to Home'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // 로그인은 되었지만 관리자가 아닌 경우
  if (!isAdmin) {
    return (
      <div className={`admin-page ${isDark ? 'dark-theme' : ''}`}>
        <div className="admin-login-container">
          <div className="admin-login-card">
            <div className="login-header">
              <h1><Icons.forbidden size={24} /> {language === 'ko' ? '접근 권한 없음' : 'Access Denied'}</h1>
              <p>{language === 'ko' ? '관리자 권한이 필요합니다.' : 'Administrator privileges required.'}</p>
            </div>
            
            <div className="access-denied-info">
              <p>{language === 'ko' 
                ? `로그인 계정: ${user.email}` 
                : `Logged in as: ${user.email}`}</p>
              <p className="hint">
                {language === 'ko' 
                  ? '이 계정은 관리자로 등록되어 있지 않습니다.' 
                  : 'This account is not registered as an administrator.'}
              </p>
            </div>
            
            <div className="login-footer">
              <button onClick={handleLogout} className="logout-btn">
                <FiLogOut /> {language === 'ko' ? '로그아웃' : 'Logout'}
              </button>
              <button onClick={() => router.push('/')} className="back-btn">
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
          <h2><Icons.admin size={20} /> Admin</h2>
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
          
          <button 
            className={`nav-item ${activeSection === 'performances' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('performances')
              loadDbPerformances()
              loadApiPerformances()
            }}
          >
            <FiMusic style={{ color: activeSection === 'performances' ? 'white' : '#9c27b0' }} />
            <span>{language === 'ko' ? '공연 관리' : 'Performances'}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'tourapi' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('tourapi')
              loadTourApiStats()
            }}
          >
            <FiGlobe style={{ color: activeSection === 'tourapi' ? 'white' : '#00bcd4' }} />
            <span>{language === 'ko' ? 'TourAPI 관리' : 'TourAPI'}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'engmapping' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('engmapping')
              loadEngMappingData()
            }}
          >
            <FiGlobe style={{ color: activeSection === 'engmapping' ? 'white' : '#1976d2' }} />
            <span>{language === 'ko' ? '영문 매핑' : 'Eng Mapping'}</span>
          </button>
          
          <div className="nav-section-title">
            {language === 'ko' ? '사용자 관리' : 'Users'}
          </div>
          
          <button 
            className={`nav-item ${activeSection === 'reviews' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('reviews')
              loadAllReviews()
            }}
          >
            <FiEdit2 style={{ color: activeSection === 'reviews' ? 'white' : '#f59e0b' }} />
            <span>{language === 'ko' ? '리뷰 관리' : 'Reviews'}</span>
          </button>
          
          <button 
            className={`nav-item ${activeSection === 'profiles' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('profiles')
              loadAllProfiles()
            }}
          >
            <FiUsers style={{ color: activeSection === 'profiles' ? 'white' : '#3b82f6' }} />
            <span>{language === 'ko' ? '프로필 관리' : 'Profiles'}</span>
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
            className={`nav-item ${activeSection === 'analytics' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('analytics')
              loadPageVisits()
            }}
          >
            <FiActivity style={{ color: activeSection === 'analytics' ? 'white' : '#10b981' }} />
            <span>{language === 'ko' ? '방문 통계' : 'Analytics'}</span>
          </button>
          
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
            {activeSection === 'performances' && (language === 'ko' ? '공연 관리' : 'Performances')}
            {activeSection === 'tourapi' && (language === 'ko' ? 'TourAPI 관리' : 'TourAPI Management')}
            {activeSection === 'reviews' && (language === 'ko' ? '리뷰 관리' : 'Review Management')}
            {activeSection === 'profiles' && (language === 'ko' ? '프로필 관리' : 'Profile Management')}
            {activeSection === 'analytics' && (language === 'ko' ? '방문 통계' : 'Analytics')}
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
          {activeSection === 'performances' && (
            <button className="refresh-btn" onClick={() => { loadDbPerformances(); loadApiPerformances(); }}>
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
              {/* 실시간 활동 요약 카드 */}
              <div className="activity-summary-section">
                <h3>
                  <FiActivity />
                  {language === 'ko' ? '실시간 활동 요약' : 'Activity Summary'}
                  {userActivityLoading && <FiLoader className="loading-icon spinning" />}
                </h3>
                <div className="activity-cards">
                  <div className="activity-card users">
                    <div className="activity-icon"><FiUsers /></div>
                    <div className="activity-info">
                      <span className="activity-label">{language === 'ko' ? '등록 사용자' : 'Registered Users'}</span>
                      <span className="activity-value">{userActivityStats.totalProfiles.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="activity-card reviews">
                    <div className="activity-icon"><FiEdit2 /></div>
                    <div className="activity-info">
                      <span className="activity-label">{language === 'ko' ? '총 리뷰' : 'Total Reviews'}</span>
                      <span className="activity-value">{userActivityStats.totalReviews.toLocaleString()}</span>
                      {userActivityStats.todayReviews > 0 && (
                        <span className="activity-today">+{userActivityStats.todayReviews} today</span>
                      )}
                    </div>
                  </div>
                  <div className="activity-card likes">
                    <div className="activity-icon"><FiHeart /></div>
                    <div className="activity-info">
                      <span className="activity-label">{language === 'ko' ? '총 좋아요' : 'Total Likes'}</span>
                      <span className="activity-value">{userActivityStats.totalLikes.toLocaleString()}</span>
                      {userActivityStats.todayLikes > 0 && (
                        <span className="activity-today">+{userActivityStats.todayLikes} today</span>
                      )}
                    </div>
                  </div>
                  <div className="activity-card visits">
                    <div className="activity-icon"><FiEye /></div>
                    <div className="activity-info">
                      <span className="activity-label">{language === 'ko' ? '오늘 방문' : 'Today Visits'}</span>
                      <span className="activity-value">{Object.values(todayVisitStats).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 최근 리뷰 & 인기 장소 */}
              <div className="recent-activity-grid">
                {/* 최근 리뷰 */}
                <div className="recent-reviews-card">
                  <h4>
                    <FiEdit2 />
                    {language === 'ko' ? '최근 리뷰' : 'Recent Reviews'}
                  </h4>
                  {userActivityStats.recentReviews.length > 0 ? (
                    <ul className="recent-list">
                      {userActivityStats.recentReviews.map((review) => (
                        <li key={review.id} className="recent-item">
                          <div className="recent-rating">
                            {[...Array(Math.min(review.rating || 0, 5))].map((_, i) => (
                              <FiSun key={i} className="star-icon filled" />
                            ))}
                          </div>
                          <div className="recent-content">
                            {review.content?.substring(0, 50) || '-'}
                            {review.content?.length > 50 && '...'}
                          </div>
                          <div className="recent-date">
                            {new Date(review.created_at).toLocaleDateString('ko-KR')}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-data-text">{language === 'ko' ? '최근 리뷰가 없습니다.' : 'No recent reviews.'}</p>
                  )}
                </div>

                {/* 인기 장소 (조회수 기준) */}
                <div className="top-rated-card">
                  <h4>
                    <FiTrendingUp />
                    {language === 'ko' ? '인기 장소 (조회수)' : 'Popular Spots (Views)'}
                  </h4>
                  {userActivityStats.topRatedSpots.length > 0 ? (
                    <ul className="top-list">
                      {userActivityStats.topRatedSpots.map((spot, idx) => (
                        <li key={spot.content_id} className="top-item">
                          <span className="top-rank">#{idx + 1}</span>
                          <span className="top-title">{spot.title}</span>
                          <span className="top-rating">
                            <FiEye /> {spot.view_count || 0} <FiHeart /> {spot.like_count || 0}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-data-text">{language === 'ko' ? '데이터가 없습니다.' : 'No data.'}</p>
                  )}
                </div>
              </div>

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
                    <button onClick={() => { loadStats(); }} className="quick-link">
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
                      disabled={tripImageUploading}
                    />
                  </div>
                  <div className="form-group">
                    <label>{language === 'ko' ? '썸네일 이미지' : 'Thumbnail Image'}</label>
                    
                    {/* 이미지 미리보기 */}
                    {tripThumbnailPreview && (
                      <div className="trip-thumbnail-preview">
                        <img src={tripThumbnailPreview} alt="Thumbnail preview" />
                        <button 
                          type="button" 
                          className="remove-thumbnail-btn" 
                          onClick={handleRemoveTripThumbnail}
                          disabled={tripImageUploading}
                        >
                          <FiX />
                        </button>
                      </div>
                    )}
                    
                    {/* 이미지 업로드 영역 */}
                    {!tripThumbnailPreview && (
                      <div className="thumbnail-upload-area">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleTripThumbnailChange}
                          id="trip-thumbnail-file-input"
                          style={{ display: 'none' }}
                          disabled={tripImageUploading}
                        />
                        <label htmlFor="trip-thumbnail-file-input" className="thumbnail-upload-label">
                          <FiImage />
                          <span>{language === 'ko' ? '이미지 선택' : 'Select Image'}</span>
                          <small>{language === 'ko' ? '(JPG, PNG, GIF, WebP / 최대 10MB)' : '(JPG, PNG, GIF, WebP / Max 10MB)'}</small>
                        </label>
                      </div>
                    )}
                    
                    {/* 또는 URL 직접 입력 */}
                    {!tripThumbnailFile && (
                      <>
                        <div className="thumbnail-divider">
                          <span>{language === 'ko' ? '또는 URL 직접 입력' : 'Or enter URL directly'}</span>
                        </div>
                        <input
                          type="text"
                          value={tripForm.thumbnailUrl}
                          onChange={(e) => {
                            setTripForm({...tripForm, thumbnailUrl: e.target.value})
                            if (e.target.value) setTripThumbnailPreview(e.target.value)
                          }}
                          placeholder="https://..."
                          disabled={tripImageUploading}
                        />
                      </>
                    )}
                  </div>
                  <div className="form-actions">
                    <button className="btn-save" onClick={handleSaveTripEdit} disabled={tripImageUploading}>
                      {tripImageUploading ? (
                        <><FiLoader className="spinning" /> {language === 'ko' ? '업로드 중...' : 'Uploading...'}</>
                      ) : (
                        <><FiSave /> {language === 'ko' ? '저장' : 'Save'}</>
                      )}
                    </button>
                    <button className="btn-cancel" onClick={() => {
                      setEditingTrip(null)
                      setTripThumbnailFile(null)
                      setTripThumbnailPreview(null)
                    }} disabled={tripImageUploading}>
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
          
          {/* 공연 관리 섹션 */}
          {activeSection === 'performances' && (
            <div className="performances-management">
              {/* 통계 및 액션 버튼 */}
              <div className="performances-header">
                <div className="performance-stats">
                  <div className="stat-badge">
                    <FiDatabase />
                    <span>DB: {performanceDbCount}개</span>
                  </div>
                  <div className="stat-badge api">
                    <FiCloud />
                    <span>API: {apiPerformances.length}개 (대전 지역)</span>
                  </div>
                </div>
                
                <div className="performance-actions">
                  <button 
                    className="btn-sync"
                    onClick={handleSyncPerformances}
                    disabled={performanceSyncLoading}
                  >
                    {performanceSyncLoading ? (
                      <><FiLoader className="spinning" /> 동기화 중...</>
                    ) : (
                      <><FiDownload /> {language === 'ko' ? 'API → DB 저장' : 'Sync from API'}</>
                    )}
                  </button>
                  <button 
                    className="btn-delete-expired"
                    onClick={handleDeleteExpiredPerformances}
                    disabled={performanceDeleteLoading}
                  >
                    {performanceDeleteLoading ? (
                      <><FiLoader className="spinning" /> 삭제 중...</>
                    ) : (
                      <><FiTrash2 /> {language === 'ko' ? '만료 공연 삭제' : 'Delete Expired'}</>
                    )}
                  </button>
                </div>
              </div>
              
              {/* DB 저장된 공연 목록 */}
              <div className="performance-section">
                <h3><FiDatabase /> {language === 'ko' ? 'DB에 저장된 공연' : 'Saved Performances'}</h3>
                
                {performancesLoading ? (
                  <div className="loading-container">
                    <FiLoader className="spinning" size={32} />
                    <p>{language === 'ko' ? '로딩 중...' : 'Loading...'}</p>
                  </div>
                ) : dbPerformances.length > 0 ? (
                  <div className="performances-table-wrapper">
                    <table className="performances-table">
                      <thead>
                        <tr>
                          <th>{language === 'ko' ? '이미지' : 'Image'}</th>
                          <th>{language === 'ko' ? '공연명' : 'Title'}</th>
                          <th>{language === 'ko' ? '분류' : 'Type'}</th>
                          <th>{language === 'ko' ? '기간' : 'Period'}</th>
                          <th>{language === 'ko' ? '장소' : 'Venue'}</th>
                          <th>{language === 'ko' ? '요금' : 'Price'}</th>
                          <th>{language === 'ko' ? '상태' : 'Status'}</th>
                          <th>{language === 'ko' ? '관리' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dbPerformances.map(perf => {
                          const today = new Date().toISOString().split('T')[0]
                          const isExpired = perf.end_date && perf.end_date < today
                          return (
                            <tr key={perf.id} className={isExpired ? 'expired' : ''}>
                              <td>
                                <div className="perf-thumbnail">
                                  {perf.image_url ? (
                                    <img src={perf.image_url} alt={perf.title} />
                                  ) : (
                                    <div className="no-thumbnail"><FiImage /></div>
                                  )}
                                </div>
                              </td>
                              <td>
                                {perf.url ? (
                                  <a href={perf.url} target="_blank" rel="noopener noreferrer" className="perf-title-link">
                                    {perf.title}
                                  </a>
                                ) : (
                                  perf.title
                                )}
                              </td>
                              <td><span className="perf-type-badge">{perf.type || '-'}</span></td>
                              <td className="perf-period">
                                {perf.start_date && perf.end_date 
                                  ? `${perf.start_date} ~ ${perf.end_date}`
                                  : perf.event_period || '-'}
                              </td>
                              <td>{perf.event_site || '-'}</td>
                              <td className="perf-charge">{perf.charge || '-'}</td>
                              <td>
                                {isExpired ? (
                                  <span className="status-badge expired">만료</span>
                                ) : (
                                  <span className="status-badge active">진행중</span>
                                )}
                              </td>
                              <td>
                                <button 
                                  className="btn-delete"
                                  onClick={() => handleDeletePerformance(perf)}
                                  title={language === 'ko' ? '삭제' : 'Delete'}
                                >
                                  <FiTrash2 />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-data">
                    <FiMusic size={48} />
                    <p>{language === 'ko' ? 'DB에 저장된 공연이 없습니다.' : 'No performances in database.'}</p>
                    <p className="sub-text">{language === 'ko' ? '"API → DB 저장" 버튼을 클릭하여 공연 데이터를 가져오세요.' : 'Click "Sync from API" to import performances.'}</p>
                  </div>
                )}
              </div>
              
              {/* API에서 불러온 공연 미리보기 */}
              {apiPerformances.length > 0 && (
                <div className="performance-section api-preview">
                  <h3><FiCloud /> {language === 'ko' ? 'API에서 불러온 공연 (대전 지역, 미만료)' : 'API Performances (Daejeon, Active)'}</h3>
                  <div className="api-performances-grid">
                    {apiPerformances.slice(0, 12).map((perf, idx) => (
                      <div key={idx} className="api-perf-card">
                        {perf.imageObject && (
                          <img src={perf.imageObject} alt={perf.title} className="api-perf-img" />
                        )}
                        <div className="api-perf-info">
                          <h4>{perf.title}</h4>
                          <p className="api-perf-period">{perf.eventPeriod}</p>
                          <p className="api-perf-site">{perf.eventSite}</p>
                          {perf.charge && <p className="api-perf-charge">{perf.charge}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {apiPerformances.length > 12 && (
                    <p className="more-info">...외 {apiPerformances.length - 12}개 더 있음</p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* TourAPI 관리 섹션 */}
          {activeSection === 'tourapi' && (
            <div className="tourapi-management">
              {/* 탭 전환 */}
              <div className="tourapi-tabs">
                <button 
                  className={`tourapi-tab ${tourDbViewMode === 'sync' ? 'active' : ''}`}
                  onClick={() => setTourDbViewMode('sync')}
                >
                  <FiCloud /> {language === 'ko' ? 'API 동기화' : 'API Sync'}
                </button>
                <button 
                  className={`tourapi-tab ${tourDbViewMode === 'manage' ? 'active' : ''}`}
                  onClick={() => {
                    setTourDbViewMode('manage')
                    loadTourDbData(tourDbSelectedType, 1, '')
                  }}
                >
                  <FiDatabase /> {language === 'ko' ? 'DB 관리' : 'DB Management'}
                </button>
              </div>
              
              {tourDbViewMode === 'sync' && (
                <>
                  {/* 헤더 및 전체 동기화 버튼 */}
                  <div className="tourapi-header">
                    <div className="tourapi-info">
                      <h3><FiGlobe /> {language === 'ko' ? '한국관광공사 TourAPI 4.0' : 'Korea Tourism TourAPI 4.0'}</h3>
                      <p className="tourapi-desc">
                        {language === 'ko' 
                          ? '대전 지역 관광정보를 API에서 가져와 DB에 저장합니다.'
                          : 'Fetch Daejeon tourism data from API and save to DB.'}
                      </p>
                    </div>
                    <div className="tourapi-actions">
                      <button 
                        className="btn-refresh"
                        onClick={loadTourApiStats}
                        disabled={tourApiLoading}
                      >
                        {tourApiLoading ? (
                          <><FiLoader className="spinning" /> {language === 'ko' ? '조회 중...' : 'Loading...'}</>
                        ) : (
                          <><FiRefreshCw /> {language === 'ko' ? '새로고침' : 'Refresh'}</>
                        )}
                      </button>
                      <button 
                        className="btn-sync-all"
                        onClick={handleSyncAllTourData}
                        disabled={tourApiLoading || Object.values(tourSyncLoading).some(v => v)}
                      >
                        <FiDownload /> {language === 'ko' ? '전체 동기화' : 'Sync All'}
                      </button>
                      <button 
                        className="btn-sync-overview"
                        onClick={handleSyncOverview}
                        disabled={tourApiLoading || overviewSyncLoading || noOverviewCount === 0}
                        title={language === 'ko' ? '상세정보(overview) 동기화' : 'Sync overview details'}
                      >
                        {overviewSyncLoading ? (
                          <><FiLoader className="spinning" /> {overviewSyncProgress.current}/{overviewSyncProgress.total}</>
                        ) : (
                          <><FiActivity /> {language === 'ko' ? `상세정보 (${noOverviewCount})` : `Overview (${noOverviewCount})`}</>
                        )}
                      </button>
                      <button 
                        className="btn-sync-intro"
                        onClick={handleSyncIntroInfo}
                        disabled={tourApiLoading || introSyncLoading || noIntroCount === 0}
                        title={language === 'ko' ? '소개정보(이용시간/주차 등) 동기화' : 'Sync intro info (hours/parking)'}
                      >
                        {introSyncLoading ? (
                          <><FiLoader className="spinning" /> {introSyncProgress.current}/{introSyncProgress.total}</>
                        ) : (
                          <><FiInfo /> {language === 'ko' ? `소개정보 (${noIntroCount})` : `Intro (${noIntroCount})`}</>
                        )}
                      </button>
                      <button 
                        className="btn-sync-room"
                        onClick={handleSyncRoomInfo}
                        disabled={tourApiLoading || roomSyncLoading || noRoomCount === 0}
                        title={language === 'ko' ? '숙박시설 객실정보 동기화' : 'Sync accommodation room info'}
                      >
                        {roomSyncLoading ? (
                          <><FiLoader className="spinning" /> {roomSyncProgress.current}/{roomSyncProgress.total}</>
                        ) : (
                          <><FiHome /> {language === 'ko' ? `객실정보 (${noRoomCount})` : `Rooms (${noRoomCount})`}</>
                        )}
                      </button>
                      <button 
                        className="btn-sync-english"
                        onClick={handleSyncEnglish}
                        disabled={tourApiLoading || engSyncLoading || noEngCount === 0}
                        title={language === 'ko' ? '영문 데이터(EngService) 동기화' : 'Sync English data'}
                      >
                        {engSyncLoading ? (
                          <><FiLoader className="spinning" /> {engSyncProgress.current}/{engSyncProgress.total}</>
                        ) : (
                          <><FiGlobe /> {language === 'ko' ? `영문 (${noEngCount})` : `English (${noEngCount})`}</>
                        )}
                      </button>
                      <button 
                        className="btn-sync-ai-desc"
                        onClick={handleSyncAiDescription}
                        disabled={tourApiLoading || aiDescSyncLoading || (aiDescCountByType[aiDescSelectedType] || 0) === 0}
                        title={language === 'ko' ? `AI ${TOUR_CONTENT_TYPES[aiDescSelectedType]?.name} 설명 생성 (n8n)` : `Generate AI ${TOUR_CONTENT_TYPES[aiDescSelectedType]?.name} descriptions (n8n)`}
                      >
                        {aiDescSyncLoading ? (
                          <><FiLoader className="spinning" /> {aiDescSyncProgress.current}/{aiDescSyncProgress.total}</>
                        ) : (
                          <><FiCoffee /> {language === 'ko' ? `AI설명 (${aiDescCountByType[aiDescSelectedType] || 0})` : `AI Desc (${aiDescCountByType[aiDescSelectedType] || 0})`}</>
                        )}
                      </button>
                    </div>
                    
                    {/* AI Description 설정 */}
                    {activeSection === 'tourapi' && (
                      <div className="ai-desc-settings">
                        <h4><FiCoffee /> {language === 'ko' ? 'AI 설명 생성 설정 (n8n)' : 'AI Description Settings (n8n)'}</h4>
                        <div className="ai-desc-inputs">
                          <div className="input-group">
                            <label>{language === 'ko' ? '카테고리 선택' : 'Select Category'}</label>
                            <select 
                              value={aiDescSelectedType}
                              onChange={(e) => setAiDescSelectedType(e.target.value)}
                              className="ai-desc-select"
                            >
                              {Object.entries(TOUR_CONTENT_TYPES).map(([typeId, info]) => (
                                <option key={typeId} value={typeId}>
                                  {info.name} ({aiDescCountByType[typeId] || 0}개 필요)
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="input-group">
                            <label>{language === 'ko' ? 'n8n Webhook URL' : 'n8n Webhook URL'}</label>
                            <input 
                              type="text" 
                              value={aiDescWebhookUrls[aiDescSelectedType] || ''}
                              onChange={(e) => setAiDescWebhookUrls(prev => ({...prev, [aiDescSelectedType]: e.target.value}))}
                              placeholder="http://localhost:5678/webhook/..."
                            />
                          </div>
                          <div className="input-group">
                            <label>{language === 'ko' ? '한 번에 처리할 개수' : 'Batch Size'}</label>
                            <input 
                              type="number" 
                              value={aiDescBatchSize}
                              onChange={(e) => setAiDescBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                              min="1"
                              max="100"
                            />
                          </div>
                        </div>
                        
                        {/* AI Description 로그 */}
                        {aiDescLogs.length > 0 && (
                          <div className="ai-desc-logs">
                            <h5>{language === 'ko' ? '📋 실행 로그' : '📋 Execution Log'}</h5>
                            <div className="logs-container">
                              {aiDescLogs.map((log, idx) => (
                                <div key={idx} className={`log-entry log-${log.type}`}>
                                  <span className="log-time">[{log.timestamp}]</span>
                                  <span className="log-msg">{log.message}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* 콘텐츠 타입별 카드 */}
                  <div className="tourapi-cards">
                    {Object.entries(TOUR_CONTENT_TYPES).map(([typeId, typeInfo]) => {
                      const Icon = typeInfo.icon
                      const apiCount = tourApiCounts[typeId]?.count || 0
                      const dbCount = typeId === '15' 
                        ? tourDbCounts.festivals || 0 
                        : tourDbCounts.spots?.[typeId]?.count || 0
                      const hasEngCount = typeId === '15' ? 0 : tourDbCounts.spots?.[typeId]?.hasEngCount || 0
                      const isLoading = tourSyncLoading[typeId]
                      
                      return (
                        <div key={typeId} className="tourapi-card">
                          <div className="tourapi-card-header" style={{ borderColor: typeInfo.color }}>
                            <div className="tourapi-card-icon" style={{ backgroundColor: typeInfo.color }}>
                              <Icon />
                            </div>
                            <div className="tourapi-card-title">
                              <h4>{typeInfo.name}</h4>
                              <span className="content-type-id">contentTypeId: {typeId}</span>
                            </div>
                          </div>
                          
                          <div className="tourapi-card-stats">
                            <div className="stat-row">
                              <span className="stat-label"><FiCloud /> API</span>
                              <span className="stat-value">{apiCount.toLocaleString()}개</span>
                            </div>
                            <div className="stat-row">
                              <span className="stat-label"><FiDatabase /> DB</span>
                              <span className="stat-value">{dbCount.toLocaleString()}개</span>
                            </div>
                            {typeId !== '15' && (
                              <div className="stat-row eng">
                                <span className="stat-label"><FiGlobe /> {language === 'ko' ? '영문' : 'Eng'}</span>
                                <span className={`stat-value ${hasEngCount === dbCount ? 'complete' : hasEngCount > 0 ? 'partial' : ''}`}>
                                  {hasEngCount.toLocaleString()}/{dbCount.toLocaleString()}
                                </span>
                              </div>
                            )}
                            <div className="stat-row diff">
                              <span className="stat-label">{language === 'ko' ? '차이' : 'Diff'}</span>
                              <span className={`stat-value ${apiCount - dbCount > 0 ? 'positive' : apiCount - dbCount < 0 ? 'negative' : ''}`}>
                                {apiCount - dbCount > 0 ? '+' : ''}{(apiCount - dbCount).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="tourapi-card-actions">
                            <button 
                              className="btn-sync-type"
                              onClick={() => handleSyncTourData(typeId)}
                              disabled={isLoading}
                              style={{ backgroundColor: typeInfo.color }}
                            >
                              {isLoading ? (
                                <><FiLoader className="spinning" /> {language === 'ko' ? '동기화 중...' : 'Syncing...'}</>
                              ) : (
                                <><FiDownload /> {language === 'ko' ? 'DB 동기화' : 'Sync to DB'}</>
                              )}
                            </button>
                            {typeId !== '15' && apiCount - dbCount < 0 && (
                              <button 
                                className="btn-check-orphaned"
                                onClick={() => handleCheckOrphaned(typeId)}
                                disabled={orphanedLoading && orphanedSelectedType === typeId}
                                title={language === 'ko' ? 'API에 없는 항목 확인' : 'Check orphaned items'}
                              >
                                {orphanedLoading && orphanedSelectedType === typeId ? (
                                  <FiLoader className="spinning" />
                                ) : (
                                  <><FiSearch /> {language === 'ko' ? '차이 확인' : 'Check Diff'}</>
                                )}
                              </button>
                            )}
                            {typeId === '15' && (
                              <button 
                                className="btn-delete-expired"
                                onClick={handleDeleteExpiredTourFestivals}
                                title={language === 'ko' ? '만료된 행사 삭제' : 'Delete expired'}
                              >
                                <FiTrash2 /> {language === 'ko' ? '만료 삭제' : 'Del Expired'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* 안내 문구 */}
                  <div className="tourapi-notice">
                    <FiActivity />
                    <p>
                      {language === 'ko'
                        ? '동기화 시 기존 상세정보(overview, ai_description 등)는 보존됩니다. DB에만 있는 항목은 "차이 확인"으로 선택 삭제 가능합니다.'
                        : 'Sync preserves existing details (overview, ai_description). Orphaned items can be deleted via "Check Diff".'}
                    </p>
                  </div>
                </>
              )}
              
              {tourDbViewMode === 'manage' && (
                <div className="tourdb-manage-section">
                  {/* 타입 선택 버튼 그룹 */}
                  <div className="tourdb-type-buttons">
                    {Object.entries(TOUR_CONTENT_TYPES).map(([typeId, typeInfo]) => {
                      const TypeIcon = typeInfo.icon
                      return (
                        <button 
                          key={typeId}
                          className={`tourdb-type-btn ${tourDbSelectedType === typeId ? 'active' : ''}`}
                          onClick={() => loadTourDbData(typeId, 1, '', tourDbSortField, tourDbSortOrder, tourDbEngFilter)}
                          style={{ 
                            '--btn-color': typeInfo.color,
                            '--btn-bg': tourDbSelectedType === typeId ? typeInfo.color : 'transparent'
                          }}
                        >
                          <TypeIcon />
                          <span>{typeInfo.name}</span>
                        </button>
                      )
                    })}
                  </div>
                  
                  {/* 검색 및 필터 */}
                  <div className="tourdb-manage-header">
                    <div className="tourdb-search-wrapper">
                      <FiSearch />
                      <input 
                        type="text"
                        placeholder={language === 'ko' ? '제목 또는 주소 검색...' : 'Search title or address...'}
                        value={tourDbSearchQuery}
                        onChange={(e) => setTourDbSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && loadTourDbData(tourDbSelectedType, 1, tourDbSearchQuery, tourDbSortField, tourDbSortOrder, tourDbEngFilter)}
                      />
                    </div>
                    {tourDbSelectedType !== '15' && (
                      <select 
                        className="tourdb-eng-filter"
                        value={tourDbEngFilter}
                        onChange={(e) => loadTourDbData(tourDbSelectedType, 1, tourDbSearchQuery, tourDbSortField, tourDbSortOrder, e.target.value)}
                      >
                        <option value="all">{language === 'ko' ? '전체' : 'All'}</option>
                        <option value="hasEng">{language === 'ko' ? '영문 있음' : 'Has English'}</option>
                        <option value="noEng">{language === 'ko' ? '영문 없음' : 'No English'}</option>
                      </select>
                    )}
                    <button 
                      className="tourdb-search-btn"
                      onClick={() => loadTourDbData(tourDbSelectedType, 1, tourDbSearchQuery, tourDbSortField, tourDbSortOrder, tourDbEngFilter)}
                    >
                      <FiSearch /> {language === 'ko' ? '검색' : 'Search'}
                    </button>
                    <span className="tourdb-count">
                      {language === 'ko' ? '총' : 'Total'} {tourDbDataTotalCount.toLocaleString()}{language === 'ko' ? '개' : ''}
                    </span>
                  </div>
                  
                  {/* 데이터 테이블 */}
                  {tourDbDataLoading ? (
                    <div className="loading-container">
                      <FiLoader className="spinning" />
                      <p>{language === 'ko' ? '데이터 로딩 중...' : 'Loading data...'}</p>
                    </div>
                  ) : tourDbData.length > 0 ? (
                    <>
                      <div className="tourdb-table-container">
                        <table className="tourdb-table">
                          <thead>
                            <tr>
                              <th style={{ width: '80px' }}>{language === 'ko' ? '이미지' : 'Image'}</th>
                              <th 
                                className="sortable-th"
                                onClick={() => handleTourDbSort('title')}
                              >
                                {language === 'ko' ? '제목' : 'Title'}
                                {tourDbSortField === 'title' && (
                                  <span className="sort-icon">
                                    {tourDbSortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                                  </span>
                                )}
                              </th>
                              <th 
                                className="sortable-th"
                                onClick={() => handleTourDbSort('title_en')}
                                style={{ width: '200px' }}
                              >
                                <FiGlobe /> {language === 'ko' ? '영문 제목' : 'English Title'}
                                {tourDbSortField === 'title_en' && (
                                  <span className="sort-icon">
                                    {tourDbSortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                                  </span>
                                )}
                              </th>
                              <th 
                                className="sortable-th"
                                onClick={() => handleTourDbSort('addr1')}
                              >
                                {language === 'ko' ? '주소' : 'Address'}
                                {tourDbSortField === 'addr1' && (
                                  <span className="sort-icon">
                                    {tourDbSortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                                  </span>
                                )}
                              </th>
                              <th 
                                style={{ width: '100px' }}
                                className="sortable-th"
                                onClick={() => handleTourDbSort('updated_at')}
                              >
                                {language === 'ko' ? '수정일' : 'Updated'}
                                {tourDbSortField === 'updated_at' && (
                                  <span className="sort-icon">
                                    {tourDbSortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                                  </span>
                                )}
                              </th>
                              <th style={{ width: '100px' }}>{language === 'ko' ? '관리' : 'Actions'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tourDbData.map((item) => (
                              <tr key={item.content_id}>
                                <td>
                                  {item.firstimage ? (
                                    <img 
                                      src={item.firstimage} 
                                      alt={item.title}
                                      className="tourdb-thumb"
                                    />
                                  ) : (
                                    <div className="tourdb-no-image"><FiImage /></div>
                                  )}
                                </td>
                                <td>
                                  <span className="tourdb-title">{item.title}</span>
                                  <span className="tourdb-content-id">ID: {item.content_id}</span>
                                </td>
                                <td>
                                  {item.title_en ? (
                                    <span className="tourdb-title-en has-eng">{item.title_en}</span>
                                  ) : (
                                    <span className="tourdb-title-en no-eng">-</span>
                                  )}
                                  {item.content_id_en && (
                                    <span className="tourdb-content-id-en">EN ID: {item.content_id_en}</span>
                                  )}
                                </td>
                                <td>
                                  <span className="tourdb-addr">{item.addr1 || '-'}</span>
                                </td>
                                <td>
                                  <span className="tourdb-date">
                                    {item.updated_at ? new Date(item.updated_at).toLocaleDateString('ko-KR') : '-'}
                                  </span>
                                </td>
                                <td>
                                  <div className="tourdb-actions">
                                    <button 
                                      className="tourdb-edit-btn"
                                      onClick={() => setTourDbEditItem({
                                        content_id: item.content_id,
                                        title: item.title,
                                        addr1: item.addr1,
                                        tel: item.tel,
                                        overview: item.overview
                                      })}
                                      title={language === 'ko' ? '수정' : 'Edit'}
                                    >
                                      <FiEdit2 />
                                    </button>
                                    <button 
                                      className="tourdb-delete-btn"
                                      onClick={() => handleDeleteTourDbItem(item)}
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
                      
                      {/* 페이지네이션 */}
                      {tourDbDataTotalCount > 20 && (
                        <div className="pagination">
                          <button 
                            disabled={tourDbDataPage === 1}
                            onClick={() => loadTourDbData(tourDbSelectedType, tourDbDataPage - 1, tourDbSearchQuery, tourDbSortField, tourDbSortOrder, tourDbEngFilter)}
                          >
                            {language === 'ko' ? '이전' : 'Prev'}
                          </button>
                          <span className="page-info">
                            {tourDbDataPage} / {Math.ceil(tourDbDataTotalCount / 20)}
                          </span>
                          <button 
                            disabled={tourDbDataPage >= Math.ceil(tourDbDataTotalCount / 20)}
                            onClick={() => loadTourDbData(tourDbSelectedType, tourDbDataPage + 1, tourDbSearchQuery, tourDbSortField, tourDbSortOrder, tourDbEngFilter)}
                          >
                            {language === 'ko' ? '다음' : 'Next'}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="no-data-message">
                      <FiDatabase size={48} />
                      <p>{language === 'ko' ? '데이터가 없습니다.' : 'No data found.'}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* 편집 모달 */}
              {tourDbEditItem && (
                <div className="tourdb-edit-modal-overlay" onClick={() => setTourDbEditItem(null)}>
                  <div className="tourdb-edit-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="tourdb-edit-header">
                      <h3><FiEdit2 /> {language === 'ko' ? '항목 수정' : 'Edit Item'}</h3>
                      <button onClick={() => setTourDbEditItem(null)}><FiX /></button>
                    </div>
                    <div className="tourdb-edit-body">
                      <div className="tourdb-edit-field">
                        <label>{language === 'ko' ? '제목' : 'Title'}</label>
                        <input 
                          type="text"
                          value={tourDbEditItem.title || ''}
                          onChange={(e) => setTourDbEditItem(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div className="tourdb-edit-field">
                        <label>{language === 'ko' ? '주소' : 'Address'}</label>
                        <input 
                          type="text"
                          value={tourDbEditItem.addr1 || ''}
                          onChange={(e) => setTourDbEditItem(prev => ({ ...prev, addr1: e.target.value }))}
                        />
                      </div>
                      <div className="tourdb-edit-field">
                        <label>{language === 'ko' ? '전화번호' : 'Phone'}</label>
                        <input 
                          type="text"
                          value={tourDbEditItem.tel || ''}
                          onChange={(e) => setTourDbEditItem(prev => ({ ...prev, tel: e.target.value }))}
                        />
                      </div>
                      <div className="tourdb-edit-field">
                        <label>{language === 'ko' ? '설명 (overview)' : 'Overview'}</label>
                        <textarea 
                          rows={5}
                          value={tourDbEditItem.overview || ''}
                          onChange={(e) => setTourDbEditItem(prev => ({ ...prev, overview: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="tourdb-edit-footer">
                      <button className="btn-cancel" onClick={() => setTourDbEditItem(null)}>
                        <FiXCircle /> {language === 'ko' ? '취소' : 'Cancel'}
                      </button>
                      <button 
                        className="btn-save"
                        onClick={() => handleUpdateTourDbItem({ content_id: tourDbEditItem.content_id })}
                      >
                        <FiSave /> {language === 'ko' ? '저장' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 영문 매핑 섹션 */}
          {activeSection === 'engmapping' && (
            <div className="eng-mapping-section">
              <div className="eng-mapping-header">
                <h3><FiGlobe /> {language === 'ko' ? '영문 데이터 수동 매핑' : 'Manual English Mapping'}</h3>
                <p className="eng-mapping-desc">
                  {language === 'ko' 
                    ? '왼쪽에서 국문 항목을 선택하고, 오른쪽에서 대응되는 영문 항목을 선택한 후 매핑 버튼을 클릭하세요.'
                    : 'Select Korean item on the left, English item on the right, then click Map button.'}
                </p>
              </div>
              
              {/* 매핑 버튼 영역 (상단) */}
              <div className="eng-mapping-top-bar">
                <button 
                  className="eng-mapping-btn"
                  onClick={handleEngMapping}
                  disabled={!engMappingSelectedKor || !engMappingSelectedEng}
                >
                  <FiArrowUp className="arrow-icon" />
                  <span>{language === 'ko' ? '매핑' : 'Map'}</span>
                  <FiArrowDown className="arrow-icon" />
                </button>
                {engMappingSelectedKor && engMappingSelectedEng && (
                  <div className="mapping-preview horizontal">
                    <span className="preview-kor">{engMappingSelectedKor.title}</span>
                    <span className="preview-arrow">↔</span>
                    <span className="preview-eng">{engMappingSelectedEng.title}</span>
                  </div>
                )}
              </div>
              
              <div className="eng-mapping-container">
                {/* 국문 데이터 목록 (왼쪽) */}
                <div className="eng-mapping-panel kor-panel">
                  <div className="eng-mapping-panel-header">
                    <h4>🇰🇷 {language === 'ko' ? '국문 데이터 (영문 없음)' : 'Korean Data (No English)'}</h4>
                    <select 
                      className="eng-type-select"
                      value={korApiSelectedType}
                      onChange={(e) => {
                        setKorApiSelectedType(e.target.value)
                        loadEngMappingData(e.target.value)
                      }}
                    >
                      <option value="">{language === 'ko' ? '전체' : 'All'}</option>
                      <option value="12">관광지 (12)</option>
                      <option value="14">문화시설 (14)</option>
                      <option value="15">행사/축제 (15)</option>
                      <option value="28">레포츠 (28)</option>
                      <option value="32">숙박 (32)</option>
                      <option value="38">쇼핑 (38)</option>
                      <option value="39">음식점 (39)</option>
                    </select>
                    <span className="count-badge">{engMappingData.length}개</span>
                  </div>
                  <div className="eng-mapping-search">
                    <input
                      type="text"
                      placeholder={language === 'ko' ? '검색어 입력...' : 'Search...'}
                      value={engMappingSearchKor}
                      onChange={(e) => setEngMappingSearchKor(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadEngMappingData(korApiSelectedType)}
                    />
                    <button onClick={() => loadEngMappingData(korApiSelectedType)} disabled={engMappingLoading}>
                      {engMappingLoading ? <FiLoader className="spinning" /> : <FiSearch />}
                    </button>
                  </div>
                  <div className="eng-mapping-list">
                    {[...engMappingData]
                      .sort((a, b) => Number(a.content_id) - Number(b.content_id))
                      .map(item => (
                      <div 
                        key={item.id}
                        className={`eng-mapping-item ${engMappingSelectedKor?.id === item.id ? 'selected' : ''}`}
                        onClick={() => {
                          setEngMappingSelectedKor(item)
                          // 해당 타입에 맞는 영문 API 자동 로드
                          const engType = CONTENT_TYPE_KOR_TO_ENG[item.content_type_id] || '76'
                          if (engType !== engApiSelectedType) {
                            setEngApiSelectedType(engType)
                            loadEngApiData(engType)
                          }
                        }}
                      >
                        <div className="eng-mapping-item-image">
                          {item.firstimage ? (
                            <img src={item.firstimage} alt="" />
                          ) : (
                            <div className="no-image"><FiImage /></div>
                          )}
                        </div>
                        <div className="eng-mapping-item-info">
                          <span className="item-title">{item.title}</span>
                          <span className="item-addr">{item.addr1 || '-'}</span>
                          <span className="item-meta">
                            <span className="type-badge">{TOUR_CONTENT_TYPES[item.content_type_id]?.name || item.content_type_id}</span>
                            <span className="zip-code">📮 {item.zipcode || '-'}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                    {engMappingData.length === 0 && !engMappingLoading && (
                      <div className="eng-mapping-empty">
                        {language === 'ko' ? '영문 데이터가 없는 항목이 없습니다.' : 'No items without English data.'}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 영문 데이터 목록 (오른쪽) */}
                <div className="eng-mapping-panel eng-panel">
                  <div className="eng-mapping-panel-header">
                    <h4>🇺🇸 {language === 'ko' ? '영문 API 데이터' : 'English API Data'}</h4>
                    <select 
                      className="eng-type-select"
                      value={engApiSelectedType}
                      onChange={(e) => {
                        setEngApiSelectedType(e.target.value)
                        loadEngApiData(e.target.value)
                      }}
                    >
                      <option value="76">Tourist Destination (관광지)</option>
                      <option value="78">Cultural Facility (문화시설)</option>
                      <option value="85">Festival/Event (행사/축제)</option>
                      <option value="75">Leisure (레포츠)</option>
                      <option value="80">Accommodation (숙박)</option>
                      <option value="79">Shopping (쇼핑)</option>
                      <option value="82">Restaurant (음식점)</option>
                    </select>
                  </div>
                  <div className="eng-mapping-search">
                    <input
                      type="text"
                      placeholder={language === 'ko' ? '영문 검색...' : 'Search English...'}
                      value={engMappingSearchEng}
                      onChange={(e) => setEngMappingSearchEng(e.target.value)}
                    />
                    <button onClick={() => loadEngApiData(engApiSelectedType)} disabled={engApiLoading}>
                      {engApiLoading ? <FiLoader className="spinning" /> : <FiRefreshCw />}
                    </button>
                  </div>
                  <div className="eng-mapping-list">
                    {[...engApiData]
                      .sort((a, b) => Number(a.contentid) - Number(b.contentid))
                      .filter(item => !engMappingSearchEng || 
                        item.title?.toLowerCase().includes(engMappingSearchEng.toLowerCase()) ||
                        item.addr1?.toLowerCase().includes(engMappingSearchEng.toLowerCase())
                      )
                      .map(item => (
                      <div 
                        key={item.contentid}
                        className={`eng-mapping-item ${engMappingSelectedEng?.contentid === item.contentid ? 'selected' : ''}`}
                        onClick={() => setEngMappingSelectedEng(item)}
                      >
                        <div className="eng-mapping-item-image">
                          {item.firstimage ? (
                            <img src={item.firstimage} alt="" />
                          ) : (
                            <div className="no-image"><FiImage /></div>
                          )}
                        </div>
                        <div className="eng-mapping-item-info">
                          <span className="item-title">{item.title}</span>
                          <span className="item-addr">{item.addr1 || '-'}</span>
                          <span className="item-meta">
                            <span className="zip-code">📮 {item.zipcode || '-'}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                    {engApiData.length === 0 && !engApiLoading && (
                      <div className="eng-mapping-empty">
                        {language === 'ko' ? '영문 타입을 선택하고 새로고침하세요.' : 'Select type and refresh.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
              
              {/* API에 없는 항목(orphaned) 모달 */}
              {orphanedModalOpen && (
                <div className="modal-overlay" onClick={() => setOrphanedModalOpen(false)}>
                  <div className="modal-content orphaned-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>
                        {language === 'ko' 
                          ? `API에 없는 항목 (${TOUR_CONTENT_TYPES[orphanedSelectedType]?.name || ''})` 
                          : `Orphaned Items (${TOUR_CONTENT_TYPES[orphanedSelectedType]?.name || ''})`}
                      </h3>
                      <button className="modal-close" onClick={() => setOrphanedModalOpen(false)}>×</button>
                    </div>
                    <div className="modal-body">
                      {orphanedItems.length === 0 ? (
                        <p className="no-items">{language === 'ko' ? 'API에 없는 항목이 없습니다.' : 'No orphaned items.'}</p>
                      ) : (
                        <>
                          <div className="orphaned-toolbar">
                            <label className="select-all">
                              <input 
                                type="checkbox" 
                                checked={orphanedSelectedIds.size === orphanedItems.length}
                                onChange={handleToggleAllOrphaned}
                              />
                              {language === 'ko' ? '전체 선택' : 'Select All'} ({orphanedSelectedIds.size}/{orphanedItems.length})
                            </label>
                            <button 
                              className="btn-delete-selected"
                              onClick={handleDeleteOrphaned}
                              disabled={orphanedSelectedIds.size === 0}
                            >
                              <FiTrash2 /> {language === 'ko' ? '선택 삭제' : 'Delete Selected'}
                            </button>
                          </div>
                          <div className="orphaned-list">
                            {orphanedItems.map(item => (
                              <div key={item.id} className={`orphaned-item ${orphanedSelectedIds.has(item.id) ? 'selected' : ''}`}>
                                <label>
                                  <input 
                                    type="checkbox"
                                    checked={orphanedSelectedIds.has(item.id)}
                                    onChange={() => handleToggleOrphanedSelect(item.id)}
                                  />
                                  <span className="item-title">{item.title}</span>
                                  <span className="item-id">({item.content_id})</span>
                                </label>
                                <div className="item-info">
                                  {item.ai_description && <span className="badge ai">AI설명</span>}
                                  {item.overview && <span className="badge overview">Overview</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="orphaned-notice">
                            {language === 'ko' 
                              ? '⚠️ 삭제 시 해당 항목의 모든 데이터(AI설명, Overview 등)가 함께 삭제됩니다.' 
                              : '⚠️ Deleting will remove all data including AI description and overview.'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
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
                  {[
                    { name: 'profiles', label: '프로필', Icon: FiUsers },
                    { name: 'spot_reviews', label: '리뷰', Icon: FiEdit2 },
                    { name: 'spot_likes', label: '좋아요', Icon: FiHeart },
                    { name: 'spot_stats', label: '통계', Icon: FiBarChart2 },
                    { name: 'page_visits', label: '방문기록', Icon: FiEye },
                    { name: 'hero_slides', label: '히어로', Icon: FiImage },
                    { name: 'admin_users', label: '관리자', Icon: FiSettings }
                  ].map(table => (
                    <button
                      key={table.name}
                      className={`table-btn ${selectedTable === table.name ? 'active' : ''}`}
                      onClick={() => loadTableData(table.name)}
                      title={table.label}
                    >
                      <table.Icon className="table-icon-svg" />
                      {table.name}
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
          
          {/* 리뷰 관리 섹션 */}
          {activeSection === 'reviews' && (
            <div className="reviews-management-section">
              <div className="section-header">
                <h2>
                  <FiEdit2 /> {language === 'ko' ? '리뷰 관리' : 'Review Management'}
                  <span className="count-badge">{reviewsTotalCount.toLocaleString()}</span>
                </h2>
                <div className="section-actions">
                  <select 
                    value={reviewsFilter} 
                    onChange={(e) => loadAllReviews(1, e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">{language === 'ko' ? '전체' : 'All'}</option>
                    <option value="recent">{language === 'ko' ? '최근 7일' : 'Recent 7 days'}</option>
                    <option value="low-rating">{language === 'ko' ? '낮은 평점 (1-2점)' : 'Low Rating (1-2)'}</option>
                  </select>
                  <button className="refresh-btn" onClick={() => loadAllReviews(reviewsPage, reviewsFilter)}>
                    <FiRefreshCw /> {language === 'ko' ? '새로고침' : 'Refresh'}
                  </button>
                </div>
              </div>
              
              {reviewsLoading ? (
                <div className="loading-container">
                  <FiLoader className="spinning" />
                  <p>{language === 'ko' ? '리뷰 로딩 중...' : 'Loading reviews...'}</p>
                </div>
              ) : allReviews.length > 0 ? (
                <>
                  <div className="reviews-list">
                    {allReviews.map((review) => (
                      <div key={review.id} className="review-item-card">
                        <div className="review-header">
                          <div className="review-user">
                            {review.profiles?.avatar_url ? (
                              <img src={toSecureUrl(review.profiles.avatar_url)} alt="" className="user-avatar" />
                            ) : (
                              <div className="user-avatar-placeholder"><FiUsers /></div>
                            )}
                            <span className="user-nickname">{review.profiles?.nickname || 'Unknown'}</span>
                          </div>
                          <div className="review-rating">
                            {[...Array(5)].map((_, i) => (
                              <FiSun 
                                key={i} 
                                className={`star-icon ${i < review.rating ? 'filled' : ''}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <div className="review-content">
                          <p>{review.content}</p>
                        </div>
                        <div className="review-meta">
                          <span className="review-spot">
                            ID: {review.content_id} (Type: {review.content_type})
                          </span>
                          <span className="review-date">
                            {new Date(review.created_at).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <div className="review-actions">
                          <a 
                            href={`/spot/${review.content_id}`} 
                            target="_blank" 
                            className="view-spot-btn"
                          >
                            <FiExternalLink /> {language === 'ko' ? '장소 보기' : 'View Spot'}
                          </a>
                          <button 
                            className="delete-review-btn"
                            onClick={() => handleDeleteReview(review.id)}
                            disabled={deletingReviewId === review.id}
                          >
                            {deletingReviewId === review.id ? (
                              <FiLoader className="spinning" />
                            ) : (
                              <><FiTrash2 /> {language === 'ko' ? '삭제' : 'Delete'}</>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 페이지네이션 */}
                  {reviewsTotalCount > 20 && (
                    <div className="pagination">
                      <button 
                        disabled={reviewsPage === 1}
                        onClick={() => loadAllReviews(reviewsPage - 1, reviewsFilter)}
                      >
                        {language === 'ko' ? '이전' : 'Prev'}
                      </button>
                      <span className="page-info">
                        {reviewsPage} / {Math.ceil(reviewsTotalCount / 20)}
                      </span>
                      <button 
                        disabled={reviewsPage >= Math.ceil(reviewsTotalCount / 20)}
                        onClick={() => loadAllReviews(reviewsPage + 1, reviewsFilter)}
                      >
                        {language === 'ko' ? '다음' : 'Next'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-data-message">
                  <FiEdit2 size={48} />
                  <p>{language === 'ko' ? '리뷰가 없습니다.' : 'No reviews found.'}</p>
                </div>
              )}
            </div>
          )}
          
          {/* 프로필 관리 섹션 */}
          {activeSection === 'profiles' && (
            <div className="profiles-management-section">
              <div className="section-header">
                <h2>
                  <FiUsers /> {language === 'ko' ? '프로필 관리' : 'Profile Management'}
                  <span className="count-badge">{profilesTotalCount.toLocaleString()}</span>
                </h2>
                <div className="section-actions">
                  <div className="search-input-wrapper">
                    <FiSearch />
                    <input 
                      type="text"
                      placeholder={language === 'ko' ? '닉네임 검색...' : 'Search nickname...'}
                      value={profileSearch}
                      onChange={(e) => setProfileSearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && loadAllProfiles(1, profileSearch)}
                    />
                  </div>
                  <button className="refresh-btn" onClick={() => loadAllProfiles(profilesPage, profileSearch)}>
                    <FiRefreshCw /> {language === 'ko' ? '새로고침' : 'Refresh'}
                  </button>
                </div>
              </div>
              
              {profilesLoading ? (
                <div className="loading-container">
                  <FiLoader className="spinning" />
                  <p>{language === 'ko' ? '프로필 로딩 중...' : 'Loading profiles...'}</p>
                </div>
              ) : allProfiles.length > 0 ? (
                <>
                  <div className="profiles-grid">
                    {allProfiles.map((profile) => (
                      <div key={profile.id || Math.random()} className="profile-card">
                        <div className="profile-avatar" style={{ width: '56px', height: '56px', flexShrink: 0 }}>
                          {profile.avatar_url ? (
                            <img 
                              src={toSecureUrl(profile.avatar_url)} 
                              alt={profile.nickname || 'User'} 
                              style={{ 
                                width: '56px', 
                                height: '56px', 
                                borderRadius: '50%', 
                                objectFit: 'cover',
                                display: 'block'
                              }}
                            />
                          ) : (
                            <div style={{ 
                              width: '56px', 
                              height: '56px', 
                              borderRadius: '50%', 
                              overflow: 'hidden',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                              color: '#94a3b8',
                              fontSize: '1.5rem'
                            }}>
                              <FiUsers />
                            </div>
                          )}
                        </div>
                        <div className="profile-info">
                          <h4 className="profile-nickname">{profile.nickname || 'Unknown'}</h4>
                          <p className="profile-id">ID: {profile.id ? profile.id.substring(0, 8) + '...' : '-'}</p>
                          <p className="profile-date">
                            {language === 'ko' ? '가입일: ' : 'Joined: '}
                            {profile.created_at ? new Date(profile.created_at).toLocaleDateString('ko-KR') : '-'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 페이지네이션 */}
                  {profilesTotalCount > 20 && (
                    <div className="pagination">
                      <button 
                        disabled={profilesPage === 1}
                        onClick={() => loadAllProfiles(profilesPage - 1, profileSearch)}
                      >
                        {language === 'ko' ? '이전' : 'Prev'}
                      </button>
                      <span className="page-info">
                        {profilesPage} / {Math.ceil(profilesTotalCount / 20)}
                      </span>
                      <button 
                        disabled={profilesPage >= Math.ceil(profilesTotalCount / 20)}
                        onClick={() => loadAllProfiles(profilesPage + 1, profileSearch)}
                      >
                        {language === 'ko' ? '다음' : 'Next'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-data-message">
                  <FiUsers size={48} />
                  <p>{language === 'ko' ? '프로필이 없습니다.' : 'No profiles found.'}</p>
                </div>
              )}
            </div>
          )}
          
          {/* 방문 통계 섹션 */}
          {activeSection === 'analytics' && (
            <div className="analytics-section">
              <div className="section-header">
                <h2>
                  <FiActivity /> {language === 'ko' ? '방문 통계' : 'Analytics'}
                  <span className="count-badge">{pageVisitsTotalCount.toLocaleString()}</span>
                </h2>
                <div className="section-actions">
                  <select 
                    className="period-select"
                    value={pageVisitsPeriod}
                    onChange={(e) => loadPageVisits(1, e.target.value)}
                  >
                    <option value="today">{language === 'ko' ? '오늘' : 'Today'}</option>
                    <option value="week">{language === 'ko' ? '최근 7일' : 'Last 7 days'}</option>
                    <option value="month">{language === 'ko' ? '최근 30일' : 'Last 30 days'}</option>
                    <option value="all">{language === 'ko' ? '전체' : 'All time'}</option>
                  </select>
                  <button className="refresh-btn" onClick={() => loadPageVisits(pageVisitsPage, pageVisitsPeriod)}>
                    <FiRefreshCw /> {language === 'ko' ? '새로고침' : 'Refresh'}
                  </button>
                </div>
              </div>
              
              {pageVisitsLoading ? (
                <div className="loading-container">
                  <FiLoader className="spinning" />
                  <p>{language === 'ko' ? '방문 기록 로딩 중...' : 'Loading visits...'}</p>
                </div>
              ) : (
                <>
                  {/* 페이지별 방문 통계 요약 */}
                  {Object.keys(pageVisitsSummary).length > 0 && (
                    <div className="page-stats-summary">
                      <h3>
                        <FiBarChart2 />
                        {language === 'ko' ? '페이지별 방문 수' : 'Visits by Page'}
                      </h3>
                      <div className="page-stats-grid">
                        {Object.entries(pageVisitsSummary)
                          .sort((a, b) => b[1] - a[1])
                          .map(([pageName, count]) => (
                            <div key={pageName} className="page-stat-card">
                              <span className="page-stat-name">{PAGE_NAMES[pageName] || pageName}</span>
                              <span className="page-stat-count">{count.toLocaleString()}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  {pageVisits.length > 0 ? (
                    <>
                      <div className="visits-table-container">
                        <table className="admin-table visits-table">
                          <thead>
                            <tr>
                              <th>{language === 'ko' ? '페이지' : 'Page'}</th>
                              <th>{language === 'ko' ? '방문 시간' : 'Visit Time'}</th>
                              <th>{language === 'ko' ? '이전 페이지' : 'Referrer'}</th>
                              <th>{language === 'ko' ? '세션 ID' : 'Session'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageVisits.map((visit) => (
                              <tr key={visit.id}>
                                <td>
                                  <span className="page-name">
                                    {PAGE_NAMES[visit.page_name] || visit.page_name || '-'}
                                  </span>
                                </td>
                                <td>
                                  <span className="visit-time">
                                    {new Date(visit.visited_at).toLocaleString('ko-KR')}
                                  </span>
                                </td>
                                <td>
                                  <span className="referrer" title={visit.referrer}>
                                    {visit.referrer ? (visit.referrer.length > 30 ? visit.referrer.substring(0, 30) + '...' : visit.referrer) : '-'}
                                  </span>
                                </td>
                                <td>
                                  <span className="session-id">{visit.session_id?.substring(0, 8) || '-'}...</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* 페이지네이션 */}
                      {pageVisitsTotalCount > 20 && (
                        <div className="pagination">
                          <button 
                            disabled={pageVisitsPage === 1}
                            onClick={() => loadPageVisits(pageVisitsPage - 1, pageVisitsPeriod)}
                          >
                            {language === 'ko' ? '이전' : 'Prev'}
                          </button>
                          <span className="page-info">
                            {pageVisitsPage} / {Math.ceil(pageVisitsTotalCount / 20)}
                          </span>
                          <button 
                            disabled={pageVisitsPage >= Math.ceil(pageVisitsTotalCount / 20)}
                            onClick={() => loadPageVisits(pageVisitsPage + 1, pageVisitsPeriod)}
                          >
                            {language === 'ko' ? '다음' : 'Next'}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="no-data-message">
                      <FiActivity size={48} />
                      <p>{language === 'ko' ? '방문 기록이 없습니다.' : 'No visits found.'}</p>
                    </div>
                  )}
                </>
              )}
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
                  <h3><FiUsers /> {language === 'ko' ? '내 계정 정보' : 'My Account Info'}</h3>
                  <div className="account-info-grid">
                    <div className="info-row">
                      <span className="info-label">Email</span>
                      <span className="info-value">{user.email}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">User ID</span>
                      <span className="info-value code">{user.id}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">{language === 'ko' ? '마지막 로그인' : 'Last Sign In'}</span>
                      <span className="info-value">{new Date(user.last_sign_in_at).toLocaleString('ko-KR')}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">{language === 'ko' ? '계정 생성일' : 'Account Created'}</span>
                      <span className="info-value">{user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="setting-item">
                  <h3><FiExternalLink /> {language === 'ko' ? '빠른 링크' : 'Quick Links'}</h3>
                  <div className="quick-links">
                    <a href="https://supabase.com/dashboard/project/geczvsuzwpvdxiwbxqtf" target="_blank" rel="noopener noreferrer" className="quick-link">
                      <FiDatabase /> Supabase Dashboard
                    </a>
                    <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer" className="quick-link">
                      <FiCloud /> Cloudflare Dashboard
                    </a>
                    <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="quick-link">
                      <FiServer /> Vercel Dashboard
                    </a>
                    <a href="https://api.visitkorea.or.kr/" target="_blank" rel="noopener noreferrer" className="quick-link">
                      <FiGlobe /> TourAPI Portal
                    </a>
                  </div>
                </div>

                <div className="setting-item">
                  <h3><FiBarChart2 /> {language === 'ko' ? '시스템 정보' : 'System Info'}</h3>
                  <div className="system-info-grid">
                    <div className="info-row">
                      <span className="info-label">Frontend</span>
                      <span className="info-value">React + Vite</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Database</span>
                      <span className="info-value">Supabase (PostgreSQL)</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">API Proxy</span>
                      <span className="info-value">Cloudflare Workers</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Hosting</span>
                      <span className="info-value">Vercel</span>
                    </div>
                  </div>
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
