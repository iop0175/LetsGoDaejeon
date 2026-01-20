import { memo } from 'react'
import { Link } from 'react-router-dom'
import { FiMapPin, FiPhone, FiMail, FiInstagram, FiFacebook, FiYoutube } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import './Footer.css'

const Footer = memo(() => {
  const { t } = useLanguage()

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
                <FiPhone />
                <span>{t.footer.tourHotline}</span>
              </div>
              <div className="contact-item">
                <FiMail />
                <span>tour@daejeon.go.kr</span>
              </div>
            </div>
          </div>

          <div className="footer-links">
            <div className="footer-link-group">
              <h4>{t.footer.tourInfo}</h4>
              <ul>
                <li><Link to="/travel">{t.nav.travel}</Link></li>
                <li><Link to="/festival">{t.nav.festival}</Link></li>
                <li><Link to="/food">{t.nav.food}</Link></li>
              </ul>
            </div>
            <div className="footer-link-group">
              <h4>{t.footer.customerService}</h4>
              <ul>
                <li><a href="#">{t.footer.faq}</a></li>
                <li><a href="#">{t.footer.tourOffice}</a></li>
                <li><a href="#">{t.footer.travelGuide}</a></li>
              </ul>
            </div>
            <div className="footer-link-group">
              <h4>{t.footer.relatedSites}</h4>
              <ul>
                <li><a href="https://www.daejeon.go.kr" target="_blank" rel="noopener noreferrer">{t.footer.daejeonCity}</a></li>
                <li><a href="https://www.visitkorea.or.kr" target="_blank" rel="noopener noreferrer">{t.footer.visitKorea}</a></li>
                <li><a href="#" target="_blank" rel="noopener noreferrer">{t.footer.tourCorp}</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-social">
            <a href="#" aria-label="Instagram" className="social-link">
              <FiInstagram />
            </a>
            <a href="#" aria-label="Facebook" className="social-link">
              <FiFacebook />
            </a>
            <a href="#" aria-label="YouTube" className="social-link">
              <FiYoutube />
            </a>
          </div>
          <div className="footer-copyright">
            <p>{t.footer.copyright}</p>
            <p className="footer-data-source">{t.footer.dataSource}</p>
            <div className="footer-legal">
              <Link to="/privacy">{t.footer.privacy}</Link>
              <Link to="/terms">{t.footer.terms}</Link>
              <Link to="/copyright">{t.footer.copyrightPolicy}</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
})

Footer.displayName = 'Footer'

export default Footer
