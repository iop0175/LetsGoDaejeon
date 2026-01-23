// 대전 공공데이터 API 서비스
// API 키는 서버(Workers)를 통해 프록시되어 보호됩니다
import { recordApiCall } from '../utils/apiStats';

// Cloudflare Workers API 프록시 URL
const WORKERS_API_URL = 'https://letsgodaejeon-api.daegieun700.workers.dev';

// 기본 이미지 (이미지 없을 때 사용)
const DEFAULT_IMAGE = '/images/no-image.svg';

// 관광지명으로 기본 이미지 URL 가져오기 (한국관광공사 API로 대체됨)
export const getTourSpotImage = (spotName) => {
  // 기본 이미지 반환 (실제 이미지는 한국관광공사 API에서 로드)
  return DEFAULT_IMAGE;
};

// 관광지 조회
export const getTourSpots = async (pageNo = 1, numOfRows = 10) => {
  try {
    recordApiCall('travel');
    const response = await fetch(
      `${WORKERS_API_URL}/api/daejeon/tourspot/gettourspot?pageNo=${pageNo}&numOfRows=${numOfRows}`
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

// 축제/행사 조회 (eventDataService 사용)
export const getFestivals = async (pageNo = 1, numOfRows = 10) => {
  try {
    recordApiCall('festival');
    const response = await fetch(
      `${WORKERS_API_URL}/api/daejeon/eventDataService/eventDataListJson?pageNo=${pageNo}&numOfRows=${numOfRows}`
    );
    const data = await response.json();
    
    if (data.comMsgHeader?.successYN === 'Y') {
      return {
        success: true,
        totalCount: data.msgHeader?.totalCount || 0,
        items: data.msgBody || []
      };
    }
    return { success: false, items: [], totalCount: 0 };
  } catch (error) {

    return { success: false, items: [], totalCount: 0, error };
  }
};

// 맛집 조회 (restrnt 엔드포인트 사용)
export const getRestaurants = async (pageNo = 1, numOfRows = 10) => {
  try {
    recordApiCall('food');
    const response = await fetch(
      `${WORKERS_API_URL}/api/daejeon/restrnt/getrestrnt?pageNo=${pageNo}&numOfRows=${numOfRows}`
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

// 숙박시설 조회
export const getAccommodations = async (pageNo = 1, numOfRows = 10) => {
  try {
    recordApiCall('accommodation');
    const response = await fetch(
      `${WORKERS_API_URL}/api/daejeon/accommodation/getaccommodation?pageNo=${pageNo}&numOfRows=${numOfRows}`
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

// 대전 축제 정보 조회 (festv API)
export const getDaejeonFestivals = async (pageNo = 1, numOfRows = 20) => {
  try {
    const response = await fetch(
      `${WORKERS_API_URL}/api/daejeon/festv/getfestv?pageNo=${pageNo}&numOfRows=${numOfRows}`
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

// 문화시설 조회
export const getCulturalFacilities = async (pageNo = 1, numOfRows = 10) => {
  try {
    recordApiCall('culture');
    const response = await fetch(
      `${WORKERS_API_URL}/api/daejeon/ctlstt/getctlstt?pageNo=${pageNo}&numOfRows=${numOfRows}`
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

// 쇼핑 조회
export const getShoppingPlaces = async (pageNo = 1, numOfRows = 10) => {
  try {
    recordApiCall('shopping');
    const response = await fetch(
      `${WORKERS_API_URL}/api/daejeon/shppg/getshppg?pageNo=${pageNo}&numOfRows=${numOfRows}`
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

// 숙박업소 조회 (tourroms API)
export const getTourRooms = async (pageNo = 1, numOfRows = 10) => {
  try {
    recordApiCall('accommodation');
    const response = await fetch(
      `${WORKERS_API_URL}/api/daejeon/tourroms/gettourroms?pageNo=${pageNo}&numOfRows=${numOfRows}`
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
// 한국관광공사 포토갤러리 API
// ============================

// 키워드로 관광지 사진 검색 (내부 사용)
const searchKTOPhotos = async (keyword, pageNo = 1, numOfRows = 10) => {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const response = await fetch(
      `${WORKERS_API_URL}/api/kto/PhotoGalleryService1/gallerySearchList1?numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=LetsGoDaejeon&keyword=${encodedKeyword}&_type=json`
    );
    const data = await response.json();
    
    if (data.response?.header?.resultCode === '0000') {
      const items = data.response.body.items?.item || [];
      return {
        success: true,
        totalCount: data.response.body.totalCount || 0,
        items: Array.isArray(items) ? items : [items]
      };
    }
    return { success: false, items: [], totalCount: 0 };
  } catch (error) {

    return { success: false, items: [], totalCount: 0, error };
  }
};

// 대전 관광지 한국관광공사 사진 키워드 매핑
const DAEJEON_KTO_PHOTOS = {
  '유성온천': '유성온천',
  '유성온천공원': '유성온천공원',
  '한밭수목원': '한밭수목원',
  '엑스포과학공원': '엑스포',
  '대청호': '대청호',
  '장태산': '장태산',
  '장태산자연휴양림': '장태산',
  '계족산': '계족산',
  '보문산': '보문산',
  '엑스포기념관': '엑스포기념관',
  '대전교통문화센터': '대전교통문화센터'
};

// 대전 관광지 사진 갤러리 가져오기 (여러 장)
export const getDaejeonPhotoGallery = async (spotName, numOfRows = 10) => {
  // 매핑된 키워드 찾기
  let searchKeyword = spotName;
  
  for (const [key, value] of Object.entries(DAEJEON_KTO_PHOTOS)) {
    if (spotName?.includes(key) || key.includes(spotName?.split(' ')[0] || '')) {
      searchKeyword = value;
      break;
    }
  }
  
  // 한국관광공사 사진 검색
  const result = await searchKTOPhotos(searchKeyword, 1, numOfRows);
  
  if (result.success && result.items.length > 0) {
    // 대전광역시 사진만 필터링
    const daejeonPhotos = result.items.filter(photo => 
      photo.galPhotographyLocation?.includes('대전')
    );
    
    if (daejeonPhotos.length > 0) {
      return {
        success: true,
        totalCount: daejeonPhotos.length,
        items: daejeonPhotos.map(photo => ({
          imageUrl: photo.galWebImageUrl,
          title: photo.galTitle,
          photographer: photo.galPhotographer,
          location: photo.galPhotographyLocation,
          keywords: photo.galSearchKeyword
        }))
      };
    }
  }
  
  // 대전 사진이 없으면 기본 이미지 반환
  return {
    success: false,
    totalCount: 1,
    items: [{
      imageUrl: DEFAULT_IMAGE,
      title: spotName,
      photographer: '한국관광공사',
      location: '대전광역시',
      keywords: spotName
    }]
  };
};

export default {
  getTourSpots,
  getFestivals,
  getRestaurants,
  getDaejeonParking,
  getDaejeonFestivals,
  getCulturalFacilities,
  getMedicalFacilities,
  getShoppingPlaces,
  getTourRooms,
  getTourSpotImage,
  getDaejeonPhotoGallery
};
