// page_visits 테이블 생성 스크립트
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://geczvsuzwpvdxiwbxqtf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlY3p2c3V6d3B2ZHhpd2J4cXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTUzMTksImV4cCI6MjA4NDM3MTMxOX0.rQXwLuP2IvoHQ7UM6Ftats0qaqIYyYG054op9c3KwMQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testPageVisits() {
  console.log('page_visits 테이블 테스트 시작...')
  
  // 테이블 존재 여부 확인
  const { data, error } = await supabase
    .from('page_visits')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('테이블 접근 오류:', error.message)
    console.log('\n⚠️ page_visits 테이블이 없습니다.')
    console.log('\nSupabase SQL Editor에서 다음 SQL을 실행하세요:\n')
    console.log(`
CREATE TABLE IF NOT EXISTS page_visits (
  id SERIAL PRIMARY KEY,
  page_name TEXT NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_name, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_page_visits_date ON page_visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_page ON page_visits(page_name, visit_date);
    `)
    return
  }
  
  console.log('✅ page_visits 테이블이 존재합니다.')
  console.log('현재 레코드 수:', data?.length || 0)
  
  // 테스트 방문 기록 삽입
  const today = new Date().toISOString().split('T')[0]
  
  const { error: insertError } = await supabase
    .from('page_visits')
    .upsert([
      { page_name: 'home', visit_date: today, visit_count: 1 }
    ], { onConflict: 'page_name,visit_date' })
  
  if (insertError) {
    console.error('삽입 테스트 실패:', insertError)
  } else {
    console.log('✅ 삽입 테스트 성공')
  }
}

testPageVisits()
