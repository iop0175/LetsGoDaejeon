import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  // SSR 환경에서는 기본값 사용, 클라이언트에서만 localStorage 접근
  const [theme, setTheme] = useState('light')
  const [isHydrated, setIsHydrated] = useState(false)

  // 클라이언트에서 hydration 후 실제 테마 적용
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setTheme(savedTheme)
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
    setIsHydrated(true)
  }, [])

  // 테마 변경 시 처리
  useEffect(() => {
    // SSR 환경에서는 실행하지 않음
    if (typeof window === 'undefined') return
    
    const root = document.documentElement
    
    if (theme === 'dark') {
      root.classList.add('dark-theme')
      root.classList.remove('light-theme')
    } else {
      root.classList.add('light-theme')
      root.classList.remove('dark-theme')
    }
    
    if (isHydrated) {
      localStorage.setItem('theme', theme)
    }
  }, [theme, isHydrated])

  // 시스템 테마 변경 감지
  useEffect(() => {
    // SSR 환경에서는 실행하지 않음
    if (typeof window === 'undefined') return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  const isDark = theme === 'dark'

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeContext
