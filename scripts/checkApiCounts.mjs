import https from 'https';

// Workers 프록시 API 사용
const WORKERS_URL = 'https://letsgodaejeon-api.daegieun700.workers.dev';

function getCount(service, typeId) {
  return new Promise((resolve, reject) => {
    // service에 따라 다른 엔드포인트 사용
    const isEng = service === 'EngService2';
    const endpoint = isEng ? 'tour-en' : 'tour';
    const url = `${WORKERS_URL}/api/${endpoint}/areaBasedList2?contentTypeId=${typeId}&numOfRows=1&pageNo=1&areaCode=3`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // TourAPI 응답 구조: response.body.totalCount
          const totalCount = json.response?.body?.totalCount || 0;
          resolve(totalCount);
        } catch(e) {
          resolve('Error: ' + e.message + ' - ' + data.substring(0, 100));
        }
      });
    }).on('error', (e) => resolve('Error: ' + e.message));
  });
}

async function main() {
  console.log('=== 국문 API (KorService2) - 지역코드 3 (대전) ===');
  const korTypes = [
    ['관광지', '12'], 
    ['문화시설', '14'], 
    ['행사/축제', '15'], 
    ['여행코스', '25'], 
    ['레포츠', '28'], 
    ['숙박', '32'], 
    ['쇼핑', '38'], 
    ['음식점', '39']
  ];
  let korTotal = 0;
  for(const [name, id] of korTypes) {
    const count = await getCount('KorService2', id);
    if (typeof count === 'number') korTotal += count;
    console.log(`${name} (${id}): ${count}개`);
  }
  console.log(`국문 합계: ${korTotal}개`);
  
  console.log('\n=== 영문 API (EngService2) - 지역코드 3 (대전) ===');
  const engTypes = [
    ['관광지', '76'], 
    ['문화시설', '78'], 
    ['행사/축제', '85'], 
    ['레포츠', '75'], 
    ['숙박', '80'], 
    ['쇼핑', '79'], 
    ['음식점', '82']
  ];
  let engTotal = 0;
  for(const [name, id] of engTypes) {
    const count = await getCount('EngService2', id);
    if (typeof count === 'number') engTotal += count;
    console.log(`${name} (${id}): ${count}개`);
  }
  console.log(`영문 합계: ${engTotal}개`);
  
  console.log('\n=== 비교 ===');
  console.log(`국문 총: ${korTotal}개, 영문 총: ${engTotal}개`);
  console.log(`영문 커버리지: ${((engTotal/korTotal)*100).toFixed(1)}%`);
}

main().catch(console.error);
