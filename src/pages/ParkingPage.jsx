import { useState, useEffect, useMemo } from 'react'
import { FiMapPin, FiClock, FiInfo, FiLoader, FiNavigation, FiPhone } from 'react-icons/fi'
import { FaCar, FaParking } from 'react-icons/fa'
import { useLanguage } from '../context/LanguageContext'
import { getDaejeonParking } from '../services/api'
import './ParkingPage.css'

// 대전시 구 목록
const DISTRICTS = [
  { id: 'all', ko: '전체 지역', en: 'All Districts' },
  { id: '동구', ko: '동구', en: 'Dong-gu' },
  { id: '중구', ko: '중구', en: 'Jung-gu' },
  { id: '서구', ko: '서구', en: 'Seo-gu' },
  { id: '유성구', ko: '유성구', en: 'Yuseong-gu' },
  { id: '대덕구', ko: '대덕구', en: 'Daedeok-gu' }
]

const ParkingPage = () => {
  const { language } = useLanguage()
  const [allParkingData, setAllParkingData] = useState([]) // 전체 데이터
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [dongFilter, setDongFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // 최초 1회 전체 데이터 로드
  useEffect(() => {
    fetchAllParkingData()
  }, [])

  const fetchAllParkingData = async () => {
    setLoading(true)
    setError(null)
    try {
      // 전체 데이터를 한 번에 불러옴 (1000개)
      const result = await getDaejeonParking(1, 1000)
      if (result.success) {
        setAllParkingData(result.items)
      } else {
        setError(language === 'ko' ? '데이터를 불러오는데 실패했습니다.' : 'Failed to load data.')
      }
    } catch (err) {
      setError(language === 'ko' ? '서버 연결 오류' : 'Server connection error')
    }
    setLoading(false)
  }

  // 주차장 타입 변환 (divideNum: 6=공영, 그외=민영)
  const getParkingType = (divideNum) => {
    return divideNum === '6' ? 'public' : 'private'
  }

  // 주차장 유형 변환 (typeNum: 2=노외, 그외=노상)
  const getParkingCategory = (typeNum) => {
    if (typeNum === '2') return language === 'ko' ? '노외주차장' : 'Off-street'
    if (typeNum === '1') return language === 'ko' ? '노상주차장' : 'On-street'
    return ''
  }

  // 주소에서 구 추출
  const getDistrictFromAddr = (addr) => {
    if (!addr) return null
    const districts = ['동구', '중구', '서구', '유성구', '대덕구']
    for (const district of districts) {
      if (addr.includes(district)) return district
    }
    return null
  }

  // 주소에서 동 추출
  const getDongFromAddr = (addr) => {
    if (!addr) return null
    // "대전광역시 서구 둔산동 123" 같은 형식에서 동 추출
    const dongMatch = addr.match(/([가-힣]+동)/)
    return dongMatch ? dongMatch[1] : null
  }

  // 선택된 구에 해당하는 동 목록 추출 (중복 제거)
  const availableDongs = useMemo(() => {
    if (districtFilter === 'all') return []
    
    const dongs = new Set()
    allParkingData.forEach(item => {
      const district = getDistrictFromAddr(item.addr)
      if (district === districtFilter) {
        const dong = getDongFromAddr(item.addr)
        if (dong) dongs.add(dong)
      }
    })
    
    return Array.from(dongs).sort()
  }, [allParkingData, districtFilter])

  // 구 변경 시 동 필터 초기화 및 페이지 리셋
  useEffect(() => {
    setDongFilter('all')
    setCurrentPage(1)
  }, [districtFilter])

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, dongFilter])

  // 주차장 타입별 + 구별 + 동별 필터링 (전체 데이터에서)
  const filteredData = useMemo(() => {
    let data = allParkingData
    
    // 타입 필터링 (공영/민영)
    if (filter !== 'all') {
      data = data.filter(item => {
        const type = getParkingType(item.divideNum)
        return type === filter
      })
    }
    
    // 구별 필터링
    if (districtFilter !== 'all') {
      data = data.filter(item => {
        const district = getDistrictFromAddr(item.addr)
        return district === districtFilter
      })
    }
    
    // 동별 필터링
    if (dongFilter !== 'all') {
      data = data.filter(item => {
        const dong = getDongFromAddr(item.addr)
        return dong === dongFilter
      })
    }
    
    return data
  }, [allParkingData, filter, districtFilter, dongFilter])

  // 현재 페이지에 해당하는 데이터
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  // 총 페이지 수
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  return (
    <div className="parking-page">
      <div className="parking-hero">
        <div className="hero-content">
          <h1>
            <FaParking className="hero-icon" />
            {language === 'ko' ? '대전 주차장 안내' : 'Daejeon Parking Guide'}
          </h1>
          <p>
            {language === 'ko' 
              ? `대전시 내 ${allParkingData.length}개 주차장 정보를 확인하세요.`
              : `Check information for ${allParkingData.length} parking lots in Daejeon.`}
          </p>
        </div>
      </div>

      <div className="container">
        {/* 필터 버튼 */}
        <div className="filter-section">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {language === 'ko' ? '전체' : 'All'}
          </button>
          <button 
            className={`filter-btn ${filter === 'public' ? 'active' : ''}`}
            onClick={() => setFilter('public')}
          >
            {language === 'ko' ? '공영 주차장' : 'Public Parking'}
          </button>
          <button 
            className={`filter-btn ${filter === 'private' ? 'active' : ''}`}
            onClick={() => setFilter('private')}
          >
            {language === 'ko' ? '민영 주차장' : 'Private Parking'}
          </button>
          
          {/* 구별 필터 드롭다운 */}
          <select 
            className="district-select"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
          >
            {DISTRICTS.map(district => (
              <option key={district.id} value={district.id}>
                {language === 'ko' ? district.ko : district.en}
              </option>
            ))}
          </select>

          {/* 동별 필터 드롭다운 (구 선택 시에만 표시) */}
          {districtFilter !== 'all' && availableDongs.length > 0 && (
            <select 
              className="district-select dong-select"
              value={dongFilter}
              onChange={(e) => setDongFilter(e.target.value)}
            >
              <option value="all">
                {language === 'ko' ? '전체 동' : 'All Neighborhoods'}
              </option>
              {availableDongs.map(dong => (
                <option key={dong} value={dong}>
                  {dong}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 통계 정보 */}
        <div className="stats-section">
          <div className="stat-card">
            <FaCar className="stat-icon" />
            <div className="stat-info">
              <span className="stat-number">{filteredData.length}</span>
              <span className="stat-label">
                {language === 'ko' 
                  ? (districtFilter !== 'all' || dongFilter !== 'all' || filter !== 'all' 
                      ? '필터 결과' 
                      : '이 페이지 주차장')
                  : (districtFilter !== 'all' || dongFilter !== 'all' || filter !== 'all' 
                      ? 'Filtered Results' 
                      : 'Parking on this page')}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <FaParking className="stat-icon public" />
            <div className="stat-info">
              <span className="stat-number">
                {filteredData.filter(item => getParkingType(item.divideNum) === 'public').length}
              </span>
              <span className="stat-label">{language === 'ko' ? '공영 주차장' : 'Public Parking'}</span>
            </div>
          </div>
          <div className="stat-card">
            <FaParking className="stat-icon private" />
            <div className="stat-info">
              <span className="stat-number">
                {filteredData.filter(item => getParkingType(item.divideNum) === 'private').length}
              </span>
              <span className="stat-label">{language === 'ko' ? '민영 주차장' : 'Private Parking'}</span>
            </div>
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading ? (
          <div className="loading-container">
            <FiLoader className="loading-spinner" />
            <p>{language === 'ko' ? '주차장 정보를 불러오는 중...' : 'Loading parking information...'}</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={fetchAllParkingData}>
              {language === 'ko' ? '다시 시도' : 'Retry'}
            </button>
          </div>
        ) : (
          <>
            {/* 주차장 목록 */}
            <div className="parking-grid">
              {paginatedData.map((item, idx) => (
                <div key={item.parkingId || idx} className="parking-card">
                  <div className="parking-header">
                    <span className={`parking-type ${getParkingType(item.divideNum)}`}>
                      {item.parkingType || (getParkingType(item.divideNum) === 'public' 
                        ? (language === 'ko' ? '공영' : 'Public')
                        : (language === 'ko' ? '민영' : 'Private'))}
                    </span>
                    <span className="parking-category">
                      {item.parkingCategory || getParkingCategory(item.typeNum)}
                    </span>
                    {item.chargeInfo && (
                      <span className={`charge-badge ${item.chargeInfo === '무료' ? 'free' : 'paid'}`}>
                        {item.chargeInfo}
                      </span>
                    )}
                    <h3>{item.name || (language === 'ko' ? '주차장' : 'Parking Lot')}</h3>
                  </div>
                  
                  <div className="parking-body">
                    {(item.addrRoad || item.addr) && (
                      <div className="parking-info">
                        <FiMapPin className="info-icon" />
                        <span>{item.addrRoad || item.addr}</span>
                      </div>
                    )}
                    
                    {item.totalLot > 0 && (
                      <div className="parking-info">
                        <FaCar className="info-icon" />
                        <span>
                          {language === 'ko' ? '주차 면수: ' : 'Capacity: '}
                          <strong>{item.totalLot}</strong>
                          {language === 'ko' ? '면' : ' spots'}
                        </span>
                      </div>
                    )}

                    {item.weekdayOpen && (
                      <div className="parking-info">
                        <FiClock className="info-icon" />
                        <span>
                          {language === 'ko' ? '평일: ' : 'Weekday: '}
                          {item.weekdayOpen} ~ {item.weekdayClose}
                        </span>
                      </div>
                    )}

                    {(item.basicCharge || item.chargeInfo === '무료') && (
                      <div className="parking-info fee">
                        <FiInfo className="info-icon" />
                        <span>
                          {item.chargeInfo === '무료' ? (
                            <strong>{language === 'ko' ? '무료' : 'Free'}</strong>
                          ) : (
                            <>
                              {language === 'ko' ? '기본: ' : 'Basic: '}
                              <strong>{item.basicTime}분 {item.basicCharge}원</strong>
                              {item.addCharge && (
                                <> / {language === 'ko' ? '추가 ' : 'Add '}{item.addTime}분 {item.addCharge}원</>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                    )}

                    {item.payMethod && (
                      <div className="parking-info">
                        <FiInfo className="info-icon" />
                        <span>{language === 'ko' ? '결제: ' : 'Payment: '}{item.payMethod}</span>
                      </div>
                    )}
                  </div>

                  {(item.addrRoad || item.addr) && (
                    <a 
                      href={`https://map.kakao.com/link/search/${encodeURIComponent(item.addrRoad || item.addr)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="parking-nav-btn"
                    >
                      <FiNavigation />
                      {language === 'ko' ? '길찾기' : 'Navigate'}
                    </a>
                  )}
                </div>
              ))}
            </div>

            {filteredData.length === 0 && (
              <div className="no-data">
                <FaParking className="no-data-icon" />
                <p>{language === 'ko' ? '주차장 정보가 없습니다.' : 'No parking information available.'}</p>
              </div>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {language === 'ko' ? '이전' : 'Prev'}
                </button>
                <span>{currentPage} / {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {language === 'ko' ? '다음' : 'Next'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ParkingPage
