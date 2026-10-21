import InfoPageNav from '../../../src/components/common/InfoPageNav'
import Link from 'next/link'
import SeoHead from '../../../src/components/common/SeoHead'
import { Arrivals } from '../../../src/components/Bus/LiveBox'
import { CITY } from '../../../src/config/cities'
import { getDirectionsUrl } from '../../../src/utils/mapLinks'
import TransitMap from '../../../src/components/common/TransitMap'

const CATEGORY = { 12: '관광지', 14: '문화시설', 28: '레포츠', 39: '맛집' }

export default function BusStopPage({ stop, routes, spots, nearby }) {
  if (!stop) return null
  const path = `/bus/stop/${stop.slug}`
  const numbers = routes.map((route) => `${route.no}번`).join(', ')
  const title = `${stop.name} 버스정류장(${stop.id}) 노선·도착정보 | ${CITY.name}`
  const description = `대전 ${stop.name} 버스정류장(정류장 번호 ${stop.id})에 정차하는 ${numbers} 버스의 실시간 도착 예정 시간과 노선 정보를 확인하세요.${spots.length ? ` 근처 ${spots[0].name} 등 가볼만한 곳도 안내합니다.` : ''}`

  const faq = [
    { question: `${stop.name} 정류장에는 어떤 버스가 서나요?`, answer: `${numbers} 버스가 정차합니다. 정류장 번호는 ${stop.id}입니다.` },
    ...(spots.length ? [{ question: `${stop.name} 정류장 근처에 가볼 만한 곳은 어디인가요?`, answer: `${spots.slice(0, 4).map((spot) => `${spot.name}(약 ${spot.meters}m)`).join(', ')} 등이 있습니다.` }] : [])
  ]
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } }))
  }
  const placeLd = {
    '@context': 'https://schema.org',
    '@type': 'BusStop',
    name: stop.name,
    identifier: stop.id,
    ...(stop.lat && { geo: { '@type': 'GeoCoordinates', latitude: stop.lat, longitude: stop.lon } }),
    address: { '@type': 'PostalAddress', addressLocality: '대전', addressCountry: 'KR' }
  }

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        keywords={`${stop.name} 버스정류장, ${stop.name} 버스, 대전 ${stop.name} 정류장, ${stop.name} 버스 도착정보, ${stop.id}`}
        path={path}
        hasEnglish={false}
        crumbs={[{ name: '홈', path: '/' }, { name: '버스 노선', path: '/bus' }, { name: stop.name, path }]}
        ld={[placeLd, faqLd]}
      />
      <section className="bt-page">
        <div className="bt-container">
          <InfoPageNav />
          <h1>{stop.name} 버스정류장 <small>{stop.id}</small></h1>
          <p className="bt-intro">{description}</p>

          <h2>실시간 도착 정보</h2>
          <Arrivals stopId={stop.id} />
          <TransitMap label={`${stop.name} 정류장 위치`} points={[{ ...stop, detail: `정류장 ${stop.id}` }]} />

          <h2>정차 노선 {routes.length}개</h2>
          <div className="bt-links"><div>{routes.map((route) => <Link key={route.slug} href={`/bus/route/${route.slug}`}>{route.no}번</Link>)}</div></div>

          {stop.lat > 0 && (
            <a className="bt-button" href={getDirectionsUrl('ko', { name: `${stop.name} 버스정류장`, lat: stop.lat, lng: stop.lon })} target="_blank" rel="noopener noreferrer">길찾기</a>
          )}

          {spots.length > 0 && (
            <>
              <h2>{stop.name} 정류장 근처 가볼 만한 곳</h2>
              <ul className="bt-spots">
                {spots.map((spot) => (
                  <li key={spot.slug}><Link href={`/spot/${spot.slug}`}>{spot.name}</Link><small>{spot.category} · 약 {spot.meters}m</small></li>
                ))}
              </ul>
            </>
          )}

          {nearby.length > 0 && (
            <nav className="bt-links">
              <h2>근처 다른 정류장</h2>
              <div>{nearby.map((item) => <Link key={item.id} href={`/bus/stop/${item.slug}`}>{item.name}</Link>)}</div>
            </nav>
          )}

          <section className="bt-faq">
            <h2>{stop.name} 정류장 자주 묻는 질문</h2>
            {faq.map((item) => (
              <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>
            ))}
          </section>
          <p className="bt-note">도착 예정 시간은 대전시 버스 정보 시스템 기준이며 실제와 다를 수 있습니다.</p>
        </div>
      </section>
    </>
  )
}

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' }
}

const toMeters = (km) => Math.round((km * 1000) / 10) * 10

export async function getStaticProps({ params }) {
  if (CITY.key !== 'daejeon') return { notFound: true }
  const { findStop, routeNos, routeSlug, stopSlug, nearestStops } = await import('../../../src/services/busData')
  const stop = findStop(decodeURIComponent(params.slug))
  if (!stop) return { notFound: true }

  const routes = routeNos(stop).map((route) => ({ no: route.no, slug: routeSlug(route) }))
  const nearby = nearestStops(stop, 7, 0.4).filter((item) => item.id !== stop.id).slice(0, 6).map(({ id, name, slug }) => ({ id, name, slug }))

  // 정류장 반경 500m 안의 관광지·문화시설·레포츠·맛집. DB가 실패해도 정류장 페이지는 만든다.
  let spots = []
  if (stop.lat > 0) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const { distanceKm } = await import('../../../src/utils/parkingFormat')
      const { generateSlug } = await import('../../../src/utils/slugUtils')
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      const { data } = await db
        .from('tour_spots')
        .select('content_id, content_type_id, title, mapy, mapx')
        .eq('areacode', CITY.tourApiAreaCode)
        .in('content_type_id', [12, 14, 28, 39])
        .gte('mapy', String(stop.lat - 0.005)).lte('mapy', String(stop.lat + 0.005))
        .gte('mapx', String(stop.lon - 0.006)).lte('mapx', String(stop.lon + 0.006))
        .limit(60)
      spots = (data || [])
        .map((row) => ({ row, km: distanceKm({ lat: stop.lat, lon: stop.lon }, { lat: Number(row.mapy), lon: Number(row.mapx) }) }))
        .filter((item) => item.km <= 0.5)
        .sort((a, b) => a.km - b.km)
        .slice(0, 6)
        .map(({ row, km }) => ({ name: row.title, slug: generateSlug(row.title, row.content_id), category: CATEGORY[row.content_type_id] || '명소', meters: toMeters(km) }))
    } catch (error) {
      console.error('Bus stop spots error:', error.message)
    }
  }

  return {
    props: { stop: { id: stop.id, name: stop.name, lat: stop.lat, lon: stop.lon, slug: stopSlug(stop) }, routes, spots, nearby },
    revalidate: 21600
  }
}
