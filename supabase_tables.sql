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
  link TEXT DEFAULT '/',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 히어로 슬라이드 인덱스
CREATE INDEX IF NOT EXISTS idx_hero_slides_active ON hero_slides(is_active, sort_order);
