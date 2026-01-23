-- ================================================
-- 기존 대전 공공데이터 API 테이블 삭제 SQL
-- TourAPI 4.0으로 대체되어 더 이상 사용되지 않는 테이블들
-- ================================================

-- 주의: 이 SQL을 실행하면 데이터가 영구적으로 삭제됩니다!
-- 실행 전에 반드시 백업을 권장합니다.

-- ================================================
-- 1. RLS 정책 삭제 (테이블 삭제 전에 먼저 삭제해야 함)
-- ================================================

-- travel_spots 정책 삭제
DROP POLICY IF EXISTS "travel_spots_select_policy" ON travel_spots;
DROP POLICY IF EXISTS "travel_spots_insert_policy" ON travel_spots;
DROP POLICY IF EXISTS "travel_spots_update_policy" ON travel_spots;
DROP POLICY IF EXISTS "travel_spots_delete_policy" ON travel_spots;

-- festivals 정책 삭제
DROP POLICY IF EXISTS "festivals_select_policy" ON festivals;
DROP POLICY IF EXISTS "festivals_insert_policy" ON festivals;
DROP POLICY IF EXISTS "festivals_update_policy" ON festivals;
DROP POLICY IF EXISTS "festivals_delete_policy" ON festivals;

-- restaurants 정책 삭제
DROP POLICY IF EXISTS "restaurants_select_policy" ON restaurants;
DROP POLICY IF EXISTS "restaurants_insert_policy" ON restaurants;
DROP POLICY IF EXISTS "restaurants_update_policy" ON restaurants;
DROP POLICY IF EXISTS "restaurants_delete_policy" ON restaurants;

-- cultural_facilities 정책 삭제
DROP POLICY IF EXISTS "cultural_facilities_select_policy" ON cultural_facilities;
DROP POLICY IF EXISTS "cultural_facilities_insert_policy" ON cultural_facilities;
DROP POLICY IF EXISTS "cultural_facilities_update_policy" ON cultural_facilities;
DROP POLICY IF EXISTS "cultural_facilities_delete_policy" ON cultural_facilities;

-- shopping_places 정책 삭제
DROP POLICY IF EXISTS "shopping_places_select_policy" ON shopping_places;
DROP POLICY IF EXISTS "shopping_places_insert_policy" ON shopping_places;
DROP POLICY IF EXISTS "shopping_places_update_policy" ON shopping_places;
DROP POLICY IF EXISTS "shopping_places_delete_policy" ON shopping_places;

-- accommodations 정책 삭제
DROP POLICY IF EXISTS "accommodations_select_policy" ON accommodations;
DROP POLICY IF EXISTS "accommodations_insert_policy" ON accommodations;
DROP POLICY IF EXISTS "accommodations_update_policy" ON accommodations;
DROP POLICY IF EXISTS "accommodations_delete_policy" ON accommodations;

-- ================================================
-- 2. 테이블 삭제
-- ================================================

-- 관광지 테이블 삭제 (TourAPI contentTypeId=12로 대체)
DROP TABLE IF EXISTS travel_spots CASCADE;

-- 축제/행사 테이블 삭제 (TourAPI contentTypeId=15로 대체)
DROP TABLE IF EXISTS festivals CASCADE;

-- 음식점 테이블 삭제 (TourAPI contentTypeId=39로 대체)
DROP TABLE IF EXISTS restaurants CASCADE;

-- 문화시설 테이블 삭제 (TourAPI contentTypeId=14로 대체)
DROP TABLE IF EXISTS cultural_facilities CASCADE;

-- 쇼핑 테이블 삭제 (TourAPI contentTypeId=38로 대체)
DROP TABLE IF EXISTS shopping_places CASCADE;

-- 숙박 테이블 삭제 (TourAPI contentTypeId=32로 대체)
DROP TABLE IF EXISTS accommodations CASCADE;

-- ================================================
-- 삭제 완료 메시지
-- ================================================
-- 
-- 삭제된 테이블:
-- - travel_spots (관광지) → tour_spots (contentTypeId=12)
-- - festivals (축제/행사) → tour_festivals (contentTypeId=15)
-- - restaurants (음식점) → tour_spots (contentTypeId=39)
-- - cultural_facilities (문화시설) → tour_spots (contentTypeId=14)
-- - shopping_places (쇼핑) → tour_spots (contentTypeId=38)
-- - accommodations (숙박) → tour_spots (contentTypeId=32)
--
-- 유지된 테이블:
-- - medical_facilities (의료시설) - TourAPI에 없음
-- - parking_lots (주차장) - TourAPI에 없음
-- - tour_spots (TourAPI 관광정보)
-- - tour_festivals (TourAPI 행사/축제)
-- - hero_slides (히어로 슬라이드)
-- - performances (KCISA 공연정보)
-- - 기타 시스템 테이블들
-- ================================================
