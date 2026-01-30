import HeroSection from '../components/HeroSection/HeroSection'
import QuickMenu from '../components/QuickMenu/QuickMenu'
import PopularSpots from '../components/PopularSpots/PopularSpots'
import FestivalSection from '../components/FestivalSection/FestivalSection'
import FoodSection from '../components/FoodSection/FoodSection'
import TravelCourse from '../components/TravelCourse/TravelCourse'
import WeatherWidget from '../components/WeatherWidget/WeatherWidget'
import KakaoChannelButton from '../components/KakaoChannelButton/KakaoChannelButton'
import SEO, { SEO_DATA } from '../components/common/SEO'
import { useLanguage } from '../context/LanguageContext'
// CSS는 pages/_app.jsx에서 import

const HomePage = () => {
  const { language } = useLanguage()
  const seoData = SEO_DATA.home[language] || SEO_DATA.home.ko

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
