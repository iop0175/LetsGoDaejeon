import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chart } from 'react-google-charts'
import { 
  FiHome, FiUsers, FiMap, FiCalendar, FiShoppingBag, FiSettings, FiLogOut, 
  FiMenu, FiX, FiBarChart2, FiDatabase, FiPieChart, FiCoffee, FiHeart, 
  FiPackage, FiTruck, FiRefreshCw, FiExternalLink, FiActivity, FiTrendingUp
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { 
  getTourSpots, getFestivals, getRestaurants, getCulturalFacilities,
  getMedicalFacilities, getShoppingPlaces, getTourRooms, getDaejeonParking
} from '../services/api'
import { getApiStats, API_NAMES, PAGE_NAMES, getMostCalledApi, getMostVisitedPage, resetApiStats } from '../utils/apiStats'
import './AdminPage.css'

// 페이지 관리 설정
const PAGE_CONFIGS = {
  travel: {
    title: { ko: '관광지', en: 'Travel' },
    icon: FiMap,
    color: '#0066cc',
    fetchFn: getTourSpots,
    fields: ['tourspotNm', 'tourspotAddr', 'tourspotSumm', 'signguNm'],
    labels: { tourspotNm: '관광지명', tourspotAddr: '주소', tourspotSumm: '설명', signguNm: '구' }
  },
  festival: {
    title: { ko: '축제/행사', en: 'Festival' },
    icon: FiCalendar,
    color: '#9c27b0',
    fetchFn: getFestivals,
    fields: ['title', 'themeCdNm', 'placeCdNm', 'beginDt', 'endDt'],
    labels: { title: '행사명', themeCdNm: '테마', placeCdNm: '장소유형', beginDt: '시작일', endDt: '종료일' }
  },
  food: {
    title: { ko: '맛집', en: 'Food' },
    icon: FiCoffee,
    color: '#ff6b35',
    fetchFn: getRestaurants,
    fields: ['restrntNm', 'restrntAddr', 'reprMenu', 'telNo', 'signguNm'],
    labels: { restrntNm: '식당명', restrntAddr: '주소', reprMenu: '대표메뉴', telNo: '전화', signguNm: '구' }
  },
  culture: {
    title: { ko: '문화시설', en: 'Culture' },
    icon: FiActivity,
    color: '#2196f3',
    fetchFn: getCulturalFacilities,
    fields: ['fcltyNm', 'locplc', 'fcltyKnd', 'operTime'],
    labels: { fcltyNm: '시설명', locplc: '주소', fcltyKnd: '종류', operTime: '운영시간' }
  },
  medical: {
    title: { ko: '의료시설', en: 'Medical' },
    icon: FiHeart,
    color: '#e91e63',
    fetchFn: getMedicalFacilities,
    fields: ['yadmNm', 'addr', 'clCdNm', 'dgsbjtCdNm', 'telno'],
    labels: { yadmNm: '병원명', addr: '주소', clCdNm: '종류', dgsbjtCdNm: '진료과', telno: '전화' }
  },
  shopping: {
    title: { ko: '쇼핑', en: 'Shopping' },
    icon: FiShoppingBag,
    color: '#4caf50',
    fetchFn: getShoppingPlaces,
    fields: ['shppgNm', 'shppgAddr', 'shppgIntro', 'telNo'],
    labels: { shppgNm: '상점명', shppgAddr: '주소', shppgIntro: '소개', telNo: '전화' }
  },
  accommodation: {
    title: { ko: '숙박', en: 'Stay' },
    icon: FiHome,
    color: '#795548',
    fetchFn: getTourRooms,
    fields: ['tourromsNm', 'tourromsAddr', 'tourromsKnd', 'telNo'],
    labels: { tourromsNm: '숙소명', tourromsAddr: '주소', tourromsKnd: '유형', telNo: '전화' }
  },
  parking: {
    title: { ko: '주차장', en: 'Parking' },
    icon: FiTruck,
    color: '#607d8b',
    fetchFn: getDaejeonParking,
    fields: ['name', 'addr', 'parkingType', 'totalLot', 'chargeInfo'],
    labels: { name: '주차장명', addr: '주소', parkingType: '유형', totalLot: '주차면수', chargeInfo: '요금' }
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
  const [stats, setStats] = useState({})
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

  // 날짜 파싱 함수 (YYYYMMDD 또는 YYYY-MM-DD -> Date)
  const parseDate = (dateStr) => {
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
  }
  
  // 통계 로드
  const loadStats = async () => {
    setStatsLoading(true)
    const newStats = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (const [key, config] of Object.entries(PAGE_CONFIGS)) {
      try {
        // 축제/행사는 진행 중인 것만 카운트
        if (key === 'festival') {
          const result = await config.fetchFn(1, 200)
          if (result.success) {
            const activeEvents = (result.items || []).filter(item => {
              const endDate = parseDate(item.endDt)
              return !endDate || endDate >= today
            })
            newStats[key] = activeEvents.length
          } else {
            newStats[key] = 0
          }
        } else {
          const result = await config.fetchFn(1, 1)
          newStats[key] = result.totalCount || 0
        }
      } catch {
        newStats[key] = 0
      }
    }
    
    setStats(newStats)
    setStatsLoading(false)
  }
  
  // API 호출 통계 로드
  const loadApiStats = () => {
    const stats = getApiStats()
    setApiCallStats(stats)
    setMostCalledApi(getMostCalledApi())
    setMostVisitedPage(getMostVisitedPage())
  }
  
  // 통계 리셋
  const handleResetStats = () => {
    if (window.confirm(language === 'ko' ? '오늘의 API 호출 통계를 초기화하시겠습니까?' : 'Reset today\'s API call statistics?')) {
      resetApiStats()
      loadApiStats()
    }
  }
  
  // 페이지 데이터 로드
  // 축제/행사 필터 (지난 행사 제외)
  const filterPastEvents = (items) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return items.filter(item => {
      const endDate = parseDate(item.endDt)
      if (!endDate) return true // 종료일이 없으면 표시
      return endDate >= today // 오늘 이후 종료 행사만 표시
    })
  }
  
  const loadPageData = async (pageKey, page = 1) => {
    setPageLoading(true)
    setSelectedPage(pageKey)
    setCurrentPage(page)
    
    const config = PAGE_CONFIGS[pageKey]
    try {
      // 축제/행사의 경우 전체 불러와서 필터링
      const fetchSize = pageKey === 'festival' ? 500 : itemsPerPage
      const result = await config.fetchFn(pageKey === 'festival' ? 1 : page, fetchSize)
      
      if (result.success) {
        let items = result.items || []
        
        // 축제/행사는 지난 것 필터링
        if (pageKey === 'festival') {
          console.log('축제/행사 원본 개수:', items.length)
          items = filterPastEvents(items)
          console.log('필터링 후 개수:', items.length)
          setPageTotalCount(items.length)
          // 클라이언트 측 페이지네이션
          const startIdx = (page - 1) * itemsPerPage
          items = items.slice(startIdx, startIdx + itemsPerPage)
        } else {
          setPageTotalCount(result.totalCount || 0)
        }
        
        setPageData(items)
      } else {
        setPageData([])
        setPageTotalCount(0)
      }
    } catch {
      setPageData([])
      setPageTotalCount(0)
    }
    
    setPageLoading(false)
  }
  
  // 페이지 변경 핸들러
  const handlePageChange = (page) => {
    if (selectedPage && page >= 1) {
      loadPageData(selectedPage, page)
    }
  }
  
  // 총 페이지 수 계산
  const totalPages = Math.ceil(pageTotalCount / itemsPerPage)
  
  // Supabase 테이블 데이터 로드
  const loadTableData = async (tableName) => {
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
  }
  
  // 대시보드 로드
  useEffect(() => {
    if (user && activeSection === 'dashboard') {
      loadStats()
      loadApiStats()
    }
  }, [user, activeSection])
  
  // API 통계 주기적 업데이트
  useEffect(() => {
    if (user && activeSection === 'dashboard') {
      const interval = setInterval(loadApiStats, 10000) // 10초마다 갱신
      return () => clearInterval(interval)
    }
  }, [user, activeSection])
  
  // 로그인 처리
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    
    try {
      await login(email, password)
    } catch {
      setLoginError(language === 'ko' ? '로그인에 실패했습니다.' : 'Login failed.')
    }
    setLoginLoading(false)
  }
  
  // 로그아웃 처리
  const handleLogout = async () => {
    await logout()
    navigate('/')
  }
  
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
                {Object.entries(PAGE_CONFIGS).map(([key, config]) => {
                  const Icon = config.icon
                  return (
                    <div 
                      key={key} 
                      className="stat-card clickable"
                      onClick={() => {
                        setActiveSection(`page-${key}`)
                        loadPageData(key)
                      }}
                    >
                      <div className="stat-icon" style={{ background: `${config.color}20`, color: config.color }}>
                        <Icon />
                      </div>
                      <div className="stat-info">
                        <span className="stat-value">
                          {statsLoading ? '...' : (stats[key] || 0).toLocaleString()}
                        </span>
                        <span className="stat-label">{config.title[language]}</span>
                      </div>
                      <FiExternalLink className="stat-link" />
                    </div>
                  )
                })}
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
                <div className="charts-grid">
                  <div className="chart-card">
                    <h4>{language === 'ko' ? 'API 호출 분포' : 'API Call Distribution'}</h4>
                    <Chart
                      chartType="PieChart"
                      data={[
                        ['API', '호출 수'],
                        ...Object.entries(API_NAMES).map(([key, name]) => [name, apiCallStats[key] || 0])
                      ]}
                      options={{
                        pieHole: 0.4,
                        colors: Object.keys(API_NAMES).map(key => PAGE_CONFIGS[key]?.color || '#ccc'),
                        legend: { position: 'right' },
                        chartArea: { width: '80%', height: '80%' },
                        backgroundColor: 'transparent'
                      }}
                      width="100%"
                      height="300px"
                    />
                  </div>
                  
                  <div className="chart-card">
                    <h4>{language === 'ko' ? 'API별 호출 횟수' : 'API Calls by Type'}</h4>
                    <Chart
                      chartType="ColumnChart"
                      data={[
                        ['API', '호출 수', { role: 'style' }],
                        ...Object.entries(API_NAMES).map(([key, name]) => [
                          name, 
                          apiCallStats[key] || 0,
                          PAGE_CONFIGS[key]?.color || '#1976d2'
                        ])
                      ]}
                      options={{
                        legend: 'none',
                        hAxis: { textStyle: { fontSize: 10 } },
                        vAxis: { title: language === 'ko' ? '호출 수' : 'Calls' },
                        chartArea: { width: '85%', height: '70%' },
                        backgroundColor: 'transparent'
                      }}
                      width="100%"
                      height="300px"
                    />
                  </div>
                </div>
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
              <div className="page-header">
                <span className="page-count">
                  {language === 'ko' ? '총' : 'Total'} <strong>{pageTotalCount.toLocaleString()}</strong> {language === 'ko' ? '개' : 'items'}
                  {pageTotalCount > 0 && (
                    <span className="page-info">
                      {' '}(페이지 {currentPage}/{totalPages})
                    </span>
                  )}
                </span>
                <a href={`/${selectedPage}`} target="_blank" className="view-page-btn">
                  <FiExternalLink /> {language === 'ko' ? '페이지 보기' : 'View'}
                </a>
              </div>
              
              {pageLoading ? (
                <div className="page-loading">
                  <div className="loading-spinner"></div>
                </div>
              ) : pageData.length > 0 ? (
                <>
                  <div className="data-table-container">
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            {PAGE_CONFIGS[selectedPage].fields.map(field => (
                              <th key={field}>{PAGE_CONFIGS[selectedPage].labels[field] || field}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pageData.map((item, idx) => (
                            <tr key={idx}>
                              <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                              {PAGE_CONFIGS[selectedPage].fields.map(field => (
                                <td key={field} title={item[field] ? String(item[field]) : ''}>
                                  {item[field] ? String(item[field]).substring(0, 60) : '-'}
                                  {item[field] && String(item[field]).length > 60 ? '...' : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <div className="admin-pagination">
                      <button 
                        className="page-btn"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                      >
                        처음
                      </button>
                      <button 
                        className="page-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        이전
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
                              onClick={() => handlePageChange(pageNum)}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>
                      
                      <button 
                        className="page-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        다음
                      </button>
                      <button 
                        className="page-btn"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        마지막
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-data">
                  <FiDatabase size={48} />
                  <p>{language === 'ko' ? '데이터 없음' : 'No data'}</p>
                </div>
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
