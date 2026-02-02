import Head from 'next/head'
import dynamic from 'next/dynamic'

// 클라이언트 전용 컴포넌트
const TripPlannerPageContent = dynamic(
  () => import('../src/pages/TripPlannerPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// SEO 메타데이터
const SEO = {
  ko: {
    title: '대전 여행 계획 만들기 | 대전으로 - Let\'s Go Daejeon',
    description: '나만의 대전 여행 일정을 쉽게 만들어보세요. 대전의 인기 관광지, 맛집, 문화시설을 드래그앤드롭으로 일정에 추가하고 최적의 여행 코스를 완성하세요.',
    keywords: '대전 여행 계획, 대전 일정 만들기, 대전 여행 플래너, 대전 코스 추천, Daejeon trip planner, Daejeon itinerary'
  },
  en: {
    title: 'Create Daejeon Trip Plan | Let\'s Go Daejeon',
    description: 'Create your own Daejeon travel itinerary easily. Add popular tourist spots, restaurants, and cultural facilities to your schedule with drag-and-drop.',
    keywords: 'Daejeon trip planner, Daejeon itinerary maker, Daejeon travel plan, plan Daejeon trip'
  }
}

export default function TripPlannerPage() {
  return (
    <>
      <Head>
        <title>{SEO.ko.title}</title>
        <meta name="description" content={SEO.ko.description} />
        <meta name="keywords" content={SEO.ko.keywords} />
        <link rel="canonical" href="https://www.letsgodaejeon.kr/trip-planner" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.letsgodaejeon.kr/trip-planner" />
        <meta property="og:title" content={SEO.ko.title} />
        <meta property="og:description" content={SEO.ko.description} />
        <meta property="og:image" content="https://www.letsgodaejeon.kr/og-image.svg" />
        <meta property="og:site_name" content="대전으로" />
        <meta property="og:locale" content="ko_KR" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SEO.ko.title} />
        <meta name="twitter:description" content={SEO.ko.description} />
        
        {/* Schema.org 구조화 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "대전 여행 플래너",
              "description": SEO.ko.description,
              "url": "https://www.letsgodaejeon.kr/trip-planner",
              "applicationCategory": "TravelApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "KRW"
              }
            })
          }}
        />
      </Head>

      <TripPlannerPageContent />
    </>
  )
}
