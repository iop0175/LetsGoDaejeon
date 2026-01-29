/**
 * 음식점 overview에서 정보를 추출하여 intro_info에 저장하는 스크립트
 * 실행: node scripts/extractFoodIntroInfo.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://geczvsuzwpvdxiwbxqtf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlY3p2c3V6d3B2ZHhpd2J4cXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTUzMTksImV4cCI6MjA4NDM3MTMxOX0.rQXwLuP2IvoHQ7UM6Ftats0qaqIYyYG054op9c3KwMQ'
)

// 음식 타입 매핑
const foodTypePatterns = [
  { pattern: /쌈밥|쌈/, type: '쌈밥' },
  { pattern: /국밥|뚝배기/, type: '국밥' },
  { pattern: /냉면|물냉면|비빔냉면/, type: '냉면' },
  { pattern: /짬뽕/, type: '짬뽕' },
  { pattern: /칼국수|수제비/, type: '칼국수' },
  { pattern: /삼겹살|목살|갈비|고기/, type: '고기' },
  { pattern: /소고기|한우/, type: '한우' },
  { pattern: /치킨|닭/, type: '치킨' },
  { pattern: /초밥|스시|사시미/, type: '일식' },
  { pattern: /라멘|우동/, type: '일식' },
  { pattern: /파스타|스테이크|피자/, type: '양식' },
  { pattern: /짜장|탕수육|중식/, type: '중식' },
  { pattern: /빵|베이커리|제과/, type: '베이커리' },
  { pattern: /카페|커피/, type: '카페' },
  { pattern: /디저트|케이크/, type: '디저트' },
  { pattern: /족발|보쌈/, type: '족발/보쌈' },
  { pattern: /피자/, type: '피자' },
  { pattern: /버거|햄버거/, type: '버거' },
  { pattern: /분식|떡볶이|김밥/, type: '분식' },
  { pattern: /해물|회|생선/, type: '해산물' },
  { pattern: /한식|백반|정식/, type: '한식' }
]

// 맛 키워드 패턴
const tastePatterns = [
  { pattern: /담백|깔끔/, taste: '담백한' },
  { pattern: /매콤|맵|얼큰/, taste: '매콤한' },
  { pattern: /고소|구수/, taste: '고소한' },
  { pattern: /진한|깊은|깊은 맛/, taste: '진한' },
  { pattern: /시원|개운/, taste: '시원한' },
  { pattern: /달콤|달달/, taste: '달콤한' },
  { pattern: /신선|싱싱/, taste: '신선한' },
  { pattern: /부드러/, taste: '부드러운' },
  { pattern: /바삭|크리스피/, taste: '바삭한' },
  { pattern: /쫄깃|쫀득/, taste: '쫄깃한' }
]

// 고유 특징 패턴
const uniquePointPatterns = [
  { pattern: /직접.*재배|자체.*재배|직접.*기른/, value: '직접 재배한 신선한 재료' },
  { pattern: /수제|직접.*만든|손.*만든/, value: '정성스럽게 손수 만든' },
  { pattern: /전통.*비법|비법.*전수|대.*이어/, value: '대를 이어온 전통 비법' },
  { pattern: /매일.*공수|산지.*직송|신선.*재료/, value: '매일 공수하는 신선한 재료' },
  { pattern: /오래.*끓인|정성.*우려|깊은.*육수/, value: '오랜 시간 정성껏 우려낸 육수' },
  { pattern: /숯불|참숯|불맛/, value: '숯불로 구운' },
  { pattern: /100%|순.*100/, value: '엄선된 재료만 사용' },
  { pattern: /국내산|한우|토종/, value: '국내산 재료' },
  { pattern: /유기농|친환경/, value: '유기농/친환경 재료' },
  { pattern: /비건|채식/, value: '비건/채식 가능' }
]

// 메뉴명 직접 추출용 키워드
const menuKeywords = [
  // 밥류
  '쌈밥', '국밥', '비빔밥', '백반', '정식', '덮밥', '볶음밥', '김밥',
  // 면류
  '냉면', '칼국수', '수제비', '짬뽕', '짜장면', '우동', '라면', '파스타',
  // 탕/찌개류
  '삼계탕', '감자탕', '부대찌개', '된장찌개', '김치찌개', '순두부', '해물탕',
  // 고기류
  '삼겹살', '갈비', '불고기', '목살', '한우', '소고기', '양념갈비',
  // 기타
  '떡볶이', '순대', '족발', '보쌈', '치킨', '돈까스', '피자', '버거'
]

/**
 * overview에서 정보 추출
 */
function extractInfoFromOverview(title, overview, addr1) {
  const text = (overview || '').replace(/<[^>]*>/g, '').toLowerCase()
  const titleLower = title.toLowerCase()
  
  // 주소에서 위치 정보 추출
  const addressParts = (addr1 || '').split(' ')
  const city = addressParts.find(p => p.includes('시') || p.includes('광역시')) || '대전광역시'
  const district = addressParts.find(p => p.includes('구')) || ''
  const neighborhood = addressParts.find(p => p.includes('동') || p.includes('로') || p.includes('길')) || ''
  
  // 음식 타입 추출
  let foodType = '맛집'
  for (const { pattern, type } of foodTypePatterns) {
    if (pattern.test(text) || pattern.test(titleLower)) {
      foodType = type
      break
    }
  }
  
  // 맛 키워드 추출
  let tasteKeyword = '맛있는'
  for (const { pattern, taste } of tastePatterns) {
    if (pattern.test(text)) {
      tasteKeyword = taste
      break
    }
  }
  
  // 고유 특징 추출
  let uniquePoint = null
  for (const { pattern, value } of uniquePointPatterns) {
    if (pattern.test(text)) {
      uniquePoint = value
      break
    }
  }
  
  // 메뉴 추출 - overview와 제목에서 메뉴 키워드 찾기
  const menus = []
  const originalText = (overview || '') + ' ' + title
  
  // 메뉴 키워드에서 찾기
  for (const keyword of menuKeywords) {
    if (originalText.includes(keyword) && !menus.includes(keyword)) {
      menus.push(keyword)
      if (menus.length >= 2) break
    }
  }
  
  // 제목에서 ~전문점, ~집 형태로 메뉴 추출
  if (menus.length === 0) {
    const titleMenuMatch = title.match(/([가-힣]{2,6})(?:전문점|집|가|네|하우스)/)
    if (titleMenuMatch && titleMenuMatch[1].length <= 6) {
      menus.push(titleMenuMatch[1])
    }
  }
  
  return {
    place_name: title,
    city: city.replace('광역', ''),
    district,
    neighborhood,
    food_type: foodType,
    signature_menu_1: menus[0] || null,
    signature_menu_2: menus[1] || null,
    taste_keyword: tasteKeyword,
    unique_point: uniquePoint,
    visit_purpose: '식사',
    extracted_at: new Date().toISOString()
  }
}

async function main() {
  console.log('음식점 intro_info 추출 시작...')
  
  // 모든 음식점 조회 (재추출)
  const { data: restaurants, error } = await supabase
    .from('tour_spots')
    .select('id, title, overview, addr1')
    .eq('content_type_id', '39')
  
  if (error) {
    console.error('조회 에러:', error.message)
    return
  }
  
  console.log(`총 ${restaurants.length}개 음식점 처리 예정`)
  
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = restaurants[i]
    
    try {
      // overview에서 정보 추출
      const introInfo = extractInfoFromOverview(
        restaurant.title,
        restaurant.overview,
        restaurant.addr1
      )
      
      // intro_info 업데이트
      const { error: updateError } = await supabase
        .from('tour_spots')
        .update({ intro_info: introInfo })
        .eq('id', restaurant.id)
      
      if (updateError) {
        console.error(`[${i + 1}/${restaurants.length}] 업데이트 실패: ${restaurant.title}`, updateError.message)
        errorCount++
      } else {
        successCount++
        if ((i + 1) % 50 === 0) {
          console.log(`[${i + 1}/${restaurants.length}] 진행 중... (성공: ${successCount}, 실패: ${errorCount})`)
        }
      }
    } catch (err) {
      console.error(`[${i + 1}/${restaurants.length}] 처리 에러: ${restaurant.title}`, err.message)
      errorCount++
    }
  }
  
  console.log('\n===== 완료 =====')
  console.log(`성공: ${successCount}`)
  console.log(`실패: ${errorCount}`)
}

main()
