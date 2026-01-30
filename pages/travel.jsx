import Head from 'next/head'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { FiMapPin, FiLoader, FiCamera, FiPhone, FiExternalLink, FiNavigation, FiPlus, FiCalendar, FiCheck, FiChevronLeft, FiChevronRight, FiSearch } from 'react-icons/fi'
import { useLanguage } from '../src/context/LanguageContext'
import { useAuth } from '../src/context/AuthContext'
import { getTourSpotImage, getTourApiImages } from '../src/services/api'
import { getAllDbData, getTourSpots as getTourSpotsDb } from '../src/services/dbService'
import { getUserTripPlans, addTripPlace } from '../src/services/tripService'
import { getReliableImageUrl, cleanIntroHtml, sanitizeIntroHtml } from '../src/utils/imageUtils'
import { DISTRICTS, extractDistrict, getDongFromAddr } from '../src/utils/constants'
import { generateSlug } from '../src/utils/slugUtils'
import LicenseBadge from '../src/components/common/LicenseBadge'
import Icons from '../src/components/common/Icons'
import { supabase } from '../src/services/supabase'

// SSG용 SEO 메타데이터
const SEO = {
  ko: {
    title: '대전 관광지 | 대전으로',
    description: '대전의 인기 관광지와 명소를 소개합니다. 엑스포과학공원, 유성온천, 계족산, 대청호 등 대전 가볼만한 곳을 확인하세요.',
    keywords: '대전 관광지, 대전 명소, 대전 가볼만한곳, 엑스포과학공원, 유성온천, 계족산, 대청호, 한밭수목원, 대전 여행지'
  },
  en: {
    title: 'Daejeon Attractions | Let\'s Go Daejeon',
    description: 'Discover popular tourist attractions in Daejeon. Explore Expo Science Park, Yuseong Hot Springs, Gyejoksan Mountain, and more.',
    keywords: 'Daejeon attractions, Daejeon sightseeing, Expo Science Park, Yuseong Hot Springs, Gyejoksan, Daecheongho Lake'
  }
}

export default function TravelPage({ initialSpots, totalCount }) {
  const { language, t } = useLanguage()
  const { user } = useAuth()
  const router = useRouter()
  const seoData = SEO[language] || SEO.ko

  const [allSpots, setAllSpots] = useState(initialSpots || [])
  const [loading, setLoading] = useState(!initialSpots)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [districtFilter, setDistrictFilter] = useState('all')
  const [dongFilter, setDongFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [searchQuery, setSearchQuery] = useState('')
  const itemsPerPage = 12

  // 상세 모달 상태
  const [selectedSpot, setSelectedSpot] = useState(null)
  const [additionalImages, setAdditionalImages] = useState([])
  const [imagesLoading, setImagesLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  // 내 여행에 추가 모달 상태
  const [showAddToTripModal, setShowAddToTripModal] = useState(false)
  const [spotToAdd, setSpotToAdd] = useState(null)
  const [tripPlans, setTripPlans] = useState([])
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [selectedDayId, setSelectedDayId] = useState(null)
  const [tripsLoading, setTripsLoading] = useState(false)
  const [addingToTrip, setAddingToTrip] = useState(false)

  // 선택된 구에 해당하는 동 목록 추출 (중복 제거)
  const availableDongs = useMemo(() => {
    if (districtFilter === 'all') return []
    
    const dongs = new Set()
    allSpots.forEach(item => {
      const location = extractDistrict(item.address)
      if (location.district === districtFilter) {
        const dong = getDongFromAddr(item.address)
        if (dong) dongs.add(dong)
      }
    })
    
    return Array.from(dongs).sort()
  }, [allSpots, districtFilter])

  // 데이터가 없으면 클라이언트에서 로드
  useEffect(() => {
    if (!initialSpots || initialSpots.length === 0) {
      loadSpots()
    }
  }, [language])

  const loadSpots = async () => {
    setLoading(true)
    try {
      const result = await getTourSpotsDb(language, 1, 1000)
      if (result.success && result.items?.length > 0) {
        setAllSpots(result.items)
      } else {
        // Fallback: getAllDbData
        const dbResult = await getAllDbData('travel', 1000)
        if (dbResult.success && dbResult.items?.length > 0) {
          setAllSpots(dbResult.items)
        }
      }
    } catch (err) {
      setError(t.common.loadFailed || '데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 필터링된 관광지
  const filteredSpots = useMemo(() => {
    let result = [...allSpots]
    
    // 검색어 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(item => {
        const name = (item.name || item.title || '').toLowerCase()
        const address = (item.address || '').toLowerCase()
        return name.includes(query) || address.includes(query)
      })
    }
    
    // 구 필터링
    if (districtFilter !== 'all') {
      result = result.filter(item => {
        const location = extractDistrict(item.address)
        return location.district === districtFilter
      })
    }
    
    // 동 필터링
    if (dongFilter !== 'all' && districtFilter !== 'all') {
      result = result.filter(item => {
        const dong = getDongFromAddr(item.address)
        return dong === dongFilter
      })
    }
    
    // 정렬
    if (sortBy === 'name') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } else if (sortBy === 'views') {
      result.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    }
    
    return result
  }, [allSpots, districtFilter, dongFilter, sortBy, searchQuery])

  // 페이지네이션
  const paginatedSpots = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredSpots.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredSpots, currentPage])

  const totalPages = Math.ceil(filteredSpots.length / itemsPerPage)

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [districtFilter, dongFilter, sortBy, searchQuery])

  // 구 필터 변경 시 동 필터 리셋
  useEffect(() => {
    setDongFilter('all')
  }, [districtFilter])

  const handleSpotClick = (spot) => {
    const slug = generateSlug(spot.name || spot.title, spot.contentId || spot.id)
    router.push(`/spot/${slug}`)
  }

  return (
    <>
      <Head>
        <title>{seoData.title}</title>
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <link rel="canonical" href="https://letsgodaejeon.kr/travel" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://letsgodaejeon.kr/travel" />
        <meta property="og:title" content={seoData.title} />
        <meta property="og:description" content={seoData.description} />
        <meta property="og:image" content="https://letsgodaejeon.kr/og-image.svg" />
        <meta property="og:locale" content={language === 'ko' ? 'ko_KR' : 'en_US'} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoData.title} />
        <meta name="twitter:description" content={seoData.description} />
      </Head>

      <div className="travel-page">
        <div className="page-hero">
          <div className="page-hero-content">
            <h1>{t.pages?.travel?.title || '관광지'}</h1>
            <p>{t.pages?.travel?.subtitle || '대전의 아름다운 관광지를 만나보세요'}</p>
          </div>
        </div>
        
        <div className="container">
          {loading ? (
            <div className="loading-container">
              <FiLoader className="loading-spinner" />
              <p>{t.common?.loading || '불러오는 중...'}</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* 검색 영역 */}
              <div className="search-section">
                <div className="search-input-wrapper">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder={language === 'ko' ? '관광지 검색...' : 'Search attractions...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  {searchQuery && (
                    <button 
                      className="search-clear" 
                      onClick={() => setSearchQuery('')}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* 구 필터 버튼 */}
              <div className="location-filters">
                <div className="district-buttons">
                  <button
                    className={`district-btn ${districtFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setDistrictFilter('all')}
                  >
                    {t.common?.all || '전체'}
                  </button>
                  {DISTRICTS.map(d => (
                    <button
                      key={d.id}
                      className={`district-btn ${districtFilter === d.id ? 'active' : ''}`}
                      onClick={() => setDistrictFilter(d.id)}
                    >
                      {language === 'ko' ? d.ko : d.en}
                    </button>
                  ))}
                </div>

                {/* 동 필터 버튼 */}
                {districtFilter !== 'all' && availableDongs.length > 0 && (
                  <div className="dong-buttons">
                    <button
                      className={`dong-btn ${dongFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setDongFilter('all')}
                    >
                      {t.common?.all || '전체'}
                    </button>
                    {availableDongs.map(dong => (
                      <button
                        key={dong}
                        className={`dong-btn ${dongFilter === dong ? 'active' : ''}`}
                        onClick={() => setDongFilter(dong)}
                      >
                        {dong}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 정렬 버튼 + 개수 표시 */}
              <div className="sort-count-row">
                <div className="sort-buttons">
                  <button
                    className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
                    onClick={() => setSortBy('name')}
                  >
                    {t.common?.byName || '이름순'}
                  </button>
                  <button
                    className={`sort-btn ${sortBy === 'views' ? 'active' : ''}`}
                    onClick={() => setSortBy('views')}
                  >
                    {t.common?.byViews || '인기순'}
                  </button>
                </div>
                <div className="results-count">
                  {language === 'ko' 
                    ? `총 ${filteredSpots.length}개의 관광지`
                    : `${filteredSpots.length} attractions found`}
                </div>
              </div>

              {/* 관광지 목록 */}
              <div className="spots-grid">
                {paginatedSpots.map((spot, index) => (
                  <article 
                    key={spot.contentId || spot.id || index}
                    className="spot-card"
                    onClick={() => handleSpotClick(spot)}
                    itemScope
                    itemType="https://schema.org/TouristAttraction"
                  >
                    <div className="spot-image">
                      <img 
                        src={getReliableImageUrl(spot.imageUrl || spot.image)}
                        alt={spot.name || spot.title}
                        loading="lazy"
                        itemProp="image"
                      />
                    </div>
                    <div className="spot-content">
                      <h3 className="spot-title" itemProp="name">{spot.name || spot.title}</h3>
                      <div className="spot-info">
                        <span className="spot-location">
                          <FiMapPin />
                          {extractDistrict(spot.address)?.[language] || extractDistrict(spot.address)?.ko}
                        </span>
                      </div>
                      {spot.address && (
                        <p className="spot-address" itemProp="address">{spot.address}</p>
                      )}
                      {spot.phone && (
                        <p className="spot-phone"><FiPhone /> {spot.phone}</p>
                      )}
                      {spot.homepage && (
                        <a 
                          href={spot.homepage.match(/href="([^"]+)"/)?.[1] || spot.homepage} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="spot-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FiExternalLink /> {t.common?.visitWebsite || '홈페이지'}
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <FiChevronLeft />
                  </button>
                  <span>{currentPage} / {totalPages}</span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <FiChevronRight />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// SSG - 빌드 시 Supabase에서 데이터 가져오기
export async function getStaticProps() {
  try {
    // 서버에서 Supabase 데이터 가져오기
    const { createClient } = await import('@supabase/supabase-js')
    const serverSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data, error, count } = await serverSupabase
      .from('tour_spots')
      .select('*', { count: 'exact' })
      .eq('content_type_id', 12) // 관광지 타입
      .order('title', { ascending: true })
      .limit(500)

    if (error) throw error

    // 데이터 형식 변환 (tour_spots 테이블 컬럼에 맞춰, undefined 값은 null로 변환)
    const spots = (data || []).map(item => ({
      id: item.id || null,
      contentId: item.content_id || null,
      name: item.title || null,
      address: item.addr1 || item.addr2 || null,
      intro: item.overview || null,
      imageUrl: item.firstimage || item.firstimage2 || null,
      phone: item.tel || null,
      viewCount: item.view_count || 0,
      mapx: item.mapx || null,
      mapy: item.mapy || null
    }))

    return {
      props: {
        initialSpots: spots,
        totalCount: count || spots.length
      },
      // 1시간마다 재생성 (ISR)
      revalidate: 3600
    }
  } catch (err) {
    console.error('getStaticProps error:', err)
    return {
      props: {
        initialSpots: [],
        totalCount: 0
      },
      revalidate: 60
    }
  }
}
