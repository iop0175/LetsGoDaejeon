/**
 * TourAPI에서 overview가 있는 지역코드 3(대전) 데이터 조회 테스트
 */

const WORKERS_API_URL = 'https://letsgodaejeon-api.daegieun700.workers.dev';

async function fetchTourApiData(contentTypeId = '12', pageNo = 1, numOfRows = 100) {
  const params = new URLSearchParams({
    areaCode: '3',
    numOfRows: String(numOfRows),
    pageNo: String(pageNo),
    contentTypeId,
    arrange: 'C'
  });

  console.log('API 요청:', `${WORKERS_API_URL}/api/tour/areaBasedList2?${params.toString()}`);
  
  const response = await fetch(`${WORKERS_API_URL}/api/tour/areaBasedList2?${params.toString()}`, {
    headers: {
      'Origin': 'http://localhost:3000'
    }
  });
  const data = await response.json();
  
  console.log('API 응답 코드:', data.response?.header?.resultCode);
  console.log('응답 메시지:', data.response?.header?.resultMsg);
  
  if (data.response?.header?.resultCode === '0000') {
    const items = data.response.body.items?.item || [];
    return Array.isArray(items) ? items : (items ? [items] : []);
  }
  console.log('전체 응답:', JSON.stringify(data).substring(0, 500));
  return [];
}

async function fetchDetailWithOverview(contentId) {
  // TourAPI 2.0의 detailCommon2에서는 contentId만 필수
  // Y/N 옵션은 필요없이 기본적으로 모든 정보 반환
  const params = new URLSearchParams({
    contentId
  });

  const response = await fetch(`${WORKERS_API_URL}/api/tour/detailCommon2?${params.toString()}`, {
    headers: {
      'Origin': 'http://localhost:3000'
    }
  });
  const data = await response.json();
  
  if (data.response?.header?.resultCode === '0000') {
    const items = data.response.body.items?.item || [];
    const item = Array.isArray(items) ? items[0] : items;
    console.log(`   API 응답 필드:`, Object.keys(item || {}).join(', '));
    if (item?.overview) {
      console.log(`   overview 미리보기:`, item.overview.substring(0, 80) + '...');
    }
    return item;
  }
  console.log(`   상세정보 실패:`, data.response?.header?.resultMsg || JSON.stringify(data).substring(0, 200));
  return null;
}

async function main() {
  console.log('=== TourAPI 대전(지역코드 3) 데이터에서 overview 확인 ===\n');
  
  // 관광지(12) 데이터 조회
  const contentTypeId = '12';
  const items = await fetchTourApiData(contentTypeId, 1, 10);
  
  console.log(`총 ${items.length}개 데이터 가져옴\n`);
  
  // 각 아이템에 대해 상세정보(overview) 조회
  let withOverviewCount = 0;
  let withoutOverviewCount = 0;
  
  for (const item of items.slice(0, 10)) {
    const detail = await fetchDetailWithOverview(item.contentid);
    
    if (detail?.overview) {
      withOverviewCount++;
      console.log(`✅ [${item.contentid}] ${item.title}`);
      console.log(`   overview: ${detail.overview.substring(0, 100)}...`);
      console.log();
    } else {
      withoutOverviewCount++;
      console.log(`❌ [${item.contentid}] ${item.title} - overview 없음`);
    }
    
    // API 호출 간격
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n=== 결과 요약 ===');
  console.log(`overview 있음: ${withOverviewCount}개`);
  console.log(`overview 없음: ${withoutOverviewCount}개`);
}

main().catch(console.error);
