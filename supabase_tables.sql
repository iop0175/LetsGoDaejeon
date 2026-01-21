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

-- ============================================================
-- RLS (Row Level Security) 설정 - 공개 데이터 테이블
-- 이 테이블들은 모든 사용자가 읽을 수 있어야 함
-- ============================================================

-- travel_spots RLS
ALTER TABLE travel_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read travel_spots" ON travel_spots FOR SELECT USING (true);
CREATE POLICY "Service role can insert travel_spots" ON travel_spots FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update travel_spots" ON travel_spots FOR UPDATE USING (true);
CREATE POLICY "Service role can delete travel_spots" ON travel_spots FOR DELETE USING (true);

-- festivals RLS
ALTER TABLE festivals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read festivals" ON festivals FOR SELECT USING (true);
CREATE POLICY "Service role can insert festivals" ON festivals FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update festivals" ON festivals FOR UPDATE USING (true);
CREATE POLICY "Service role can delete festivals" ON festivals FOR DELETE USING (true);

-- restaurants RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read restaurants" ON restaurants FOR SELECT USING (true);
CREATE POLICY "Service role can insert restaurants" ON restaurants FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update restaurants" ON restaurants FOR UPDATE USING (true);
CREATE POLICY "Service role can delete restaurants" ON restaurants FOR DELETE USING (true);

-- cultural_facilities RLS
ALTER TABLE cultural_facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cultural_facilities" ON cultural_facilities FOR SELECT USING (true);
CREATE POLICY "Service role can insert cultural_facilities" ON cultural_facilities FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update cultural_facilities" ON cultural_facilities FOR UPDATE USING (true);
CREATE POLICY "Service role can delete cultural_facilities" ON cultural_facilities FOR DELETE USING (true);

-- medical_facilities RLS
ALTER TABLE medical_facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read medical_facilities" ON medical_facilities FOR SELECT USING (true);
CREATE POLICY "Service role can insert medical_facilities" ON medical_facilities FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update medical_facilities" ON medical_facilities FOR UPDATE USING (true);
CREATE POLICY "Service role can delete medical_facilities" ON medical_facilities FOR DELETE USING (true);

-- shopping_places RLS
ALTER TABLE shopping_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read shopping_places" ON shopping_places FOR SELECT USING (true);
CREATE POLICY "Service role can insert shopping_places" ON shopping_places FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update shopping_places" ON shopping_places FOR UPDATE USING (true);
CREATE POLICY "Service role can delete shopping_places" ON shopping_places FOR DELETE USING (true);

-- accommodations RLS
ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read accommodations" ON accommodations FOR SELECT USING (true);
CREATE POLICY "Service role can insert accommodations" ON accommodations FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update accommodations" ON accommodations FOR UPDATE USING (true);
CREATE POLICY "Service role can delete accommodations" ON accommodations FOR DELETE USING (true);

-- parking_lots RLS
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read parking_lots" ON parking_lots FOR SELECT USING (true);
CREATE POLICY "Service role can insert parking_lots" ON parking_lots FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update parking_lots" ON parking_lots FOR UPDATE USING (true);
CREATE POLICY "Service role can delete parking_lots" ON parking_lots FOR DELETE USING (true);

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

-- hero_slides RLS
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read hero_slides" ON hero_slides FOR SELECT USING (true);
CREATE POLICY "Service role can manage hero_slides" ON hero_slides FOR ALL USING (true) WITH CHECK (true);

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

-- page_visits RLS (익명 사용자도 방문 기록 추가 가능)
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read page_visits" ON page_visits FOR SELECT USING (true);
CREATE POLICY "Anyone can insert page_visits" ON page_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update page_visits" ON page_visits FOR UPDATE USING (true);

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

-- search_logs RLS (익명 사용자도 검색 기록 추가 가능)
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read search_logs" ON search_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert search_logs" ON search_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update search_logs" ON search_logs FOR UPDATE USING (true);

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

-- 여행 장소 좌표 및 체류시간 컬럼 마이그레이션
ALTER TABLE trip_places ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE trip_places ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE trip_places ADD COLUMN IF NOT EXISTS stay_duration INTEGER;

-- 여행 장소 다음 장소까지 대중교통 정보 컬럼 마이그레이션
-- transit_to_next: 다음 장소까지의 대중교통 정보 (JSONB)
-- 예: {"bus": {"totalTime": 15, "routes": ["301", "802"]}, "subway": {"totalTime": 20, "lines": ["1호선"]}}
ALTER TABLE trip_places ADD COLUMN IF NOT EXISTS transit_to_next JSONB;

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

-- ============================================================
-- 16. 경로 캐시 테이블 (Route Cache)
-- API 호출을 최소화하기 위해 경로 정보를 캐싱
-- ============================================================
CREATE TABLE IF NOT EXISTS route_cache (
  id SERIAL PRIMARY KEY,
  -- 출발지/도착지 좌표 (소수점 4자리까지 반올림하여 근사 매칭)
  origin_lat DECIMAL(8, 4) NOT NULL,
  origin_lng DECIMAL(9, 4) NOT NULL,
  dest_lat DECIMAL(8, 4) NOT NULL,
  dest_lng DECIMAL(9, 4) NOT NULL,
  -- 이동수단 (car, bus, subway, walk)
  transport_type TEXT NOT NULL,
  -- 경로 정보
  duration INTEGER, -- 소요시간 (분)
  distance INTEGER, -- 거리 (미터)
  payment INTEGER, -- 요금 (원)
  -- 상세 경로 데이터 (JSON)
  route_details JSONB, -- 버스/지하철 상세 정보 [{type, busNo, startStation, endStation, ...}]
  all_routes JSONB, -- 모든 경로 옵션 [{totalTime, busSummary, subwaySummary, routeDetails, ...}]
  path_data JSONB, -- 자동차 경로 좌표 [{lat, lng}, ...]
  -- 상태
  is_estimate BOOLEAN DEFAULT false, -- 예상 시간인지 여부
  no_route BOOLEAN DEFAULT false, -- 노선 없음 여부
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  hit_count INTEGER DEFAULT 1, -- 조회 횟수 (인기 경로 파악)
  -- 복합 유니크 인덱스를 위한 제약
  UNIQUE(origin_lat, origin_lng, dest_lat, dest_lng, transport_type)
);

-- 경로 캐시 인덱스
CREATE INDEX IF NOT EXISTS idx_route_cache_coords ON route_cache(origin_lat, origin_lng, dest_lat, dest_lng);
CREATE INDEX IF NOT EXISTS idx_route_cache_transport ON route_cache(transport_type);
CREATE INDEX IF NOT EXISTS idx_route_cache_updated ON route_cache(updated_at);

-- 경로 캐시 updated_at 트리거
DROP TRIGGER IF EXISTS update_route_cache_updated_at ON route_cache;
CREATE TRIGGER update_route_cache_updated_at
  BEFORE UPDATE ON route_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 오래된 캐시 삭제 함수 (30일 이상 미사용)
CREATE OR REPLACE FUNCTION cleanup_old_route_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM route_cache
  WHERE updated_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 17. 좌표 캐시 테이블 (Coordinate Cache)
-- 주소 → 좌표 변환 결과를 캐싱하여 API 호출 최소화
-- ============================================================
CREATE TABLE IF NOT EXISTS coordinate_cache (
  id SERIAL PRIMARY KEY,
  -- 검색 주소 (정규화된 형태로 저장)
  address TEXT UNIQUE NOT NULL,
  -- 좌표
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  -- 장소명 (있는 경우)
  place_name TEXT,
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  hit_count INTEGER DEFAULT 1
);

-- 좌표 캐시 인덱스
CREATE INDEX IF NOT EXISTS idx_coordinate_cache_address ON coordinate_cache(address);

-- 좌표 캐시 updated_at 트리거
DROP TRIGGER IF EXISTS update_coordinate_cache_updated_at ON coordinate_cache;
CREATE TRIGGER update_coordinate_cache_updated_at
  BEFORE UPDATE ON coordinate_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 18. 캐시 테이블 RLS 정책 (Row Level Security)
-- 경로 캐시와 좌표 캐시는 모든 사용자가 읽고 쓸 수 있어야 함
-- ============================================================

-- route_cache RLS 활성화 및 정책
ALTER TABLE route_cache ENABLE ROW LEVEL SECURITY;

-- 모든 사용자(익명 포함)가 읽을 수 있음
CREATE POLICY "Anyone can read route cache"
  ON route_cache FOR SELECT
  USING (true);

-- 모든 사용자(익명 포함)가 삽입할 수 있음
CREATE POLICY "Anyone can insert route cache"
  ON route_cache FOR INSERT
  WITH CHECK (true);

-- 모든 사용자(익명 포함)가 업데이트할 수 있음 (hit_count 등)
CREATE POLICY "Anyone can update route cache"
  ON route_cache FOR UPDATE
  USING (true);

-- coordinate_cache RLS 활성화 및 정책
ALTER TABLE coordinate_cache ENABLE ROW LEVEL SECURITY;

-- 모든 사용자(익명 포함)가 읽을 수 있음
CREATE POLICY "Anyone can read coordinate cache"
  ON coordinate_cache FOR SELECT
  USING (true);

-- 모든 사용자(익명 포함)가 삽입할 수 있음
CREATE POLICY "Anyone can insert coordinate cache"
  ON coordinate_cache FOR INSERT
  WITH CHECK (true);

-- 모든 사용자(익명 포함)가 업데이트할 수 있음 (hit_count 등)
CREATE POLICY "Anyone can update coordinate cache"
  ON coordinate_cache FOR UPDATE
  USING (true);

-- ============================================================
-- 19. API 호출 로그 테이블 (API Call Logs)
-- 모든 외부 API 호출을 추적하여 사용량 분석 및 디버깅
-- ============================================================
CREATE TABLE IF NOT EXISTS api_call_logs (
  id SERIAL PRIMARY KEY,
  -- API 정보
  api_type TEXT NOT NULL, -- 'kakao_geocoding', 'kakao_route', 'odsay_transit', 'tour_api', 'kto_photo' 등
  endpoint TEXT, -- 호출된 엔드포인트
  -- 요청 정보
  request_params JSONB, -- 요청 파라미터 (출발지, 도착지, 검색어 등)
  -- 응답 정보
  response_status TEXT, -- 'success', 'fail', 'error'
  response_code INTEGER, -- HTTP 상태 코드 또는 API 에러 코드
  response_message TEXT, -- 에러 메시지 (실패 시)
  -- 호출자 정보
  user_id UUID, -- 로그인 사용자 (있는 경우)
  session_id TEXT, -- 세션 ID (익명 사용자 추적용)
  ip_address TEXT, -- IP 주소 (서버 사이드에서만)
  user_agent TEXT, -- 브라우저/기기 정보
  -- 위치 정보
  page_name TEXT, -- 호출한 페이지 (my-trip, map, travel 등)
  -- 성능 정보
  response_time_ms INTEGER, -- 응답 시간 (밀리초)
  -- 캐시 정보
  from_cache BOOLEAN DEFAULT false, -- 캐시에서 반환되었는지
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API 호출 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_api_call_logs_type ON api_call_logs(api_type);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_created ON api_call_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_status ON api_call_logs(response_status);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_page ON api_call_logs(page_name);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_user ON api_call_logs(user_id);

-- api_call_logs RLS
ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert api_call_logs" ON api_call_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read api_call_logs" ON api_call_logs FOR SELECT USING (true);

-- ============================================================
-- 20. API 호출 일별 통계 테이블 (API Daily Stats)
-- 일별 API 호출 집계 (빠른 대시보드 조회용)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_daily_stats (
  id SERIAL PRIMARY KEY,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  api_type TEXT NOT NULL,
  -- 호출 통계
  total_calls INTEGER DEFAULT 0,
  success_calls INTEGER DEFAULT 0,
  fail_calls INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0, -- 캐시 히트 수
  -- 성능 통계
  avg_response_time_ms INTEGER,
  max_response_time_ms INTEGER,
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stat_date, api_type)
);

-- API 일별 통계 인덱스
CREATE INDEX IF NOT EXISTS idx_api_daily_stats_date ON api_daily_stats(stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_api_daily_stats_type ON api_daily_stats(api_type);

-- api_daily_stats RLS
ALTER TABLE api_daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read api_daily_stats" ON api_daily_stats FOR SELECT USING (true);
CREATE POLICY "Anyone can insert api_daily_stats" ON api_daily_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update api_daily_stats" ON api_daily_stats FOR UPDATE USING (true);

-- api_daily_stats updated_at 트리거
DROP TRIGGER IF EXISTS update_api_daily_stats_updated_at ON api_daily_stats;
CREATE TRIGGER update_api_daily_stats_updated_at
  BEFORE UPDATE ON api_daily_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 게시된 여행 계획 관련 테이블 추가
-- ============================================================

-- trip_plans에 게시 관련 컬럼 추가
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS author_nickname TEXT;

-- 게시된 여행 계획 인덱스
CREATE INDEX IF NOT EXISTS idx_trip_plans_published ON trip_plans(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_trip_plans_published_at ON trip_plans(published_at DESC) WHERE is_published = true;

-- 게시된 여행 계획은 모든 사용자가 읽을 수 있도록 RLS 정책 추가
DROP POLICY IF EXISTS "Anyone can read published trip_plans" ON trip_plans;
CREATE POLICY "Anyone can read published trip_plans"
  ON trip_plans FOR SELECT
  USING (is_published = true);

-- 여행 좋아요 테이블
CREATE TABLE IF NOT EXISTS trip_likes (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trip_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id),
  UNIQUE(trip_id, session_id)
);

-- 여행 좋아요 인덱스
CREATE INDEX IF NOT EXISTS idx_trip_likes_trip ON trip_likes(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_likes_user ON trip_likes(user_id);

-- trip_likes RLS
ALTER TABLE trip_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read trip_likes" ON trip_likes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert trip_likes" ON trip_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own trip_likes" ON trip_likes FOR DELETE 
  USING (user_id = auth.uid() OR session_id IS NOT NULL);
