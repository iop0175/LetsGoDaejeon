-- ============================================================
-- 캐시 테이블 생성 + RLS 정책
-- 
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- 이 SQL을 먼저 실행한 후 rls_policies.sql을 실행하세요.
-- ============================================================

-- updated_at 자동 업데이트 함수 (이미 있으면 무시됨)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. 경로 캐시 테이블 (Route Cache)
-- ============================================================
CREATE TABLE IF NOT EXISTS route_cache (
  id SERIAL PRIMARY KEY,
  -- 출발지 좌표 (소수점 4자리 = 약 11m 오차)
  origin_lat DECIMAL(7, 4) NOT NULL,
  origin_lng DECIMAL(8, 4) NOT NULL,
  -- 도착지 좌표
  dest_lat DECIMAL(7, 4) NOT NULL,
  dest_lng DECIMAL(8, 4) NOT NULL,
  -- 이동 수단
  transport_type TEXT NOT NULL,
  -- 캐시된 결과
  duration INTEGER,
  distance INTEGER,
  payment INTEGER,
  route_details JSONB,
  all_routes JSONB,
  path_data JSONB,
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  hit_count INTEGER DEFAULT 1,
  -- 유니크 제약조건
  UNIQUE(origin_lat, origin_lng, dest_lat, dest_lng, transport_type)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_route_cache_coords ON route_cache(origin_lat, origin_lng, dest_lat, dest_lng);
CREATE INDEX IF NOT EXISTS idx_route_cache_transport ON route_cache(transport_type);
CREATE INDEX IF NOT EXISTS idx_route_cache_updated ON route_cache(updated_at);

-- updated_at 트리거
DROP TRIGGER IF EXISTS update_route_cache_updated_at ON route_cache;
CREATE TRIGGER update_route_cache_updated_at
  BEFORE UPDATE ON route_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. 좌표 캐시 테이블 (Coordinate Cache)
-- ============================================================
CREATE TABLE IF NOT EXISTS coordinate_cache (
  id SERIAL PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  place_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  hit_count INTEGER DEFAULT 1
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_coordinate_cache_address ON coordinate_cache(address);

-- updated_at 트리거
DROP TRIGGER IF EXISTS update_coordinate_cache_updated_at ON coordinate_cache;
CREATE TRIGGER update_coordinate_cache_updated_at
  BEFORE UPDATE ON coordinate_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. 캐시 테이블 RLS 활성화 및 정책
-- ============================================================

-- route_cache RLS
ALTER TABLE route_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read route cache" ON route_cache;
CREATE POLICY "Anyone can read route cache" ON route_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert route cache" ON route_cache;
CREATE POLICY "Anyone can insert route cache" ON route_cache FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update route cache" ON route_cache;
CREATE POLICY "Anyone can update route cache" ON route_cache FOR UPDATE USING (true);

-- coordinate_cache RLS
ALTER TABLE coordinate_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read coordinate cache" ON coordinate_cache;
CREATE POLICY "Anyone can read coordinate cache" ON coordinate_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert coordinate cache" ON coordinate_cache;
CREATE POLICY "Anyone can insert coordinate cache" ON coordinate_cache FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update coordinate cache" ON coordinate_cache;
CREATE POLICY "Anyone can update coordinate cache" ON coordinate_cache FOR UPDATE USING (true);

-- ============================================================
-- 완료! 캐시 테이블이 생성되고 RLS가 설정되었습니다.
-- ============================================================
