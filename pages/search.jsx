import Head from 'next/head'
import dynamic from 'next/dynamic'

// 클라이언트 전용 컴포넌트
const SearchPageContent = dynamic(
  () => import('../src/pages/SearchPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// SEO 메타데이터
const SEO = {
  ko: {
    title: '검색 | 대전으로 - Let\'s Go Daejeon',
    description: '대전의 관광지, 맛집, 숙소, 축제 정보를 검색하세요. 원하는 여행 정보를 빠르게 찾아보세요.',
    keywords: '대전 검색, 대전 여행 검색, 대전 관광지 검색, 대전 맛집 검색, Daejeon search, search Daejeon'
  },
  en: {
    title: 'Search | Let\'s Go Daejeon',
    description: 'Search for attractions, restaurants, accommodations, and festivals in Daejeon. Find your travel information quickly.',
    keywords: 'search Daejeon, Daejeon travel search, find Daejeon attractions, Daejeon restaurant search'
  }
}

export default function SearchPage() {
  return (
    <>
      <Head>
        <title>{SEO.ko.title}</title>
        <meta name="description" content={SEO.ko.description} />
        <meta name="keywords" content={SEO.ko.keywords} />
        <link rel="canonical" href="https://lets-go-daejeon.vercel.app/search" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://lets-go-daejeon.vercel.app/search" />
        <meta property="og:title" content={SEO.ko.title} />
        <meta property="og:description" content={SEO.ko.description} />
        <meta property="og:image" content="https://lets-go-daejeon.vercel.app/og-image.svg" />
        <meta property="og:site_name" content="대전으로" />
        <meta property="og:locale" content="ko_KR" />
      </Head>

      <SearchPageContent />
    </>
  )
}
