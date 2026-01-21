-- 여행 계획 게시 기능을 위한 테이블 수정
-- Supabase SQL Editor에서 실행하세요

-- ============================================================
-- 1. trip_plans 테이블에 게시 관련 컬럼 추가
-- ============================================================
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS author_nickname TEXT;

-- 게시된 여행 계획 인덱스
CREATE INDEX IF NOT EXISTS idx_trip_plans_published ON trip_plans(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_trip_plans_published_at ON trip_plans(published_at DESC) WHERE is_published = true;

-- ============================================================
-- 2. 게시된 여행 계획은 모든 사용자가 읽을 수 있도록 RLS 정책 추가
-- ============================================================

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Users can read own trip_plans" ON trip_plans;
DROP POLICY IF EXISTS "Anyone can read published trip_plans" ON trip_plans;

-- 자신의 여행 계획 + 게시된 여행 계획 읽기 가능
CREATE POLICY "Users can read own or published trip_plans"
  ON trip_plans FOR SELECT
  USING (user_id = auth.uid() OR is_published = true);

-- ============================================================
-- 3. 여행 좋아요 테이블
-- ============================================================
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

DROP POLICY IF EXISTS "Anyone can read trip_likes" ON trip_likes;
DROP POLICY IF EXISTS "Anyone can insert trip_likes" ON trip_likes;
DROP POLICY IF EXISTS "Users can delete own trip_likes" ON trip_likes;

CREATE POLICY "Anyone can read trip_likes" ON trip_likes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert trip_likes" ON trip_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own trip_likes" ON trip_likes FOR DELETE 
  USING (user_id = auth.uid() OR session_id IS NOT NULL);

-- ============================================================
-- 4. trip_days와 trip_places도 게시된 여행에 대해 읽기 가능하도록 수정
-- ============================================================

-- trip_days RLS 정책 업데이트
DROP POLICY IF EXISTS "Users can read own trip_days" ON trip_days;
CREATE POLICY "Users can read own or published trip_days"
  ON trip_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_plans 
      WHERE trip_plans.id = trip_days.plan_id 
      AND (trip_plans.user_id = auth.uid() OR trip_plans.is_published = true)
    )
  );

-- trip_places RLS 정책 업데이트
DROP POLICY IF EXISTS "Users can read own trip_places" ON trip_places;
CREATE POLICY "Users can read own or published trip_places"
  ON trip_places FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_days
      JOIN trip_plans ON trip_plans.id = trip_days.plan_id
      WHERE trip_days.id = trip_places.day_id
      AND (trip_plans.user_id = auth.uid() OR trip_plans.is_published = true)
    )
  );
