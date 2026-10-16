import { useRouter } from 'next/router'
import SeoHead from '../src/components/common/SeoHead'
import { getPageSeo } from '../src/config/pageSeo'
import dynamic from 'next/dynamic'
import HeroSection from '../src/components/HeroSection/HeroSection'
import { getHeroSlides } from '../src/services/dbService'
import { CITY, IS_CITY_PREVIEW } from '../src/config/cities'

// SSR 호환성을 위해 클라이언트 전용 컴포넌트로 동적 임포트
const QuickMenu = dynamic(() => import('../src/components/QuickMenu/QuickMenu'), { ssr: true })
const PopularSpots = dynamic(() => import('../src/components/PopularSpots/PopularSpots'), { ssr: true })
const FestivalSection = dynamic(() => import('../src/components/FestivalSection/FestivalSection'), { ssr: true })
const FoodSection = dynamic(() => import('../src/components/FoodSection/FoodSection'), { ssr: true })
const TravelCourse = dynamic(() => import('../src/components/TravelCourse/TravelCourse'), { ssr: true })
const SeoulCrowd = dynamic(() => import('../src/components/SeoulCrowd/SeoulCrowd'), { ssr: false })
const BusanDistricts = dynamic(() => import('../src/components/BusanDistricts/BusanDistricts'), { ssr: false })
const BusanGuides = dynamic(() => import('../src/components/BusanDistricts/BusanGuides'), { ssr: false })
const JejuThemes = dynamic(() => import('../src/components/JejuThemes/JejuThemes'), { ssr: false })
const WeatherWidget = dynamic(() => import('../src/components/WeatherWidget/WeatherWidget'), { ssr: false })
const KakaoChannelButton = dynamic(() => import('../src/components/KakaoChannelButton/KakaoChannelButton'), { ssr: false })

export default function HomePage({ heroSlides }) {
  const { locale } = useRouter()
  const loc = locale === 'en' ? 'en' : 'kr'
  const seo = getPageSeo('home', loc)

  return (
    <>
      <SeoHead
        page="home"
        path="/"
        image={CITY.hero?.image}
        imageAlt={seo.title}
        includeSiteLd
      />
      <h1 className="visually-hidden">{seo.title}</h1>

      <HeroSection initialSlides={heroSlides} />
      <QuickMenu />
      <PopularSpots />
      {CITY.key === 'seoul' && <SeoulCrowd />}
      {CITY.key === 'busan' && <BusanDistricts />}
      {CITY.key === 'busan' && <BusanGuides />}
      {CITY.key === 'jeju' && <JejuThemes />}
      {CITY.key === 'daejeon' && <TravelCourse />}
      <FestivalSection />
      <FoodSection />
      
      {/* 오른쪽 사이드바 날씨 위젯 */}
      <div className="weather-sidebar">
        <WeatherWidget />
      </div>
      
      {/* 카카오톡 채널 플로팅 버튼 */}
      {CITY.key === 'daejeon' && !IS_CITY_PREVIEW && <KakaoChannelButton channelUrl="http://pf.kakao.com/_xnxgxkAX" />}
    </>
  )
}

// 정적 생성 (SSG) - 빌드 시 히어로 슬라이드 데이터 미리 가져오기
export async function getStaticProps() {
  let heroSlides = []
  
  try {
    const result = await getHeroSlides(true)
    if (result.success && result.items.length > 0) {
      heroSlides = result.items
    }
  } catch (error) {
    console.error('Failed to fetch hero slides:', error)
  }
  
  return {
    props: {
      heroSlides,
    },
    // 1시간마다 재생성 (ISR)
    revalidate: 3600
  }
}
