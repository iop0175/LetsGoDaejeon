import Head from 'next/head'
import dynamic from 'next/dynamic'

// 클라이언트 전용 컴포넌트
const ParkingPageContent = dynamic(
  () => import('../src/pages/ParkingPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// SEO 메타데이터
const SEO = {
  ko: {
    title: '대전 주차장 | 대전으로 - Let\'s Go Daejeon',
    description: '대전의 공영주차장, 민영주차장 정보를 실시간으로 제공합니다. 주차 요금, 운영시간, 위치 정보를 확인하세요.',
    keywords: '대전 주차장, 대전 공영주차장, 대전 주차 요금, 대전역 주차장, 유성구 주차장, Daejeon parking, Daejeon parking lot'
  },
  en: {
    title: 'Daejeon Parking | Let\'s Go Daejeon',
    description: 'Find public and private parking lots in Daejeon. Check parking fees, operating hours, and locations.',
    keywords: 'Daejeon parking, parking in Daejeon, Daejeon parking lots, Daejeon Station parking'
  }
}

export default function ParkingPage() {
  return (
    <>
      <Head>
        <title>{SEO.ko.title}</title>
        <meta name="description" content={SEO.ko.description} />
        <meta name="keywords" content={SEO.ko.keywords} />
        <link rel="canonical" href="https://letsgodaejeon.kr/parking" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://letsgodaejeon.kr/parking" />
        <meta property="og:title" content={SEO.ko.title} />
        <meta property="og:description" content={SEO.ko.description} />
        <meta property="og:image" content="https://letsgodaejeon.kr/og-image.svg" />
        <meta property="og:site_name" content="대전으로" />
        <meta property="og:locale" content="ko_KR" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SEO.ko.title} />
        <meta name="twitter:description" content={SEO.ko.description} />
      </Head>

      <ParkingPageContent />
    </>
  )
}
