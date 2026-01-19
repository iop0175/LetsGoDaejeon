import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { 
  FiPlus, FiTrash2, FiEdit2, FiMapPin, FiCalendar, FiClock, 
  FiChevronDown, FiChevronUp, FiSave, FiX, FiMap, FiCoffee,
  FiStar, FiNavigation, FiUsers, FiGrid, FiList, FiShare2
} from 'react-icons/fi'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { 
  getUserTripPlans, createTripPlan, updateTripPlan, deleteTripPlan,
  addTripDay, updateTripDay, deleteTripDay,
  addTripPlace, updateTripPlace, deleteTripPlace
} from '../services/tripService'
import { getTourSpots, getRestaurants, getCulturalFacilities } from '../services/api'
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
          const travelData = await getTourSpots()
          results = travelData.filter(item => 
            item.tourspotNm?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tourspotAddr?.toLowerCase().includes(searchQuery.toLowerCase())
          ).slice(0, 10).map(item => ({
            type: 'travel',
            name: item.tourspotNm,
            address: item.tourspotAddr,
            description: item.tourspotSumm,
            image: item.imageUrl
          }))
          break
          
        case 'food':
          const foodData = await getRestaurants()
          results = foodData.filter(item =>
            item.restrntNm?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.reprMenu?.toLowerCase().includes(searchQuery.toLowerCase())
          ).slice(0, 10).map(item => ({
            type: 'food',
            name: item.restrntNm,
            address: item.restrntAddr,
            description: item.reprMenu,
            image: item.imageUrl
          }))
          break
          
        case 'culture':
          const cultureData = await getCulturalFacilities()
          results = cultureData.filter(item =>
            item.fcltyNm?.toLowerCase().includes(searchQuery.toLowerCase())
          ).slice(0, 10).map(item => ({
            type: 'culture',
            name: item.fcltyNm,
            address: item.locplc,
            description: item.fcltyKnd,
            image: item.imageUrl
          }))
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
                        {day.places?.length === 0 ? (
                          <div className="no-places">
                            <p>{language === 'ko' ? '아직 추가된 장소가 없습니다' : 'No places added yet'}</p>
                            <small>{language === 'ko' ? '위에서 장소를 검색하여 추가해보세요' : 'Search and add places above'}</small>
                          </div>
                        ) : (
                          <div className="places-list">
                            {day.places?.map((place, idx) => (
                              <div key={place.id} className="place-item">
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
                                <button 
                                  className="remove-place"
                                  onClick={() => handleDeletePlace(day.id, place.id)}
                                >
                                  <FiTrash2 />
                                </button>
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
