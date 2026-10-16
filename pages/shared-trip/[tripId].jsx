import SeoHead from '../../src/components/common/SeoHead'
import { CITY, SITE_URL } from '../../src/config/cities'
import dynamic from 'next/dynamic'
import { supabase } from '../../src/services/supabase'

// 클라이언트 전용 컴포넌트
const SharedTripPageContent = dynamic(
  () => import('../../src/pages/SharedTripPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

// 이미지 URL 안전하게 처리
const getSafeImageUrl = (url) => {
  if (!url) return null
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('http://')) return url.replace('http://', 'https://')
  return url
}

export default function SharedTripPage({ tripData, placesData }) {
  const tripName = tripData?.title || tripData?.name || '공유된 여행'
  const tripDescription = tripData?.description || `${tripName} - ${CITY.cityName} 여행 코스를 확인하세요.`
  const tripImage = getSafeImageUrl(tripData?.thumbnail_url)
  const authorName = tripData?.author_nickname || `${CITY.name} 사용자`
  
  // 장소 목록 추출 (SEO용)
  const allPlaces = placesData || []
  
  // Schema.org 구조화 데이터 생성
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "name": tripName,
    "description": tripDescription,
    "image": tripImage,
    "touristType": "Individual",
    "provider": {
      "@type": "Organization",
      "name": CITY.name,
      "url": SITE_URL
    },
    "author": {
      "@type": "Person",
      "name": authorName
    },
    "itinerary": allPlaces.length > 0 ? allPlaces.map((place, idx) => ({
      "@type": "TouristDestination",
      "name": place.place_name,
      "description": place.place_description || `${place.place_name} - ${CITY.cityName} 여행 명소`,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": place.place_address,
        "addressLocality": CITY.cityName,
        "addressCountry": "KR"
      },
      ...(place.place_image && { "image": getSafeImageUrl(place.place_image) }),
      ...(place.lat && place.lng && {
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": place.lat,
          "longitude": place.lng
        }
      })
    })) : {
      "@type": "ItemList",
      "numberOfItems": tripData?.days?.length || 0
    }
  }
  
  return (
    <>
      <SeoHead
        title={`${tripName} | ${CITY.cityName} 여행 코스 - ${CITY.name}`}
        description={tripDescription}
        keywords={`${CITY.cityName} 여행 코스, ${CITY.cityName} 추천 일정, ${CITY.cityName} 여행 계획, ${tripName}, ${allPlaces.map(p => p.place_name).join(', ')}`}
        path={`/shared-trip/${tripData?.id}`}
        image={tripImage}
        imageAlt={tripName}
        type="article"
        hasEnglish={false}
        crumbs={[
          { name: '홈', path: '/' },
          { name: '여행 코스', path: '/shared-trips' },
          { name: tripName, path: `/shared-trip/${tripData?.id}` }
        ]}
        ld={[schemaData]}
      />

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
      params: { tripId: String(trip.id) }, // 문자열로 변환
      locale: 'kr'
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
    
    // 여행 계획 기본 정보 가져오기
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
    
    // 여행 일자 및 장소 정보 가져오기 (SEO용)
    let placesData = []
    try {
      const { data: days, error: daysError } = await supabase
        .from('trip_days')
        .select(`
          id,
          day_number,
          trip_places (
            id,
            place_name,
            place_description,
            place_address,
            place_image,
            lat,
            lng,
            content_id,
            order_index
          )
        `)
        .eq('trip_id', tripId)
        .order('day_number', { ascending: true })
      
      if (!daysError && days) {
        // 모든 장소를 평면 배열로 변환
        placesData = days.flatMap(day => 
          (day.trip_places || [])
            .sort((a, b) => a.order_index - b.order_index)
            .map(place => ({
              ...place,
              day_number: day.day_number
            }))
        )
      }
    } catch (placesError) {
      console.error('Error fetching places for SEO:', placesError)
    }
    
    return {
      props: {
        tripData: trip,
        placesData
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
