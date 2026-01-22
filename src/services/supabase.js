import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://geczvsuzwpvdxiwbxqtf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

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
