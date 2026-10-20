import { memo } from 'react'
import Link from 'next/link'
import { FiMap, FiCalendar, FiActivity, FiCoffee, FiSun, FiHeart } from 'react-icons/fi'
import { useLanguage } from '../../context/LanguageContext'
import { CITY } from '../../config/cities'
import SectionHeading from '../common/SectionHeading'
// CSS는 _app.jsx에서 import

const QuickMenu = memo(() => {
  const { t, language } = useLanguage()

  const quickMenuItems = [
    { icon: FiMap, label: t.quickMenu.travelCourse, link: '/travel' },
    { icon: FiCoffee, label: t.quickMenu.restaurant, link: '/food' },
    { icon: FiCalendar, label: t.quickMenu.festival, link: '/festival' },
    { icon: FiActivity, label: t.quickMenu.leisure || '레저', link: '/leisure' },
    { icon: FiSun, label: t.quickMenu.seasonTravel, link: '/travel' },
    { icon: FiHeart, label: t.quickMenu.recommend, link: CITY.key === 'daejeon' ? '/shared-trips' : '/travel' },
  ]

  return (
    <section className="quick-menu">
      <div className="container">
        <SectionHeading eyebrow={language === 'ko' ? '여행의 시작' : 'START EXPLORING'} title={language === 'ko' ? '어떤 여행을 찾으세요?' : 'Find your kind of trip'} description={language === 'ko' ? '가보고 싶은 곳과 즐길 거리를 골라보세요.' : 'Choose places to visit and things to enjoy.'} />
        <div className="quick-menu-grid">
          {quickMenuItems.map((item, index) => (
            <Link key={index} href={item.link} className="quick-menu-item">
              <div className="quick-menu-icon">
                <item.icon />
              </div>
              <span className="quick-menu-label">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
})

QuickMenu.displayName = 'QuickMenu'

export default QuickMenu
