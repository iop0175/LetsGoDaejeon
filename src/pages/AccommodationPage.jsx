import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getAllDbData, getTourSpots as getTourSpotsDb } from '../services/dbService';
import { FiMapPin, FiPhone, FiNavigation, FiSearch, FiCamera, FiLoader, FiClock } from 'react-icons/fi';
import { MdHotel, MdApartment, MdHome } from 'react-icons/md';
import { handleImageError, getReliableImageUrl } from '../utils/imageUtils';
import { DISTRICTS, DISTRICT_NAMES, getDongFromAddr } from '../utils/constants';
import './AccommodationPage.css';

const AccommodationPage = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [allRooms, setAllRooms] = useState([]); // 전체 데이터
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [dongFilter, setDongFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const itemsPerPage = 12;

  const text = {
    ko: {
      title: '숙박',
      subtitle: '편안한 대전의 숙소를 찾아보세요',
      loading: '불러오는 중...',
      noResults: '검색 결과가 없습니다',
      searchPlaceholder: '숙소 검색',
      address: '주소',
      phone: '전화',
      navigate: '길찾기',
      all: '전체',
      hotel: '호텔',
      motel: '모텔',
      pension: '펜션',
      guesthouse: '게스트하우스',
      totalCount: '총 {count}개의 숙소'
    },
    en: {
      title: 'Accommodation',
      subtitle: 'Find comfortable stays in Daejeon',
      loading: 'Loading...',
      noResults: 'No results found',
      searchPlaceholder: 'Search accommodations',
      address: 'Address',
      phone: 'Phone',
      navigate: 'Navigate',
      all: 'All',
      hotel: 'Hotel',
      motel: 'Motel',
      pension: 'Pension',
      guesthouse: 'Guesthouse',
      totalCount: 'Total {count} accommodations'
    }
  };

  const t = text[language];

  const accommodationTypes = [
    { id: 'all', label: t.all, icon: <MdHotel /> },
    { id: '호텔', label: t.hotel, icon: <MdHotel /> },
    { id: '모텔', label: t.motel, icon: <MdApartment /> },
    { id: '펜션', label: t.pension, icon: <MdHome /> },
    { id: '게스트하우스', label: t.guesthouse, icon: <MdHome /> }
  ];

  // 최초 1회 전체 데이터 로드
  useEffect(() => {
    fetchAllRooms();
  }, []);

  const fetchAllRooms = async () => {
    setLoading(true);
    try {
      // 먼저 tour_spots에서 숙박(32) 데이터 시도
      const tourResult = await getTourSpotsDb('32', 1, 1000);
      
      if (tourResult.success && tourResult.items.length > 0) {
        // TourAPI 데이터를 기존 형식으로 변환
        const formattedItems = tourResult.items.map(item => ({
          romsNm: item.title,
          romsAddr: item.addr1 || item.addr2,
          romsScl: '', // TourAPI에는 숙소유형이 없음
          romsRefadNo: item.tel,
          imageUrl: getReliableImageUrl(item.firstimage || item.firstimage2, '/images/no-image.svg'),
          mapx: item.mapx,
          mapy: item.mapy,
          overview: item.overview,
          intro_info: item.intro_info, // 소개정보 (체크인/아웃, 주차 등)
          _source: 'tourapi'
        }));
        setAllRooms(formattedItems);
      } else {
        // tour_spots에 데이터가 없으면 기존 accommodations 테이블 시도
        const dbResult = await getAllDbData('accommodation');
        
        if (dbResult.success && dbResult.items.length > 0) {
          setAllRooms(dbResult.items);
        } else {
          setAllRooms([]);
        }
      }
    } catch (error) {
      console.error('숙박 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 주소에서 구 추출
  const getDistrictFromAddr = (addr) => {
    if (!addr) return null;
    for (const district of DISTRICT_NAMES) {
      if (addr.includes(district)) return district;
    }
    return null;
  };

  // 선택된 구에 해당하는 동 목록 추출 (중복 제거)
  const availableDongs = useMemo(() => {
    if (districtFilter === 'all') return [];
    
    const dongs = new Set();
    allRooms.forEach(item => {
      const district = getDistrictFromAddr(item.romsAddr);
      if (district === districtFilter) {
        const dong = getDongFromAddr(item.romsAddr);
        if (dong) dongs.add(dong);
      }
    });
    
    return Array.from(dongs).sort();
  }, [allRooms, districtFilter]);

  // 구 변경 시 동 필터 초기화 및 페이지 리셋
  useEffect(() => {
    setDongFilter('all');
    setCurrentPage(1);
  }, [districtFilter]);

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, dongFilter, searchQuery, sortBy]);

  // 검색 + 타입별 + 구별 + 동별 필터링
  const filteredRooms = useMemo(() => {
    let data = allRooms;
    
    // 검색 필터
    if (searchQuery) {
      data = data.filter(r => 
        r.romsNm?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.romsAddr?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // 타입 필터링
    if (selectedType !== 'all') {
      data = data.filter(r => r.romsNm?.includes(selectedType) || r.romsSumm?.includes(selectedType));
    }
    
    // 구별 필터링
    if (districtFilter !== 'all') {
      data = data.filter(item => {
        const district = getDistrictFromAddr(item.romsAddr);
        return district === districtFilter;
      });
    }
    
    // 동별 필터링
    if (dongFilter !== 'all') {
      data = data.filter(item => {
        const dong = getDongFromAddr(item.romsAddr);
        return dong === dongFilter;
      });
    }
    
    // 정렬 적용
    if (sortBy === 'name') {
      data = [...data].sort((a, b) => (a.romsNm || '').localeCompare(b.romsNm || '', 'ko'));
    } else if (sortBy === 'views') {
      data = [...data].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    }
    
    return data;
  }, [allRooms, searchQuery, selectedType, districtFilter, dongFilter, sortBy]);

  // 현재 페이지에 해당하는 데이터
  const paginatedRooms = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRooms.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRooms, currentPage, itemsPerPage]);

  const handleNavigate = (room) => {
    const address = room.romsAddr || room.romsDtlAddr;
    if (address) {
      window.open(`https://map.kakao.com/link/search/${encodeURIComponent(address)}`, '_blank');
    }
  };

  const getIcon = (name) => {
    if (name?.includes('호텔')) return <MdHotel />;
    if (name?.includes('모텔')) return <MdApartment />;
    return <MdHome />;
  };

  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage);

  return (
    <div className="accommodation-page">
      <div className="accommodation-hero">
        <div className="container">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
      </div>

      <div className="container">
        {/* 검색창 추가 */}
        <div className="accommodation-search">
          <FiSearch />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="accommodation-filters">
          {accommodationTypes.map(type => (
            <button
              key={type.id}
              className={`filter-btn ${selectedType === type.id ? 'active' : ''}`}
              onClick={() => setSelectedType(type.id)}
            >
              {type.icon}
              <span>{type.label}</span>
            </button>
          ))}
        </div>

        {/* 구/동 필터 */}
        <div className="location-filters">
          <div className="district-buttons">
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

          {districtFilter !== 'all' && availableDongs.length > 0 && (
            <div className="dong-buttons">
              <button
                className={`dong-btn ${dongFilter === 'all' ? 'active' : ''}`}
                onClick={() => setDongFilter('all')}
              >
                {language === 'ko' ? '전체 동' : 'All Dong'}
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

        {/* 정렬 + 개수 표시 */}
        <div className="sort-count-row">
          <div className="sort-buttons">
            <button
              className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
              onClick={() => setSortBy('name')}
            >
              {language === 'ko' ? '가나다순' : 'Name'}
            </button>
            <button
              className={`sort-btn ${sortBy === 'views' ? 'active' : ''}`}
              onClick={() => setSortBy('views')}
            >
              {language === 'ko' ? '조회수순' : 'Views'}
            </button>
          </div>
          <div className="accommodation-count">
            {t.totalCount.replace('{count}', filteredRooms.length)}
          </div>
        </div>

        {loading ? (
          <div className="loading">{t.loading}</div>
        ) : paginatedRooms.length === 0 ? (
          <div className="no-results">{t.noResults}</div>
        ) : (
          <div className="accommodation-grid">
            {paginatedRooms.map((room, index) => (
              <div key={index} className="accommodation-card" onClick={() => navigate(`/spot/${room.contentId}`)} style={{ cursor: 'pointer' }}>
                <div className="accommodation-image">
                  <img 
                    src={room.imageUrl || '/images/no-image.svg'} 
                    alt={room.romsNm} 
                    loading="lazy"
                    onError={(e) => { e.target.src = '/images/no-image.svg' }}
                  />
                </div>
                <div className="accommodation-card-content">
                  <div className="accommodation-card-header">
                    <div className="accommodation-icon">
                      {getIcon(room.romsNm)}
                    </div>
                    <div className="accommodation-title">
                      <h3>{room.romsNm || '숙박시설'}</h3>
                      {room.romsScl && (
                        <span className="room-type">{room.romsScl}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="accommodation-info">
                    {room.romsAddr && (
                      <div className="info-item">
                        <FiMapPin />
                        <span>{room.romsAddr}</span>
                      </div>
                    )}
                    {room.romsDtlAddr && room.romsDtlAddr !== room.romsAddr && (
                      <div className="info-item detail">
                        <span>{room.romsDtlAddr}</span>
                      </div>
                    )}
                    
                    {/* 체크인/체크아웃: intro_info */}
                    {(room.intro_info?.checkintime || room.intro_info?.checkouttime) && (
                      <div className="info-item checkin-time">
                        <FiClock />
                        <span>
                          {room.intro_info?.checkintime && `체크인 ${room.intro_info.checkintime}`}
                          {room.intro_info?.checkintime && room.intro_info?.checkouttime && ' / '}
                          {room.intro_info?.checkouttime && `체크아웃 ${room.intro_info.checkouttime}`}
                        </span>
                      </div>
                    )}
                    
                    {/* 전화번호: intro_info.infocenterlodging 또는 기존 romsRefadNo */}
                    {(room.romsRefadNo || room.intro_info?.infocenterlodging) && (
                      <div className="info-item">
                        <FiPhone />
                        <a href={`tel:${room.romsRefadNo || room.intro_info?.infocenterlodging}`}>
                          {room.romsRefadNo || room.intro_info?.infocenterlodging}
                        </a>
                      </div>
                    )}
                    
                    {/* 주차시설: intro_info.parkinglodging */}
                    {room.intro_info?.parkinglodging && (
                      <div className="info-item parking">
                        <span>🅿️ {room.intro_info.parkinglodging}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* 예약/홈페이지 버튼 그룹 */}
                  {(room.intro_info?.reservationurl || room.romsHmpgAddr) && (
                    <div className="accommodation-action-links">
                      {/* 예약 URL: intro_info.reservationurl */}
                      {room.intro_info?.reservationurl && (
                        <a 
                          href={room.intro_info.reservationurl.match(/href="([^"]+)"/)?.[1] || room.intro_info.reservationurl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="reservation-link"
                        >
                          {language === 'ko' ? '예약하기' : 'Book Now'}
                        </a>
                      )}
                      
                      {room.romsHmpgAddr && (
                        <a 
                          href={room.romsHmpgAddr} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="homepage-link"
                        >
                          {language === 'ko' ? '홈페이지' : 'Website'}
                        </a>
                      )}
                    </div>
                  )}

                  <button 
                    className="navigate-btn"
                    onClick={() => handleNavigate(room)}
                  >
                    <FiNavigation />
                    {t.navigate}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              이전
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccommodationPage;
