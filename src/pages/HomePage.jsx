import HeroSection from '../components/HeroSection/HeroSection'
import QuickMenu from '../components/QuickMenu/QuickMenu'
import PopularSpots from '../components/PopularSpots/PopularSpots'
import FestivalSection from '../components/FestivalSection/FestivalSection'
import FoodSection from '../components/FoodSection/FoodSection'
import TravelCourse from '../components/TravelCourse/TravelCourse'
import WeatherWidget from '../components/WeatherWidget/WeatherWidget'
import './HomePage.css'

const HomePage = () => {
  return (
    <>
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
    </>
  )
}

export default HomePage
