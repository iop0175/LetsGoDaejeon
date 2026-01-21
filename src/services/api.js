// 대전 공공데이터 API 서비스
// API 키는 환경변수에서 불러옵니다 (.env 파일 참조)
import { recordApiCall } from '../utils/apiStats';

const API_KEY = import.meta.env.VITE_API_KEY;
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://apis.data.go.kr/6300000/openapi2022';

// 한국관광공사 포토갤러리 API
const KTO_PHOTO_API_KEY = import.meta.env.VITE_KTO_PHOTO_API_KEY;
const KTO_PHOTO_BASE_URL = 'https://apis.data.go.kr/B551011/PhotoGalleryService1';

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
      `${BASE_URL}/tourspot/gettourspot?serviceKey=${API_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}`
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
      `https://apis.data.go.kr/6300000/eventDataService/eventDataListJson?serviceKey=${API_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}`
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
      `${BASE_URL}/restrnt/getrestrnt?serviceKey=${API_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}`
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
      `${BASE_URL}/accommodation/getaccommodation?serviceKey=${API_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}`
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
      `https://apis.data.go.kr/6300000/GetPakpListService1/getPakpList1?serviceKey=${API_KEY}&numOfRows=${numOfRows}&pageNo=${pageNo}&type=xml`
    );
    const text = await response.text();
    
    // XML을 파싱
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    
    const resultCode = xmlDoc.querySelector('resultCode')?.textContent;
    // 전체 개수 가져오기 (totalCount 태그 확인)
    const totalCountNode = xmlDoc.querySelector('totalCount');
    const apiTotalCount = totalCountNode ? parseInt(totalCountNode.textContent) : 0;
    
    if (resultCode === '00') {
      const parkingNodes = xmlDoc.querySelectorAll('item');
      const items = Array.from(parkingNodes).map(node => ({
        name: node.querySelector('PRKPLCENM')?.textContent || '',
        parkingId: node.querySelector('PRKPLCENO')?.textContent || '',
        lat: parseFloat(node.querySelector('LATITUDE')?.textContent || '0'),
        lon: parseFloat(node.querySelector('LONGITUDE')?.textContent || '0'),
        addr: node.querySelector('LNMADR')?.textContent || '', // 지번주소
        addrRoad: node.querySelector('RDNMADR')?.textContent || '', // 도로명주소
        divideNum: node.querySelector('PRKPLCESE')?.textContent === '공영' ? '6' : '1', // 공영/민영
        typeNum: node.querySelector('PRKPLCETYPE')?.textContent === '노외' ? '2' : '1', // 노상/노외
        parkingType: node.querySelector('PRKPLCESE')?.textContent || '', // 공영/민영 텍스트
        parkingCategory: node.querySelector('PRKPLCETYPE')?.textContent || '', // 노상/노외 텍스트
        totalLot: node.querySelector('PRKCMPRT')?.textContent || '', // 주차면수 (문자열로)
        // 운영시간
        weekdayOpen: node.querySelector('WEEKDAYOPEROPENHHMM')?.textContent || '',
        weekdayClose: node.querySelector('WEEKDAYOPERCOLSEHHMM')?.textContent || '',
        satOpen: node.querySelector('SATOPEROPEROPENHHMM')?.textContent || '',
        satClose: node.querySelector('SATOPERCLOSEHHMM')?.textContent || '',
        holidayOpen: node.querySelector('HOLIDAYOPEROPENHHMM')?.textContent || '',
        holidayClose: node.querySelector('HOLIDAYCLOSEOPENHHMM')?.textContent || '',
        // 요금 정보
        chargeInfo: node.querySelector('PARKINGCHRGEINFO')?.textContent || '', // 유료/무료
        basicTime: node.querySelector('BASICTIME')?.textContent || '',
        basicCharge: node.querySelector('BASICCHARGE')?.textContent || '',
        addTime: node.querySelector('ADDUNITTIME')?.textContent || '',
        addCharge: node.querySelector('ADDUNITCHARGE')?.textContent || '',
        dayTicket: node.querySelector('DAYCMMTKT')?.textContent || '',
        monthTicket: node.querySelector('MONTHCMMTKT')?.textContent || '',
        // 결제수단
        payMethod: node.querySelector('METPAY')?.textContent || '',
        // 기타
        operDay: node.querySelector('OPERDAY')?.textContent || '', // 운영일
        referenceDate: node.querySelector('REFERENCEDATE')?.textContent || ''
      }));
      
      return {
        success: true,
        totalCount: apiTotalCount || items.length,
        items: items
      };
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
      `${BASE_URL}/festv/getfestv?serviceKey=${API_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}`
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
      `${BASE_URL}/ctlstt/getctlstt?serviceKey=${API_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}`
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
      `https://apis.data.go.kr/6300000/mdlcnst/getmdlcnst?serviceKey=${API_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}`
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
      `${BASE_URL}/shppg/getshppg?serviceKey=${API_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}`
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
      `${BASE_URL}/tourroms/gettourroms?serviceKey=${API_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}`
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
      `${KTO_PHOTO_BASE_URL}/gallerySearchList1?serviceKey=${KTO_PHOTO_API_KEY}&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=LetsGoDaejeon&keyword=${encodedKeyword}&_type=json`
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
