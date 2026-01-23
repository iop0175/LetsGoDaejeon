-- ============================================================
-- Supabase RLS 보안 강화 정책 (Row Level Security Policies)
-- 
-- ⚠️ 기존 정책을 삭제하고 보안이 강화된 정책으로 교체합니다.
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ============================================================

-- ============================================================
-- 0. 관리자 테이블 먼저 생성 (다른 정책에서 참조하기 때문)
-- ============================================================

-- admin_users 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ⚠️ 중요: 아래 SQL을 실행하기 전에 먼저 관리자를 추가하세요!
-- INSERT INTO admin_users (user_id, email, role) 
-- VALUES ('your-supabase-user-uuid', 'admin@example.com', 'super_admin');

-- ============================================================
-- 1. 공개 데이터 테이블 정책 (읽기만 가능, 수정/삭제는 인증된 관리자만)
-- ============================================================

-- travel_spots (관광지)
DROP POLICY IF EXISTS "Anyone can read travel_spots" ON travel_spots;
DROP POLICY IF EXISTS "Anyone can manage travel_spots" ON travel_spots;
DROP POLICY IF EXISTS "Admins can manage travel_spots" ON travel_spots;

CREATE POLICY "Anyone can read travel_spots" ON travel_spots 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage travel_spots" ON travel_spots 
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- festivals (축제)
DROP POLICY IF EXISTS "Anyone can read festivals" ON festivals;
DROP POLICY IF EXISTS "Anyone can manage festivals" ON festivals;
DROP POLICY IF EXISTS "Admins can manage festivals" ON festivals;

CREATE POLICY "Anyone can read festivals" ON festivals 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage festivals" ON festivals 
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- restaurants (맛집)
DROP POLICY IF EXISTS "Anyone can read restaurants" ON restaurants;
DROP POLICY IF EXISTS "Anyone can manage restaurants" ON restaurants;
DROP POLICY IF EXISTS "Admins can manage restaurants" ON restaurants;

CREATE POLICY "Anyone can read restaurants" ON restaurants 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage restaurants" ON restaurants 
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- cultural_facilities (문화시설)
DROP POLICY IF EXISTS "Anyone can read cultural_facilities" ON cultural_facilities;
DROP POLICY IF EXISTS "Anyone can manage cultural_facilities" ON cultural_facilities;
DROP POLICY IF EXISTS "Admins can manage cultural_facilities" ON cultural_facilities;

CREATE POLICY "Anyone can read cultural_facilities" ON cultural_facilities 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage cultural_facilities" ON cultural_facilities 
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- medical_facilities (의료시설)
DROP POLICY IF EXISTS "Anyone can read medical_facilities" ON medical_facilities;
DROP POLICY IF EXISTS "Anyone can manage medical_facilities" ON medical_facilities;
DROP POLICY IF EXISTS "Admins can manage medical_facilities" ON medical_facilities;

CREATE POLICY "Anyone can read medical_facilities" ON medical_facilities 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage medical_facilities" ON medical_facilities 
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- shopping_places (쇼핑)
DROP POLICY IF EXISTS "Anyone can read shopping_places" ON shopping_places;
DROP POLICY IF EXISTS "Anyone can manage shopping_places" ON shopping_places;
DROP POLICY IF EXISTS "Admins can manage shopping_places" ON shopping_places;

CREATE POLICY "Anyone can read shopping_places" ON shopping_places 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage shopping_places" ON shopping_places 
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- accommodations (숙박)
DROP POLICY IF EXISTS "Anyone can read accommodations" ON accommodations;
DROP POLICY IF EXISTS "Anyone can manage accommodations" ON accommodations;
DROP POLICY IF EXISTS "Admins can manage accommodations" ON accommodations;

CREATE POLICY "Anyone can read accommodations" ON accommodations 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage accommodations" ON accommodations 
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- parking_lots (주차장)
DROP POLICY IF EXISTS "Anyone can read parking_lots" ON parking_lots;
DROP POLICY IF EXISTS "Anyone can manage parking_lots" ON parking_lots;
DROP POLICY IF EXISTS "Admins can manage parking_lots" ON parking_lots;

CREATE POLICY "Anyone can read parking_lots" ON parking_lots 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage parking_lots" ON parking_lots 
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- hero_slides (히어로 슬라이드)
DROP POLICY IF EXISTS "Anyone can read hero_slides" ON hero_slides;
DROP POLICY IF EXISTS "Anyone can manage hero_slides" ON hero_slides;
DROP POLICY IF EXISTS "Admins can manage hero_slides" ON hero_slides;

CREATE POLICY "Anyone can read hero_slides" ON hero_slides 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage hero_slides" ON hero_slides 
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- ============================================================
-- 2. 통계/로그 테이블 정책 (INSERT만 허용, UPDATE/DELETE 제한)
-- ============================================================

-- page_visits (페이지 방문)
DROP POLICY IF EXISTS "Anyone can read page_visits" ON page_visits;
DROP POLICY IF EXISTS "Anyone can insert page_visits" ON page_visits;
DROP POLICY IF EXISTS "Anyone can update page_visits" ON page_visits;
DROP POLICY IF EXISTS "Admins can manage page_visits" ON page_visits;

CREATE POLICY "Admins can read page_visits" ON page_visits 
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );
CREATE POLICY "Anyone can insert page_visits" ON page_visits 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage page_visits" ON page_visits 
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- search_logs (검색 로그)
DROP POLICY IF EXISTS "Anyone can read search_logs" ON search_logs;
DROP POLICY IF EXISTS "Anyone can insert search_logs" ON search_logs;
DROP POLICY IF EXISTS "Anyone can update search_logs" ON search_logs;
DROP POLICY IF EXISTS "Admins can manage search_logs" ON search_logs;

CREATE POLICY "Admins can read search_logs" ON search_logs 
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );
CREATE POLICY "Anyone can insert search_logs" ON search_logs 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage search_logs" ON search_logs 
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- ============================================================
-- 3. 캐시 테이블 정책 (읽기/쓰기 허용, 삭제는 관리자만)
-- ============================================================

-- route_cache (경로 캐시)
DROP POLICY IF EXISTS "Anyone can read route cache" ON route_cache;
DROP POLICY IF EXISTS "Anyone can insert route cache" ON route_cache;
DROP POLICY IF EXISTS "Anyone can update route cache" ON route_cache;
DROP POLICY IF EXISTS "Admins can delete route cache" ON route_cache;

CREATE POLICY "Anyone can read route cache" ON route_cache 
  FOR SELECT USING (true);
CREATE POLICY "Anyone can insert route cache" ON route_cache 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update route cache" ON route_cache 
  FOR UPDATE USING (true);
CREATE POLICY "Admins can delete route cache" ON route_cache 
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- coordinate_cache (좌표 캐시)
DROP POLICY IF EXISTS "Anyone can read coordinate cache" ON coordinate_cache;
DROP POLICY IF EXISTS "Anyone can insert coordinate cache" ON coordinate_cache;
DROP POLICY IF EXISTS "Anyone can update coordinate cache" ON coordinate_cache;
DROP POLICY IF EXISTS "Admins can delete coordinate cache" ON coordinate_cache;

CREATE POLICY "Anyone can read coordinate cache" ON coordinate_cache 
  FOR SELECT USING (true);
CREATE POLICY "Anyone can insert coordinate cache" ON coordinate_cache 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update coordinate cache" ON coordinate_cache 
  FOR UPDATE USING (true);
CREATE POLICY "Admins can delete coordinate cache" ON coordinate_cache 
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- ============================================================
-- 4. 사용자별 데이터 테이블 정책 (자신의 데이터만 접근)
-- ============================================================

-- trip_plans (사용자 여행 계획)
DROP POLICY IF EXISTS "Users can view their own trip plans" ON trip_plans;
DROP POLICY IF EXISTS "Users can view published trip plans" ON trip_plans;
DROP POLICY IF EXISTS "Users can insert their own trip plans" ON trip_plans;
DROP POLICY IF EXISTS "Users can update their own trip plans" ON trip_plans;
DROP POLICY IF EXISTS "Users can delete their own trip plans" ON trip_plans;

-- 자신의 여행 계획 보기
CREATE POLICY "Users can view their own trip plans" ON trip_plans
  FOR SELECT USING (auth.uid() = user_id);

-- 게시된 여행 계획은 모두가 볼 수 있음
CREATE POLICY "Anyone can view published trip plans" ON trip_plans
  FOR SELECT USING (is_published = true);

-- 자신의 여행 계획 생성
CREATE POLICY "Users can insert their own trip plans" ON trip_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 자신의 여행 계획 수정
CREATE POLICY "Users can update their own trip plans" ON trip_plans
  FOR UPDATE USING (auth.uid() = user_id);

-- 자신의 여행 계획 삭제
CREATE POLICY "Users can delete their own trip plans" ON trip_plans
  FOR DELETE USING (auth.uid() = user_id);

-- trip_days (여행 일자) - 자신의 여행 계획에 속한 것만
DROP POLICY IF EXISTS "Users can manage their trip days" ON trip_days;
CREATE POLICY "Users can manage their trip days" ON trip_days
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trip_plans
      WHERE trip_plans.id = trip_days.plan_id
      AND trip_plans.user_id = auth.uid()
    )
  );

-- 게시된 여행 계획의 일자는 모두가 볼 수 있음
CREATE POLICY "Anyone can view published trip days" ON trip_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_plans
      WHERE trip_plans.id = trip_days.plan_id
      AND trip_plans.is_published = true
    )
  );

-- trip_places (여행 장소) - 자신의 여행 계획에 속한 것만
DROP POLICY IF EXISTS "Users can manage their trip places" ON trip_places;
CREATE POLICY "Users can manage their trip places" ON trip_places
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trip_days
      JOIN trip_plans ON trip_plans.id = trip_days.plan_id
      WHERE trip_days.id = trip_places.day_id
      AND trip_plans.user_id = auth.uid()
    )
  );

-- 게시된 여행 계획의 장소는 모두가 볼 수 있음
CREATE POLICY "Anyone can view published trip places" ON trip_places
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_days
      JOIN trip_plans ON trip_plans.id = trip_days.plan_id
      WHERE trip_days.id = trip_places.day_id
      AND trip_plans.is_published = true
    )
  );

-- ============================================================
-- 5. 관리자 테이블 정책 (관리자만 읽기 가능)
-- ============================================================

DROP POLICY IF EXISTS "Admins can read admin_users" ON admin_users;
CREATE POLICY "Admins can read admin_users" ON admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

-- ============================================================
-- 6. API 로그 테이블 정책 (테이블이 존재하는 경우에만)
-- ============================================================

-- api_logs 테이블이 존재하지 않으면 이 섹션은 건너뛰세요.
-- api_logs (API 호출 로그)
-- DROP POLICY IF EXISTS "Anyone can insert api_logs" ON api_logs;
-- DROP POLICY IF EXISTS "Admins can read api_logs" ON api_logs;

-- CREATE POLICY "Anyone can insert api_logs" ON api_logs 
--   FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Admins can read api_logs" ON api_logs 
--   FOR SELECT USING (
--     auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
--   );

-- ============================================================
-- 완료! 보안이 강화된 RLS 정책이 설정되었습니다.
-- ============================================================
