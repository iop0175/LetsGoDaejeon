import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getAllDbData } from '../services/dbService';
import { FiMapPin, FiPhone, FiNavigation, FiSearch } from 'react-icons/fi';
import { MdLocalHospital, MdLocalPharmacy, MdHealthAndSafety } from 'react-icons/md';
import { DISTRICTS, DISTRICT_NAMES, getDongFromAddr } from '../utils/constants';
import SEO, { SEO_DATA } from '../components/common/SEO';
// CSS는 pages/_app.jsx에서 import

const MedicalPage = () => {
  const { language } = useLanguage();
  const seoData = SEO_DATA.medical[language] || SEO_DATA.medical.ko;
  const [allFacilities, setAllFacilities] = useState([]); // 전체 데이터
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [dongFilter, setDongFilter] = useState('all');
  const itemsPerPage = 12;

  const text = {
    ko: {
      title: '의료기관',
      subtitle: '대전 지역 의료기관 정보',
      loading: '불러오는 중...',
      noResults: '검색 결과가 없습니다',
      searchPlaceholder: '병원명 또는 주소 검색',
      address: '주소',
      phone: '전화',
      navigate: '길찾기',
      all: '전체',
      hospital: '병원',
      clinic: '의원',
      pharmacy: '약국',
      totalCount: '총 {count}개의 의료기관'
    },
    en: {
      title: 'Medical Facilities',
      subtitle: 'Medical facility information in Daejeon',
      loading: 'Loading...',
      noResults: 'No results found',
      searchPlaceholder: 'Search by name or address',
      address: 'Address',
      phone: 'Phone',
      navigate: 'Navigate',
      all: 'All',
      hospital: 'Hospital',
      clinic: 'Clinic',
      pharmacy: 'Pharmacy',
      totalCount: 'Total {count} facilities'
    }
  };

  const t = text[language];

  const facilityTypes = [
    { id: 'all', label: t.all, icon: <MdHealthAndSafety /> },
    { id: '병원', label: t.hospital, icon: <MdLocalHospital /> },
    { id: '의원', label: t.clinic, icon: <MdLocalHospital /> },
    { id: '약국', label: t.pharmacy, icon: <MdLocalPharmacy /> }
  ];

  // 최초 1회 전체 데이터 로드
  useEffect(() => {
    fetchAllFacilities();
  }, []);

  const fetchAllFacilities = async () => {
    setLoading(true);
    try {
      // DB에서 데이터 가져오기
      const dbResult = await getAllDbData('medical');
      
      if (dbResult.success && dbResult.items.length > 0) {
        setAllFacilities(dbResult.items);
      } else {
        // DB에 데이터가 없으면 빈 배열 (관리자 페이지에서 저장 필요)
        setAllFacilities([]);
      }
    } catch (error) {

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
    allFacilities.forEach(item => {
      const district = getDistrictFromAddr(item.locplc);
      if (district === districtFilter) {
        const dong = getDongFromAddr(item.locplc);
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
  }, [selectedType, dongFilter, searchQuery]);

  // 검색 + 타입별 + 구별 + 동별 필터링
  const filteredFacilities = useMemo(() => {
    let data = allFacilities;
    
    // 검색 필터
    if (searchQuery) {
      data = data.filter(f => 
        f.hsptlNm?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.locplc?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // 타입 필터링
    if (selectedType !== 'all') {
      data = data.filter(f => f.hsptlKnd?.includes(selectedType));
    }
    
    // 구별 필터링
    if (districtFilter !== 'all') {
      data = data.filter(item => {
        const district = getDistrictFromAddr(item.locplc);
        return district === districtFilter;
      });
    }
    
    // 동별 필터링
    if (dongFilter !== 'all') {
      data = data.filter(item => {
        const dong = getDongFromAddr(item.locplc);
        return dong === dongFilter;
      });
    }
    
    return data;
  }, [allFacilities, searchQuery, selectedType, districtFilter, dongFilter]);

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
    if (type?.includes('약국')) return <MdLocalPharmacy />;
    return <MdLocalHospital />;
  };

  const totalPages = Math.ceil(filteredFacilities.length / itemsPerPage);

  return (
    <>
      <SEO 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        url="/medical"
      />
      <div className="medical-page">
        <div className="medical-hero">
          <div className="container">
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
        </div>

      <div className="container">
        <div className="medical-search">
          <FiSearch />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="medical-filters">
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

        <div className="medical-summary">
          {t.totalCount.replace('{count}', filteredFacilities.length)}
        </div>

        {loading ? (
          <div className="loading">{t.loading}</div>
        ) : paginatedFacilities.length === 0 ? (
          <div className="no-results">{t.noResults}</div>
        ) : (
          <div className="medical-grid">
            {paginatedFacilities.map((facility, index) => (
              <div key={index} className="medical-card">
                <div className="medical-card-header">
                  <div className="medical-icon">
                    {getIcon(facility.hsptlKnd)}
                  </div>
                  <div className="medical-title">
                    <h3>{facility.hsptlNm || '의료기관'}</h3>
                    {facility.hsptlKnd && (
                      <span className="medical-type">{facility.hsptlKnd}</span>
                    )}
                  </div>
                </div>
                
                <div className="medical-info">
                  {facility.locplc && (
                    <div className="info-item">
                      <FiMapPin />
                      <span>{facility.locplc}</span>
                    </div>
                  )}
                  {facility.telno && (
                    <div className="info-item">
                      <FiPhone />
                      <a href={`tel:${facility.telno}`}>{facility.telno}</a>
                    </div>
                  )}
                  {facility.fondSe && (
                    <div className="info-item">
                      <MdHealthAndSafety />
                      <span>{facility.fondSe}</span>
                    </div>
                  )}
                  {facility.roomSo && (
                    <div className="info-item detail">
                      <span>{language === 'ko' ? `병실: ${facility.roomSo}개` : `Rooms: ${facility.roomSo}`}</span>
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
    </>
  );
};

export default MedicalPage;
