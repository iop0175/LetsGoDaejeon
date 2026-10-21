import InfoPageNav from '../../src/components/common/InfoPageNav'
import Link from 'next/link'
import SeoHead from '../../src/components/common/SeoHead'
import { CITY } from '../../src/config/cities'
import { hasCityFeature } from '../../src/config/cityFeatures'

export default function EvIndexPage({ total, fastTotal, chargerTotal, areas, top }) {
  const title = `제주 전기차 충전소 ${total.toLocaleString('ko-KR')}곳 | 급속충전·실시간 충전 가능 - ${CITY.name}`
  const description = `제주 전기차 충전소 ${total.toLocaleString('ko-KR')}곳(충전기 ${chargerTotal.toLocaleString('ko-KR')}기)의 위치, 충전기 종류, 이용시간을 지역별로 찾아보세요. 급속충전이 되는 곳은 ${fastTotal.toLocaleString('ko-KR')}곳이며, 충전소마다 실시간 충전 가능 대수를 볼 수 있습니다.`

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        keywords="제주 전기차 충전소, 제주 급속충전, 제주 전기차 충전, 제주 렌터카 전기차 충전, 제주 공항 전기차 충전소"
        path="/ev"
        hasEnglish={false}
        crumbs={[{ name: '홈', path: '/' }, { name: '전기차 충전소', path: '/ev' }]}
      />
      <section className="bt-page">
        <div className="bt-container">
          <InfoPageNav />
          <h1>제주 전기차 충전소</h1>
          <p className="bt-intro">{description}</p>
          <p className="bt-note">제주 교통정보센터 제공 자료입니다. 전기차 렌터카를 반납하기 전에 가까운 급속충전소를 미리 확인해 보세요.</p>

          <h2>충전기가 많은 충전소</h2>
          <ul className="bt-nearby">
            {top.map((station) => (
              <li key={station.id}><Link href={`/ev/${station.slug}`}>{station.name}</Link><small>{station.town || station.city} · 충전기 {station.chargers}기{station.fast ? ` (급속 ${station.fast})` : ''}</small></li>
            ))}
          </ul>

          <nav className="bt-links">
            <h2>지역별 전기차 충전소</h2>
            <div>
              {areas.map((area) => <Link key={area.name} href={`/ev/area/${area.name}`}>{area.name} {area.count}곳</Link>)}
            </div>
          </nav>
          <p className="bt-note"><Link href="/gas">제주 주유소 가격</Link> · <Link href="/traffic">제주 도로 상황</Link></p>
        </div>
      </section>
    </>
  )
}

export async function getStaticProps() {
  if (!hasCityFeature(CITY.key, 'ev')) return { notFound: true }
  try {
    const { loadEvStations } = await import('../../src/services/jejuIts')
    const { generateSlug } = await import('../../src/utils/slugUtils')
    const stations = await loadEvStations()
    const counts = new Map()
    for (const station of stations) if (station.town) counts.set(station.town, (counts.get(station.town) || 0) + 1)
    const areas = [...counts].filter(([, count]) => count >= 3).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    const top = [...stations].sort((a, b) => b.chargers - a.chargers).slice(0, 12)
      .map((s) => ({ id: s.id, slug: generateSlug(s.name, s.id), name: s.name, town: s.town, city: s.city, chargers: s.chargers, fast: s.fast }))
    return {
      props: { total: stations.length, fastTotal: stations.filter((s) => s.fast > 0).length, chargerTotal: stations.reduce((sum, s) => sum + s.chargers, 0), areas, top },
      revalidate: 21600
    }
  } catch (error) {
    console.error('EV index error:', error.message)
    return { props: { total: 0, fastTotal: 0, chargerTotal: 0, areas: [], top: [] }, revalidate: 10 }
  }
}
