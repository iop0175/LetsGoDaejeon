// 히어로 슬라이드 확인 스크립트
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://geczvsuzwpvdxiwbxqtf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlY3p2c3V6d3B2ZHhpd2J4cXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTUzMTksImV4cCI6MjA4NDM3MTMxOX0.rQXwLuP2IvoHQ7UM6Ftats0qaqIYyYG054op9c3KwMQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkHeroSlides() {
  const { data, error } = await supabase
    .from('hero_slides')
    .select('*')
    .order('sort_order')
  
  if (error) {
    console.error('조회 오류:', error)
    return
  }
  
  console.log('=== 현재 히어로 슬라이드 ===')
  console.log('총 개수:', data.length)
  data.forEach((slide, idx) => {
    console.log(`\n${idx + 1}. ID: ${slide.id}`)
    console.log(`   제목: ${slide.title_ko} / ${slide.title_en}`)
    console.log(`   부제목: ${slide.subtitle_ko}`)
    console.log(`   링크: ${slide.link}`)
    console.log(`   활성: ${slide.is_active}`)
  })
}

checkHeroSlides()
