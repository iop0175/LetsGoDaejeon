import dynamic from 'next/dynamic'
import HeroSection from '../components/HeroSection/HeroSection'
import QuickMenu from '../components/QuickMenu/QuickMenu'
import PopularSpots from '../components/PopularSpots/PopularSpots'
import SEO, { SEO_DATA } from '../components/common/SEO'
import { useLanguage } from '../context/LanguageContext'
import Link from 'next/link'
import { CITY } from '../config/cities'
import { getCityGuides } from '../config/cityGuides'
// CSS는 pages/_app.jsx에서 import

// Dynamic imports for below-the-fold components
const FestivalSection = dynamic(() => import('../components/FestivalSection/FestivalSection'), {
  loading: () => <div className="section-loading" />,
  ssr: true
})
const FoodSection = dynamic(() => import('../components/FoodSection/FoodSection'), {
  loading: () => <div className="section-loading" />,
  ssr: true
})
const TravelCourse = dynamic(() => import('../components/TravelCourse/TravelCourse'), {
  loading: () => <div className="section-loading" />,
  ssr: true
})
const WeatherWidget = dynamic(() => import('../components/WeatherWidget/WeatherWidget'), {
  loading: () => null,
  ssr: false
})
const KakaoChannelButton = dynamic(() => import('../components/KakaoChannelButton/KakaoChannelButton'), {
  loading: () => null,
  ssr: false
})

const HomePage = () => {
  const { language } = useLanguage()
  const seoData = SEO_DATA.home[language] || SEO_DATA.home.ko
  const locale = language === 'en' ? 'en' : 'ko'
  const guideLocale = language === 'en' ? 'en' : 'kr'
  const guides = getCityGuides(CITY.key).slice(0, 4)

  return (
    <>
      <SEO 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        url="/"
      />
      {/* SEO H1 - 시각적으로 숨김, 스크린리더와 검색엔진에 표시 */}
      <h1 className="visually-hidden">대전으로 - 대전 관광 여행 가이드 | 맛집, 축제, 숙소 정보</h1>
      <HeroSection />
      <QuickMenu />
      <PopularSpots />
      <TravelCourse />
      <section className="section home-guides">
        <div className="container">
          <div className="home-guides__head"><div><h2 className="section-title">{locale === 'ko' ? `${CITY.cityName} 상황별 여행 코스` : `${CITY.cityNameEn} itineraries`}</h2><p className="section-subtitle">{locale === 'ko' ? '일정과 날씨, 동행에 맞는 코스를 골라보세요.' : 'Pick a route for your schedule, weather and travel group.'}</p></div><Link href="/guides">{locale === 'ko' ? '전체 보기' : 'View all'}</Link></div>
          <div className="home-guides__grid">{guides.map((guide) => <Link href={`/guides/${guide.slug}`} key={guide.slug}><strong>{guide[guideLocale].title}</strong><span>{guide[guideLocale].description}</span></Link>)}</div>
          <div className="home-guides__live"><Link href="/live">{locale === 'ko' ? `지금 ${CITY.cityName} 날씨·혼잡·여행 정보 보기` : `Check live weather and travel conditions in ${CITY.cityNameEn}`} →</Link></div>
        </div>
      </section>
      <FestivalSection />
      <FoodSection />
      
      {/* 오른쪽 사이드바 날씨 위젯 */}
      <div className="weather-sidebar">
        <WeatherWidget />
      </div>
      
      {/* 카카오톡 채널 플로팅 버튼 */}
      <KakaoChannelButton channelUrl="http://pf.kakao.com/_xnxgxkAX" />
    </>
  )
}

export default HomePage
