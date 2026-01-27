/**
 * TourAPI detailInfo2 vs detailIntro2 비교 스크립트
 * 각 콘텐츠 타입별로 1개씩 조회해서 비교
 */

const WORKERS_URL = 'https://letsgodaejeon-api.daegieun700.workers.dev';

// 콘텐츠 타입별 테스트용 content_id (대전 지역)
const TEST_CONTENT_IDS = {
  12: { id: '126128', name: '관광지' },      // 예시 관광지
  14: { id: '126151', name: '문화시설' },    // 예시 문화시설
  15: { id: '3411451', name: '행사/축제' },  // 예시 축제
  28: { id: '130040', name: '레포츠' },      // 예시 레포츠
  32: { id: '142830', name: '숙박' },        // 예시 숙박
  38: { id: '136099', name: '쇼핑' },        // 예시 쇼핑
  39: { id: '136073', name: '음식점' },      // 예시 음식점
};

async function fetchApi(endpoint, params) {
  const url = new URL(`${WORKERS_URL}/api/tour${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    return data;
  } catch (error) {
    return { error: error.message };
  }
}

async function testContentType(contentTypeId, info) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📌 ${info.name} (contentTypeId: ${contentTypeId})`);
  console.log(`   contentId: ${info.id}`);
  console.log('='.repeat(60));
  
  // 1. detailIntro2 (소개정보) 조회
  console.log('\n📋 detailIntro2 (소개정보):');
  const introResult = await fetchApi('/detailIntro2', {
    contentId: info.id,
    contentTypeId: contentTypeId,
    numOfRows: '1'
  });
  
  if (introResult.response?.body?.items?.item) {
    const item = Array.isArray(introResult.response.body.items.item) 
      ? introResult.response.body.items.item[0] 
      : introResult.response.body.items.item;
    
    const fields = Object.keys(item).filter(k => item[k] && item[k] !== '');
    console.log(`   필드 수: ${fields.length}`);
    console.log(`   필드 목록: ${fields.join(', ')}`);
    
    // 주요 필드 값 출력
    const importantFields = ['usetime', 'restdate', 'parking', 'infocenter', 'checkintime', 'checkouttime', 'opentime', 'firstmenu'];
    importantFields.forEach(field => {
      if (item[field]) {
        console.log(`   - ${field}: ${item[field].substring(0, 50)}...`);
      }
    });
  } else {
    console.log('   데이터 없음 또는 에러:', introResult.response?.header?.resultMsg || introResult.error);
  }
  
  // 2. detailInfo2 (반복정보) 조회
  console.log('\n📋 detailInfo2 (반복정보):');
  const infoResult = await fetchApi('/detailInfo2', {
    contentId: info.id,
    contentTypeId: contentTypeId,
    numOfRows: '10'
  });
  
  if (infoResult.response?.body?.items?.item) {
    const items = Array.isArray(infoResult.response.body.items.item) 
      ? infoResult.response.body.items.item 
      : [infoResult.response.body.items.item];
    
    console.log(`   항목 수: ${items.length}`);
    
    if (items.length > 0) {
      const fields = Object.keys(items[0]).filter(k => items[0][k] && items[0][k] !== '');
      console.log(`   필드 목록: ${fields.join(', ')}`);
      
      // 첫 번째 항목 상세
      console.log(`   첫 번째 항목:`);
      Object.entries(items[0]).forEach(([key, value]) => {
        if (value && value !== '') {
          const displayValue = String(value).length > 50 ? String(value).substring(0, 50) + '...' : value;
          console.log(`     - ${key}: ${displayValue}`);
        }
      });
    }
  } else {
    console.log('   데이터 없음 또는 에러:', infoResult.response?.header?.resultMsg || infoResult.error);
  }
}

async function main() {
  console.log('🔍 TourAPI detailIntro2 vs detailInfo2 비교');
  console.log('각 콘텐츠 타입별로 1개씩 조회합니다.\n');
  
  for (const [typeId, info] of Object.entries(TEST_CONTENT_IDS)) {
    await testContentType(typeId, info);
    // API 호출 간격
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n\n✅ 테스트 완료!');
}

main();
