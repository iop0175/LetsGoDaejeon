import Head from 'next/head'
import dynamic from 'next/dynamic'
import { getTourSpots as getTourSpotsDb } from '../src/services/dbService'

// 클라이언트 전용 컴포넌트
const AccommodationPageContent = dynamic(
  () => import('../src/pages/AccommodationPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// SEO 메타데이터
const SEO = {
  ko: {
    title: '대전 숙박 | 대전으로 - Let\'s Go Daejeon',
    description: '대전의 호텔, 모텔, 펜션, 게스트하우스 등 다양한 숙박시설을 찾아보세요. 유성온천 호텔, 대전역 주변 숙소 등을 소개합니다.',
    keywords: '대전 숙박, 대전 호텔, 대전 펜션, 유성온천 호텔, 대전역 숙소, 대전 게스트하우스, Daejeon hotel, Daejeon accommodation'
  },
  en: {
    title: 'Daejeon Accommodation | Let\'s Go Daejeon',
    description: 'Find hotels, motels, pensions and guesthouses in Daejeon. Discover Yuseong Hot Spring hotels and accommodations near Daejeon Station.',
    keywords: 'Daejeon hotels, Daejeon accommodation, Yuseong spa hotel, Daejeon guesthouse, where to stay Daejeon'
  }
}

export default function AccommodationPage({ initialData }) {
  return (
    <>
      <Head>
        <title>{SEO.ko.title}</title>
        <meta name="description" content={SEO.ko.description} />
        <meta name="keywords" content={SEO.ko.keywords} />
        <link rel="canonical" href="https://www.letsgodaejeon.kr/accommodation" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.letsgodaejeon.kr/accommodation" />
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
              "name": "대전 숙박시설 목록",
              "description": SEO.ko.description,
              "url": "https://www.letsgodaejeon.kr/accommodation",
              "numberOfItems": initialData?.length || 0,
              "itemListElement": initialData?.slice(0, 10).map((item, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                  "@type": "Hotel",
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

      <AccommodationPageContent />
    </>
  )
}

export async function getStaticProps() {
  try {
    // 숙박시설 데이터 로드 (contentTypeId: 32)
    const result = await getTourSpotsDb('32', 1, 100)
    
    return {
      props: {
        initialData: result.success ? result.items : []
      },
      revalidate: 3600 // 1시간마다 재생성
    }
  } catch (error) {
    console.error('Accommodation page static props error:', error)
    return {
      props: {
        initialData: []
      },
      revalidate: 3600
    }
  }
}
