import { memo } from 'react'
import { FiMap, FiCalendar, FiActivity, FiCoffee, FiSun, FiHeart } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
// CSS는 _app.jsx에서 import

const QuickMenu = memo(() => {
  const { t } = useLanguage()

  const quickMenuItems = [
    { icon: FiMap, label: t.quickMenu.travelCourse, link: '/travel' },
    { icon: FiCoffee, label: t.quickMenu.restaurant, link: '/food' },
    { icon: FiCalendar, label: t.quickMenu.festival, link: '/festival' },
    { icon: FiActivity, label: t.quickMenu.leisure || '레저', link: '/leisure' },
    { icon: FiSun, label: t.quickMenu.seasonTravel, link: '/travel' },
    { icon: FiHeart, label: t.quickMenu.recommend, link: '/shared-trips' },
  ]

  return (
    <section className="quick-menu">
      <div className="container">
        <div className="quick-menu-header">
          <h2 className="section-title">{t.quickMenu.title}</h2>
          <p className="section-subtitle">{t.quickMenu.subtitle}</p>
        </div>
        <div className="quick-menu-grid">
          {quickMenuItems.map((item, index) => (
            <a key={index} href={item.link} className="quick-menu-item">
              <div className="quick-menu-icon">
                <item.icon />
              </div>
              <span className="quick-menu-label">{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
})

QuickMenu.displayName = 'QuickMenu'

export default QuickMenu
