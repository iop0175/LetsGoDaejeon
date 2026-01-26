-- 기존 정책 삭제 (에러 방지)
DROP POLICY IF EXISTS "spot_stats_select_policy" ON spot_stats;
DROP POLICY IF EXISTS "spot_stats_insert_policy" ON spot_stats;
DROP POLICY IF EXISTS "spot_stats_update_policy" ON spot_stats;
DROP POLICY IF EXISTS "spot_likes_select_policy" ON spot_likes;
DROP POLICY IF EXISTS "spot_likes_insert_policy" ON spot_likes;
DROP POLICY IF EXISTS "spot_likes_delete_policy" ON spot_likes;
DROP POLICY IF EXISTS "spot_reviews_select_policy" ON spot_reviews;
DROP POLICY IF EXISTS "spot_reviews_insert_policy" ON spot_reviews;
DROP POLICY IF EXISTS "spot_reviews_update_policy" ON spot_reviews;
DROP POLICY IF EXISTS "spot_reviews_delete_policy" ON spot_reviews;

-- 관광지 통계 테이블 (조회수, 좋아요 수)
CREATE TABLE IF NOT EXISTS spot_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id VARCHAR(50) NOT NULL UNIQUE,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- content_id 인덱스
CREATE INDEX IF NOT EXISTS idx_spot_stats_content_id ON spot_stats(content_id);

-- 좋아요 테이블 (사용자별 좋아요 기록)
CREATE TABLE IF NOT EXISTS spot_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(content_id, user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_spot_likes_content_id ON spot_likes(content_id);
CREATE INDEX IF NOT EXISTS idx_spot_likes_user_id ON spot_likes(user_id);

-- 리뷰 테이블
CREATE TABLE IF NOT EXISTS spot_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_spot_reviews_content_id ON spot_reviews(content_id);
CREATE INDEX IF NOT EXISTS idx_spot_reviews_user_id ON spot_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_reviews_rating ON spot_reviews(rating);

-- 좋아요 수 증가 함수
CREATE OR REPLACE FUNCTION increment_like_count(p_content_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  INSERT INTO spot_stats (content_id, view_count, like_count)
  VALUES (p_content_id, 0, 1)
  ON CONFLICT (content_id) 
  DO UPDATE SET 
    like_count = spot_stats.like_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 좋아요 수 감소 함수
CREATE OR REPLACE FUNCTION decrement_like_count(p_content_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE spot_stats 
  SET like_count = GREATEST(0, like_count - 1),
      updated_at = NOW()
  WHERE content_id = p_content_id;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) 정책 설정

-- spot_stats: 모든 사용자가 조회 가능, 시스템만 수정 가능
ALTER TABLE spot_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spot_stats_select_policy" ON spot_stats
  FOR SELECT USING (true);

CREATE POLICY "spot_stats_insert_policy" ON spot_stats
  FOR INSERT WITH CHECK (true);

CREATE POLICY "spot_stats_update_policy" ON spot_stats
  FOR UPDATE USING (true);

-- spot_likes: 로그인 사용자만 자신의 좋아요 관리 가능
ALTER TABLE spot_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spot_likes_select_policy" ON spot_likes
  FOR SELECT USING (true);

CREATE POLICY "spot_likes_insert_policy" ON spot_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spot_likes_delete_policy" ON spot_likes
  FOR DELETE USING (auth.uid() = user_id);

-- spot_reviews: 모든 사용자가 조회 가능, 로그인 사용자만 자신의 리뷰 관리 가능
ALTER TABLE spot_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spot_reviews_select_policy" ON spot_reviews
  FOR SELECT USING (true);

CREATE POLICY "spot_reviews_insert_policy" ON spot_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spot_reviews_update_policy" ON spot_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "spot_reviews_delete_policy" ON spot_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- 프로필 테이블이 없는 경우 생성 (리뷰 작성자 정보 표시용)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE USING (auth.uid() = id);
