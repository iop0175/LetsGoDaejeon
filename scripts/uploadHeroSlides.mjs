// 히어로 슬라이드 데이터 업로드 스크립트
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://geczvsuzwpvdxiwbxqtf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlY3p2c3V6d3B2ZHhpd2J4cXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTUzMTksImV4cCI6MjA4NDM3MTMxOX0.rQXwLuP2IvoHQ7UM6Ftats0qaqIYyYG054op9c3KwMQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Hero 슬라이드 데이터
const heroSlides = [
  {
    title_ko: '대전의 봄',
    title_en: 'Spring in Daejeon',
    subtitle_ko: '벚꽃이 만개한 대전의 봄을 만나보세요',
    subtitle_en: 'Experience the blooming cherry blossoms in Daejeon',
    description_ko: '유성온천, 한밭수목원에서 펼쳐지는 봄꽃 향연',
    description_en: 'Spring flower festival at Yuseong Hot Spring and Hanbat Arboretum',
    imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920&h=1080&fit=crop',
    link: '/travel',
    sort_order: 1,
    is_active: true
  },
  {
    title_ko: '과학의 도시',
    title_en: 'City of Science',
    subtitle_ko: '대한민국 과학수도 대전',
    subtitle_en: 'Daejeon, the Science Capital of Korea',
    description_ko: '국립중앙과학관, 대전엑스포과학공원에서 미래를 만나다',
    description_en: 'Meet the future at National Science Museum and Daejeon Expo Science Park',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&h=1080&fit=crop',
    link: '/travel',
    sort_order: 2,
    is_active: true
  },
  {
    title_ko: '맛의 고장',
    title_en: 'Land of Flavors',
    subtitle_ko: '대전의 숨겨진 맛집을 찾아서',
    subtitle_en: 'Discover hidden culinary gems in Daejeon',
    description_ko: '성심당, 두부두루치기... 대전만의 특별한 맛',
    description_en: 'Seongsimdang bakery, Tofu Duruchimu... Special tastes unique to Daejeon',
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=1080&fit=crop',
    link: '/food',
    sort_order: 3,
    is_active: true
  }
]

async function uploadHeroSlides() {
  console.log('히어로 슬라이드 업로드 시작...')
  
  // 기존 데이터 확인
  const { data: existingSlides, error: checkError } = await supabase
    .from('hero_slides')
    .select('*')
  
  if (checkError) {
    console.error('기존 데이터 확인 오류:', checkError)
    return
  }
  
  console.log('기존 슬라이드 수:', existingSlides?.length || 0)
  
  // 새 슬라이드 삽입
  const { data, error } = await supabase
    .from('hero_slides')
    .insert(heroSlides)
    .select()
  
  if (error) {
    console.error('업로드 오류:', error)
    return
  }
  
  console.log('✅ 업로드 성공!')
  console.log('업로드된 슬라이드:')
  data.forEach((slide, idx) => {
    console.log(`  ${idx + 1}. ${slide.title_ko} (ID: ${slide.id})`)
  })
}

uploadHeroSlides()
