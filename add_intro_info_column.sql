-- tour_spots 테이블에 소개정보(detailIntro2) 저장을 위한 컬럼 추가

-- intro_info: JSONB 형태로 contentTypeId별 소개정보 저장
-- 각 타입별로 다른 필드를 가지므로 JSONB로 유연하게 저장

-- 컬럼 추가
ALTER TABLE tour_spots ADD COLUMN IF NOT EXISTS intro_info JSONB;

-- 인덱스 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_tour_spots_intro_info ON tour_spots USING GIN (intro_info);

-- 설명:
-- 12 (관광지): infocenter, opendate, restdate, usetime, parking, etc.
-- 14 (문화시설): infocenterculture, usetimeculture, restdateculture, usefee, parkingculture, etc.
-- 28 (레포츠): infocenterleports, usetimeleports, restdateleports, usefeeleports, parkingleports, etc.
-- 32 (숙박): checkintime, checkouttime, roomcount, roomtype, parking, pickup, etc.
-- 38 (쇼핑): infocentershopping, opentime, restdateshopping, parkingshopping, saleitem, etc.
-- 39 (음식점): infocenterfood, opentimefood, restdatefood, firstmenu, treatmenu, parking, etc.

-- 사용 예시:
-- SELECT title, intro_info->>'usetime' as 이용시간, intro_info->>'parking' as 주차 
-- FROM tour_spots WHERE content_type_id = '12';
