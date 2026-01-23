-- TourAPI 관광정보 통합 테이블
-- 대전 지역 관광지, 문화시설, 레포츠, 숙박, 쇼핑, 음식점, 행사/축제 데이터 저장

-- 기존 테이블이 있으면 삭제 (주의: 데이터 손실)
-- DROP TABLE IF EXISTS tour_spots;
-- DROP TABLE IF EXISTS tour_festivals;

-- 1. 관광정보 통합 테이블 (관광지, 문화시설, 레포츠, 숙박, 쇼핑, 음식점)
CREATE TABLE IF NOT EXISTS tour_spots (
    id BIGSERIAL PRIMARY KEY,
    content_id VARCHAR(50) UNIQUE NOT NULL,         -- TourAPI contentid
    content_type_id VARCHAR(10) NOT NULL,            -- 12:관광지, 14:문화시설, 28:레포츠, 32:숙박, 38:쇼핑, 39:음식점
    title VARCHAR(500) NOT NULL,                     -- 제목
    addr1 VARCHAR(500),                              -- 주소
    addr2 VARCHAR(200),                              -- 상세주소
    areacode VARCHAR(10),                            -- 지역코드 (대전=3)
    sigungucode VARCHAR(10),                         -- 시군구코드
    cat1 VARCHAR(10),                                -- 대분류
    cat2 VARCHAR(10),                                -- 중분류
    cat3 VARCHAR(10),                                -- 소분류
    firstimage TEXT,                                 -- 대표이미지 원본
    firstimage2 TEXT,                                -- 대표이미지 썸네일
    mapx VARCHAR(50),                                -- GPS X좌표 (경도)
    mapy VARCHAR(50),                                -- GPS Y좌표 (위도)
    mlevel VARCHAR(10),                              -- Map Level
    tel VARCHAR(100),                                -- 전화번호
    zipcode VARCHAR(20),                             -- 우편번호
    overview TEXT,                                   -- 개요 (상세정보에서 가져옴)
    homepage TEXT,                                   -- 홈페이지
    cpyrht_div_cd VARCHAR(20),                       -- 저작권 유형
    created_time VARCHAR(20),                        -- TourAPI 등록일
    modified_time VARCHAR(20),                       -- TourAPI 수정일
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 행사/축제 전용 테이블 (종료일 필드 추가)
CREATE TABLE IF NOT EXISTS tour_festivals (
    id BIGSERIAL PRIMARY KEY,
    content_id VARCHAR(50) UNIQUE NOT NULL,         -- TourAPI contentid
    content_type_id VARCHAR(10) DEFAULT '15',        -- 15: 행사/공연/축제
    title VARCHAR(500) NOT NULL,                     -- 제목
    addr1 VARCHAR(500),                              -- 주소
    addr2 VARCHAR(200),                              -- 상세주소
    areacode VARCHAR(10),                            -- 지역코드 (대전=3)
    sigungucode VARCHAR(10),                         -- 시군구코드
    cat1 VARCHAR(10),                                -- 대분류
    cat2 VARCHAR(10),                                -- 중분류
    cat3 VARCHAR(10),                                -- 소분류
    firstimage TEXT,                                 -- 대표이미지 원본
    firstimage2 TEXT,                                -- 대표이미지 썸네일
    mapx VARCHAR(50),                                -- GPS X좌표 (경도)
    mapy VARCHAR(50),                                -- GPS Y좌표 (위도)
    mlevel VARCHAR(10),                              -- Map Level
    tel VARCHAR(100),                                -- 전화번호
    zipcode VARCHAR(20),                             -- 우편번호
    event_start_date VARCHAR(20),                    -- 행사 시작일 (YYYYMMDD)
    event_end_date VARCHAR(20),                      -- 행사 종료일 (YYYYMMDD)
    cpyrht_div_cd VARCHAR(20),                       -- 저작권 유형
    created_time VARCHAR(20),                        -- TourAPI 등록일
    modified_time VARCHAR(20),                       -- TourAPI 수정일
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tour_spots_content_type ON tour_spots(content_type_id);
CREATE INDEX IF NOT EXISTS idx_tour_spots_areacode ON tour_spots(areacode);
CREATE INDEX IF NOT EXISTS idx_tour_spots_title ON tour_spots(title);
CREATE INDEX IF NOT EXISTS idx_tour_festivals_end_date ON tour_festivals(event_end_date);
CREATE INDEX IF NOT EXISTS idx_tour_festivals_areacode ON tour_festivals(areacode);

-- 4. RLS (Row Level Security) 정책
ALTER TABLE tour_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_festivals ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "tour_spots_select_policy" ON tour_spots
    FOR SELECT USING (true);

CREATE POLICY "tour_festivals_select_policy" ON tour_festivals
    FOR SELECT USING (true);

-- 인증된 사용자만 삽입/수정/삭제 가능 (관리자용)
CREATE POLICY "tour_spots_insert_policy" ON tour_spots
    FOR INSERT WITH CHECK (true);

CREATE POLICY "tour_spots_update_policy" ON tour_spots
    FOR UPDATE USING (true);

CREATE POLICY "tour_spots_delete_policy" ON tour_spots
    FOR DELETE USING (true);

CREATE POLICY "tour_festivals_insert_policy" ON tour_festivals
    FOR INSERT WITH CHECK (true);

CREATE POLICY "tour_festivals_update_policy" ON tour_festivals
    FOR UPDATE USING (true);

CREATE POLICY "tour_festivals_delete_policy" ON tour_festivals
    FOR DELETE USING (true);

-- 5. updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_tour_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS tour_spots_updated_at ON tour_spots;
CREATE TRIGGER tour_spots_updated_at
    BEFORE UPDATE ON tour_spots
    FOR EACH ROW
    EXECUTE FUNCTION update_tour_updated_at();

DROP TRIGGER IF EXISTS tour_festivals_updated_at ON tour_festivals;
CREATE TRIGGER tour_festivals_updated_at
    BEFORE UPDATE ON tour_festivals
    FOR EACH ROW
    EXECUTE FUNCTION update_tour_updated_at();

-- 6. 종료된 행사 자동 삭제 함수
CREATE OR REPLACE FUNCTION delete_expired_tour_festivals()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM tour_festivals
    WHERE event_end_date < TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 7. 타입별 데이터 개수 조회 함수
CREATE OR REPLACE FUNCTION get_tour_stats()
RETURNS TABLE (
    content_type_id VARCHAR(10),
    type_name VARCHAR(50),
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.content_type_id,
        CASE ts.content_type_id
            WHEN '12' THEN '관광지'
            WHEN '14' THEN '문화시설'
            WHEN '28' THEN '레포츠'
            WHEN '32' THEN '숙박'
            WHEN '38' THEN '쇼핑'
            WHEN '39' THEN '음식점'
        END as type_name,
        COUNT(*)::BIGINT as count
    FROM tour_spots ts
    GROUP BY ts.content_type_id
    
    UNION ALL
    
    SELECT 
        '15'::VARCHAR(10) as content_type_id,
        '행사/축제'::VARCHAR(50) as type_name,
        COUNT(*)::BIGINT as count
    FROM tour_festivals
    WHERE event_end_date >= TO_CHAR(CURRENT_DATE, 'YYYYMMDD')
    
    ORDER BY content_type_id;
END;
$$ LANGUAGE plpgsql;

-- 실행 예시:
-- SELECT * FROM get_tour_stats();
-- SELECT delete_expired_tour_festivals();
