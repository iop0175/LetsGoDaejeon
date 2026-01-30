import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useLanguage } from '../context/LanguageContext';
import { getAllDbData, getTourSpots as getTourSpotsDb } from '../services/dbService';
import { FiMapPin, FiPhone, FiClock, FiNavigation, FiCamera, FiLoader } from 'react-icons/fi';
import { MdTheaters, MdMuseum, MdLocalLibrary, MdMusicNote } from 'react-icons/md';
import { handleImageError, getReliableImageUrl, cleanIntroHtml } from '../utils/imageUtils';
import { DISTRICTS, DISTRICT_NAMES, getDongFromAddr } from '../utils/constants';
import { generateSlug } from '../utils/slugUtils';
import Icons from '../components/common/Icons';
import SEO, { SEO_DATA } from '../components/common/SEO';
// CSS는 pages/_app.jsx에서 import

const CulturePage = () => {
  const { language } = useLanguage();
  const seoData = SEO_DATA.culture[language] || SEO_DATA.culture.ko;
  const router = useRouter();
  const [allFacilities, setAllFacilities] = useState([]); // 전체 데이터
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [dongFilter, setDongFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
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
      // 먼저 tour_spots에서 문화시설(14) 데이터 시도
      const tourResult = await getTourSpotsDb('14', 1, 1000);
      
      if (tourResult.success && tourResult.items.length > 0) {
        // TourAPI 데이터를 기존 형식으로 변환
        const formattedItems = tourResult.items.map(item => ({
          fcltyNm: item.title,
          fcltyNm_en: item.title_en, // 영어 제목
          locplc: item.addr1 || item.addr2,
          locplc_en: item.addr1_en, // 영어 주소
          fcltyKnd: '', // TourAPI에는 시설종류가 없음
          operTime: '',
          telno: item.tel,
          imageUrl: getReliableImageUrl(item.firstimage || item.firstimage2, '/images/no-image.svg'),
          mapx: item.mapx,
          mapy: item.mapy,
          contentId: item.content_id,
          overview: item.overview,
          overview_en: item.overview_en, // 영어 설명
          intro_info: item.intro_info, // 소개정보 (이용시간, 쉬는날, 이용요금 등)
          _source: 'tourapi'
        }));
        setAllFacilities(formattedItems);
      } else {
        // tour_spots에 데이터가 없으면 기존 cultural_facilities 테이블 시도
        const dbResult = await getAllDbData('culture');
        
        if (dbResult.success && dbResult.items.length > 0) {
          setAllFacilities(dbResult.items);
        } else {
          setAllFacilities([]);
        }
      }
    } catch (error) {
      console.error('문화시설 데이터 로드 실패:', error);
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
  }, [selectedType, dongFilter, sortBy]);

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
    
    // 정렬 적용
    if (sortBy === 'name') {
      data = [...data].sort((a, b) => (a.fcltyNm || '').localeCompare(b.fcltyNm || '', 'ko'));
    } else if (sortBy === 'views') {
      data = [...data].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    }
    
    return data;
  }, [allFacilities, selectedType, districtFilter, dongFilter, sortBy]);

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
    <>
      <SEO 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        url="/culture"
      />
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
          <div className="culture-count">
            {t.totalCount.replace('{count}', filteredFacilities.length)}
          </div>
        </div>

        {loading ? (
          <div className="loading">{t.loading}</div>
        ) : paginatedFacilities.length === 0 ? (
          <div className="no-results">{t.noResults}</div>
        ) : (
          <div className="culture-grid">
            {paginatedFacilities.map((facility, index) => (
              <div key={index} className="culture-card" onClick={() => router.push(`/spot/${generateSlug(facility.fcltyNm, facility.contentId)}`)} style={{ cursor: 'pointer' }}>
                <div className="culture-image">
                  <Image 
                    src={getReliableImageUrl(facility.imageUrl) || '/images/no-image.svg'} 
                    alt={language === 'en' && facility.fcltyNm_en ? facility.fcltyNm_en : facility.fcltyNm} 
                    width={350}
                    height={200}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 350px"
                    style={{ objectFit: 'cover' }}
                    loading={index < 6 ? 'eager' : 'lazy'}
                  />
                </div>
                <div className="culture-card-content">
                  <div className="culture-card-header">
                    <div className="culture-icon">
                      {getIcon(facility.fcltyKnd)}
                    </div>
                    <div className="culture-title">
                      <h3>{language === 'en' && facility.fcltyNm_en ? facility.fcltyNm_en : (facility.fcltyNm || '문화시설')}</h3>
                      {facility.fcltyKnd && (
                        <span className="facility-type">{facility.fcltyKnd}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="facility-info">
                    {facility.locplc && (
                      <div className="info-item">
                        <FiMapPin />
                        <span>{facility.signgu} {language === 'en' && facility.locplc_en ? facility.locplc_en : facility.locplc}</span>
                      </div>
                    )}
                    
                    {/* 이용시간: intro_info.usetimeculture */}
                    {facility.intro_info?.usetimeculture && (
                      <div className="info-item">
                        <FiClock />
                        <span>{cleanIntroHtml(facility.intro_info.usetimeculture, ' / ')}</span>
                      </div>
                    )}
                    
                    {/* 쉬는날: intro_info.restdateculture */}
                    {facility.intro_info?.restdateculture && (
                      <div className="info-item rest-day">
                        <span><Icons.calendar size={14} /> {language === 'ko' ? '휴관' : 'Closed'}: </span>
                        <span>{cleanIntroHtml(facility.intro_info.restdateculture, ', ')}</span>
                      </div>
                    )}
                    
                    {/* 이용요금: intro_info.usefee */}
                    {facility.intro_info?.usefee && (
                      <div className="info-item">
                        <span><Icons.money size={14} /> </span>
                        <span>{cleanIntroHtml(facility.intro_info.usefee, ' / ')}</span>
                      </div>
                    )}
                    
                    {/* 전화번호: intro_info.infocenterculture 또는 기존 telno */}
                    {(facility.telno || facility.intro_info?.infocenterculture) && (
                      <div className="info-item">
                        <FiPhone />
                        <span>{cleanIntroHtml(facility.telno || facility.intro_info?.infocenterculture)}</span>
                      </div>
                    )}
                    
                    {/* 주차시설: intro_info.parkingculture */}
                    {facility.intro_info?.parkingculture && (
                      <div className="info-item parking">
                        <span><Icons.parking size={14} /> {cleanIntroHtml(facility.intro_info.parkingculture)}</span>
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

export default CulturePage;
