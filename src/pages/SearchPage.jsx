import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { FiSearch, FiMapPin, FiCalendar, FiClock, FiLoader, FiX, FiTrendingUp } from 'react-icons/fi'
import { useLanguage } from '../context/LanguageContext'
import { recordSearchQuery, getPopularSearchQueries, getAllDbData } from '../services/dbService'
import Icons from '../components/common/Icons'
import SEO, { SEO_DATA } from '../components/common/SEO'
// CSS는 pages/_app.jsx에서 import

const SearchPage = () => {
  const { language, t } = useLanguage()
  const seoData = SEO_DATA.search[language] || SEO_DATA.search.ko
  const router = useRouter()
  const initialQuery = router.query.q || ''
  
  const [query, setQuery] = useState(initialQuery)
  const [searchTerm, setSearchTerm] = useState(initialQuery)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  
  const [tourSpots, setTourSpots] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [events, setEvents] = useState([])
  
  const [tourTotal, setTourTotal] = useState(0)
  const [restaurantTotal, setRestaurantTotal] = useState(0)
  const [eventTotal, setEventTotal] = useState(0)
  
  // 인기 검색어
  const [popularSearches, setPopularSearches] = useState([])
  
  // 인기 검색어 로드
  useEffect(() => {
    const loadPopularSearches = async () => {
      try {
        const result = await getPopularSearchQueries(8)
        if (result.success) {
          setPopularSearches(result.items)
        }
      } catch (err) {

      }
    }
    loadPopularSearches()
  }, [])
  
  // 인기 검색어 클릭
  const handlePopularSearchClick = async (searchQuery) => {
    setQuery(searchQuery)
    setSearchTerm(searchQuery)
    router.push({ pathname: '/search', query: { q: searchQuery } }, undefined, { shallow: true })
    setLoading(true)
    
    // 검색 기록 저장
    recordSearchQuery(searchQuery)
    
    try {
      const [tourResult, restaurantResult, eventResult] = await Promise.all([
        getAllDbData('travel'),
        getAllDbData('food'),
        getAllDbData('festival')
      ])
      
      const sq = searchQuery.toLowerCase()
      
      if (tourResult.success) {
        const filtered = tourResult.items.filter(item => 
          item.tourspotNm?.toLowerCase().includes(sq) ||
          item.tourspotSumm?.toLowerCase().includes(sq) ||
          item.tourspotAddr?.toLowerCase().includes(sq)
        )
        setTourSpots(filtered)
        setTourTotal(filtered.length)
      }
      
      if (restaurantResult.success) {
        const filtered = restaurantResult.items.filter(item =>
          item.restrntNm?.toLowerCase().includes(sq) ||
          item.restrntSumm?.toLowerCase().includes(sq) ||
          item.reprMenu?.toLowerCase().includes(sq) ||
          item.restrntAddr?.toLowerCase().includes(sq)
        )
        setRestaurants(filtered)
        setRestaurantTotal(filtered.length)
      }
      
      if (eventResult.success) {
        const filtered = eventResult.items.filter(item =>
          item.title?.toLowerCase().includes(sq) ||
          item.placeCdNm?.toLowerCase().includes(sq) ||
          item.themeCdNm?.toLowerCase().includes(sq)
        )
        setEvents(filtered)
        setEventTotal(filtered.length)
      }
    } catch (error) {

    }
    
    setLoading(false)
  }

  // 검색 실행
  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    
    setSearchTerm(query)
    router.push({ pathname: '/search', query: { q: query } }, undefined, { shallow: true })
    setLoading(true)
    
    // 검색 기록 저장 (DB)
    recordSearchQuery(query)
    
    try {
      // DB에서 데이터 가져오기
      const [tourResult, restaurantResult, eventResult] = await Promise.all([
        getAllDbData('travel'),
        getAllDbData('food'),
        getAllDbData('festival')
      ])
      
      const searchQuery = query.toLowerCase()
      
      // 관광지 필터링
      if (tourResult.success) {
        const filtered = tourResult.items.filter(item => 
          item.tourspotNm?.toLowerCase().includes(searchQuery) ||
          item.tourspotSumm?.toLowerCase().includes(searchQuery) ||
          item.tourspotAddr?.toLowerCase().includes(searchQuery)
        )
        setTourSpots(filtered)
        setTourTotal(filtered.length)
      }
      
      // 맛집 필터링
      if (restaurantResult.success) {
        const filtered = restaurantResult.items.filter(item =>
          item.restrntNm?.toLowerCase().includes(searchQuery) ||
          item.restrntSumm?.toLowerCase().includes(searchQuery) ||
          item.reprMenu?.toLowerCase().includes(searchQuery) ||
          item.restrntAddr?.toLowerCase().includes(searchQuery)
        )
        setRestaurants(filtered)
        setRestaurantTotal(filtered.length)
      }
      
      // 공연/행사 필터링
      if (eventResult.success) {
        const filtered = eventResult.items.filter(item =>
          item.title?.toLowerCase().includes(searchQuery) ||
          item.placeCdNm?.toLowerCase().includes(searchQuery) ||
          item.themeCdNm?.toLowerCase().includes(searchQuery)
        )
        setEvents(filtered)
        setEventTotal(filtered.length)
      }
      
    } catch (error) {

    }
    
    setLoading(false)
  }

  // 초기 검색 (URL 파라미터가 있을 때)
  useEffect(() => {
    if (initialQuery) {
      handleSearch()
    }
  }, [])

  // 지역 추출
  const extractDistrict = (address) => {
    if (!address) return ''
    const match = address.match(/대전\s*(시)?\s*(\S+구)/)
    return match ? match[2] : '대전'
  }

  // 날짜 포맷
  const formatDate = (date) => {
    if (!date) return ''
    return date.replace(/-/g, '.')
  }

  const totalResults = tourTotal + restaurantTotal + eventTotal

  const tabs = [
    { id: 'all', label: t.pages.search.all, count: totalResults },
    { id: 'tour', label: t.pages.search.attractions, count: tourTotal },
    { id: 'food', label: t.pages.search.restaurants, count: restaurantTotal },
    { id: 'event', label: t.pages.search.events, count: eventTotal }
  ]

  return (
    <>
      <SEO 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        url="/search"
      />
      <div className="search-page">
        <div className="search-hero">
          <div className="container">
            <h1>{t.pages.search.title}</h1>
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <FiSearch className="search-icon" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.pages.search.placeholder}
                autoFocus
              />
              {query && (
                <button type="button" className="clear-btn" onClick={() => setQuery('')}>
                  <FiX />
                </button>
              )}
            </div>
            <button type="submit" className="search-submit">
              {t.pages.search.searchButton}
            </button>
          </form>
          
          {/* 인기 검색어 */}
          {popularSearches.length > 0 && !searchTerm && (
            <div className="popular-keywords">
              <div className="popular-label">
                <FiTrendingUp />
                {t.pages.search.popularSearches}
              </div>
              <div className="popular-tags">
                {popularSearches.map((item, index) => (
                  <button
                    key={item.query}
                    className="popular-tag"
                    onClick={() => handlePopularSearchClick(item.query)}
                  >
                    <span className="tag-rank">{index + 1}</span>
                    <span className="tag-text">{item.query}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="container">
        {loading ? (
          <div className="loading-container">
            <FiLoader className="loading-spinner" />
            <p>{t.pages.search.searching}</p>
          </div>
        ) : searchTerm ? (
          <>
            <div className="search-summary">
              <strong>"{searchTerm}"</strong> {t.pages.search.searchResults}
              <span className="result-count">{totalResults}{t.pages.search.results}</span>
            </div>
            
            <div className="search-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  <span className="tab-count">{tab.count}</span>
                </button>
              ))}
            </div>
            
            <div className="search-results">
              {/* 관광지 결과 */}
              {(activeTab === 'all' || activeTab === 'tour') && tourSpots.length > 0 && (
                <div className="result-section">
                  {activeTab === 'all' && (
                    <h2 className="section-title">
                      {t.pages.search.attractions} 
                      <span>({tourTotal})</span>
                    </h2>
                  )}
                  <div className="result-grid">
                    {tourSpots.slice(0, activeTab === 'all' ? 4 : undefined).map((item, idx) => (
                      <div key={idx} className="result-card tour-card">
                        <div className="result-image">
                          <img 
                            src={`https://picsum.photos/seed/${encodeURIComponent(item.tourspotNm)}/400/300`}
                            alt={item.tourspotNm}
                            onError={(e) => { e.target.src = '/images/no-image.svg' }}
                          />
                          <span className="result-badge tour">{t.pages.search.attractions}</span>
                        </div>
                        <div className="result-content">
                          <h3>{item.tourspotNm}</h3>
                          <p className="result-summary">{item.tourspotSumm}</p>
                          <div className="result-meta">
                            <FiMapPin />
                            <span>{extractDistrict(item.tourspotAddr)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {activeTab === 'all' && tourTotal > 4 && (
                    <button className="see-more-btn" onClick={() => setActiveTab('tour')}>
                      {t.pages.search.seeMoreAttractions} ({tourTotal - 4}+)
                    </button>
                  )}
                </div>
              )}
              
              {/* 맛집 결과 */}
              {(activeTab === 'all' || activeTab === 'food') && restaurants.length > 0 && (
                <div className="result-section">
                  {activeTab === 'all' && (
                    <h2 className="section-title">
                      {t.pages.search.restaurants}
                      <span>({restaurantTotal})</span>
                    </h2>
                  )}
                  <div className="result-grid">
                    {restaurants.slice(0, activeTab === 'all' ? 4 : undefined).map((item, idx) => (
                      <div key={idx} className="result-card food-card">
                        <div className="result-image">
                          <img 
                            src={`https://picsum.photos/seed/${encodeURIComponent(item.restrntNm)}/400/300`}
                            alt={item.restrntNm}
                            onError={(e) => { e.target.src = '/images/no-image.svg' }}
                          />
                          <span className="result-badge food">{t.pages.search.restaurants}</span>
                        </div>
                        <div className="result-content">
                          <h3>{item.restrntNm}</h3>
                          <p className="result-summary">{item.restrntSumm}</p>
                          {item.rprsFod && <p className="result-menu"><Icons.food size={14} /> {item.rprsFod}</p>}
                          <div className="result-meta">
                            <FiMapPin />
                            <span>{extractDistrict(item.restrntAddr)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {activeTab === 'all' && restaurantTotal > 4 && (
                    <button className="see-more-btn" onClick={() => setActiveTab('food')}>
                      {t.pages.search.seeMoreRestaurants} ({restaurantTotal - 4}+)
                    </button>
                  )}
                </div>
              )}
              
              {/* 공연/행사 결과 */}
              {(activeTab === 'all' || activeTab === 'event') && events.length > 0 && (
                <div className="result-section">
                  {activeTab === 'all' && (
                    <h2 className="section-title">
                      {t.pages.search.events}
                      <span>({eventTotal})</span>
                    </h2>
                  )}
                  <div className="result-grid">
                    {events.slice(0, activeTab === 'all' ? 4 : undefined).map((item, idx) => (
                      <div key={idx} className="result-card event-card">
                        <div className="result-image">
                          <img 
                            src={`https://picsum.photos/seed/${encodeURIComponent(item.title)}/400/300`}
                            alt={item.title}
                            onError={(e) => { e.target.src = '/images/no-image.svg' }}
                          />
                          <span className="result-badge event">{item.themeCdNm || t.pages.search.events}</span>
                        </div>
                        <div className="result-content">
                          <h3>{item.title}</h3>
                          <div className="result-meta">
                            <FiCalendar />
                            <span>{formatDate(item.beginDt)}</span>
                          </div>
                          <div className="result-meta">
                            <FiMapPin />
                            <span>{item.placeCdNm} {item.placeDetail && `(${item.placeDetail})`}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {activeTab === 'all' && eventTotal > 4 && (
                    <button className="see-more-btn" onClick={() => setActiveTab('event')}>
                      {t.pages.search.seeMoreEvents} ({eventTotal - 4}+)
                    </button>
                  )}
                </div>
              )}
              
              {/* 결과 없음 */}
              {totalResults === 0 && (
                <div className="no-results">
                  <div className="no-results-icon"><Icons.search size={48} /></div>
                  <h3>{t.pages.search.noResults}</h3>
                  <p>{t.pages.search.noResultsHint}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="search-placeholder">
            <div className="placeholder-icon"><Icons.search size={48} /></div>
            <h3>{t.pages.search.enterSearchTerm}</h3>
            <p>{t.pages.search.searchDescription}</p>
            <div className="search-suggestions">
              <span>{t.pages.search.suggestions}</span>
              {['유성온천', '성심당', '엑스포', '칼국수', '대전예술의전당'].map(term => (
                <button key={term} onClick={() => { setQuery(term); }}>
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

export default SearchPage
