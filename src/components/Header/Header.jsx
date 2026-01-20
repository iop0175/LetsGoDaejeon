import { useState, useEffect, memo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiMenu, FiX, FiSearch, FiMapPin, FiGlobe, FiSun, FiMoon, FiUser, FiLogOut } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import './Header.css'

const Header = memo(() => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { language, toggleLanguage, t } = useLanguage()
  const { isDark, toggleTheme } = useTheme()
  const { user, loginWithKakao, logout, getUserProfile } = useAuth()

  const navItems = [
    { path: '/', label: t.nav.home },
    { path: '/travel', label: t.nav.travel },
    { path: '/festival', label: t.nav.festival },
    { path: '/food', label: t.nav.food },
    { path: '/map', label: t.nav.map },
    { path: '/my-trip', label: language === 'ko' ? '나의 여행' : 'My Trip' },
  ]

  const moreMenuItems = [
    { path: '/parking', label: t.nav.parking },
    { path: '/culture', label: t.nav.culture },
    { path: '/medical', label: t.nav.medical },
    { path: '/shopping', label: t.nav.shopping },
    { path: '/accommodation', label: t.nav.accommodation },
  ]

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
    setIsMoreMenuOpen(false)
    setIsUserMenuOpen(false)
  }, [location])

  const handleSearchClick = () => {
    navigate('/search')
  }

  const handleKakaoLogin = async () => {
    try {
      await loginWithKakao()
    } catch (err) {
      console.error('카카오 로그인 실패:', err)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setIsUserMenuOpen(false)
    } catch (err) {
      console.error('로그아웃 실패:', err)
    }
  }

  const userProfile = getUserProfile()

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        <Link to="/" className="logo">
          <FiMapPin className="logo-icon" />
          <span className="logo-text">
            <span className="logo-main">{t.siteName}</span>
            <span className="logo-sub">{t.siteSubtitle}</span>
          </span>
        </Link>

        <nav className={`nav ${isMobileMenuOpen ? 'open' : ''}`}>
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path} className="nav-item">
                <Link
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="nav-item more-menu">
              <button 
                className={`nav-link more-btn ${moreMenuItems.some(i => i.path === location.pathname) ? 'active' : ''}`}
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              >
                {language === 'ko' ? '더보기' : 'More'}
                <span className={`arrow ${isMoreMenuOpen ? 'open' : ''}`}>▼</span>
              </button>
              {isMoreMenuOpen && (
                <ul className="dropdown-menu">
                  {moreMenuItems.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`dropdown-link ${location.pathname === item.path ? 'active' : ''}`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </ul>
        </nav>

        <div className="header-actions">
          <button 
            className="theme-btn" 
            onClick={toggleTheme}
            aria-label="테마 변경"
          >
            {isDark ? <FiSun /> : <FiMoon />}
          </button>
          <button 
            className="lang-btn" 
            onClick={toggleLanguage}
            aria-label="언어 변경"
          >
            <FiGlobe />
            <span>{language === 'ko' ? 'EN' : '한'}</span>
          </button>
          <button className="search-btn" aria-label="검색" onClick={handleSearchClick}>
            <FiSearch />
          </button>
          
          {/* 로그인/사용자 메뉴 */}
          {user ? (
            <div className="user-menu-container">
              <button 
                className="user-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-label="사용자 메뉴"
              >
                {userProfile?.avatar ? (
                  <img 
                    src={userProfile.avatar} 
                    alt={userProfile.nickname}
                    className="user-avatar"
                  />
                ) : (
                  <FiUser />
                )}
              </button>
              {isUserMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-info">
                    {userProfile?.avatar && (
                      <img 
                        src={userProfile.avatar} 
                        alt={userProfile.nickname}
                        className="user-dropdown-avatar"
                      />
                    )}
                    <span className="user-nickname">{userProfile?.nickname}</span>
                    {userProfile?.provider === 'kakao' && (
                      <span className="user-provider">카카오</span>
                    )}
                  </div>
                  <Link to="/my-trip" className="user-dropdown-item" onClick={() => setIsUserMenuOpen(false)}>
                    <FiMapPin />
                    {language === 'ko' ? '나의 여행' : 'My Trip'}
                  </Link>
                  <button className="user-dropdown-item logout-btn" onClick={handleLogout}>
                    <FiLogOut />
                    {language === 'ko' ? '로그아웃' : 'Logout'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="login-btn" onClick={handleKakaoLogin}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.463 2 10.71c0 2.754 1.826 5.168 4.568 6.528-.16.57-.622 2.234-.714 2.584-.112.43.158.424.332.308.137-.09 2.173-1.474 3.056-2.074.254.038.515.058.78.072h-.02c.332.02.665.03 1 .03 5.523 0 10-3.463 10-7.448S17.523 3 12 3z"/>
              </svg>
              <span>{language === 'ko' ? '로그인' : 'Login'}</span>
            </button>
          )}

          <button
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="메뉴"
          >
            {isMobileMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>
    </header>
  )
})

Header.displayName = 'Header'

export default Header
