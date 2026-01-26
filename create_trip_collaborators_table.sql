-- 여행 계획 협업자 테이블 생성
-- trip_collaborators: 여행 계획 공동 편집 권한 관리
-- 참고: trip_plans.id가 INTEGER 타입이므로 plan_id도 INTEGER로 설정

CREATE TABLE IF NOT EXISTS trip_collaborators (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES trip_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL DEFAULT 'edit' CHECK (permission IN ('view', 'edit', 'admin')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(plan_id, user_id)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_plan_id ON trip_collaborators(plan_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user_id ON trip_collaborators(user_id);

-- 초대 링크 테이블 (로그인하지 않은 사용자도 초대받을 수 있도록)
CREATE TABLE IF NOT EXISTS trip_invites (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES trip_plans(id) ON DELETE CASCADE,
    invite_code VARCHAR(32) UNIQUE NOT NULL,
    permission VARCHAR(20) NOT NULL DEFAULT 'edit' CHECK (permission IN ('view', 'edit')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    max_uses INTEGER DEFAULT 10,
    use_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_trip_invites_invite_code ON trip_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_trip_invites_plan_id ON trip_invites(plan_id);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invites ENABLE ROW LEVEL SECURITY;

-- trip_collaborators RLS 정책
-- 자신이 협업자인 레코드만 조회 가능
CREATE POLICY "Users can view their own collaborations" 
    ON trip_collaborators FOR SELECT 
    USING (auth.uid() = user_id);

-- 여행 계획 소유자는 협업자 추가/수정/삭제 가능
CREATE POLICY "Plan owners can manage collaborators" 
    ON trip_collaborators FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM trip_plans 
            WHERE trip_plans.id = trip_collaborators.plan_id 
            AND trip_plans.user_id = auth.uid()
        )
    );

-- admin 권한의 협업자도 다른 협업자 관리 가능
CREATE POLICY "Admin collaborators can manage collaborators" 
    ON trip_collaborators FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM trip_collaborators tc 
            WHERE tc.plan_id = trip_collaborators.plan_id 
            AND tc.user_id = auth.uid() 
            AND tc.permission = 'admin'
        )
    );

-- trip_invites RLS 정책
-- 초대 코드 조회는 누구나 가능 (초대 수락을 위해)
CREATE POLICY "Anyone can view active invites by code" 
    ON trip_invites FOR SELECT 
    USING (is_active = true AND expires_at > NOW());

-- 여행 계획 소유자 또는 admin 협업자만 초대 생성/관리 가능
CREATE POLICY "Plan owners and admins can manage invites" 
    ON trip_invites FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM trip_plans 
            WHERE trip_plans.id = trip_invites.plan_id 
            AND trip_plans.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM trip_collaborators tc 
            WHERE tc.plan_id = trip_invites.plan_id 
            AND tc.user_id = auth.uid() 
            AND tc.permission = 'admin'
        )
    );

-- 협업자가 여행 계획을 조회할 수 있도록 정책 추가
CREATE POLICY "Collaborators can view shared plans" 
    ON trip_plans FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM trip_collaborators 
            WHERE trip_collaborators.plan_id = trip_plans.id 
            AND trip_collaborators.user_id = auth.uid()
        )
    );

-- 협업자가 여행 계획을 수정할 수 있도록 정책 추가 (edit/admin 권한)
CREATE POLICY "Collaborators with edit permission can update plans" 
    ON trip_plans FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM trip_collaborators 
            WHERE trip_collaborators.plan_id = trip_plans.id 
            AND trip_collaborators.user_id = auth.uid()
            AND trip_collaborators.permission IN ('edit', 'admin')
        )
    );

-- trip_days 테이블도 협업자 접근 가능하도록
CREATE POLICY "Collaborators can view trip days" 
    ON trip_days FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM trip_collaborators 
            WHERE trip_collaborators.plan_id = trip_days.plan_id 
            AND trip_collaborators.user_id = auth.uid()
        )
    );

CREATE POLICY "Collaborators with edit permission can manage trip days" 
    ON trip_days FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM trip_collaborators 
            WHERE trip_collaborators.plan_id = trip_days.plan_id 
            AND trip_collaborators.user_id = auth.uid()
            AND trip_collaborators.permission IN ('edit', 'admin')
        )
    );

-- trip_places 테이블도 협업자 접근 가능하도록
CREATE POLICY "Collaborators can view trip places" 
    ON trip_places FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM trip_days 
            JOIN trip_collaborators ON trip_collaborators.plan_id = trip_days.plan_id
            WHERE trip_days.id = trip_places.day_id 
            AND trip_collaborators.user_id = auth.uid()
        )
    );

CREATE POLICY "Collaborators with edit permission can manage trip places" 
    ON trip_places FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM trip_days 
            JOIN trip_collaborators ON trip_collaborators.plan_id = trip_days.plan_id
            WHERE trip_days.id = trip_places.day_id 
            AND trip_collaborators.user_id = auth.uid()
            AND trip_collaborators.permission IN ('edit', 'admin')
        )
    );

COMMENT ON TABLE trip_collaborators IS '여행 계획 협업자 테이블 - 공동 편집 권한 관리';
COMMENT ON COLUMN trip_collaborators.permission IS 'view: 보기만, edit: 편집 가능, admin: 협업자 관리 가능';
COMMENT ON TABLE trip_invites IS '여행 계획 초대 링크 테이블 - 공유 링크로 초대';
