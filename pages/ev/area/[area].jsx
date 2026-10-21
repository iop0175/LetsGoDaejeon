import InfoPageNav from '../../../src/components/common/InfoPageNav'
import Link from 'next/link'
import SeoHead from '../../../src/components/common/SeoHead'
import { CITY } from '../../../src/config/cities'
import { hasCityFeature } from '../../../src/config/cityFeatures'

export default function EvAreaPage({ area, city, total, fastCount, stations }) {
  const path = `/ev/area/${area}`
  const title = `제주 ${area} 전기차 충전소 ${total}곳 | 급속충전·충전기 현황 - ${CITY.name}`
  const description = `제주 ${city} ${area}에 있는 전기차 충전소 ${total}곳의 위치와 충전기 종류, 이용시간을 모았습니다. 급속충전이 되는 곳은 ${fastCount}곳입니다.`

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        keywords={`제주 ${area} 전기차 충전소, ${area} 전기차 충전, ${area} 급속충전, ${city} ${area} 충전소`}
        path={path}
        hasEnglish={false}
        crumbs={[{ name: '홈', path: '/' }, { name: '전기차 충전소', path: '/ev' }, { name: area, path }]}
      />
      <section className="bt-page">
        <div className="bt-container">
          <InfoPageNav />
          <h1>제주 {area} 전기차 충전소</h1>
          <p className="bt-intro">{description}</p>
          <ul className="bt-nearby">
            {stations.map((station) => (
              <li key={station.id}>
                <Link href={`/ev/${station.slug}`}>{station.name}</Link>
                <small>충전기 {station.chargers}기{station.fast ? ` (급속 ${station.fast})` : ''}{station.hours ? ` · ${station.hours}` : ''}</small>
              </li>
            ))}
          </ul>
          {total > stations.length && <p className="bt-note">{total}곳 중 {stations.length}곳을 보여 드립니다.</p>}
          <p className="bt-note"><Link href="/ev">제주 전기차 충전소 전체 지역</Link></p>
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
  const { loadEvStations } = await import('../../../src/services/jejuIts')
  const { generateSlug } = await import('../../../src/utils/slugUtils')
  const area = decodeURIComponent(params.area)
  const inArea = (await loadEvStations()).filter((station) => station.town === area)
  if (!inArea.length) return { notFound: true, revalidate: 3600 }

  const stations = [...inArea].sort((a, b) => b.fast - a.fast || b.chargers - a.chargers).slice(0, 100)
    .map((s) => ({ id: s.id, slug: generateSlug(s.name, s.id), name: s.name, chargers: s.chargers, fast: s.fast, hours: s.hours }))
  return {
    props: { area, city: inArea[0].city, total: inArea.length, fastCount: inArea.filter((s) => s.fast > 0).length, stations },
    revalidate: 21600
  }
}
