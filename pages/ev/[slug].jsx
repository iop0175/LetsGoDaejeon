import InfoPageNav from '../../src/components/common/InfoPageNav'
import Link from 'next/link'
import SeoHead from '../../src/components/common/SeoHead'
import EvLive from '../../src/components/Jeju/EvLive'
import { CITY } from '../../src/config/cities'
import { hasCityFeature } from '../../src/config/cityFeatures'
import { CHARGER_LABEL } from '../../src/utils/jejuLabels'
import { getDirectionsUrl } from '../../src/utils/mapLinks'

export default function EvStationPage({ station, nearby }) {
  if (!station) return null
  const path = `/ev/${station.slug}`
  const place = station.town ? `${station.city} ${station.town}` : station.city
  const kinds = Object.entries(station.types).map(([type, count]) => `${CHARGER_LABEL[type] || '기타'} ${count}기`).join(', ')
  const title = `${station.name} 전기차 충전소 (${place}) | ${CITY.name}`
  const description = `${place} ${station.name} 전기차 충전소 정보입니다. 충전기 ${station.chargers}기(${kinds}), ${station.hours || '이용시간 확인 필요'}${station.operator ? `, 운영 ${station.operator}` : ''}. 실시간 충전 가능 대수를 확인하세요.`

  const faq = [
    { question: `${station.name} 충전소에는 충전기가 몇 기 있나요?`, answer: `${station.chargers}기가 있습니다. 구성은 ${kinds}입니다.` },
    ...(station.hours ? [{ question: `${station.name} 충전소 이용 시간은 언제인가요?`, answer: `${station.hours}입니다.${station.memberOnly ? ' 회원만 이용할 수 있습니다.' : ''}${station.free ? ' 무료로 이용할 수 있다고 안내되어 있습니다.' : ''}` }] : [])
  ]
  const ld = [{
    '@context': 'https://schema.org',
    '@type': 'ElectricVehicleChargingStation',
    name: station.name,
    address: { '@type': 'PostalAddress', streetAddress: station.addr, addressLocality: station.city, addressRegion: '제주특별자치도', addressCountry: 'KR' },
    ...(station.lat && { geo: { '@type': 'GeoCoordinates', latitude: station.lat, longitude: station.lon } }),
    ...(station.phone && { telephone: station.phone }),
    ...(station.hours && { openingHours: station.hours })
  }, {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } }))
  }]

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        keywords={`${station.name}, ${station.name} 충전소, ${place} 전기차 충전소, 제주 전기차 충전소, 제주 급속충전`}
        path={path}
        hasEnglish={false}
        crumbs={[{ name: '홈', path: '/' }, { name: '전기차 충전소', path: '/ev' }, ...(station.town ? [{ name: station.town, path: `/ev/area/${station.town}` }] : []), { name: station.name, path }]}
        ld={ld}
      />
      <section className="bt-page">
        <div className="bt-container">
          <InfoPageNav />
          <h1>{station.name}</h1>
          <p className="bt-intro">{description}</p>

          <h2>실시간 충전 가능 대수</h2>
          <EvLive id={station.id} />

          <dl className="pk-details">
            {[
              ['주소', station.addr],
              ['충전기', `${station.chargers}기 (${kinds})`],
              ['이용시간', station.hours],
              ['운영기관', station.operator],
              ['문의', station.phone],
              ['요금', station.free ? '무료 안내' : station.fee]
            ].filter(([, value]) => value && String(value).trim()).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          {station.lat > 0 && <a className="bt-button" href={getDirectionsUrl('ko', { name: station.name, lat: station.lat, lng: station.lon })} target="_blank" rel="noopener noreferrer">길찾기</a>}

          {nearby.length > 0 && (
            <>
              <h2>{station.town || station.city} 근처 충전소</h2>
              <ul className="bt-nearby">
                {nearby.map((item) => (
                  <li key={item.id}><Link href={`/ev/${item.slug}`}>{item.name}</Link><small>{item.distance ? `${item.distance}m · ` : ''}충전기 {item.chargers}기</small></li>
                ))}
              </ul>
            </>
          )}

          <section className="bt-faq">
            <h2>{station.name} 자주 묻는 질문</h2>
            {faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
          </section>
          <p className="bt-note">충전기 구성과 이용 정보는 제주 교통정보센터 자료이며 현장과 다를 수 있습니다. <Link href="/ev">제주 전기차 충전소 전체 보기</Link></p>
        </div>
      </section>
    </>
  )
}

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  if (!hasCityFeature(CITY.key, 'ev')) return { notFound: true }
  const { loadEvStations, distanceM } = await import('../../src/services/jejuIts')
  const { generateSlug } = await import('../../src/utils/slugUtils')
  const slug = decodeURIComponent(params.slug)
  const id = slug.slice(slug.lastIndexOf('-') + 1)
  const stations = await loadEvStations()
  const station = stations.find((item) => item.id === id)
  if (!station) return { notFound: true, revalidate: 3600 }

  const here = { lat: station.lat, lon: station.lon }
  const nearby = stations
    .filter((item) => item.id !== station.id && item.lat > 0 && station.lat > 0 && Math.abs(item.lat - station.lat) < 0.02 && Math.abs(item.lon - station.lon) < 0.025)
    .map((item) => ({ item, meters: distanceM(here, item) }))
    .filter((entry) => entry.meters <= 2000)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, 5)
    .map(({ item, meters }) => ({ id: item.id, slug: generateSlug(item.name, item.id), name: item.name, chargers: item.chargers, distance: Math.round(meters / 10) * 10 }))

  return { props: { station: { ...station, slug: generateSlug(station.name, station.id) }, nearby }, revalidate: 21600 }
}
