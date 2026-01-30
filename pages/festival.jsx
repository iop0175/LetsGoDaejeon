import Head from 'next/head'
import dynamic from 'next/dynamic'
import { getTourFestivals } from '../src/services/dbService'

// 클라이언트 전용 컴포넌트 (react-router-dom 사용)
const FestivalPageContent = dynamic(
  () => import('../src/pages/FestivalPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// SEO 메타데이터
const SEO = {
  ko: {
    title: '대전 축제/행사 | 대전으로 - Let\'s Go Daejeon',
    description: '대전에서 열리는 축제와 행사 정보를 확인하세요. 대전 사이언스페스티벌, 유성온천문화축제, 계족산 맨발축제 등 다양한 행사를 소개합니다.',
    keywords: '대전 축제, 대전 행사, 대전 이벤트, 대전 사이언스페스티벌, 유성온천문화축제, 계족산 맨발축제, Daejeon festival, Daejeon event'
  },
  en: {
    title: 'Daejeon Festivals & Events | Let\'s Go Daejeon',
    description: 'Discover festivals and events in Daejeon. From Science Festival to Yuseong Hot Spring Festival and Gyejoksan Barefoot Festival.',
    keywords: 'Daejeon festivals, Daejeon events, Science Festival Daejeon, Yuseong Hot Spring Festival, Korea festivals'
  }
}

export default function FestivalPage({ initialData }) {
  return (
    <>
      <Head>
        <title>{SEO.ko.title}</title>
        <meta name="description" content={SEO.ko.description} />
        <meta name="keywords" content={SEO.ko.keywords} />
        <link rel="canonical" href="https://www.letsgodaejeon.kr/festival" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.letsgodaejeon.kr/festival" />
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
              "@type": "ItemList",
              "name": "대전 축제/행사 목록",
              "description": SEO.ko.description,
              "url": "https://www.letsgodaejeon.kr/festival",
              "numberOfItems": initialData?.length || 0,
              "itemListElement": initialData?.slice(0, 10).map((item, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                  "@type": "Event",
                  "name": item.title || item.name,
                  "startDate": item.startDate || item.eventstartdate,
                  "endDate": item.endDate || item.eventenddate,
                  "location": {
                    "@type": "Place",
                    "name": item.place || "대전",
                    "address": {
                      "@type": "PostalAddress",
                      "addressLocality": "대전",
                      "addressCountry": "KR"
                    }
                  }
                }
              })) || []
            })
          }}
        />
      </Head>

      <FestivalPageContent />
    </>
  )
}

export async function getStaticProps() {
  try {
    // 축제/행사 데이터 로드
    const result = await getTourFestivals(1, 100)
    
    return {
      props: {
        initialData: result.success ? result.items : []
      },
      revalidate: 3600 // 1시간마다 재생성
    }
  } catch (error) {
    console.error('Festival page static props error:', error)
    return {
      props: {
        initialData: []
      },
      revalidate: 3600
    }
  }
}
