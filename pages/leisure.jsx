import Head from 'next/head'
import dynamic from 'next/dynamic'
import { getTourSpots as getTourSpotsDb } from '../src/services/dbService'

// 클라이언트 전용 컴포넌트
const LeisurePageContent = dynamic(
  () => import('../src/pages/LeisurePage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// SEO 메타데이터
const SEO = {
  ko: {
    title: '대전 레저/스포츠 | 대전으로 - Let\'s Go Daejeon',
    description: '대전의 레저 스포츠 시설을 소개합니다. 골프장, 스키장, 워터파크, 캠핑장, 등산로 등 야외 활동을 즐길 수 있는 곳을 찾아보세요.',
    keywords: '대전 레저, 대전 스포츠, 대전 캠핑, 대전 골프장, 대전 등산, 계족산, 식장산, Daejeon leisure, Daejeon sports'
  },
  en: {
    title: 'Daejeon Leisure & Sports | Let\'s Go Daejeon',
    description: 'Explore leisure and sports facilities in Daejeon. Find golf courses, water parks, camping sites, and hiking trails.',
    keywords: 'Daejeon leisure, Daejeon sports, Daejeon hiking, Daejeon camping, Daejeon golf, outdoor activities Daejeon'
  }
}

export default function LeisurePage({ initialData }) {
  return (
    <>
      <Head>
        <title>{SEO.ko.title}</title>
        <meta name="description" content={SEO.ko.description} />
        <meta name="keywords" content={SEO.ko.keywords} />
        <link rel="canonical" href="https://lets-go-daejeon.vercel.app/leisure" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://lets-go-daejeon.vercel.app/leisure" />
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
              "name": "대전 레저/스포츠 시설 목록",
              "description": SEO.ko.description,
              "url": "https://lets-go-daejeon.vercel.app/leisure",
              "numberOfItems": initialData?.length || 0,
              "itemListElement": initialData?.slice(0, 10).map((item, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                  "@type": "SportsActivityLocation",
                  "name": item.title || item.name,
                  "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "대전",
                    "addressCountry": "KR",
                    "streetAddress": item.addr1 || item.address
                  }
                }
              })) || []
            })
          }}
        />
      </Head>

      <LeisurePageContent />
    </>
  )
}

export async function getStaticProps() {
  try {
    // 레저/스포츠 데이터 로드 (contentTypeId: 28)
    const result = await getTourSpotsDb('28', 1, 100)
    
    return {
      props: {
        initialData: result.success ? result.items : []
      },
      revalidate: 3600 // 1시간마다 재생성
    }
  } catch (error) {
    console.error('Leisure page static props error:', error)
    return {
      props: {
        initialData: []
      },
      revalidate: 3600
    }
  }
}
