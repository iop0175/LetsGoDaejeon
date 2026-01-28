import Head from 'next/head'
import dynamic from 'next/dynamic'
import { getPublishedTripPlans } from '../src/services/tripService'

// 클라이언트 전용 컴포넌트
const SharedTripsPageContent = dynamic(
  () => import('../src/pages/SharedTripsPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// SEO 메타데이터
const SEO = {
  ko: {
    title: '공유된 여행 코스 | 대전으로 - Let\'s Go Daejeon',
    description: '다른 여행자들이 공유한 대전 여행 코스를 확인하세요. 인기 여행 일정과 추천 코스를 참고하여 나만의 여행을 계획해보세요.',
    keywords: '대전 여행 코스, 대전 추천 코스, 대전 여행 일정, 공유 여행, Daejeon travel course, Daejeon itinerary shared'
  },
  en: {
    title: 'Shared Travel Courses | Let\'s Go Daejeon',
    description: 'Explore travel courses shared by other travelers in Daejeon. Get inspired by popular itineraries and recommended routes.',
    keywords: 'Daejeon travel courses, shared itineraries, Daejeon trip ideas, travel inspiration Daejeon'
  }
}

export default function SharedTripsPage({ initialData }) {
  return (
    <>
      <Head>
        <title>{SEO.ko.title}</title>
        <meta name="description" content={SEO.ko.description} />
        <meta name="keywords" content={SEO.ko.keywords} />
        <link rel="canonical" href="https://lets-go-daejeon.vercel.app/shared-trips" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://lets-go-daejeon.vercel.app/shared-trips" />
        <meta property="og:title" content={SEO.ko.title} />
        <meta property="og:description" content={SEO.ko.description} />
        <meta property="og:image" content="https://lets-go-daejeon.vercel.app/og-image.svg" />
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
              "@type": "ItemList",
              "name": "공유된 대전 여행 코스",
              "description": SEO.ko.description,
              "url": "https://lets-go-daejeon.vercel.app/shared-trips",
              "numberOfItems": initialData?.length || 0
            })
          }}
        />
      </Head>

      <SharedTripsPageContent />
    </>
  )
}

export async function getStaticProps() {
  try {
    const trips = await getPublishedTripPlans(1, 20)
    
    return {
      props: {
        initialData: trips || []
      },
      revalidate: 1800 // 30분마다 재생성
    }
  } catch (error) {
    console.error('Shared trips page static props error:', error)
    return {
      props: {
        initialData: []
      },
      revalidate: 1800
    }
  }
}
