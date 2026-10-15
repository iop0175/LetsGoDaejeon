import Head from 'next/head'
import dynamic from 'next/dynamic'
import { CITY, SITE_URL, getCityPageSeo } from '../src/config/cities'

// 클라이언트 전용 컴포넌트
const MapPageContent = dynamic(
  () => import('../src/pages/MapPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// SEO 메타데이터
const SEO = CITY.key === 'daejeon' ? {
  ko: {
    title: '대전 지도 | 대전으로 - Let\'s Go Daejeon',
    description: '대전의 관광지, 맛집, 숙소를 지도에서 한눈에 확인하세요. 카카오맵 기반의 대전 관광 지도 서비스입니다.',
    keywords: '대전 지도, 대전 관광 지도, 대전 맛집 지도, 대전 여행 지도, Daejeon map, Daejeon tourist map'
  },
  en: {
    title: 'Daejeon Map | Let\'s Go Daejeon',
    description: 'Explore Daejeon attractions, restaurants, and accommodations on a map. Interactive tourist map powered by Kakao Maps.',
    keywords: 'Daejeon map, Daejeon tourist map, Daejeon attractions map, interactive map Daejeon'
  }
} : getCityPageSeo('지도', 'Map')

export default function MapPage() {
  return (
    <>
      <Head>
        <title>{SEO.ko.title}</title>
        <meta name="description" content={SEO.ko.description} />
        <meta name="keywords" content={SEO.ko.keywords} />
        <link rel="canonical" href={`${SITE_URL}/map`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/map`} />
        <meta property="og:title" content={SEO.ko.title} />
        <meta property="og:description" content={SEO.ko.description} />
        <meta property="og:image" content={`${SITE_URL}/og-image.svg`} />
        <meta property="og:site_name" content={CITY.name} />
        <meta property="og:locale" content="ko_KR" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SEO.ko.title} />
        <meta name="twitter:description" content={SEO.ko.description} />
      </Head>

      <MapPageContent />
    </>
  )
}
