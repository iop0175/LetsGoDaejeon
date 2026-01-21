-- ============================================================
-- API 호출 로그 테이블 생성 + RLS 정책
-- 
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ============================================================

-- ============================================================
-- 1. API 호출 로그 테이블 (API Call Logs)
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
CREATE INDEX IF NOT EXISTS idx_api_call_logs_session ON api_call_logs(session_id);

-- api_call_logs RLS
ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert api_call_logs" ON api_call_logs;
CREATE POLICY "Anyone can insert api_call_logs" ON api_call_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read api_call_logs" ON api_call_logs;
CREATE POLICY "Anyone can read api_call_logs" ON api_call_logs FOR SELECT USING (true);

-- ============================================================
-- 2. API 호출 일별 통계 테이블 (API Daily Stats)
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

DROP POLICY IF EXISTS "Anyone can read api_daily_stats" ON api_daily_stats;
CREATE POLICY "Anyone can read api_daily_stats" ON api_daily_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert api_daily_stats" ON api_daily_stats;
CREATE POLICY "Anyone can insert api_daily_stats" ON api_daily_stats FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update api_daily_stats" ON api_daily_stats;
CREATE POLICY "Anyone can update api_daily_stats" ON api_daily_stats FOR UPDATE USING (true);

-- updated_at 자동 업데이트 함수 (이미 있으면 무시됨)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- api_daily_stats updated_at 트리거
DROP TRIGGER IF EXISTS update_api_daily_stats_updated_at ON api_daily_stats;
CREATE TRIGGER update_api_daily_stats_updated_at
  BEFORE UPDATE ON api_daily_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 완료! API 로그 테이블이 생성되고 RLS가 설정되었습니다.
-- ============================================================
