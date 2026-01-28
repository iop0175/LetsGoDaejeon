import Head from 'next/head'
import dynamic from 'next/dynamic'
import { useLanguage } from '../src/context/LanguageContext'
import { SEO_DATA } from '../src/components/common/SEO'
import { getTourSpots as getTourSpotsDb } from '../src/services/dbService'

// 클라이언트 전용 컴포넌트 (react-router-dom 사용)
const FoodPageContent = dynamic(
  () => import('../src/pages/FoodPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// SEO 메타데이터
const SEO = {
  ko: {
    title: '대전 맛집 | 대전으로 - Let\'s Go Daejeon',
    description: '대전의 숨은 맛집부터 유명 맛집까지! 성심당, 칼국수, 두부두루치기 등 대전 대표 음식을 맛볼 수 있는 곳을 소개합니다.',
    keywords: '대전 맛집, 대전 음식점, 대전 성심당, 대전 칼국수, 대전 두부두루치기, 대전 식당 추천, Daejeon food, Daejeon restaurant'
  },
  en: {
    title: 'Daejeon Restaurants | Let\'s Go Daejeon',
    description: 'Discover the best restaurants in Daejeon! From Sungsimdang bakery to local specialties like Kalguksu and Dubu Duruchigi.',
    keywords: 'Daejeon restaurants, Daejeon food, Daejeon bakery, Sungsimdang, Korean food Daejeon, best restaurants Daejeon'
  }
}

export default function FoodPage({ initialData }) {
  return (
    <>
      <Head>
        <title>{SEO.ko.title}</title>
        <meta name="description" content={SEO.ko.description} />
        <meta name="keywords" content={SEO.ko.keywords} />
        <link rel="canonical" href="https://lets-go-daejeon.vercel.app/food" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://lets-go-daejeon.vercel.app/food" />
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
              "name": "대전 맛집 목록",
              "description": SEO.ko.description,
              "url": "https://lets-go-daejeon.vercel.app/food",
              "numberOfItems": initialData?.length || 0,
              "itemListElement": initialData?.slice(0, 10).map((item, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                  "@type": "Restaurant",
                  "name": item.name || item.title,
                  "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "대전",
                    "addressRegion": "대전광역시",
                    "addressCountry": "KR",
                    "streetAddress": item.address || item.addr1
                  }
                }
              })) || []
            })
          }}
        />
      </Head>

      <FoodPageContent />
    </>
  )
}

export async function getStaticProps() {
  try {
    // 맛집 데이터 로드 (contentTypeId: 39)
    const result = await getTourSpotsDb('39', 1, 100)
    
    return {
      props: {
        initialData: result.success ? result.items : []
      },
      revalidate: 3600 // 1시간마다 재생성
    }
  } catch (error) {
    console.error('Food page static props error:', error)
    return {
      props: {
        initialData: []
      },
      revalidate: 3600
    }
  }
}
