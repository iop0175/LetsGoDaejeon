import Head from 'next/head'
import dynamic from 'next/dynamic'
import { getTourSpots as getTourSpotsDb } from '../src/services/dbService'

// 클라이언트 전용 컴포넌트
const CulturePageContent = dynamic(
  () => import('../src/pages/CulturePage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// SEO 메타데이터
const SEO = {
  ko: {
    title: '대전 문화시설 | 대전으로 - Let\'s Go Daejeon',
    description: '대전의 박물관, 미술관, 도서관, 공연장 등 문화시설을 소개합니다. 국립중앙과학관, 대전시립미술관, 한밭도서관 등을 만나보세요.',
    keywords: '대전 문화시설, 대전 박물관, 대전 미술관, 대전 도서관, 국립중앙과학관, 대전시립미술관, 한밭도서관, Daejeon museum, Daejeon culture'
  },
  en: {
    title: 'Daejeon Cultural Facilities | Let\'s Go Daejeon',
    description: 'Explore museums, galleries, libraries, and theaters in Daejeon. Visit National Science Museum, Daejeon Museum of Art, and more.',
    keywords: 'Daejeon museums, Daejeon galleries, Daejeon libraries, National Science Museum Korea, Daejeon cultural facilities'
  }
}

export default function CulturePage({ initialData }) {
  return (
    <>
      <Head>
        <title>{SEO.ko.title}</title>
        <meta name="description" content={SEO.ko.description} />
        <meta name="keywords" content={SEO.ko.keywords} />
        <link rel="canonical" href="https://www.letsgodaejeon.kr/culture" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.letsgodaejeon.kr/culture" />
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
              "name": "대전 문화시설 목록",
              "description": SEO.ko.description,
              "url": "https://www.letsgodaejeon.kr/culture",
              "numberOfItems": initialData?.length || 0,
              "itemListElement": initialData?.slice(0, 10).map((item, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                  "@type": "Museum",
                  "name": item.title || item.fcltyNm,
                  "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "대전",
                    "addressCountry": "KR",
                    "streetAddress": item.addr1 || item.locplc
                  }
                }
              })) || []
            })
          }}
        />
      </Head>

      <CulturePageContent />
    </>
  )
}

export async function getStaticProps() {
  try {
    // 문화시설 데이터 로드 (contentTypeId: 14)
    const result = await getTourSpotsDb('14', 1, 100)
    
    return {
      props: {
        initialData: result.success ? result.items : []
      },
      revalidate: 3600 // 1시간마다 재생성
    }
  } catch (error) {
    console.error('Culture page static props error:', error)
    return {
      props: {
        initialData: []
      },
      revalidate: 3600
    }
  }
}
