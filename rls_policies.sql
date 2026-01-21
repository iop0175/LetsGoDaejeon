-- ============================================================
-- Supabase RLS 정책 (Row Level Security Policies)
-- 
-- 이 SQL은 모든 테이블에 RLS가 이미 활성화되어 있다고 가정합니다.
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ============================================================

-- ============================================================
-- 1. 공개 데이터 테이블 정책 (모든 사용자 읽기 가능)
-- ============================================================

-- travel_spots
DROP POLICY IF EXISTS "Anyone can read travel_spots" ON travel_spots;
CREATE POLICY "Anyone can read travel_spots" ON travel_spots FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can manage travel_spots" ON travel_spots;
CREATE POLICY "Anyone can manage travel_spots" ON travel_spots FOR ALL USING (true) WITH CHECK (true);

-- festivals
DROP POLICY IF EXISTS "Anyone can read festivals" ON festivals;
CREATE POLICY "Anyone can read festivals" ON festivals FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can manage festivals" ON festivals;
CREATE POLICY "Anyone can manage festivals" ON festivals FOR ALL USING (true) WITH CHECK (true);

-- restaurants
DROP POLICY IF EXISTS "Anyone can read restaurants" ON restaurants;
CREATE POLICY "Anyone can read restaurants" ON restaurants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can manage restaurants" ON restaurants;
CREATE POLICY "Anyone can manage restaurants" ON restaurants FOR ALL USING (true) WITH CHECK (true);

-- cultural_facilities
DROP POLICY IF EXISTS "Anyone can read cultural_facilities" ON cultural_facilities;
CREATE POLICY "Anyone can read cultural_facilities" ON cultural_facilities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can manage cultural_facilities" ON cultural_facilities;
CREATE POLICY "Anyone can manage cultural_facilities" ON cultural_facilities FOR ALL USING (true) WITH CHECK (true);

-- medical_facilities
DROP POLICY IF EXISTS "Anyone can read medical_facilities" ON medical_facilities;
CREATE POLICY "Anyone can read medical_facilities" ON medical_facilities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can manage medical_facilities" ON medical_facilities;
CREATE POLICY "Anyone can manage medical_facilities" ON medical_facilities FOR ALL USING (true) WITH CHECK (true);

-- shopping_places
DROP POLICY IF EXISTS "Anyone can read shopping_places" ON shopping_places;
CREATE POLICY "Anyone can read shopping_places" ON shopping_places FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can manage shopping_places" ON shopping_places;
CREATE POLICY "Anyone can manage shopping_places" ON shopping_places FOR ALL USING (true) WITH CHECK (true);

-- accommodations
DROP POLICY IF EXISTS "Anyone can read accommodations" ON accommodations;
CREATE POLICY "Anyone can read accommodations" ON accommodations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can manage accommodations" ON accommodations;
CREATE POLICY "Anyone can manage accommodations" ON accommodations FOR ALL USING (true) WITH CHECK (true);

-- parking_lots
DROP POLICY IF EXISTS "Anyone can read parking_lots" ON parking_lots;
CREATE POLICY "Anyone can read parking_lots" ON parking_lots FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can manage parking_lots" ON parking_lots;
CREATE POLICY "Anyone can manage parking_lots" ON parking_lots FOR ALL USING (true) WITH CHECK (true);

-- hero_slides
DROP POLICY IF EXISTS "Anyone can read hero_slides" ON hero_slides;
CREATE POLICY "Anyone can read hero_slides" ON hero_slides FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can manage hero_slides" ON hero_slides;
CREATE POLICY "Anyone can manage hero_slides" ON hero_slides FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 2. 통계/로그 테이블 정책 (익명 사용자도 기록 가능)
-- ============================================================

-- page_visits
DROP POLICY IF EXISTS "Anyone can read page_visits" ON page_visits;
CREATE POLICY "Anyone can read page_visits" ON page_visits FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert page_visits" ON page_visits;
CREATE POLICY "Anyone can insert page_visits" ON page_visits FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update page_visits" ON page_visits;
CREATE POLICY "Anyone can update page_visits" ON page_visits FOR UPDATE USING (true);

-- search_logs
DROP POLICY IF EXISTS "Anyone can read search_logs" ON search_logs;
CREATE POLICY "Anyone can read search_logs" ON search_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert search_logs" ON search_logs;
CREATE POLICY "Anyone can insert search_logs" ON search_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update search_logs" ON search_logs;
CREATE POLICY "Anyone can update search_logs" ON search_logs FOR UPDATE USING (true);

-- ============================================================
-- 3. 캐시 테이블 정책 (모든 사용자 읽기/쓰기 가능)
-- ============================================================

-- route_cache
DROP POLICY IF EXISTS "Anyone can read route cache" ON route_cache;
CREATE POLICY "Anyone can read route cache" ON route_cache FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert route cache" ON route_cache;
CREATE POLICY "Anyone can insert route cache" ON route_cache FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update route cache" ON route_cache;
CREATE POLICY "Anyone can update route cache" ON route_cache FOR UPDATE USING (true);

-- coordinate_cache
DROP POLICY IF EXISTS "Anyone can read coordinate cache" ON coordinate_cache;
CREATE POLICY "Anyone can read coordinate cache" ON coordinate_cache FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert coordinate cache" ON coordinate_cache;
CREATE POLICY "Anyone can insert coordinate cache" ON coordinate_cache FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update coordinate cache" ON coordinate_cache;
CREATE POLICY "Anyone can update coordinate cache" ON coordinate_cache FOR UPDATE USING (true);

-- ============================================================
-- 4. 사용자별 데이터 테이블 정책 (자신의 데이터만 접근)
-- ============================================================

-- trip_plans (사용자 여행 계획)
DROP POLICY IF EXISTS "Users can view their own trip plans" ON trip_plans;
CREATE POLICY "Users can view their own trip plans" ON trip_plans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own trip plans" ON trip_plans;
CREATE POLICY "Users can insert their own trip plans" ON trip_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trip plans" ON trip_plans;
CREATE POLICY "Users can update their own trip plans" ON trip_plans
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own trip plans" ON trip_plans;
CREATE POLICY "Users can delete their own trip plans" ON trip_plans
  FOR DELETE USING (auth.uid() = user_id);

-- trip_days (여행 일자)
DROP POLICY IF EXISTS "Users can manage their trip days" ON trip_days;
CREATE POLICY "Users can manage their trip days" ON trip_days
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trip_plans
      WHERE trip_plans.id = trip_days.plan_id
      AND trip_plans.user_id = auth.uid()
    )
  );

-- trip_places (여행 장소)
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

-- ============================================================
-- 완료! 모든 RLS 정책이 설정되었습니다.
-- ============================================================
