// 대전 공공데이터 API 서비스
// API 키는 서버(Workers)를 통해 프록시되어 보호됩니다
import { recordApiCall } from '../utils/apiStats';

// Cloudflare Workers API 프록시 URL
const WORKERS_API_URL = 'https://letsgodaejeon-api.daegieun700.workers.dev';

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
    const response = await fetch(
      `${WORKERS_API_URL}/api/daejeon/parking?numOfRows=${numOfRows}&pageNo=${pageNo}`
    );
    const data = await response.json();
    
    // Workers에서 파싱된 JSON 응답을 처리
    if (data.success) {
      return data;
    }
    return { success: false, items: [], totalCount: 0 };
  } catch (error) {

    return { success: false, items: [], totalCount: 0, error };
  }
};

// 의료기관 조회
export const getMedicalFacilities = async (pageNo = 1, numOfRows = 10) => {
  try {
    recordApiCall('medical');
    const response = await fetch(
      `${WORKERS_API_URL}/api/daejeon/medical?pageNo=${pageNo}&numOfRows=${numOfRows}`
    );
    const data = await response.json();
    
    if (data.response?.header?.resultCode === 'C00') {
      return {
        success: true,
        totalCount: data.response.body.totalCount,
        items: data.response.body.items || []
      };
    }
    return { success: false, items: [], totalCount: 0 };
  } catch (error) {

    return { success: false, items: [], totalCount: 0, error };
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
    
    const response = await fetch(
      `${WORKERS_API_URL}/api/kcisa/CNV_060?${queryParams}`
    );
    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        totalCount: data.totalCount || 0,
        items: data.items || []
      };
    }
    return { success: false, items: [], totalCount: 0, message: data.resultMsg };
  } catch (error) {
    return { success: false, items: [], totalCount: 0, error };
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
    return { success: false, items: [], totalCount: 0, error };
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
    
    const response = await fetch(
      `${WORKERS_API_URL}/api/tour/areaBasedList2?${params.toString()}`
    );
    const data = await response.json();
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      // 단일 객체인 경우 배열로 변환
      const itemArray = Array.isArray(items) ? items : [items];
      
      return {
        success: true,
        totalCount: data.response.body.totalCount || itemArray.length,
        items: itemArray
      };
    }
    
    return { success: false, items: [], totalCount: 0 };
  } catch (error) {
    console.error('TourAPI 조회 에러:', error);
    return { success: false, items: [], totalCount: 0, error };
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
    
    const response = await fetch(
      `${WORKERS_API_URL}/api/tour/searchFestival2?${params.toString()}`
    );
    const data = await response.json();
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      const itemArray = Array.isArray(items) ? items : [items];
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
    console.error('TourAPI 행사 조회 에러:', error);
    return { success: false, items: [], totalCount: 0, error };
  }
};

/**
 * TourAPI 상세정보 조회 (공통정보)
 * @param {string} contentId - 콘텐츠 ID
 * @param {boolean} includeOverview - overview 포함 여부
 * @returns {Promise<Object>} { success, item }
 */
export const getTourApiDetail = async (contentId, includeOverview = true) => {
  try {
    recordApiCall('tourapi');
    
    const params = new URLSearchParams({
      contentId,
      defaultYN: 'Y',
      firstImageYN: 'Y',
      addrinfoYN: 'Y',
      overviewYN: includeOverview ? 'Y' : 'N'
    });
    
    const response = await fetch(
      `${WORKERS_API_URL}/api/tour/detailCommon1?${params.toString()}`
    );
    const data = await response.json();
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      const item = Array.isArray(items) ? items[0] : items;
      
      return { success: true, item };
    }
    
    return { success: false, item: null };
  } catch (error) {
    console.error('TourAPI 상세정보 조회 에러:', error);
    return { success: false, item: null, error };
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
    
    const response = await fetch(
      `${WORKERS_API_URL}/api/tour/detailIntro2?contentId=${contentId}&contentTypeId=${contentTypeId}`
    );
    const data = await response.json();
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      const item = Array.isArray(items) ? items[0] : items;
      
      return { success: true, item };
    }
    
    return { success: false, item: null };
  } catch (error) {
    console.error('TourAPI 소개정보 조회 에러:', error);
    return { success: false, item: null, error };
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
    
    const response = await fetch(
      `${WORKERS_API_URL}/api/tour/detailImage2?contentId=${contentId}&imageYN=Y`
    );
    const data = await response.json();
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      const itemArray = Array.isArray(items) ? items : [items];
      
      return { success: true, items: itemArray };
    }
    
    return { success: false, items: [] };
  } catch (error) {
    console.error('TourAPI 이미지 조회 에러:', error);
    return { success: false, items: [], error };
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
  getTourApiCounts
};
