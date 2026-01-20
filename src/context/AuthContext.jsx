import { useState, useEffect, createContext, useContext } from 'react'
import { supabase, getCurrentUser, onAuthStateChange, signIn, signOut, signInWithKakao, getSession, exchangeCodeForSession } from '../services/supabase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 초기 사용자 상태 확인 - 세션 기반으로 변경
    const initAuth = async () => {
      try {
        // URL에 인증 코드가 있으면 교환 (OAuth callback)
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        
        if (code) {
          console.log('OAuth 인증 코드 발견, 세션 교환 중...')
          const { data: exchangeData, error: exchangeError } = await exchangeCodeForSession()
          
          if (exchangeError) {
            console.error('코드 교환 오류:', exchangeError)
          } else if (exchangeData?.session) {
            console.log('세션 교환 성공:', exchangeData.session.user.email)
            setUser(exchangeData.session.user)
            setLoading(false)
            return
          }
        }
        
        // 세션 가져오기
        const { session, error } = await getSession()
        
        if (error) {
          console.error('세션 가져오기 오류:', error)
        }
        
        if (session?.user) {
          console.log('사용자 세션 발견:', session.user.email)
          setUser(session.user)
        } else {
          console.log('활성 세션 없음')
          setUser(null)
        }
      } catch (err) {
        console.error('인증 초기화 오류:', err)
        setUser(null)
      }
      setLoading(false)
    }
    
    initAuth()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('인증 상태 변경:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      } else {
        setUser(session?.user ?? null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const { data, error } = await signIn(email, password)
    if (error) throw error
    return data
  }

  // 카카오 로그인
  const loginWithKakao = async () => {
    const { data, error } = await signInWithKakao()
    if (error) throw error
    return data
  }

  const logout = async () => {
    const { error } = await signOut()
    if (error) throw error
    setUser(null)
  }

  // 사용자 프로필 정보 가져오기 (카카오 로그인 후)
  const getUserProfile = () => {
    if (!user) return null
    
    return {
      id: user.id,
      email: user.email,
      nickname: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0],
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      provider: user.app_metadata?.provider || 'email'
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      loginWithKakao, 
      logout, 
      getUserProfile,
      supabase 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
