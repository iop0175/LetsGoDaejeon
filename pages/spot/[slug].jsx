import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { CITY } from '../../src/config/cities'
import LotList from '../../src/components/Parking/LotList'
import TransitMap from '../../src/components/common/TransitMap'
import { Arrivals } from '../../src/components/Bus/LiveBox'
import { nearestLots } from '../../src/utils/parkingFormat'
import SeoHead from '../../src/components/common/SeoHead'
import { FallbackContext, FallbackLoading } from '../../src/components/common/PageFallback'
import { generateLocalizedSlug } from '../../src/utils/slugUtils'
import { getReliableImageUrl, cleanIntroHtml } from '../../src/utils/imageUtils'
import { SCHEMA_TYPE_BY_CONTENT_TYPE, absoluteUrl } from '../../src/utils/seo'

// 기존 SpotDetailPage 컴포넌트는 그대로 쓰고(CSR), 로딩 중과 서버 HTML에는 장소 정보를 먼저 보여 준다.
const SpotDetailPageComponent = dynamic(
  () => import('../../src/pages/SpotDetailPage'),
  { ssr: false, loading: FallbackLoading }
)

// contentTypeId → 목록 경로와 이름
const CATEGORY = {
  12: { path: '/travel', ko: '관광지', en: 'Attraction', enPlural: 'Attractions' },
  14: { path: '/culture', ko: '문화시설', en: 'Cultural Venue', enPlural: 'Cultural Venues' },
  15: { path: '/festival', ko: '축제·행사', en: 'Event', enPlural: 'Events' },
  28: { path: '/leisure', ko: '레포츠', en: 'Activity', enPlural: 'Activities' },
  32: { path: '/accommodation', ko: '숙소', en: 'Accommodation', enPlural: 'Accommodation' },
  38: { path: '/shopping', ko: '쇼핑', en: 'Shop', enPlural: 'Shopping' },
  39: { path: '/food', ko: '맛집', en: 'Restaurant', enPlural: 'Restaurants' }
}

const BUS_SOURCE = {
  daejeon: '도착 예정 시간은 대전시 버스 정보 시스템 기준이며 20초마다 갱신합니다. 실제와 다를 수 있습니다.',
  busan: '도착 예정 시간은 부산버스정보시스템 기준이며 20초마다 갱신합니다. 실제와 다를 수 있습니다.',
  jeju: '도착 예정 시간은 제주 버스정보시스템 기준이며 20초마다 갱신합니다. 실제와 다를 수 있습니다.',
  seoul: '도착 예정 시간은 서울시 버스정보 기준이며 20초마다 갱신합니다. 실제와 다를 수 있습니다.'
}

const plain = (html, max) => {
  const text = cleanIntroHtml(html || '', ' ').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text
}

export default function SpotPage({ seoData }) {
  const router = useRouter()
  const loc = router.locale === 'en' ? 'en' : 'kr'

  if (router.isFallback || !seoData) {
    return (
      <div className="sdp">
        <div className="sdp__loading">
          <div className="sdp__spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  const view = seoData[loc]
  const category = CATEGORY[seoData.contentTypeId] || CATEGORY[12]
  const homeLabel = loc === 'en' ? 'Home' : '홈'
  const categoryLabel = loc === 'en' ? category.enPlural : category.ko
  const schemaType = SCHEMA_TYPE_BY_CONTENT_TYPE[seoData.contentTypeId] || 'TouristAttraction'
  const cityName = loc === 'en' ? CITY.cityNameEn : CITY.cityName
  const pageUrl = absoluteUrl(loc, `/spot/${view.slug}`)

  const placeLd = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: view.name,
    description: view.description,
    ...(seoData.image && { image: seoData.image }),
    address: {
      '@type': 'PostalAddress',
      streetAddress: view.address,
      addressLocality: seoData.district || cityName,
      addressRegion: loc === 'en' ? CITY.cityNameEn : (CITY.aliases[0] || CITY.cityName),
      addressCountry: 'KR'
    },
    ...(seoData.phone && { telephone: seoData.phone }),
    ...(seoData.lat && seoData.lng && {
      geo: { '@type': 'GeoCoordinates', latitude: Number(seoData.lat), longitude: Number(seoData.lng) }
    }),
    url: pageUrl,
    inLanguage: loc === 'en' ? 'en' : 'ko'
  }

  const faqLd = seoData.faqItems?.length && loc === 'kr' ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: seoData.faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  } : null

  const details = [
    view.address && { label: loc === 'en' ? 'Address' : '주소', value: view.address },
    seoData.phone && { label: loc === 'en' ? 'Phone' : '전화', value: seoData.phone }
  ].filter(Boolean)

  return (
    <>
      <SeoHead
        title={view.title}
        description={view.description}
        keywords={view.keywords}
        path={`/spot/${view.slug}`}
        paths={{ kr: `/spot/${seoData.kr.slug}`, en: `/spot/${seoData.en.slug}` }}
        image={seoData.image}
        imageAlt={view.name}
        type="article"
        hasEnglish={seoData.hasEnglish}
        crumbs={[
          { name: homeLabel, path: '/' },
          { name: categoryLabel, path: category.path },
          { name: view.name, path: `/spot/${view.slug}` }
        ]}
        ld={[placeLd, faqLd]}
      />
      <FallbackContext.Provider
        value={{
          h1: view.name,
          intro: view.description,
          image: seoData.image,
          imageAlt: view.name,
          details,
          links: [{ name: categoryLabel, path: category.path }]
        }}
      >
        <SpotDetailPageComponent />
      </FallbackContext.Provider>
      {seoData.lat && seoData.lng && loc === 'kr' && (
        <section className="pk-nearby pk-nearby--spot">
          <h2>{view.name} 주변 도로 상황</h2>
          <TransitMap traffic label={`${view.name} 주변 실시간 교통`} points={[
            { kind: 'place', name: view.name, lat: seoData.lat, lon: seoData.lng },
            ...(seoData.busStops || []).map((stop) => ({ ...stop, detail: `${stop.no ? `정류장 ${stop.no} · ` : ''}약 ${stop.meters}m` }))
          ]} />
        </section>
      )}
      {seoData.busStops?.length > 0 && loc === 'kr' && (
        <section className="pk-nearby pk-nearby--spot">
          <h2>{view.name} 근처 버스정류장</h2>
          <ul className="bt-stop-cards">
            {seoData.busStops.map((stop) => (
              <li key={stop.id}>
                <header><strong>{stop.name}</strong><small>{stop.no && `정류장 ${stop.no} · `}걸어서 약 {stop.meters}m</small></header>
                {stop.routes.length > 0 && <div className="bt-nearby__routes">{stop.routes.map((no) => <span key={no}>{no}번</span>)}</div>}
                <Arrivals stopId={stop.id} />
              </li>
            ))}
          </ul>
          <p className="bt-note">{BUS_SOURCE[CITY.key]}</p>
        </section>
      )}
      {seoData.parking?.length > 0 && (
        <section className="pk-nearby pk-nearby--spot">
          <h2>{loc === 'en' ? `Parking near ${view.name}` : `${view.name} 근처 주차장`}</h2>
          <LotList lots={seoData.parking} en={loc === 'en'} />
          <Link href="/parking">{loc === 'en' ? 'All parking' : `${cityName} 주차장 전체 보기`}</Link>
        </section>
      )}
    </>
  )
}

const getServerClient = async () => {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

// 상위 100곳은 빌드 때 만들고 나머지는 처음 요청될 때 만든다(ISR). 영어판은 영문명이 있는 곳만 만든다.
export async function getStaticPaths() {
  try {
    const db = await getServerClient()
    const { data, error } = await db
      .from('tour_spots')
      .select('content_id, title, title_en')
      .eq('areacode', CITY.tourApiAreaCode)
      .not('firstimage', 'is', null)
      .order('modified_time', { ascending: false, nullsFirst: false })
      .limit(100)
    if (error) throw error

    const paths = (data || [])
      .filter((item) => item.content_id && item.title)
      .flatMap((item) => [
        { params: { slug: generateLocalizedSlug({ title: item.title, contentId: item.content_id }, 'kr') }, locale: 'kr' },
        ...(item.title_en
          ? [{ params: { slug: generateLocalizedSlug({ title: item.title, titleEn: item.title_en, contentId: item.content_id }, 'en') }, locale: 'en' }]
          : [])
      ])

    return { paths, fallback: 'blocking' }
  } catch (err) {
    console.error('getStaticPaths error:', err)
    return { paths: [], fallback: 'blocking' }
  }
}

const parseFaq = (introInfo) => {
  const raw = introInfo?.faq
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter((item) => item.question && item.answer)
  if (typeof raw !== 'string') return []
  const items = []
  let question = null
  for (const line of raw.split('\n').map((l) => l.trim()).filter(Boolean)) {
    if (line.startsWith('Q.')) question = line.replace(/^Q\.\s*/, '')
    else if (line.startsWith('A.') && question) {
      items.push({ question, answer: line.replace(/^A\.\s*/, '') })
      question = null
    }
  }
  return items
}

export async function getStaticProps({ params, locale }) {
  const decodedSlug = decodeURIComponent(params.slug)
  const contentId = decodedSlug.match(/-(\d+)$/)?.[1] || (/^\d+$/.test(decodedSlug) ? decodedSlug : null)
  if (!contentId) return { notFound: true }

  try {
    const db = await getServerClient()
    const { data: row, error } = await db
      .from('tour_spots')
      .select('content_id, content_type_id, title, title_en, addr1, addr1_en, overview, overview_en, firstimage, firstimage2, tel, mapy, mapx, intro_info')
      .eq('content_id', contentId)
      .eq('areacode', CITY.tourApiAreaCode)
      .single()
    if (error || !row) return { notFound: true }

    const contentTypeId = Number(row.content_type_id) || 12
    const category = CATEGORY[contentTypeId] || CATEGORY[12]
    const addressParts = (row.addr1 || '').split(' ')
    const district = addressParts.find((part) => /[구군]$/.test(part)) || ''
    const hasEnglish = Boolean(row.title_en)
    const rawImage = row.firstimage || row.firstimage2
    const image = rawImage ? getReliableImageUrl(rawImage) : null

    const build = (loc) => {
      const en = loc === 'en'
      // 영문명에 붙은 한글 병기 "(서래마을)"는 검색 결과 제목에서 뺀다
      const name = en ? (row.title_en || row.title).replace(/\s*\([^)]*[가-힣][^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim() : row.title
      const siteName = en ? CITY.englishName : CITY.name
      const cityName = en ? CITY.cityNameEn : CITY.cityName
      const address = en ? (row.addr1_en || row.addr1) : row.addr1
      const overview = plain(en ? row.overview_en : row.overview, 155)
      const fallbackDescription = en
        ? `${name} is a ${category.en.toLowerCase()} in ${cityName}.${address ? ` Address: ${address}.` : ''}${row.tel ? ` Phone: ${row.tel}.` : ''} See photos, location and nearby places on ${siteName}.`
        : `${name}은(는) ${cityName}${district ? ` ${district}` : ''}에 있는 ${category.ko}입니다.${address ? ` 주소: ${address}.` : ''}${row.tel ? ` 전화: ${row.tel}.` : ''} 사진과 위치, 주변 정보를 ${siteName}에서 확인하세요.`
      return {
        slug: generateLocalizedSlug({ title: row.title, titleEn: en ? row.title_en : null, contentId: row.content_id }, loc),
        name,
        address,
        title: en ? `${name} - ${category.en} in ${cityName} | ${siteName}` : `${name} - ${cityName} ${category.ko} | ${siteName}`,
        description: overview || fallbackDescription,
        keywords: en
          ? `${name}, ${name} ${cityName}, ${cityName} ${category.enPlural.toLowerCase()}, things to do in ${cityName}`
          : `${name}, ${cityName} ${name}, ${cityName} ${category.ko}, ${cityName} 여행, ${addressParts.slice(0, 2).join(' ')}`
      }
    }

    const faqItems = parseFaq(row.intro_info)

    // 근처 버스정류장 3곳. 대전·서울은 저장한 정류장 목록, 부산·제주는 TAGO API. 실패하거나 좌표가 없으면 건너뛴다.
    let busStops = []
    if (contentTypeId !== 15) {
      const point = { lat: Number(row.mapy), lon: Number(row.mapx) }
      try {
        if (CITY.key === 'daejeon') busStops = (await import('../../src/services/busData')).nearestStops(point)
        else {
          const stops = CITY.key === 'seoul'
            ? (await import('../../src/services/seoulBus')).nearestStops(point)
            : await (await import('../../src/services/tagoBus')).nearestStops(point, CITY.key)
          busStops = await (await import('../../src/services/busLive')).withRoutes(CITY.key, stops)
        }
      } catch (err) {
        console.error('Nearby bus stops error:', err.message)
      }
    }

    // 근처 주차장 3곳. 주차장 API가 실패해도 장소 페이지는 그대로 만든다.
    let parking = []
    if (CITY.parkingReady && contentTypeId !== 15) {
      try {
        const { loadParkingLots } = await import('../../src/services/parkingServer')
        parking = nearestLots(await loadParkingLots(), { lat: Number(row.mapy), lon: Number(row.mapx), district }, 3)
          .map(({ id, slug, name, addr, category, isPublic, totalLot, open, close, allDay, free, basicTime, basicCharge, addTime, addCharge, dayTicket, monthTicket, km }) => ({
            id, slug, name, addr, category, isPublic, totalLot, open, close, allDay, free, basicTime, basicCharge, addTime, addCharge, dayTicket, monthTicket,
            ...(km !== undefined && { km })
          }))
      } catch (err) {
        console.error('Nearby parking error:', err.message)
      }
    }

    return {
      props: {
        seoData: {
          contentTypeId,
          hasEnglish,
          image,
          district,
          phone: row.tel || null,
          lat: row.mapy || null,
          lng: row.mapx || null,
          faqItems: faqItems.length ? faqItems : null,
          parking,
          busStops,
          kr: build('kr'),
          en: build('en')
        }
      },
      revalidate: 3600
    }
  } catch (err) {
    console.error('getStaticProps error:', err)
    return { notFound: true }
  }
}
