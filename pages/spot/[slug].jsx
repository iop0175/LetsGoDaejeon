import dynamic from 'next/dynamic'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { generateSlug } from '../../src/utils/slugUtils'
import { getReliableImageUrl, cleanIntroHtml } from '../../src/utils/imageUtils'

// 기존 SpotDetailPage 컴포넌트 동적 import (CSR로 모든 기능 유지)
const SpotDetailPageComponent = dynamic(
  () => import('../../src/pages/SpotDetailPage'),
  { ssr: false }
)

// slug 생성 함수 (서버 사이드용, 한국어 유지)
const generateSlugServer = (title, contentId) => {
  if (!title) return String(contentId || 'unknown')
  let slug = title
  // 소문자로 변환 (영문만)
  slug = slug.split('').map(char => /[A-Z]/.test(char) ? char.toLowerCase() : char).join('')
  // 마침표(.)를 하이픈(-)으로 변환
  slug = slug.replace(/\./g, '-')
  // 특수문자 제거 (한글, 영문, 숫자, 공백, 하이픈만 유지)
  slug = slug.replace(/[^가-힣a-z0-9\s-]/g, '')
  // 연속된 공백을 하나로, 공백을 하이픈으로
  slug = slug.replace(/\s+/g, ' ').trim().replace(/\s/g, '-')
  // 연속된 하이픈 정리, 시작/끝 하이픈 제거
  slug = slug.replace(/-+/g, '-').replace(/^-|-$/g, '')
  // contentId 추가
  slug = contentId ? `${slug}-${contentId}` : slug || String(contentId || 'unknown')
  // Next.js에서 자동으로 URL 인코딩하므로 인코딩하지 않음
  return slug
}

export default function SpotPage({ seoData }) {
  const router = useRouter()

  // 로딩 상태 (fallback)
  if (router.isFallback) {
    return (
      <div className="sdp">
        <div className="sdp__loading">
          <div className="sdp__spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* SEO 메타데이터 (SSG로 사전 렌더링) */}
      {seoData && (
        <Head>
          <title>{seoData.title}</title>
          <meta name="description" content={seoData.description} />
          <meta name="keywords" content={seoData.keywords} />
          <link rel="canonical" href={seoData.canonicalUrl} />
          
          {/* Open Graph */}
          <meta property="og:type" content="article" />
          <meta property="og:url" content={seoData.canonicalUrl} />
          <meta property="og:title" content={seoData.title} />
          <meta property="og:description" content={seoData.description} />
          <meta property="og:image" content={seoData.image} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:site_name" content="대전으로" />
          <meta property="og:locale" content="ko_KR" />
          
          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:url" content={seoData.canonicalUrl} />
          <meta name="twitter:title" content={seoData.title} />
          <meta name="twitter:description" content={seoData.description} />
          <meta name="twitter:image" content={seoData.image} />
          
          {/* 구조화된 데이터 (Schema.org) - TouristAttraction */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "TouristAttraction",
                "name": seoData.name,
                "description": seoData.description,
                "image": seoData.image,
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": seoData.streetAddress || seoData.address,
                  "addressLocality": seoData.district || "대전",
                  "addressRegion": seoData.city || "대전광역시",
                  "addressCountry": "KR"
                },
                ...(seoData.phone && { "telephone": seoData.phone }),
                ...(seoData.lat && seoData.lng && {
                  "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": seoData.lat,
                    "longitude": seoData.lng
                  }
                }),
                "url": seoData.canonicalUrl
              })
            }}
          />
          
          {/* 구조화된 데이터 (Schema.org) - FAQPage (AI 생성 FAQ가 있을 때만) */}
          {seoData.faqItems && seoData.faqItems.length > 0 && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  "mainEntity": seoData.faqItems.map(item => ({
                    "@type": "Question",
                    "name": item.question,
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": item.answer
                    }
                  }))
                })
              }}
            />
          )}
        </Head>
      )}
      
      {/* 기존 SpotDetailPage 컴포넌트 (CSR로 모든 기능 유지) */}
      <SpotDetailPageComponent />
    </>
  )
}

// SSG - 빌드 시 생성할 경로 목록 (slug 기반, 한국어 유지)
export async function getStaticPaths() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const serverSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // 상위 100개 관광지만 미리 생성 (나머지는 ISR)
    const { data, error } = await serverSupabase
      .from('tour_spots')
      .select('content_id, title')
      .limit(100)

    if (error) throw error

    const paths = (data || [])
      .filter(item => item.content_id && item.title)
      .map(item => ({
        params: { slug: generateSlugServer(item.title, item.content_id) }
      }))

    return {
      paths,
      // ISR: 없는 페이지는 요청 시 생성
      fallback: 'blocking'
    }
  } catch (err) {
    console.error('getStaticPaths error:', err)
    return {
      paths: [],
      fallback: 'blocking'
    }
  }
}

// SSG - SEO 메타데이터만 사전 렌더링
export async function getStaticProps({ params }) {
  const { slug } = params

  // URL 디코딩 후 contentId 추출 (마지막 숫자 부분)
  const decodedSlug = decodeURIComponent(slug)
  const contentIdMatch = decodedSlug.match(/-(\d+)$/)
  const contentId = contentIdMatch ? contentIdMatch[1] : (decodedSlug.match(/^\d+$/) ? decodedSlug : null)

  if (!contentId) {
    return { notFound: true }
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const serverSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // 관광지 기본 정보 가져오기 (SEO용 + FAQ용 intro_info 추가)
    const { data: spotData, error } = await serverSupabase
      .from('tour_spots')
      .select('content_id, title, addr1, overview, firstimage, firstimage2, tel, mapy, mapx, intro_info')
      .eq('content_id', contentId)
      .single()

    if (error || !spotData) {
      return { notFound: true }
    }

    // SEO 데이터 생성
    const spotSlug = generateSlugServer(spotData.title, spotData.content_id)
    const seoDescription = spotData.overview 
      ? cleanIntroHtml(spotData.overview).slice(0, 150) 
      : `${spotData.title} - 대전의 인기 관광지입니다. 주소: ${spotData.addr1 || '대전광역시'}`
    
    // 주소에서 시/구/상세주소 추출
    const addressParts = (spotData.addr1 || '').split(' ')
    const city = addressParts.find(p => p.includes('시') || p.includes('광역시')) || '대전광역시'
    const district = addressParts.find(p => p.includes('구')) || ''
    const streetAddress = addressParts.slice(2).join(' ') || spotData.addr1
    
    // FAQ 데이터 파싱 (AI 생성 FAQ가 있는 경우)
    let faqItems = []
    const introInfo = spotData.intro_info
    if (introInfo?.faq) {
      let rawFaq = introInfo.faq
      if (typeof rawFaq === 'string') {
        // 텍스트 형식 파싱 (Q. ... A. ... 형식)
        const lines = rawFaq.split('\n').filter(line => line.trim())
        let currentQ = null
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('Q.')) {
            currentQ = trimmed.replace(/^Q\.\s*/, '')
          } else if (trimmed.startsWith('A.') && currentQ) {
            faqItems.push({ question: currentQ, answer: trimmed.replace(/^A\.\s*/, '') })
            currentQ = null
          }
        }
      } else if (Array.isArray(rawFaq)) {
        // 배열 형식
        faqItems = rawFaq.filter(item => item.question && item.answer)
      }
    }
    
    const seoData = {
      name: spotData.title,
      title: `${spotData.title} | 대전 관광지 - 대전으로`,
      description: seoDescription,
      keywords: `${spotData.title}, 대전 ${spotData.title}, 대전 관광지, 대전 여행, ${spotData.addr1?.split(' ').slice(0, 2).join(' ')}`,
      image: getReliableImageUrl(spotData.firstimage || spotData.firstimage2),
      canonicalUrl: `https://letsgodaejeon.kr/spot/${spotSlug}`,
      address: spotData.addr1,
      city: city,
      district: district,
      streetAddress: streetAddress,
      phone: spotData.tel,
      lat: spotData.mapy,
      lng: spotData.mapx,
      faqItems: faqItems.length > 0 ? faqItems : null
    }

    return {
      props: {
        seoData
      },
      // 1시간마다 재생성 (ISR)
      revalidate: 3600
    }
  } catch (err) {
    console.error('getStaticProps error:', err)
    return { notFound: true }
  }
}
