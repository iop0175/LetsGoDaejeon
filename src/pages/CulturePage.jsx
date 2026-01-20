import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getAllDbData } from '../services/dbService';
import { FiMapPin, FiPhone, FiClock, FiNavigation } from 'react-icons/fi';
import { MdTheaters, MdMuseum, MdLocalLibrary, MdMusicNote } from 'react-icons/md';
import './CulturePage.css';

// 대전시 구 목록
const DISTRICTS = [
  { id: 'all', ko: '전체 지역', en: 'All Districts' },
  { id: '동구', ko: '동구', en: 'Dong-gu' },
  { id: '중구', ko: '중구', en: 'Jung-gu' },
  { id: '서구', ko: '서구', en: 'Seo-gu' },
  { id: '유성구', ko: '유성구', en: 'Yuseong-gu' },
  { id: '대덕구', ko: '대덕구', en: 'Daedeok-gu' }
];

const CulturePage = () => {
  const { language } = useLanguage();
  const [allFacilities, setAllFacilities] = useState([]); // 전체 데이터
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [dongFilter, setDongFilter] = useState('all');
  const itemsPerPage = 12;

  const text = {
    ko: {
      title: '문화시설',
      subtitle: '대전의 다양한 문화시설을 만나보세요',
      loading: '불러오는 중...',
      noResults: '검색 결과가 없습니다',
      address: '주소',
      phone: '전화',
      hours: '운영시간',
      navigate: '길찾기',
      all: '전체',
      museum: '박물관',
      library: '도서관',
      theater: '공연장',
      gallery: '전시관',
      totalCount: '총 {count}개의 문화시설'
    },
    en: {
      title: 'Cultural Facilities',
      subtitle: 'Explore various cultural facilities in Daejeon',
      loading: 'Loading...',
      noResults: 'No results found',
      address: 'Address',
      phone: 'Phone',
      hours: 'Hours',
      navigate: 'Navigate',
      all: 'All',
      museum: 'Museum',
      library: 'Library',
      theater: 'Theater',
      gallery: 'Gallery',
      totalCount: 'Total {count} facilities'
    }
  };

  const t = text[language];

  const facilityTypes = [
    { id: 'all', label: t.all, icon: <MdTheaters /> },
    { id: '박물관', label: t.museum, icon: <MdMuseum /> },
    { id: '도서관', label: t.library, icon: <MdLocalLibrary /> },
    { id: '공연장', label: t.theater, icon: <MdMusicNote /> },
    { id: '전시', label: t.gallery, icon: <MdTheaters /> }
  ];

  // 최초 1회 전체 데이터 로드
  useEffect(() => {
    fetchAllFacilities();
  }, []);

  const fetchAllFacilities = async () => {
    setLoading(true);
    try {
      // DB에서 데이터 가져오기
      const dbResult = await getAllDbData('culture');
      
      if (dbResult.success && dbResult.items.length > 0) {
        setAllFacilities(dbResult.items);
      } else {
        // DB에 데이터가 없으면 빈 배열 (관리자 페이지에서 저장 필요)
        setAllFacilities([]);
      }
    } catch (error) {
      console.error('문화시설 불러오기 오류:', error);
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
    allFacilities.forEach(item => {
      const addr = item.locplc || item.signgu;
      const district = getDistrictFromAddr(addr);
      if (district === districtFilter) {
        const dong = getDongFromAddr(addr);
        if (dong) dongs.add(dong);
      }
    });
    
    return Array.from(dongs).sort();
  }, [allFacilities, districtFilter]);

  // 구 변경 시 동 필터 초기화 및 페이지 리셋
  useEffect(() => {
    setDongFilter('all');
    setCurrentPage(1);
  }, [districtFilter]);

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, dongFilter]);

  // 타입별 + 구별 + 동별 필터링
  const filteredFacilities = useMemo(() => {
    let data = allFacilities;
    
    // 타입 필터링
    if (selectedType !== 'all') {
      data = data.filter(f => f.fcltyKnd?.includes(selectedType) || f.fcltyNm?.includes(selectedType));
    }
    
    // 구별 필터링
    if (districtFilter !== 'all') {
      data = data.filter(item => {
        const addr = item.locplc || item.signgu;
        const district = getDistrictFromAddr(addr);
        return district === districtFilter;
      });
    }
    
    // 동별 필터링
    if (dongFilter !== 'all') {
      data = data.filter(item => {
        const addr = item.locplc || item.signgu;
        const dong = getDongFromAddr(addr);
        return dong === dongFilter;
      });
    }
    
    return data;
  }, [allFacilities, selectedType, districtFilter, dongFilter]);

  // 현재 페이지에 해당하는 데이터
  const paginatedFacilities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFacilities.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFacilities, currentPage, itemsPerPage]);

  const handleNavigate = (facility) => {
    const address = facility.locplc;
    if (address) {
      window.open(`https://map.kakao.com/link/search/${encodeURIComponent(address)}`, '_blank');
    }
  };

  const getIcon = (type) => {
    if (type?.includes('박물관') || type?.includes('전시')) return <MdMuseum />;
    if (type?.includes('도서관')) return <MdLocalLibrary />;
    if (type?.includes('공연') || type?.includes('극장')) return <MdMusicNote />;
    return <MdTheaters />;
  };

  const totalPages = Math.ceil(filteredFacilities.length / itemsPerPage);

  return (
    <div className="culture-page">
      <div className="culture-hero">
        <div className="container">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
      </div>

      <div className="container">
        <div className="culture-filters">
          {facilityTypes.map(type => (
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

        <div className="culture-summary">
          {t.totalCount.replace('{count}', filteredFacilities.length)}
        </div>

        {loading ? (
          <div className="loading">{t.loading}</div>
        ) : paginatedFacilities.length === 0 ? (
          <div className="no-results">{t.noResults}</div>
        ) : (
          <div className="culture-grid">
            {paginatedFacilities.map((facility, index) => (
              <div key={index} className="culture-card">
                <div className="culture-card-header">
                  <div className="culture-icon">
                    {getIcon(facility.fcltyKnd)}
                  </div>
                  <div className="culture-title">
                    <h3>{facility.fcltyNm || '문화시설'}</h3>
                    {facility.fcltyKnd && (
                      <span className="facility-type">{facility.fcltyKnd}</span>
                    )}
                  </div>
                </div>
                
                <div className="facility-info">
                  {facility.locplc && (
                    <div className="info-item">
                      <FiMapPin />
                      <span>{facility.signgu} {facility.locplc}</span>
                    </div>
                  )}
                  {facility.telno && (
                    <div className="info-item">
                      <FiPhone />
                      <span>{facility.telno}</span>
                    </div>
                  )}
                  {facility.seatCo && facility.seatCo !== '-' && (
                    <div className="info-item">
                      <FiClock />
                      <span>{language === 'ko' ? '좌석수: ' : 'Seats: '}{facility.seatCo}</span>
                    </div>
                  )}
                </div>

                <button 
                  className="navigate-btn"
                  onClick={() => handleNavigate(facility)}
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

export default CulturePage;
