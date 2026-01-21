import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getAllDbData } from '../services/dbService';
import { FiMapPin, FiPhone, FiNavigation, FiStar, FiSearch } from 'react-icons/fi';
import { MdHotel, MdApartment, MdHome } from 'react-icons/md';
import './AccommodationPage.css';

// 대전시 구 목록
const DISTRICTS = [
  { id: 'all', ko: '전체 지역', en: 'All Districts' },
  { id: '동구', ko: '동구', en: 'Dong-gu' },
  { id: '중구', ko: '중구', en: 'Jung-gu' },
  { id: '서구', ko: '서구', en: 'Seo-gu' },
  { id: '유성구', ko: '유성구', en: 'Yuseong-gu' },
  { id: '대덕구', ko: '대덕구', en: 'Daedeok-gu' }
];

const AccommodationPage = () => {
  const { language } = useLanguage();
  const [allRooms, setAllRooms] = useState([]); // 전체 데이터
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [dongFilter, setDongFilter] = useState('all');
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
      // DB에서 데이터 가져오기
      const dbResult = await getAllDbData('accommodation');
      
      if (dbResult.success && dbResult.items.length > 0) {
        setAllRooms(dbResult.items);
      } else {
        // DB에 데이터가 없으면 빈 배열 (관리자 페이지에서 저장 필요)
        setAllRooms([]);
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  // 주소에서 구 추출
  const getDistrictFromAddr = (addr) => {
    if (!addr) return null;
    const districts = ['동구', '중구', '서구', '유성구', '대덕구'];
    for (const district of districts) {
      if (addr.includes(district)) return district;
    }
    return null;
  };

  // 주소에서 동 추출
  const getDongFromAddr = (addr) => {
    if (!addr) return null;
    const dongMatch = addr.match(/([가-힣]+동)/);
    return dongMatch ? dongMatch[1] : null;
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
  }, [selectedType, dongFilter, searchQuery]);

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
    
    return data;
  }, [allRooms, searchQuery, selectedType, districtFilter, dongFilter]);

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

        <div className="accommodation-summary">
          {t.totalCount.replace('{count}', filteredRooms.length)}
        </div>

        {loading ? (
          <div className="loading">{t.loading}</div>
        ) : paginatedRooms.length === 0 ? (
          <div className="no-results">{t.noResults}</div>
        ) : (
          <div className="accommodation-grid">
            {paginatedRooms.map((room, index) => (
              <div key={index} className="accommodation-card">
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
                  {room.romsRefadNo && (
                    <div className="info-item">
                      <FiPhone />
                      <a href={`tel:${room.romsRefadNo}`}>{room.romsRefadNo}</a>
                    </div>
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

                <button 
                  className="navigate-btn"
                  onClick={() => handleNavigate(room)}
                >
                  <FiNavigation />
                  {t.navigate}
                </button>
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
