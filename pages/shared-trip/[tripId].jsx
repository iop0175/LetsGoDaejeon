import Head from 'next/head'
import dynamic from 'next/dynamic'
import { supabase } from '../../src/services/supabase'

// 클라이언트 전용 컴포넌트
const SharedTripPageContent = dynamic(
  () => import('../../src/pages/SharedTripPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

export default function SharedTripPage({ tripData }) {
  const tripName = tripData?.name || '공유된 여행'
  const tripDescription = tripData?.description || '대전 여행 코스를 확인하세요.'
  
  return (
    <>
      <Head>
        <title>{tripName} | 대전으로 - Let\'s Go Daejeon</title>
        <meta name="description" content={tripDescription} />
        <meta name="keywords" content="대전 여행 코스, 대전 추천 일정, 대전 여행 계획" />
        
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={tripName} />
        <meta property="og:description" content={tripDescription} />
        <meta property="og:image" content="https://letsgodaejeon.kr/og-image.svg" />
        <meta property="og:site_name" content="대전으로" />
        
        {/* Schema.org 구조화 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "TouristTrip",
              "name": tripName,
              "description": tripDescription,
              "touristType": "Travel",
              "itinerary": {
                "@type": "ItemList",
                "numberOfItems": tripData?.days?.length || 0
              }
            })
          }}
        />
      </Head>

      <SharedTripPageContent />
    </>
  )
}

export async function getStaticPaths() {
  try {
    // 공개된 여행 일정 ID들을 가져옴
    const { data: trips, error } = await supabase
      .from('trip_plans')
      .select('id')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) throw error
    
    const paths = trips?.map(trip => ({
      params: { tripId: String(trip.id) } // 문자열로 변환
    })) || []
    
    return {
      paths,
      fallback: 'blocking' // 새로운 여행 코스도 동적으로 생성
    }
  } catch (error) {
    console.error('getStaticPaths error:', error)
    return {
      paths: [],
      fallback: 'blocking'
    }
  }
}

export async function getStaticProps({ params }) {
  try {
    const { tripId } = params
    
    const { data: trip, error } = await supabase
      .from('trip_plans')
      .select('*')
      .eq('id', tripId)
      .eq('is_published', true)
      .single()
    
    if (error || !trip) {
      return {
        notFound: true
      }
    }
    
    return {
      props: {
        tripData: trip
      },
      revalidate: 1800 // 30분마다 재생성
    }
  } catch (error) {
    console.error('getStaticProps error:', error)
    return {
      notFound: true
    }
  }
}
