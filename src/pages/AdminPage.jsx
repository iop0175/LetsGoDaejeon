import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FiHome, FiUsers, FiMap, FiCalendar, FiShoppingBag, FiSettings, FiLogOut, 
  FiMenu, FiX, FiBarChart2, FiDatabase, FiCoffee, FiHeart, 
  FiTruck, FiRefreshCw, FiExternalLink, FiActivity, FiTrendingUp, FiCloud
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { 
  getTourSpots, getFestivals, getRestaurants, getCulturalFacilities,
  getMedicalFacilities, getShoppingPlaces, getTourRooms, getDaejeonParking
} from '../services/api'
import { getAllDbCounts } from '../services/dbService'
import { getApiStats, API_NAMES, getMostCalledApi, getMostVisitedPage, resetApiStats } from '../utils/apiStats'
import { StatCard, ApiStatsChart, DataTable, Pagination } from '../components/admin'
import './AdminPage.css'

// 페이지 관리 설정
const PAGE_CONFIGS = {
  travel: {
    title: { ko: '관광지', en: 'Travel' },
    icon: FiMap,
    color: '#0066cc',
    fetchFn: getTourSpots,
    fields: ['tourspotNm', 'tourspotAddr', 'tourspotSumm', 'signguNm', 'imageUrl'],
    labels: { tourspotNm: '관광지명', tourspotAddr: '주소', tourspotSumm: '설명', signguNm: '구', imageUrl: '이미지' },
    tableName: 'travel_spots',
    uniqueField: 'tourspotNm'
  },
  festival: {
    title: { ko: '축제/행사', en: 'Festival' },
    icon: FiCalendar,
    color: '#9c27b0',
    fetchFn: getFestivals,
    fields: ['title', 'themeCdNm', 'placeCdNm', 'beginDt', 'endDt', 'imageUrl'],
    labels: { title: '행사명', themeCdNm: '테마', placeCdNm: '장소유형', beginDt: '시작일', endDt: '종료일', imageUrl: '이미지' },
    tableName: 'festivals',
    uniqueField: 'title'
  },
  food: {
    title: { ko: '맛집', en: 'Food' },
    icon: FiCoffee,
    color: '#ff6b35',
    fetchFn: getRestaurants,
    fields: ['restrntNm', 'restrntAddr', 'reprMenu', 'telNo', 'signguNm', 'imageUrl'],
    labels: { restrntNm: '식당명', restrntAddr: '주소', reprMenu: '대표메뉴', telNo: '전화', signguNm: '구', imageUrl: '이미지' },
    tableName: 'restaurants',
    uniqueField: 'restrntNm'
  },
  culture: {
    title: { ko: '문화시설', en: 'Culture' },
    icon: FiActivity,
    color: '#2196f3',
    fetchFn: getCulturalFacilities,
    fields: ['fcltyNm', 'locplc', 'fcltyKnd', 'operTime', 'imageUrl'],
    labels: { fcltyNm: '시설명', locplc: '주소', fcltyKnd: '종류', operTime: '운영시간', imageUrl: '이미지' },
    tableName: 'cultural_facilities',
    uniqueField: 'fcltyNm'
  },
  medical: {
    title: { ko: '의료시설', en: 'Medical' },
    icon: FiHeart,
    color: '#e91e63',
    fetchFn: getMedicalFacilities,
    fields: ['hsptlNm', 'locplc', 'hsptlKnd', 'fondSe', 'telno', 'imageUrl'],
    labels: { hsptlNm: '병원명', locplc: '주소', hsptlKnd: '종류', fondSe: '설립구분', telno: '전화', imageUrl: '이미지' },
    tableName: 'medical_facilities',
    uniqueField: 'hsptlNm'
  },
  shopping: {
    title: { ko: '쇼핑', en: 'Shopping' },
    icon: FiShoppingBag,
    color: '#4caf50',
    fetchFn: getShoppingPlaces,
    fields: ['shppgNm', 'shppgAddr', 'shppgIntro', 'telNo', 'imageUrl'],
    labels: { shppgNm: '상점명', shppgAddr: '주소', shppgIntro: '소개', telNo: '전화', imageUrl: '이미지' },
    tableName: 'shopping_places',
    uniqueField: 'shppgNm'
  },
  accommodation: {
    title: { ko: '숙박', en: 'Stay' },
    icon: FiHome,
    color: '#795548',
    fetchFn: getTourRooms,
    fields: ['romsNm', 'romsAddr', 'romsScl', 'romsRefadNo', 'imageUrl'],
    labels: { romsNm: '숙소명', romsAddr: '주소', romsScl: '유형', romsRefadNo: '전화', imageUrl: '이미지' },
    tableName: 'accommodations',
    uniqueField: 'romsNm'
  },
  parking: {
    title: { ko: '주차장', en: 'Parking' },
    icon: FiTruck,
    color: '#607d8b',
    fetchFn: getDaejeonParking,
    fields: ['name', 'addr', 'parkingType', 'totalLot', 'chargeInfo', 'imageUrl'],
    labels: { name: '주차장명', addr: '주소', parkingType: '유형', totalLot: '주차면수', chargeInfo: '요금', imageUrl: '이미지' },
    tableName: 'parking_lots',
    uniqueField: 'name'
  }
}

const AdminPage = () => {
  const { user, loading, login, logout, supabase } = useAuth()
  const { language } = useLanguage()
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
  const itemsPerPage = 20
  
  // Supabase 테이블 데이터
  const [tableData, setTableData] = useState([])
  const [tableLoading, setTableLoading] = useState(false)
  const [selectedTable, setSelectedTable] = useState('')
  
  // 저장된 아이템 추적
  const [savedItems, setSavedItems] = useState({})

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
  
  // 통계 로드
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
    
    // DB 데이터 개수 로드
    try {
      const dbCounts = await getAllDbCounts()
      setDbStats(dbCounts)
    } catch (err) {
      console.error('DB 개수 로드 실패:', err)
    }
    
    setStatsLoading(false)
  }, [parseDate])
  
  // API 호출 통계 로드
  const loadApiStats = useCallback(() => {
    const stats = getApiStats()
    setApiCallStats(stats)
    setMostCalledApi(getMostCalledApi())
    setMostVisitedPage(getMostVisitedPage())
  }, [])
  
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
  
  const loadPageData = useCallback(async (pageKey, page = 1, source = 'api') => {
    setPageLoading(true)
    setSelectedPage(pageKey)
    setCurrentPage(page)
    setDataSource(source)
    
    const config = PAGE_CONFIGS[pageKey]
    try {
      if (source === 'db') {
        // DB에서만 가져오기
        const { getDbData } = await import('../services/dbService')
        const dbResult = await getDbData(pageKey, page, itemsPerPage)
        
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
            console.error('저장된 아이템 조회 실패:', err)
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
      console.error('데이터 로드 실패:', err)
      setPageData([])
      setPageTotalCount(0)
    }
    
    setPageLoading(false)
  }, [filterPastEvents, itemsPerPage, savedItems, supabase])
  
  // 페이지 변경 핸들러
  const handlePageChange = useCallback((page) => {
    if (selectedPage && page >= 1) {
      loadPageData(selectedPage, page, dataSource)
    }
  }, [selectedPage, loadPageData, dataSource])
  
  // 데이터 소스 변경 핸들러
  const handleDataSourceChange = useCallback((source) => {
    if (selectedPage) {
      loadPageData(selectedPage, 1, source)
    }
  }, [selectedPage, loadPageData])
  
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
      console.error('저장된 아이템 로드 실패:', err)
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
          console.error('배치 저장 실패:', error)
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
      console.error('전체 저장 실패:', err)
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
      loadStats()
      loadApiStats()
    }
  }, [user, activeSection, loadStats, loadApiStats])
  
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
      <div className="admin-page">
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
      <div className="admin-page">
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
    <div className="admin-page">
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
            {activeSection === 'database' && 'Supabase'}
            {activeSection === 'settings' && (language === 'ko' ? '설정' : 'Settings')}
            {activeSection.startsWith('page-') && PAGE_CONFIGS[activeSection.replace('page-', '')]?.title[language]}
          </h1>
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
              <div className="stats-grid">
                {Object.entries(PAGE_CONFIGS).map(([key, config]) => (
                  <StatCard
                    key={key}
                    title={config.title[language]}
                    value={stats[key]}
                    dbValue={dbStats[key]}
                    icon={config.icon}
                    color={config.color}
                    loading={statsLoading}
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
                    <span className="top-label">🏆 {language === 'ko' ? '최다 호출 API' : 'Most Called API'}</span>
                    {mostCalledApi ? (
                      <span className="top-value">{mostCalledApi.name} <strong>({mostCalledApi.count}회)</strong></span>
                    ) : (
                      <span className="top-value empty">{language === 'ko' ? '데이터 없음' : 'No data'}</span>
                    )}
                  </div>
                  <div className="top-stat-card">
                    <span className="top-label">🏆 {language === 'ko' ? '최다 방문 페이지' : 'Most Visited Page'}</span>
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
              
              <div className="dashboard-info">
                <div className="info-card">
                  <h3>👋 {language === 'ko' ? '환영합니다!' : 'Welcome!'}</h3>
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
              
              <div className="page-header">
                <span className="page-count">
                  {dataSource === 'api' 
                    ? (language === 'ko' ? '미저장 API 데이터' : 'Unsaved API Data')
                    : (language === 'ko' ? '저장된 DB 데이터' : 'Saved DB Data')
                  }: <strong>{pageTotalCount.toLocaleString()}</strong> {language === 'ko' ? '개' : 'items'}
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
                onSaveItem={handleSaveItem}
                savedItems={savedItems[selectedPage] || []}
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
