import Head from 'next/head'
import dynamic from 'next/dynamic'

// 클라이언트 전용 컴포넌트 (로그인 필요 페이지)
const MyTripPageContent = dynamic(
  () => import('../src/pages/MyTripPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// SEO 메타데이터
const SEO = {
  ko: {
    title: '내 여행 | 대전으로 - Let\'s Go Daejeon',
    description: '나만의 대전 여행 일정을 만들고 관리하세요. 관광지, 맛집, 숙소를 추가하여 완벽한 대전 여행을 계획해보세요.',
    keywords: '대전 여행 계획, 대전 여행 일정, 내 여행, 대전 코스 만들기, Daejeon trip planner, Daejeon itinerary'
  },
  en: {
    title: 'My Trip | Let\'s Go Daejeon',
    description: 'Create and manage your own Daejeon travel itinerary. Add attractions, restaurants, and accommodations for the perfect trip.',
    keywords: 'Daejeon trip planner, Daejeon itinerary, my trip Daejeon, travel planning Daejeon'
  }
}

export default function MyTripPage() {
  return (
    <>
      <Head>
        <title>{SEO.ko.title}</title>
        <meta name="description" content={SEO.ko.description} />
        <meta name="keywords" content={SEO.ko.keywords} />
        <meta name="robots" content="noindex" /> {/* 로그인 필요 페이지는 인덱싱 제외 */}
        <link rel="canonical" href="https://letsgodaejeon.kr/my-trip" />
      </Head>

      <MyTripPageContent />
    </>
  )
}
