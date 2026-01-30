import Head from 'next/head'
import dynamic from 'next/dynamic'
import HeroSection from '../src/components/HeroSection/HeroSection'
import { getHeroSlides } from '../src/services/dbService'

// SSR 호환성을 위해 클라이언트 전용 컴포넌트로 동적 임포트
const QuickMenu = dynamic(() => import('../src/components/QuickMenu/QuickMenu'), { ssr: true })
const PopularSpots = dynamic(() => import('../src/components/PopularSpots/PopularSpots'), { ssr: true })
const FestivalSection = dynamic(() => import('../src/components/FestivalSection/FestivalSection'), { ssr: true })
const FoodSection = dynamic(() => import('../src/components/FoodSection/FoodSection'), { ssr: true })
const TravelCourse = dynamic(() => import('../src/components/TravelCourse/TravelCourse'), { ssr: true })
const WeatherWidget = dynamic(() => import('../src/components/WeatherWidget/WeatherWidget'), { ssr: false })
const KakaoChannelButton = dynamic(() => import('../src/components/KakaoChannelButton/KakaoChannelButton'), { ssr: false })

// SEO 메타데이터
const SEO = {
  title: '대전으로 | Let\'s Go Daejeon - 대전 관광 여행 가이드',
  description: '대전의 아름다운 관광지, 맛집, 축제, 문화시설을 소개합니다. 대전 여행의 모든 것을 한눈에!',
  keywords: '대전, 대전 관광, 대전 여행, 대전 맛집, 대전 축제, 대전 가볼만한곳, 대전 명소, Daejeon, Daejeon Tourism',
  url: 'https://www.letsgodaejeon.kr',
  image: 'https://www.letsgodaejeon.kr/og-image.svg'
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
        <meta property="og:site_name" content="대전으로" />
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
