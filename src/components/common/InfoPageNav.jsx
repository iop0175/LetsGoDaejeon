import Link from 'next/link'
import { useRouter } from 'next/router'
import { FiArrowLeft, FiMapPin } from 'react-icons/fi'
import { CITY } from '../../config/cities'
import { getCityFeatures } from '../../config/cityFeatures'

export default function InfoPageNav() {
  const { pathname, locale } = useRouter()
  const en = locale === 'en'
  const section = `/${pathname.split('/')[1]}`
  const links = [
    ...(CITY.parkingReady ? [{ path: '/parking', ko: '주차장', en: 'Parking' }] : []),
    ...getCityFeatures(CITY.key).filter((feature) => ['gas', 'ev', 'themes', 'subway', 'beaches'].includes(feature.id))
  ]
  const current = links.find((item) => item.path === section)
  const back = pathname === section || pathname === '/parking' ? '/' : section

  return (
    <div className="info-navigation">
      <div className="info-navigation__context">
        <Link href={back}><FiArrowLeft aria-hidden="true" />{back === '/' ? (en ? 'Home' : '홈으로') : (en ? current?.en : current?.ko)}</Link>
        <span><FiMapPin aria-hidden="true" />{en ? CITY.cityNameEn : CITY.cityName} · {en ? 'Travel essentials' : '여행 생활정보'}</span>
      </div>
      <nav className="info-navigation__links" aria-label={en ? 'Travel information' : '여행 생활정보'}>
        {links.map((item) => (
          <Link key={item.path} href={item.path} aria-current={section === item.path ? 'page' : undefined}>
            {en ? item.en : item.ko}
          </Link>
        ))}
      </nav>
    </div>
  )
}
