import { useState, useEffect, createContext, useContext } from 'react'
import { supabase, getCurrentUser, onAuthStateChange, signIn, signOut, signInWithKakao, getSession, exchangeCodeForSession } from '../services/supabase'
import { toSecureUrl } from '../utils/imageUtils'

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

          const { data: exchangeData, error: exchangeError } = await exchangeCodeForSession()
          
          if (exchangeError) {

          } else if (exchangeData?.session) {

            setUser(exchangeData.session.user)
            setLoading(false)
            return
          }
        }
        
        // 세션 가져오기
        const { session, error } = await getSession()
        
        if (error) {

        }
        
        if (session?.user) {

          setUser(session.user)
        } else {

          setUser(null)
        }
      } catch (err) {

        setUser(null)
      }
      setLoading(false)
    }
    
    initAuth()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = onAuthStateChange((event, session) => {

      
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

  // 카카오 로그인 (returnPath: 로그인 후 돌아갈 경로)
  const loginWithKakao = async (returnPath) => {
    const { data, error } = await signInWithKakao(returnPath)
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
      avatar: toSecureUrl(user.user_metadata?.avatar_url || user.user_metadata?.picture),
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
