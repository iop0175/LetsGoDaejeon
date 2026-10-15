import Head from 'next/head'
import dynamic from 'next/dynamic'
import HeroSection from '../src/components/HeroSection/HeroSection'
import { getHeroSlides } from '../src/services/dbService'
import { CITY, SITE_URL, IS_CITY_PREVIEW } from '../src/config/cities'

// SSR 호환성을 위해 클라이언트 전용 컴포넌트로 동적 임포트
const QuickMenu = dynamic(() => import('../src/components/QuickMenu/QuickMenu'), { ssr: true })
const PopularSpots = dynamic(() => import('../src/components/PopularSpots/PopularSpots'), { ssr: true })
const FestivalSection = dynamic(() => import('../src/components/FestivalSection/FestivalSection'), { ssr: true })
const FoodSection = dynamic(() => import('../src/components/FoodSection/FoodSection'), { ssr: true })
const TravelCourse = dynamic(() => import('../src/components/TravelCourse/TravelCourse'), { ssr: true })
const SeoulCrowd = dynamic(() => import('../src/components/SeoulCrowd/SeoulCrowd'), { ssr: false })
const JejuThemes = dynamic(() => import('../src/components/JejuThemes/JejuThemes'), { ssr: false })
const WeatherWidget = dynamic(() => import('../src/components/WeatherWidget/WeatherWidget'), { ssr: false })
const KakaoChannelButton = dynamic(() => import('../src/components/KakaoChannelButton/KakaoChannelButton'), { ssr: false })

// SEO 메타데이터
const SEO = {
  title: `${CITY.name} | ${CITY.englishName} - ${CITY.cityName} 관광 여행 가이드`,
  description: `${CITY.cityName}의 관광지, 맛집, 공연과 문화시설을 소개합니다. ${CITY.cityName} 여행의 모든 것을 한눈에!`,
  keywords: `${CITY.cityName}, ${CITY.cityName} 여행, ${CITY.cityName} 맛집, ${CITY.cityNameEn} Tourism`,
  url: SITE_URL,
  image: `${SITE_URL}${CITY.hero?.image || '/og-image.svg'}`
}

export default function HomePage({ heroSlides }) {
  return (
    <>
      <Head>
        <title>{SEO.title}</title>
        <meta name="description" content={SEO.description} />
        <meta name="keywords" content={SEO.keywords} />
        <link rel="canonical" href={SEO.url} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SEO.url} />
        <meta property="og:title" content={SEO.title} />
        <meta property="og:description" content={SEO.description} />
        <meta property="og:image" content={SEO.image} />
        <meta property="og:site_name" content={CITY.name} />
        <meta property="og:locale" content="ko_KR" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={SEO.url} />
        <meta name="twitter:title" content={SEO.title} />
        <meta name="twitter:description" content={SEO.description} />
        <meta name="twitter:image" content={SEO.image} />
      </Head>

      <HeroSection initialSlides={heroSlides} />
      <QuickMenu />
      <PopularSpots />
      {CITY.key === 'seoul' && <SeoulCrowd />}
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
