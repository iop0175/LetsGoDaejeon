import Head from 'next/head'
import dynamic from 'next/dynamic'
import { getTourSpots as getTourSpotsDb } from '../src/services/dbService'

// 클라이언트 전용 컴포넌트
const ShoppingPageContent = dynamic(
  () => import('../src/pages/ShoppingPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// SEO 메타데이터
const SEO = {
  ko: {
    title: '대전 쇼핑 | 대전으로 - Let\'s Go Daejeon',
    description: '대전의 백화점, 쇼핑몰, 전통시장, 아울렛 등 쇼핑 명소를 소개합니다. 갤러리아 타임월드, 대전 중앙시장, 유성 로데오거리 등을 만나보세요.',
    keywords: '대전 쇼핑, 대전 백화점, 대전 전통시장, 갤러리아 타임월드, 대전 중앙시장, 유성 로데오거리, Daejeon shopping, Daejeon mall'
  },
  en: {
    title: 'Daejeon Shopping | Let\'s Go Daejeon',
    description: 'Discover shopping destinations in Daejeon. From department stores to traditional markets and outlets.',
    keywords: 'Daejeon shopping, Daejeon mall, Daejeon market, Galleria Timeworld, Daejeon traditional market'
  }
}

export default function ShoppingPage({ initialData }) {
  return (
    <>
      <Head>
        <title>{SEO.ko.title}</title>
        <meta name="description" content={SEO.ko.description} />
        <meta name="keywords" content={SEO.ko.keywords} />
        <link rel="canonical" href="https://www.letsgodaejeon.kr/shopping" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.letsgodaejeon.kr/shopping" />
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
              "name": "대전 쇼핑 명소 목록",
              "description": SEO.ko.description,
              "url": "https://www.letsgodaejeon.kr/shopping",
              "numberOfItems": initialData?.length || 0,
              "itemListElement": initialData?.slice(0, 10).map((item, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                  "@type": "ShoppingCenter",
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

      <ShoppingPageContent />
    </>
  )
}

export async function getStaticProps() {
  try {
    // 쇼핑 데이터 로드 (contentTypeId: 38)
    const result = await getTourSpotsDb('38', 1, 100)
    
    return {
      props: {
        initialData: result.success ? result.items : []
      },
      revalidate: 3600 // 1시간마다 재생성
    }
  } catch (error) {
    console.error('Shopping page static props error:', error)
    return {
      props: {
        initialData: []
      },
      revalidate: 3600
    }
  }
}
