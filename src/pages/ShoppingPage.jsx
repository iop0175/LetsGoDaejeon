import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getAllDbData, getTourSpots as getTourSpotsDb } from '../services/dbService';
import { FiMapPin, FiPhone, FiNavigation, FiShoppingBag, FiSearch, FiCamera, FiLoader, FiClock } from 'react-icons/fi';
import { MdStorefront, MdLocalMall, MdShoppingCart } from 'react-icons/md';
import { handleImageError, getReliableImageUrl, cleanIntroHtml } from '../utils/imageUtils';
import './ShoppingPage.css';

// 대전시 구 목록
const DISTRICTS = [
  { id: 'all', ko: '전체 지역', en: 'All Districts' },
  { id: '동구', ko: '동구', en: 'Dong-gu' },
  { id: '중구', ko: '중구', en: 'Jung-gu' },
  { id: '서구', ko: '서구', en: 'Seo-gu' },
  { id: '유성구', ko: '유성구', en: 'Yuseong-gu' },
  { id: '대덕구', ko: '대덕구', en: 'Daedeok-gu' }
];

const ShoppingPage = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [allShops, setAllShops] = useState([]); // 전체 데이터
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [dongFilter, setDongFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const itemsPerPage = 12;

  const text = {
    ko: {
      title: '쇼핑',
      subtitle: '대전의 쇼핑 명소를 만나보세요',
      loading: '불러오는 중...',
      noResults: '검색 결과가 없습니다',
      searchPlaceholder: '쇼핑 명소 검색',
      address: '주소',
      phone: '전화',
      navigate: '길찾기',
      totalCount: '총 {count}개의 쇼핑 명소'
    },
    en: {
      title: 'Shopping',
      subtitle: 'Discover shopping destinations in Daejeon',
      loading: 'Loading...',
      noResults: 'No results found',
      searchPlaceholder: 'Search shopping places',
      address: 'Address',
      phone: 'Phone',
      navigate: 'Navigate',
      totalCount: 'Total {count} shopping places'
    }
  };

  const t = text[language];

  // 최초 1회 전체 데이터 로드
  useEffect(() => {
    fetchAllShops();
  }, []);

  const fetchAllShops = async () => {
    setLoading(true);
    try {
      // 먼저 tour_spots에서 쇼핑(38) 데이터 시도
      const tourResult = await getTourSpotsDb('38', 1, 1000);
      
      if (tourResult.success && tourResult.items.length > 0) {
        console.log('[DEBUG] ShoppingPage - 샘플 TourAPI 데이터:', tourResult.items[0])
        // TourAPI 데이터를 기존 형식으로 변환
        const formattedItems = tourResult.items.map(item => ({
          shppgNm: item.title,
          shppgAddr: item.addr1 || item.addr2,
          shppgIntro: item.overview || '',
          telNo: item.tel,
          imageUrl: getReliableImageUrl(item.firstimage || item.firstimage2, '/images/no-image.svg'),
          mapx: item.mapx,
          mapy: item.mapy,
          intro_info: item.intro_info, // 소개정보 (영업시간, 쉬는날, 주차 등)
          _source: 'tourapi'
        }));
        console.log('[DEBUG] ShoppingPage - 변환된 데이터:', formattedItems[0])
        setAllShops(formattedItems);
      } else {
        // tour_spots에 데이터가 없으면 기존 shopping_places 테이블 시도
        const dbResult = await getAllDbData('shopping');
        
        if (dbResult.success && dbResult.items.length > 0) {
          setAllShops(dbResult.items);
        } else {
          setAllShops([]);
        }
      }
    } catch (error) {
      console.error('쇼핑 데이터 로드 실패:', error);
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
    allShops.forEach(item => {
      const district = getDistrictFromAddr(item.shppgAddr);
      if (district === districtFilter) {
        const dong = getDongFromAddr(item.shppgAddr);
        if (dong) dongs.add(dong);
      }
    });
    
    return Array.from(dongs).sort();
  }, [allShops, districtFilter]);

  // 구 변경 시 동 필터 초기화 및 페이지 리셋
  useEffect(() => {
    setDongFilter('all');
    setCurrentPage(1);
  }, [districtFilter]);

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [dongFilter, searchQuery, sortBy]);

  // 검색 + 구별 + 동별 필터링
  const filteredShops = useMemo(() => {
    let data = allShops;
    
    // 검색 필터
    if (searchQuery) {
      data = data.filter(s => 
        s.shppgNm?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.shppgAddr?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // 구별 필터링
    if (districtFilter !== 'all') {
      data = data.filter(item => {
        const district = getDistrictFromAddr(item.shppgAddr);
        return district === districtFilter;
      });
    }
    
    // 동별 필터링
    if (dongFilter !== 'all') {
      data = data.filter(item => {
        const dong = getDongFromAddr(item.shppgAddr);
        return dong === dongFilter;
      });
    }
    
    // 정렬 적용
    if (sortBy === 'name') {
      data = [...data].sort((a, b) => (a.shppgNm || '').localeCompare(b.shppgNm || '', 'ko'));
    } else if (sortBy === 'views') {
      data = [...data].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    }
    
    return data;
  }, [allShops, searchQuery, districtFilter, dongFilter, sortBy]);

  // 현재 페이지에 해당하는 데이터
  const paginatedShops = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredShops.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredShops, currentPage, itemsPerPage]);

  const handleNavigate = (shop) => {
    const address = shop.shppgAddr || shop.shppgDtlAddr;
    if (address) {
      window.open(`https://map.kakao.com/link/search/${encodeURIComponent(address)}`, '_blank');
    }
  };

  const getIcon = (name) => {
    if (name?.includes('시장') || name?.includes('마트')) return <MdShoppingCart />;
    if (name?.includes('몰') || name?.includes('백화점')) return <MdLocalMall />;
    return <MdStorefront />;
  };

  const totalPages = Math.ceil(filteredShops.length / itemsPerPage);

  return (
    <div className="shopping-page">
      <div className="shopping-hero">
        <div className="container">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
      </div>

      <div className="container">
        {/* 검색창 추가 */}
        <div className="shopping-search">
          <FiSearch />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
          <div className="shopping-count">
            {t.totalCount.replace('{count}', filteredShops.length)}
          </div>
        </div>

        {loading ? (
          <div className="loading">{t.loading}</div>
        ) : paginatedShops.length === 0 ? (
          <div className="no-results">{t.noResults}</div>
        ) : (
          <div className="shopping-grid">
            {paginatedShops.map((shop, index) => (
              <div key={index} className="shopping-card" onClick={() => navigate(`/spot/${shop.contentId}`)} style={{ cursor: 'pointer' }}>
                <div className="shopping-image">
                  <img 
                    src={shop.imageUrl || '/images/no-image.svg'} 
                    alt={shop.shppgNm} 
                    loading="lazy"
                    onError={(e) => { e.target.src = '/images/no-image.svg' }}
                  />
                </div>
                <div className="shopping-card-content">
                  <div className="shopping-card-header">
                    <div className="shopping-icon">
                      {getIcon(shop.shppgNm)}
                    </div>
                    <div className="shopping-title">
                      <h3>{shop.shppgNm || '쇼핑 명소'}</h3>
                      {shop.salsTime && (
                        <span className="shop-time">{language === 'ko' ? '영업: ' : 'Hours: '}{shop.salsTime}</span>
                      )}
                    </div>
                  </div>
                    
                  <div className="shop-info">
                    {shop.shppgAddr && (
                      <div className="info-item">
                        <FiMapPin />
                        <span>{shop.shppgAddr}</span>
                      </div>
                    )}
                    
                    {/* 영업시간: intro_info.opentime */}
                    {shop.intro_info?.opentime && (
                      <div className="info-item open-time">
                        <FiClock />
                        <span>{cleanIntroHtml(shop.intro_info.opentime, ' / ')}</span>
                      </div>
                    )}
                    
                    {/* 쉬는날: intro_info.restdateshopping */}
                    {shop.intro_info?.restdateshopping && (
                      <div className="info-item rest-day">
                        <span>📅 {language === 'ko' ? '휴무' : 'Closed'}: {cleanIntroHtml(shop.intro_info.restdateshopping)}</span>
                      </div>
                    )}
                    
                    {/* 전화번호: intro_info.infocentershopping 또는 기존 shppgInqrTel */}
                    {(shop.shppgInqrTel || shop.telNo || shop.intro_info?.infocentershopping) && (
                      <div className="info-item">
                        <FiPhone />
                        <a href={`tel:${cleanIntroHtml(shop.shppgInqrTel || shop.telNo || shop.intro_info?.infocentershopping)}`}>
                          {cleanIntroHtml(shop.shppgInqrTel || shop.telNo || shop.intro_info?.infocentershopping)}
                        </a>
                      </div>
                    )}
                    
                    {/* 주차시설: intro_info.parkingshopping */}
                    {shop.intro_info?.parkingshopping && (
                      <div className="info-item parking">
                        <span>🅿️ {cleanIntroHtml(shop.intro_info.parkingshopping)}</span>
                      </div>
                    )}
                    
                    {shop.shppgIntrd && (
                      <p className="shop-desc">{shop.shppgIntrd.length > 150 ? shop.shppgIntrd.substring(0, 150) + '...' : shop.shppgIntrd}</p>
                    )}
                    {shop.shppgHmpgUrl && (
                      <a 
                        href={shop.shppgHmpgUrl} 
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
                    onClick={() => handleNavigate(shop)}
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

export default ShoppingPage;
