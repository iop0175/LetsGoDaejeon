import { useState, useEffect, memo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiMenu, FiX, FiSearch, FiMapPin, FiGlobe, FiSun, FiMoon } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import './Header.css'

const Header = memo(() => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { language, toggleLanguage, t } = useLanguage()
  const { isDark, toggleTheme } = useTheme()

  const navItems = [
    { path: '/', label: t.nav.home },
    { path: '/travel', label: t.nav.travel },
    { path: '/festival', label: t.nav.festival },
    { path: '/food', label: t.nav.food },
    { path: '/map', label: t.nav.map },
  ]

  const moreMenuItems = [
    { path: '/parking', label: t.nav.parking },
    { path: '/culture', label: t.nav.culture },
    { path: '/medical', label: t.nav.medical },
    { path: '/shopping', label: t.nav.shopping },
    { path: '/accommodation', label: t.nav.accommodation },
    { path: '/my-trip', label: language === 'ko' ? '나의 여행' : 'My Trip' },
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
  }, [location])

  const handleSearchClick = () => {
    navigate('/search')
  }

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
