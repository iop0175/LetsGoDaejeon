import Head from 'next/head'
import dynamic from 'next/dynamic'

// 클라이언트 전용 컴포넌트
const MedicalPageContent = dynamic(
  () => import('../src/pages/MedicalPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// SEO 메타데이터
const SEO = {
  ko: {
    title: '대전 의료시설 | 대전으로 - Let\'s Go Daejeon',
    description: '대전의 병원, 약국, 의료시설 정보를 제공합니다. 충남대학교병원, 을지대학교병원, 건양대학교병원 등 주요 의료기관을 소개합니다.',
    keywords: '대전 병원, 대전 의료, 대전 약국, 충남대학교병원, 을지대학교병원, 건양대학교병원, Daejeon hospital, Daejeon medical'
  },
  en: {
    title: 'Daejeon Medical Facilities | Let\'s Go Daejeon',
    description: 'Find hospitals, pharmacies, and medical facilities in Daejeon. Major hospitals and healthcare services information.',
    keywords: 'Daejeon hospital, Daejeon medical, Daejeon pharmacy, healthcare Daejeon, medical tourism Daejeon'
  }
}

export default function MedicalPage() {
  return (
    <>
      <Head>
        <title>{SEO.ko.title}</title>
        <meta name="description" content={SEO.ko.description} />
        <meta name="keywords" content={SEO.ko.keywords} />
        <link rel="canonical" href="https://www.letsgodaejeon.kr/medical" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.letsgodaejeon.kr/medical" />
        <meta property="og:title" content={SEO.ko.title} />
        <meta property="og:description" content={SEO.ko.description} />
        <meta property="og:image" content="https://www.letsgodaejeon.kr/og-image.svg" />
        <meta property="og:site_name" content="대전으로" />
        <meta property="og:locale" content="ko_KR" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SEO.ko.title} />
        <meta name="twitter:description" content={SEO.ko.description} />
      </Head>

      <MedicalPageContent />
    </>
  )
}
