import { memo } from 'react'
import Link from 'next/link'
import { FiMapPin, FiMail } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { CITY } from '../../config/cities'
import { getCityFeatures } from '../../config/cityFeatures'
// CSS는 _app.jsx에서 import

const Footer = memo(() => {
  const { t, language } = useLanguage()

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-info">
            <div className="footer-logo">
              <FiMapPin className="footer-logo-icon" />
              <span>{t.siteName}</span>
            </div>
            <p className="footer-desc">
              {t.footer.description}
            </p>
            <div className="footer-contact">
              <div className="contact-item">
                <FiMail />
                <span>daegiEun700@gmail.com</span>
              </div>
            </div>
          </div>

          <div className="footer-links">
            <div className="footer-link-group">
              <h4>{t.footer.tourInfo}</h4>
              <ul>
                <li><Link href="/travel">{t.nav.travel}</Link></li>
                <li><Link href="/food">{t.nav.food}</Link></li>
                <li><Link href="/festival">{t.nav.festival}</Link></li>
                <li><Link href="/culture">{t.nav.culture}</Link></li>
                <li><Link href="/leisure">{language === 'ko' ? '레포츠' : 'Leisure'}</Link></li>
                <li><Link href="/accommodation">{t.nav.accommodation}</Link></li>
                <li><Link href="/shopping">{t.nav.shopping}</Link></li>
              </ul>
            </div>
            <div className="footer-link-group">
              <h4>{language === 'ko' ? '여행 도구' : 'Travel tools'}</h4>
              <ul>
                <li><Link href="/map">{t.nav.map}</Link></li>
                <li><Link href="/trip-planner">{language === 'ko' ? '여행 일정 만들기' : 'Trip planner'}</Link></li>
                <li><Link href="/guides">{language === 'ko' ? '테마별 여행 코스' : 'Travel guides'}</Link></li>
                <li><Link href="/live">{language === 'ko' ? '실시간 여행 현황' : 'Live city conditions'}</Link></li>
                {getCityFeatures(CITY.key).map((feature) => <li key={feature.id}><Link href={feature.path}>{language === 'ko' ? feature.ko : feature.en}</Link></li>)}
                {CITY.key === 'daejeon' && <li><Link href="/shared-trips">{language === 'ko' ? '여행코스' : 'Travel Courses'}</Link></li>}
                {CITY.parkingReady && <li><Link href="/parking">{t.nav.parking}</Link></li>}
                {CITY.medicalReady && <li><Link href="/medical">{t.nav.medical}</Link></li>}
              </ul>
            </div>
            <div className="footer-link-group">
              <h4>{t.footer.relatedSites}</h4>
              <ul>
                <li><a href={CITY.governmentUrl} target="_blank" rel="noopener noreferrer">{t.footer.daejeonCity}</a></li>
                <li><a href="https://www.visitkorea.or.kr" target="_blank" rel="noopener noreferrer">{t.footer.visitKorea}</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copyright">
            <p className="footer-disclaimer">
              {language === 'ko' ? `${CITY.name}는 ${CITY.aliases[0]} 및 관광기관의 공식 홈페이지가 아닙니다. 관광 정보 제공을 목적으로 운영하는 민간 여행 안내 사이트입니다.` : `${CITY.englishName} is an independently operated travel guide, not an official website of the ${CITY.cityNameEn} government or tourism authority.`}
            </p>
            <p>{t.footer.copyright}</p>
            <p className="footer-data-source">{t.footer.dataSource}</p>
            <div className="footer-legal">
              <Link href="/privacy">{t.footer.privacy}</Link>
              <Link href="/terms">{t.footer.terms}</Link>
              <Link href="/copyright">{t.footer.copyrightPolicy}</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
})

Footer.displayName = 'Footer'

export default Footer
