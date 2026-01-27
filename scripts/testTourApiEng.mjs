/**
 * TourAPI 국문/영문 content_id 매핑 테스트
 */

const WORKERS_API_URL = 'https://letsgodaejeon-api.daegieun700.workers.dev';

// 국문 관광지 목록 조회
async function fetchKorSpots(contentTypeId = '12', pageNo = 1, numOfRows = 10) {
  const params = new URLSearchParams({
    areaCode: '3',  // 대전
    numOfRows: String(numOfRows),
    pageNo: String(pageNo),
    contentTypeId,
    arrange: 'C'
  });
  
  const response = await fetch(`${WORKERS_API_URL}/api/tour/areaBasedList2?${params.toString()}`, {
    headers: { 'Origin': 'http://localhost:3000' }
  });
  const data = await response.json();
  
  if (data.response?.header?.resultCode === '0000') {
    const items = data.response.body.items?.item || [];
    return Array.isArray(items) ? items : (items ? [items] : []);
  }
  return [];
}

// 영문 관광지 목록 조회
async function fetchEngSpots(contentTypeId = '76', pageNo = 1, numOfRows = 10) {
  const params = new URLSearchParams({
    areaCode: '3',  // 대전
    numOfRows: String(numOfRows),
    pageNo: String(pageNo),
    contentTypeId,
    arrange: 'C'
  });
  
  const response = await fetch(`${WORKERS_API_URL}/api/tour-en/areaBasedList2?${params.toString()}`, {
    headers: { 'Origin': 'http://localhost:3000' }
  });
  const data = await response.json();
  
  if (data.response?.header?.resultCode === '0000') {
    const items = data.response.body.items?.item || [];
    return Array.isArray(items) ? items : (items ? [items] : []);
  }
  return [];
}

async function main() {
  console.log('=== TourAPI 국문/영문 content_id 매핑 테스트 ===\n');
  
  // 국문 관광지(12) 조회
  console.log('[1] 국문 관광지(contentTypeId=12) 조회...');
  const korSpots = await fetchKorSpots('12', 1, 50);
  console.log(`   → ${korSpots.length}개 조회됨\n`);
  
  // 영문 관광지(76) 조회
  console.log('[2] 영문 관광지(contentTypeId=76) 조회...');
  const engSpots = await fetchEngSpots('76', 1, 50);
  console.log(`   → ${engSpots.length}개 조회됨\n`);
  
  // content_id 매핑 확인
  console.log('=== content_id 매핑 분석 ===\n');
  
  const korIds = new Set(korSpots.map(s => s.contentid));
  const engIds = new Set(engSpots.map(s => s.contentid));
  
  // 공통 content_id 찾기
  const commonIds = [...korIds].filter(id => engIds.has(id));
  
  console.log(`국문 전용 content_id: ${korIds.size - commonIds.length}개`);
  console.log(`영문 전용 content_id: ${engIds.size - commonIds.length}개`);
  console.log(`공통 content_id: ${commonIds.length}개\n`);
  
  if (commonIds.length > 0) {
    console.log('--- 공통 content_id 예시 (상위 5개) ---');
    for (const id of commonIds.slice(0, 5)) {
      const korSpot = korSpots.find(s => s.contentid === id);
      const engSpot = engSpots.find(s => s.contentid === id);
      console.log(`[${id}]`);
      console.log(`  국문: ${korSpot?.title}`);
      console.log(`  영문: ${engSpot?.title}`);
      console.log();
    }
  }
  
  if (commonIds.length === 0) {
    console.log('⚠️ 국문과 영문에서 동일한 content_id가 없습니다!');
    console.log('\n--- 국문 content_id 샘플 ---');
    korSpots.slice(0, 5).forEach(s => console.log(`  [${s.contentid}] ${s.title}`));
    console.log('\n--- 영문 content_id 샘플 ---');
    engSpots.slice(0, 5).forEach(s => console.log(`  [${s.contentid}] ${s.title}`));
    
    // 이름으로 매칭 시도
    console.log('\n--- 이름 기반 매칭 시도 ---');
    for (const engSpot of engSpots.slice(0, 10)) {
      // 영문 제목에서 괄호 안의 한글 추출
      const korNameMatch = engSpot.title.match(/\(([^)]+)\)/);
      if (korNameMatch) {
        const korName = korNameMatch[1];
        const matchedKor = korSpots.find(k => k.title.includes(korName));
        if (matchedKor) {
          console.log(`✅ 매칭됨:`);
          console.log(`   영문: [${engSpot.contentid}] ${engSpot.title}`);
          console.log(`   국문: [${matchedKor.contentid}] ${matchedKor.title}`);
          console.log(`   content_id 동일: ${engSpot.contentid === matchedKor.contentid ? '예' : '아니오'}`);
          console.log();
        }
      }
    }
  }
  
  console.log('\n=== 테스트 완료 ===');
}

main().catch(console.error);
