import { createClient } from '@supabase/supabase-js'

// Supabase URL과 키는 환경변수에서 로드 (.env 파일 참조)
// trim()으로 불필요한 공백/개행 제거
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// 관리자 인증 함수
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    return { error }
  } catch (err) {
    // 세션이 없는 경우에도 로그아웃 처리
    return { error: null }
  }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// 실시간 인증 상태 변경 리스너
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}

// 카카오 OAuth 로그인
export const signInWithKakao = async (returnPath) => {
  // 현재 페이지 경로를 리다이렉트 URL로 사용 (기본값: 현재 페이지)
  const currentPath = returnPath || (typeof window !== 'undefined' ? window.location.pathname : '/')
  const redirectUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${currentPath}` 
    : undefined

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: redirectUrl,
      scopes: 'profile_nickname profile_image account_email'
    }
  })
  return { data, error }
}

// 현재 세션 가져오기
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

// URL에서 인증 코드 교환 (OAuth callback 처리)
export const exchangeCodeForSession = async () => {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    // URL에서 코드 파라미터 제거
    if (!error) {
      url.searchParams.delete('code')
      window.history.replaceState({}, '', url.toString())
    }
    
    return { data, error }
  }
  
  return { data: null, error: null }
}

// 실시간 구독 헬퍼 함수

// 여행 계획 실시간 구독 (특정 계획의 변경 감지)
export const subscribeTripPlanChanges = (planId, onUpdate) => {
  const channel = supabase
    .channel(`trip_plan_${planId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trip_plans',
        filter: `id=eq.${planId}`
      },
      (payload) => {
        onUpdate({ type: 'plan', event: payload.eventType, data: payload.new, old: payload.old })
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trip_days',
        filter: `plan_id=eq.${planId}`
      },
      (payload) => {
        onUpdate({ type: 'day', event: payload.eventType, data: payload.new, old: payload.old })
      }
    )
    .subscribe()

  return channel
}

// 여행 장소 실시간 구독 (일차별 장소 변경 감지)
export const subscribeTripPlacesChanges = (dayIds, onUpdate) => {
  if (!dayIds || dayIds.length === 0) return null
  
  const channel = supabase
    .channel(`trip_places_${dayIds.join('_')}`)
  
  // 각 일차에 대해 구독 추가
  dayIds.forEach(dayId => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trip_places',
        filter: `day_id=eq.${dayId}`
      },
      (payload) => {
        onUpdate({ type: 'place', event: payload.eventType, data: payload.new, old: payload.old, dayId })
      }
    )
  })
  
  channel.subscribe()
  return channel
}

// 협업자 변경 구독
export const subscribeCollaboratorChanges = (planId, onUpdate) => {
  const channel = supabase
    .channel(`trip_collaborators_${planId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trip_collaborators',
        filter: `plan_id=eq.${planId}`
      },
      (payload) => {
        onUpdate({ type: 'collaborator', event: payload.eventType, data: payload.new, old: payload.old })
      }
    )
    .subscribe()

  return channel
}

// 구독 해제
export const unsubscribeChannel = (channel) => {
  if (channel) {
    supabase.removeChannel(channel)
  }
}
