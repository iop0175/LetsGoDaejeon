// 대전 공공데이터 API 서비스
// API 키는 서버(Workers)를 통해 프록시되어 보호됩니다
import { recordApiCall } from '../utils/apiStats';
import { safeFetch } from '../utils/fetchUtils';

// Cloudflare Workers API 프록시 URL
const WORKERS_API_URL = 'https://letsgodaejeon-api.daegieun700.workers.dev';
const API_TIMEOUT = 15000; // 15초 타임아웃

// 기본 이미지 (이미지 없을 때 사용)
const DEFAULT_IMAGE = '/images/no-image.svg';

// 관광지명으로 기본 이미지 URL 가져오기
export const getTourSpotImage = (spotName) => {
  return DEFAULT_IMAGE;
};

// ============================
// 대전 공공데이터 API (TourAPI에 없는 데이터)
// ============================

// 대전시 주차장 정보 조회 (XML API)
export const getDaejeonParking = async (pageNo = 1, numOfRows = 50) => {
  try {
    recordApiCall('parking');
    const data = await safeFetch(
      `${WORKERS_API_URL}/api/daejeon/parking?numOfRows=${numOfRows}&pageNo=${pageNo}`,
      {},
      API_TIMEOUT
    );
    
    // Workers에서 파싱된 JSON 응답을 처리
    if (data.success) {
      return data;
    }
    return { success: false, items: [], totalCount: 0 };
  } catch (error) {
    console.warn('주차장 API 오류:', error.message);
    return { success: false, items: [], totalCount: 0, error: error.message };
  }
};

// 의료기관 조회
export const getMedicalFacilities = async (pageNo = 1, numOfRows = 10) => {
  try {
    recordApiCall('medical');
    const data = await safeFetch(
      `${WORKERS_API_URL}/api/daejeon/medical?pageNo=${pageNo}&numOfRows=${numOfRows}`,
      {},
      API_TIMEOUT
    );
    
    if (data.response?.header?.resultCode === 'C00') {
      return {
        success: true,
        totalCount: data.response.body.totalCount,
        items: data.response.body.items || []
      };
    }
    return { success: false, items: [], totalCount: 0 };
  } catch (error) {
    console.warn('의료기관 API 오류:', error.message);
    return { success: false, items: [], totalCount: 0, error: error.message };
  }
};

// ============================
// KCISA 문화예술 공연 API
// ============================

/**
 * KCISA 문화예술 공연 정보 조회
 * @param {Object} options - 검색 옵션
 * @param {number} options.pageNo - 페이지 번호 (기본: 1)
 * @param {number} options.numOfRows - 한 페이지 결과 수 (기본: 20)
 * @param {string} options.dtype - 분류명 (연극, 뮤지컬, 오페라, 음악, 콘서트, 국악, 무용, 전시, 기타)
 * @param {string} options.title - 제목 검색어 (2자 이상)
 * @returns {Promise<Object>} 공연 정보 목록
 */
export const getCulturalPerformances = async (options = {}) => {
  try {
    recordApiCall('culture');
    const { pageNo = 1, numOfRows = 20, dtype, title } = options;
    
    let queryParams = `numOfRows=${numOfRows}&pageNo=${pageNo}`;
    if (dtype) queryParams += `&dtype=${encodeURIComponent(dtype)}`;
    if (title) queryParams += `&title=${encodeURIComponent(title)}`;
    
    const data = await safeFetch(
      `${WORKERS_API_URL}/api/kcisa/CNV_060?${queryParams}`,
      {},
      API_TIMEOUT
    );
    
    if (data.success) {
      return {
        success: true,
        totalCount: data.totalCount || 0,
        items: data.items || []
      };
    }
    return { success: false, items: [], totalCount: 0, message: data.resultMsg };
  } catch (error) {
    console.warn('문화공연 API 오류:', error.message);
    return { success: false, items: [], totalCount: 0, error: error.message };
  }
};

/**
 * 대전 지역 공연 정보 조회 (KCISA에서 대전 필터링)
 * @param {Object} options - 검색 옵션
 * @returns {Promise<Object>} 대전 공연 정보 목록
 */
export const getDaejeonPerformances = async (options = {}) => {
  try {
    const result = await getCulturalPerformances({ ...options, numOfRows: 100 });
    
    if (result.success && result.items.length > 0) {
      // 대전 지역 공연만 필터링
      const daejeonItems = result.items.filter(item => 
        item.eventSite?.includes('대전') || 
        item.description?.includes('대전')
      );
      
      return {
        success: true,
        totalCount: daejeonItems.length,
        items: daejeonItems
      };
    }
    return result;
  } catch (error) {
    console.warn('대전공연 API 오류:', error.message);
    return { success: false, items: [], totalCount: 0, error: error.message };
  }
};

// ============================================================
// TourAPI 4.0 (한국관광공사 국문 관광정보 서비스) 함수들
// ============================================================

/**
 * TourAPI 지역기반 관광정보 조회
 * @param {Object} options - { contentTypeId, areaCode, pageNo, numOfRows }
 * @returns {Promise<Object>} { success, items, totalCount }
 */
export const getTourApiSpots = async (options = {}) => {
  const {
    contentTypeId,      // 12:관광지, 14:문화시설, 28:레포츠, 32:숙박, 38:쇼핑, 39:음식점
    areaCode = '3',     // 대전
    pageNo = 1,
    numOfRows = 100
  } = options;
  
  try {
    recordApiCall('tourapi');
    
    const params = new URLSearchParams({
      areaCode,
      numOfRows: String(numOfRows),
      pageNo: String(pageNo),
      arrange: 'C'       // 수정일순
    });
    
    if (contentTypeId) {
      params.append('contentTypeId', contentTypeId);
    }
    
    const data = await safeFetch(
      `${WORKERS_API_URL}/api/tour/areaBasedList2?${params.toString()}`,
      {},
      API_TIMEOUT
    );
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      // 단일 객체인 경우 배열로 변환
      const itemArray = Array.isArray(items) ? items : (items ? [items] : []);
      
      return {
        success: true,
        totalCount: data.response.body.totalCount || itemArray.length,
        items: itemArray
      };
    }
    
    return { success: false, items: [], totalCount: 0 };
  } catch (error) {
    console.warn('TourAPI 조회 에러:', error.message);
    return { success: false, items: [], totalCount: 0, error: error.message };
  }
};

/**
 * TourAPI 행사/축제 정보 조회
 * @param {Object} options - { eventStartDate, areaCode, pageNo, numOfRows }
 * @returns {Promise<Object>} { success, items, totalCount }
 */
export const getTourApiFestivals = async (options = {}) => {
  const {
    areaCode = '3',
    pageNo = 1,
    numOfRows = 100,
    eventStartDate = null  // YYYYMMDD 형식
  } = options;
  
  try {
    recordApiCall('tourapi');
    
    // 시작일 기본값: 오늘 기준 1년 전
    const defaultStartDate = new Date();
    defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 1);
    const startDate = eventStartDate || defaultStartDate.toISOString().slice(0, 10).replace(/-/g, '');
    
    const params = new URLSearchParams({
      areaCode,
      numOfRows: String(numOfRows),
      pageNo: String(pageNo),
      eventStartDate: startDate,
      arrange: 'C'
    });
    
    const data = await safeFetch(
      `${WORKERS_API_URL}/api/tour/searchFestival2?${params.toString()}`,
      {},
      API_TIMEOUT
    );
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      const itemArray = Array.isArray(items) ? items : (items ? [items] : []);
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filteredItems = itemArray.filter(item => {
        const endDate = item.eventenddate || '';
        return !endDate || endDate >= today;
      });
      
      return {
        success: true,
        totalCount: filteredItems.length,
        items: filteredItems
      };
    }
    
    return { success: false, items: [], totalCount: 0 };
  } catch (error) {
    console.warn('TourAPI 행사 조회 에러:', error.message);
    return { success: false, items: [], totalCount: 0, error: error.message };
  }
};

/**
 * TourAPI 상세정보 조회 (공통정보)
 * TourAPI 2.0에서는 contentId만 전달하면 모든 정보(overview 포함)가 반환됨
 * @param {string} contentId - 콘텐츠 ID
 * @param {boolean} includeOverview - (호환성 유지용, 실제로는 무시됨)
 * @returns {Promise<Object>} { success, item }
 */
export const getTourApiDetail = async (contentId, includeOverview = true) => {
  try {
    recordApiCall('tourapi');
    
    // TourAPI 2.0 (KorService2): contentId만 필요, Y/N 옵션들은 지원 안됨
    const params = new URLSearchParams({
      contentId
    });
    
    const data = await safeFetch(
      `${WORKERS_API_URL}/api/tour/detailCommon2?${params.toString()}`,
      {},
      API_TIMEOUT
    );
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      const item = Array.isArray(items) ? items[0] : items;
      
      return { success: true, item };
    }
    
    // API 에러 메시지 포함
    const errorMsg = data.response?.header?.resultMsg || 'Unknown API error';
    console.warn(`TourAPI detailCommon2 실패 (contentId: ${contentId}):`, errorMsg);
    return { success: false, item: null, error: errorMsg };
  } catch (error) {
    console.warn('TourAPI 상세정보 조회 에러:', error.message);
    return { success: false, item: null, error: error.message };
  }
};

/**
 * TourAPI 소개정보 조회 (상세정보2)
 * @param {string} contentId - 콘텐츠 ID
 * @param {string} contentTypeId - 관광타입 ID
 * @returns {Promise<Object>} { success, item }
 */
export const getTourApiIntro = async (contentId, contentTypeId) => {
  try {
    recordApiCall('tourapi');
    
    const data = await safeFetch(
      `${WORKERS_API_URL}/api/tour/detailIntro2?contentId=${contentId}&contentTypeId=${contentTypeId}`,
      {},
      API_TIMEOUT
    );
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      const item = Array.isArray(items) ? items[0] : items;
      
      return { success: true, item };
    }
    
    return { success: false, item: null };
  } catch (error) {
    console.warn('TourAPI 소개정보 조회 에러:', error.message);
    return { success: false, item: null, error: error.message };
  }
};

/**
 * TourAPI 반복정보 조회 (숙박 객실정보 등)
 * @param {string} contentId - 콘텐츠 ID
 * @param {string} contentTypeId - 관광타입 ID (32: 숙박)
 * @returns {Promise<Object>} { success, items }
 */
export const getTourApiRoomInfo = async (contentId, contentTypeId = '32') => {
  try {
    recordApiCall('tourapi');
    
    const data = await safeFetch(
      `${WORKERS_API_URL}/api/tour/detailInfo2?contentId=${contentId}&contentTypeId=${contentTypeId}&numOfRows=20`,
      {},
      API_TIMEOUT
    );
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      const itemArray = Array.isArray(items) ? items : (items ? [items] : []);
      
      return { success: true, items: itemArray };
    }
    
    return { success: false, items: [] };
  } catch (error) {
    console.warn('TourAPI 반복정보 조회 에러:', error.message);
    return { success: false, items: [], error: error.message };
  }
};

/**
 * TourAPI 이미지정보 조회
 * @param {string} contentId - 콘텐츠 ID
 * @returns {Promise<Object>} { success, items }
 */
export const getTourApiImages = async (contentId) => {
  try {
    recordApiCall('tourapi');
    
    const data = await safeFetch(
      `${WORKERS_API_URL}/api/tour/detailImage2?contentId=${contentId}&imageYN=Y`,
      {},
      API_TIMEOUT
    );
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      const itemArray = Array.isArray(items) ? items : (items ? [items] : []);
      
      return { success: true, items: itemArray };
    }
    
    return { success: false, items: [] };
  } catch (error) {
    console.warn('TourAPI 이미지 조회 에러:', error.message);
    return { success: false, items: [], error: error.message };
  }
};

/**
 * TourAPI 모든 타입 데이터 개수 조회
 * @returns {Promise<Object>} 각 타입별 totalCount
 */
export const getTourApiCounts = async () => {
  const contentTypes = {
    '12': '관광지',
    '14': '문화시설',
    '28': '레포츠',
    '32': '숙박',
    '38': '쇼핑',
    '39': '음식점'
  };
  
  const counts = {};
  
  try {
    for (const [typeId, typeName] of Object.entries(contentTypes)) {
      const result = await getTourApiSpots({
        contentTypeId: typeId,
        numOfRows: 1,
        pageNo: 1
      });
      counts[typeId] = {
        name: typeName,
        count: result.totalCount || 0
      };
    }
    
    // 행사/축제 개수 - 1년 전부터 시작하는 행사 조회
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const startDate = oneYearAgo.toISOString().slice(0, 10).replace(/-/g, '');
    
    const festivalResult = await getTourApiFestivals({
      numOfRows: 1,
      pageNo: 1,
      eventStartDate: startDate
    });
    console.log('[DEBUG] getTourApiCounts - festivals result:', festivalResult);
    counts['15'] = {
      name: '행사/축제',
      count: festivalResult.totalCount || 0
    };
    
    return counts;
  } catch (error) {
    console.error('TourAPI 개수 조회 에러:', error);
    return counts;
  }
};

// ============================================================
// TourAPI 영문 서비스 (EngService2)
// 영문 contentTypeId: 76=관광지, 78=문화시설, 80=레포츠, 82=숙박, 79=쇼핑, 85=음식점, 75=행사/축제
// ============================================================

/**
 * 국문 contentTypeId를 영문으로 변환
 */
export const CONTENT_TYPE_KOR_TO_ENG = {
  '12': '76',  // 관광지 → Tourist Destination
  '14': '78',  // 문화시설 → Cultural Facility
  '15': '85',  // 행사/축제 → Festival/Event
  '28': '75',  // 레포츠 → Leisure
  '32': '80',  // 숙박 → Accommodation
  '38': '79',  // 쇼핑 → Shopping
  '39': '82'   // 음식점 → Restaurant
};

/**
 * TourAPI 영문 지역기반 관광정보 조회
 * @param {Object} options - { contentTypeId (국문 또는 영문코드), areaCode, pageNo, numOfRows }
 * @returns {Promise<Object>} { success, items, totalCount }
 */
export const getTourApiSpotsEng = async (options = {}) => {
  const {
    contentTypeId,      // 국문 또는 영문 코드 모두 지원
    areaCode = '3',     // 대전
    pageNo = 1,
    numOfRows = 100
  } = options;
  
  try {
    recordApiCall('tourapi');
    
    // contentTypeId가 영문 코드(2자리, 70~89)인지 확인
    const engCodes = ['75', '76', '78', '79', '80', '82', '85'];
    const engContentTypeId = engCodes.includes(contentTypeId) 
      ? contentTypeId 
      : (CONTENT_TYPE_KOR_TO_ENG[contentTypeId] || '76');
    
    const params = new URLSearchParams({
      areaCode,
      numOfRows: String(numOfRows),
      pageNo: String(pageNo),
      contentTypeId: engContentTypeId,
      arrange: 'C'
    });
    
    const data = await safeFetch(
      `${WORKERS_API_URL}/api/tour-en/areaBasedList2?${params.toString()}`,
      {},
      API_TIMEOUT
    );
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      const itemArray = Array.isArray(items) ? items : (items ? [items] : []);
      
      return {
        success: true,
        totalCount: data.response.body.totalCount || itemArray.length,
        items: itemArray
      };
    }
    
    return { success: false, items: [], totalCount: 0 };
  } catch (error) {
    console.warn('TourAPI 영문 조회 에러:', error.message);
    return { success: false, items: [], totalCount: 0, error: error.message };
  }
};

/**
 * TourAPI 영문 상세정보 조회
 * @param {string} contentId - 영문 콘텐츠 ID
 * @returns {Promise<Object>} { success, item }
 */
export const getTourApiDetailEng = async (contentId) => {
  try {
    recordApiCall('tourapi');
    
    const params = new URLSearchParams({ contentId });
    
    const data = await safeFetch(
      `${WORKERS_API_URL}/api/tour-en/detailCommon2?${params.toString()}`,
      {},
      API_TIMEOUT
    );
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      const item = Array.isArray(items) ? items[0] : items;
      return { success: true, item };
    }
    
    return { success: false, item: null };
  } catch (error) {
    console.warn('TourAPI 영문 상세정보 조회 에러:', error.message);
    return { success: false, item: null, error: error.message };
  }
};

export default {
  // 대전 공공데이터 (TourAPI에 없는 데이터)
  getDaejeonParking,
  getMedicalFacilities,
  getTourSpotImage,
  // KCISA 공연 정보
  getCulturalPerformances,
  getDaejeonPerformances,
  // TourAPI 4.0 (한국관광공사 국문 관광정보)
  getTourApiSpots,
  getTourApiFestivals,
  getTourApiDetail,
  getTourApiIntro,
  getTourApiImages,
  getTourApiCounts,
  // TourAPI 영문 서비스
  getTourApiSpotsEng,
  getTourApiDetailEng
};
