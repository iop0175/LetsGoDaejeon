-- 대전 관광 데이터 저장을 위한 Supabase 테이블 스키마
-- Supabase SQL Editor에서 실행하세요

-- 1. 관광지 테이블
CREATE TABLE IF NOT EXISTS travel_spots (
  id SERIAL PRIMARY KEY,
  "tourspotNm" TEXT UNIQUE NOT NULL,
  "tourspotAddr" TEXT,
  "tourspotSumm" TEXT,
  "signguNm" TEXT,
  "imageUrl" TEXT,
  page_type TEXT DEFAULT 'travel',
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  saved_by TEXT,
  raw_data JSONB
);

-- 2. 축제/행사 테이블
CREATE TABLE IF NOT EXISTS festivals (
  id SERIAL PRIMARY KEY,
  title TEXT UNIQUE NOT NULL,
  "themeCdNm" TEXT,
  "placeCdNm" TEXT,
  "beginDt" TEXT,
  "endDt" TEXT,
  "imageUrl" TEXT,
  page_type TEXT DEFAULT 'festival',
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  saved_by TEXT,
  raw_data JSONB
);

-- 3. 맛집 테이블
CREATE TABLE IF NOT EXISTS restaurants (
  id SERIAL PRIMARY KEY,
  "restrntNm" TEXT UNIQUE NOT NULL,
  "restrntAddr" TEXT,
  "reprMenu" TEXT,
  "telNo" TEXT,
  "signguNm" TEXT,
  "imageUrl" TEXT,
  page_type TEXT DEFAULT 'food',
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  saved_by TEXT,
  raw_data JSONB
);

-- 4. 문화시설 테이블
CREATE TABLE IF NOT EXISTS cultural_facilities (
  id SERIAL PRIMARY KEY,
  "fcltyNm" TEXT UNIQUE NOT NULL,
  locplc TEXT,
  "fcltyKnd" TEXT,
  "operTime" TEXT,
  "imageUrl" TEXT,
  page_type TEXT DEFAULT 'culture',
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  saved_by TEXT,
  raw_data JSONB
);

-- 5. 의료시설 테이블
CREATE TABLE IF NOT EXISTS medical_facilities (
  id SERIAL PRIMARY KEY,
  "hsptlNm" TEXT UNIQUE NOT NULL,
  locplc TEXT,
  "hsptlKnd" TEXT,
  "fondSe" TEXT,
  telno TEXT,
  "imageUrl" TEXT,
  page_type TEXT DEFAULT 'medical',
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  saved_by TEXT,
  raw_data JSONB
);

-- 6. 쇼핑 테이블
CREATE TABLE IF NOT EXISTS shopping_places (
  id SERIAL PRIMARY KEY,
  "shppgNm" TEXT UNIQUE NOT NULL,
  "shppgAddr" TEXT,
  "shppgIntro" TEXT,
  "telNo" TEXT,
  "imageUrl" TEXT,
  page_type TEXT DEFAULT 'shopping',
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  saved_by TEXT,
  raw_data JSONB
);

-- 7. 숙박 테이블
CREATE TABLE IF NOT EXISTS accommodations (
  id SERIAL PRIMARY KEY,
  "romsNm" TEXT UNIQUE NOT NULL,
  "romsAddr" TEXT,
  "romsScl" TEXT,
  "romsRefadNo" TEXT,
  "imageUrl" TEXT,
  page_type TEXT DEFAULT 'accommodation',
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  saved_by TEXT,
  raw_data JSONB
);

-- 8. 주차장 테이블
CREATE TABLE IF NOT EXISTS parking_lots (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  addr TEXT,
  "parkingType" TEXT,
  "totalLot" TEXT,
  "chargeInfo" TEXT,
  "imageUrl" TEXT,
  page_type TEXT DEFAULT 'parking',
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  saved_by TEXT,
  raw_data JSONB
);

-- RLS (Row Level Security) 활성화 (선택사항)
-- ALTER TABLE travel_spots ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE festivals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cultural_facilities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE medical_facilities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shopping_places ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자만 CRUD 가능한 정책 (선택사항)
-- CREATE POLICY "Enable all for authenticated users" ON travel_spots
--   FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- (다른 테이블에도 동일하게 적용)

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_travel_spots_name ON travel_spots("tourspotNm");
CREATE INDEX IF NOT EXISTS idx_festivals_title ON festivals(title);
CREATE INDEX IF NOT EXISTS idx_restaurants_name ON restaurants("restrntNm");
CREATE INDEX IF NOT EXISTS idx_cultural_facilities_name ON cultural_facilities("fcltyNm");
CREATE INDEX IF NOT EXISTS idx_medical_facilities_name ON medical_facilities("hsptlNm");
CREATE INDEX IF NOT EXISTS idx_shopping_places_name ON shopping_places("shppgNm");
CREATE INDEX IF NOT EXISTS idx_accommodations_name ON accommodations("romsNm");
CREATE INDEX IF NOT EXISTS idx_parking_lots_name ON parking_lots(name);

-- ============================================================
-- 마이그레이션: 기존 테이블에 imageUrl 컬럼 추가
-- (이미 테이블이 있는 경우 아래 SQL을 실행하세요)
-- ============================================================
ALTER TABLE travel_spots ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE festivals ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE cultural_facilities ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE medical_facilities ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE shopping_places ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- ============================================================
-- 마이그레이션: 이미지 출처 정보 컬럼 추가
-- image_author: 사진 원작자/촬영자
-- image_source: 이미지를 가져온 출처 (URL, 사이트명 등)
-- ============================================================
ALTER TABLE travel_spots ADD COLUMN IF NOT EXISTS image_author TEXT;
ALTER TABLE travel_spots ADD COLUMN IF NOT EXISTS image_source TEXT;

ALTER TABLE festivals ADD COLUMN IF NOT EXISTS image_author TEXT;
ALTER TABLE festivals ADD COLUMN IF NOT EXISTS image_source TEXT;

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS image_author TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS image_source TEXT;

ALTER TABLE cultural_facilities ADD COLUMN IF NOT EXISTS image_author TEXT;
ALTER TABLE cultural_facilities ADD COLUMN IF NOT EXISTS image_source TEXT;

ALTER TABLE medical_facilities ADD COLUMN IF NOT EXISTS image_author TEXT;
ALTER TABLE medical_facilities ADD COLUMN IF NOT EXISTS image_source TEXT;

ALTER TABLE shopping_places ADD COLUMN IF NOT EXISTS image_author TEXT;
ALTER TABLE shopping_places ADD COLUMN IF NOT EXISTS image_source TEXT;

ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS image_author TEXT;
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS image_source TEXT;

ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS image_author TEXT;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS image_source TEXT;

-- ============================================================
-- 마이그레이션: updated_at 컬럼 추가
-- 데이터 수정 시간을 추적하기 위한 컬럼
-- ============================================================
ALTER TABLE travel_spots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE festivals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE cultural_facilities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE medical_facilities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE shopping_places ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 각 테이블에 트리거 추가 (행 업데이트 시 updated_at 자동 갱신)
DROP TRIGGER IF EXISTS update_travel_spots_updated_at ON travel_spots;
CREATE TRIGGER update_travel_spots_updated_at
  BEFORE UPDATE ON travel_spots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_festivals_updated_at ON festivals;
CREATE TRIGGER update_festivals_updated_at
  BEFORE UPDATE ON festivals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cultural_facilities_updated_at ON cultural_facilities;
CREATE TRIGGER update_cultural_facilities_updated_at
  BEFORE UPDATE ON cultural_facilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_medical_facilities_updated_at ON medical_facilities;
CREATE TRIGGER update_medical_facilities_updated_at
  BEFORE UPDATE ON medical_facilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopping_places_updated_at ON shopping_places;
CREATE TRIGGER update_shopping_places_updated_at
  BEFORE UPDATE ON shopping_places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accommodations_updated_at ON accommodations;
CREATE TRIGGER update_accommodations_updated_at
  BEFORE UPDATE ON accommodations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parking_lots_updated_at ON parking_lots;
CREATE TRIGGER update_parking_lots_updated_at
  BEFORE UPDATE ON parking_lots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. 히어로 슬라이드 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS hero_slides (
  id SERIAL PRIMARY KEY,
  title_ko TEXT NOT NULL,
  title_en TEXT,
  subtitle_ko TEXT,
  subtitle_en TEXT,
  description_ko TEXT,
  description_en TEXT,
  "imageUrl" TEXT NOT NULL,
  image_author TEXT,
  image_source TEXT,
  link TEXT DEFAULT '/',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 히어로 슬라이드 인덱스
CREATE INDEX IF NOT EXISTS idx_hero_slides_active ON hero_slides(is_active, sort_order);

-- 히어로 슬라이드 이미지 출처 컬럼 마이그레이션
ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS image_author TEXT;
ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS image_source TEXT;

-- ============================================================
-- 10. 페이지 방문 통계 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS page_visits (
  id SERIAL PRIMARY KEY,
  page_name TEXT NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_name, visit_date)
);

-- 페이지 방문 통계 인덱스
CREATE INDEX IF NOT EXISTS idx_page_visits_date ON page_visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_page ON page_visits(page_name, visit_date);

-- ============================================================
-- 11. 검색 기록 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS search_logs (
  id SERIAL PRIMARY KEY,
  search_query TEXT NOT NULL,
  search_date DATE NOT NULL DEFAULT CURRENT_DATE,
  search_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(search_query, search_date)
);

-- 검색 기록 인덱스
CREATE INDEX IF NOT EXISTS idx_search_logs_date ON search_logs(search_date DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(search_query, search_date);
CREATE INDEX IF NOT EXISTS idx_search_logs_count ON search_logs(search_count DESC);

-- ============================================================
-- 12. 여행 계획 테이블 (Trip Plans)
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_plans (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  accommodation_name TEXT,
  accommodation_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 숙소 정보 컬럼 추가 (기존 테이블에 실행)
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS accommodation_name TEXT;
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS accommodation_address TEXT;

-- 여행 계획 인덱스
CREATE INDEX IF NOT EXISTS idx_trip_plans_user ON trip_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_plans_dates ON trip_plans(start_date, end_date);

-- ============================================================
-- 13. 여행 일정 테이블 (Trip Days)
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_days (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES trip_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, day_number)
);

-- 여행 일정 인덱스
CREATE INDEX IF NOT EXISTS idx_trip_days_plan ON trip_days(plan_id);

-- ============================================================
-- 14. 여행 장소 테이블 (Trip Places)
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_places (
  id SERIAL PRIMARY KEY,
  day_id INTEGER NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  place_type TEXT NOT NULL,
  place_name TEXT NOT NULL,
  place_address TEXT,
  place_description TEXT,
  place_image TEXT,
  image_author TEXT,
  image_source TEXT,
  order_index INTEGER DEFAULT 0,
  visit_time TIME,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 여행 장소 인덱스
CREATE INDEX IF NOT EXISTS idx_trip_places_day ON trip_places(day_id);
CREATE INDEX IF NOT EXISTS idx_trip_places_order ON trip_places(day_id, order_index);

-- 여행 장소 이미지 출처 컬럼 마이그레이션
ALTER TABLE trip_places ADD COLUMN IF NOT EXISTS image_author TEXT;
ALTER TABLE trip_places ADD COLUMN IF NOT EXISTS image_source TEXT;

-- 여행 장소 이동 방법 컬럼 마이그레이션
ALTER TABLE trip_places ADD COLUMN IF NOT EXISTS transport_to_next TEXT;

-- ============================================================
-- 15. 여행 계획 RLS 정책 (Row Level Security)
-- ============================================================
-- trip_plans RLS
ALTER TABLE trip_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trip plans"
  ON trip_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trip plans"
  ON trip_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip plans"
  ON trip_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip plans"
  ON trip_plans FOR DELETE
  USING (auth.uid() = user_id);

-- trip_days RLS
ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their trip days"
  ON trip_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trip_plans 
      WHERE trip_plans.id = trip_days.plan_id 
      AND trip_plans.user_id = auth.uid()
    )
  );

-- trip_places RLS
ALTER TABLE trip_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their trip places"
  ON trip_places FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trip_days 
      JOIN trip_plans ON trip_plans.id = trip_days.plan_id
      WHERE trip_days.id = trip_places.day_id 
      AND trip_plans.user_id = auth.uid()
    )
  );
