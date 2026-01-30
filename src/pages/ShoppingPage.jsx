import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useLanguage } from '../context/LanguageContext';
import { getAllDbData, getTourSpots as getTourSpotsDb } from '../services/dbService';
import { FiMapPin, FiPhone, FiNavigation, FiShoppingBag, FiSearch, FiCamera, FiLoader, FiClock } from 'react-icons/fi';
import { MdStorefront, MdLocalMall, MdShoppingCart } from 'react-icons/md';
import { handleImageError, getReliableImageUrl, cleanIntroHtml } from '../utils/imageUtils';
import { DISTRICTS, DISTRICT_NAMES, getDongFromAddr } from '../utils/constants';
import { generateSlug } from '../utils/slugUtils';
import Icons from '../components/common/Icons';
import SEO, { SEO_DATA } from '../components/common/SEO';
// CSS는 pages/_app.jsx에서 import

const ShoppingPage = () => {
  const { language, t } = useLanguage();
  const seoData = SEO_DATA.shopping[language] || SEO_DATA.shopping.ko;
  const router = useRouter();
  const [allShops, setAllShops] = useState([]); // 전체 데이터
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [dongFilter, setDongFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const itemsPerPage = 12;

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
          shppgNm_en: item.title_en, // 영어 이름
          shppgAddr: item.addr1 || item.addr2,
          shppgAddr_en: item.addr1_en, // 영어 주소
          shppgIntro: item.overview || '',
          shppgIntro_en: item.overview_en || '', // 영어 설명
          telNo: item.tel,
          contentId: item.content_id,
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
    for (const district of DISTRICT_NAMES) {
      if (addr.includes(district)) return district;
    }
    return null;
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
    <>
      <SEO 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        url="/shopping"
      />
      <div className="shopping-page">
        <div className="shopping-hero">
          <div className="container">
            <h1>{t.pages.shopping.title}</h1>
            <p>{t.pages.shopping.subtitle}</p>
          </div>
        </div>

      <div className="container">
        {/* 검색창 추가 */}
        <div className="shopping-search">
          <FiSearch />
          <input
            type="text"
            placeholder={t.pages.shopping.searchPlaceholder}
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
                {d[language]}
              </button>
            ))}
          </div>

          {districtFilter !== 'all' && availableDongs.length > 0 && (
            <div className="dong-buttons">
              <button
                className={`dong-btn ${dongFilter === 'all' ? 'active' : ''}`}
                onClick={() => setDongFilter('all')}
              >
                {t.common.allDong}
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
              {t.ui.sortByName}
            </button>
            <button
              className={`sort-btn ${sortBy === 'views' ? 'active' : ''}`}
              onClick={() => setSortBy('views')}
            >
              {t.ui.sortByViews}
            </button>
          </div>
          <div className="shopping-count">
            {t.pages.shopping.totalCount.replace('{count}', filteredShops.length)}
          </div>
        </div>

        {loading ? (
          <div className="loading">{t.pages.shopping.loading}</div>
        ) : paginatedShops.length === 0 ? (
          <div className="no-results">{t.pages.shopping.noResults}</div>
        ) : (
          <div className="shopping-grid">
            {paginatedShops.map((shop, index) => (
              <div key={index} className="shopping-card" onClick={() => router.push(`/spot/${generateSlug(shop.shppgNm, shop.contentId)}`)} style={{ cursor: 'pointer' }}>
                <div className="shopping-image">
                  <Image 
                    src={shop.imageUrl || '/images/no-image.svg'} 
                    alt={language === 'en' && shop.shppgNm_en ? shop.shppgNm_en : shop.shppgNm}
                    width={394}
                    height={263}
                    loading="lazy"
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  />
                </div>
                <div className="shopping-card-content">
                  <div className="shopping-card-header">
                    <div className="shopping-icon">
                      {getIcon(shop.shppgNm)}
                    </div>
                    <div className="shopping-title">
                      <h3>{language === 'en' && shop.shppgNm_en ? shop.shppgNm_en : (shop.shppgNm || t.pages.shopping.defaultName)}</h3>
                      {shop.salsTime && (
                        <span className="shop-time">{t.pages.shopping.hoursPrefix}{shop.salsTime}</span>
                      )}
                    </div>
                  </div>
                    
                  <div className="shop-info">
                    {shop.shppgAddr && (
                      <div className="info-item">
                        <FiMapPin />
                        <span>{language === 'en' && shop.shppgAddr_en ? shop.shppgAddr_en : shop.shppgAddr}</span>
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
                        <span><Icons.calendar size={14} /> {t.detail.closed}: {cleanIntroHtml(shop.intro_info.restdateshopping)}</span>
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
                        <span><Icons.parking size={14} /> {cleanIntroHtml(shop.intro_info.parkingshopping)}</span>
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
                        {t.ui.website}
                      </a>
                    )}
                  </div>

                  <button 
                    className="navigate-btn"
                    onClick={() => handleNavigate(shop)}
                  >
                    <FiNavigation />
                    {t.ui.navigate}
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
              {t.ui.prev}
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              {t.ui.next}
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default ShoppingPage;
