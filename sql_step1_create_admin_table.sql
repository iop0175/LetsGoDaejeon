-- ============================================================
-- Step 1: admin_users 테이블 생성
-- Supabase SQL Editor에서 먼저 이 스크립트를 실행하세요.
-- ============================================================

-- admin_users 테이블 생성
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

-- ============================================================
-- Step 2: 관리자 추가
-- 아래 쿼리를 수정해서 실행하세요!
-- 
-- Supabase Dashboard > Authentication > Users에서 
-- 관리자 계정의 UUID를 복사한 후 아래에 붙여넣으세요.
-- ============================================================

-- 예시 (실제 UUID로 변경 필요):
-- INSERT INTO admin_users (user_id, email, role) 
-- VALUES ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'your-email@example.com', 'super_admin');

-- ============================================================
-- Step 3: 관리자가 추가되었는지 확인
-- ============================================================
-- SELECT * FROM admin_users;
