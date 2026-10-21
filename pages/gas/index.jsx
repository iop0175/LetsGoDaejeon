import InfoPageNav from '../../src/components/common/InfoPageNav'
import InfoTable from '../../src/components/common/InfoTable'
import Link from 'next/link'
import SeoHead from '../../src/components/common/SeoHead'
import { CITY } from '../../src/config/cities'
import { hasCityFeature } from '../../src/config/cityFeatures'

const won = (n) => `${n.toLocaleString('ko-KR')}원`

export default function GasIndexPage({ updated, average, top, rows }) {
  const title = `제주 주유소 가격 | 휘발유·경유 최저가 주유소 - ${CITY.name}`
  const cheapest = top.gasoline[0]
  const description = `제주 주유소 ${rows.length}곳의 휘발유·경유·LPG 가격을 비교하세요. 오늘 제주 휘발유 평균 ${won(average.gasoline)}, 경유 평균 ${won(average.diesel)}${cheapest ? `, 휘발유 최저가는 ${cheapest.name} ${won(cheapest.gasoline)}` : ''}입니다.`

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        keywords="제주 주유소 가격, 제주 기름값, 제주 휘발유 가격, 제주 경유 가격, 제주 최저가 주유소, 제주 LPG 가격"
        path="/gas"
        hasEnglish={false}
        crumbs={[{ name: '홈', path: '/' }, { name: '주유소 가격', path: '/gas' }]}
      />
      <section className="bt-page">
        <div className="bt-container">
          <InfoPageNav />
          <h1>제주 주유소 가격</h1>
          <p className="bt-intro">{description}</p>
          <p className="bt-note">{updated} 기준 · 제주 교통정보센터 제공 자료입니다. 가격은 판매점 사정에 따라 바뀔 수 있어요.</p>

          <h2>제주 평균 가격</h2>
          <InfoTable>
            <thead><tr><th>휘발유</th><th>고급휘발유</th><th>경유</th><th>LPG</th></tr></thead>
            <tbody><tr>{['gasoline', 'premium', 'diesel', 'lpg'].map((key) => <td key={key}>{average[key] ? won(average[key]) : '-'}</td>)}</tr></tbody>
          </InfoTable>

          {[['gasoline', '휘발유'], ['diesel', '경유'], ['lpg', 'LPG']].map(([key, label]) => top[key].length > 0 && (
            <div key={key}>
              <h2>제주 {label} 최저가 주유소 TOP {top[key].length}</h2>
              <InfoTable>
                <thead><tr><th>순위</th><th>주유소</th><th>지역</th><th>가격</th></tr></thead>
                <tbody>
                  {top[key].map((station, index) => (
                    <tr key={station.id}><td>{index + 1}</td><th><Link href={`/gas/${station.slug}`}>{station.name}</Link></th><td>{station.town || station.city}</td><td>{won(station[key])}</td></tr>
                  ))}
                </tbody>
              </InfoTable>
            </div>
          ))}

          <h2>전체 주유소 ({rows.length}곳)</h2>
          <InfoTable>
            <thead><tr><th>주유소</th><th>지역</th><th>휘발유</th><th>경유</th><th>LPG</th></tr></thead>
            <tbody>
              {rows.map((station) => (
                <tr key={station.id}>
                  <th><Link href={`/gas/${station.slug}`}>{station.name}</Link></th>
                  <td>{station.town || station.city}</td>
                  <td>{station.gasoline ? won(station.gasoline) : '-'}</td>
                  <td>{station.diesel ? won(station.diesel) : '-'}</td>
                  <td>{station.lpg ? won(station.lpg) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </InfoTable>
          <p className="bt-note">가격이 '-'인 곳은 해당 유종을 팔지 않거나 가격 정보가 없는 곳입니다. 렌터카를 반납하기 전 가까운 주유소를 찾을 때 활용해 보세요. <Link href="/ev">전기차 충전소 찾기</Link></p>
        </div>
      </section>
    </>
  )
}

const avg = (rows, key) => {
  const values = rows.map((row) => row[key]).filter((value) => value > 0)
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
}

export async function getStaticProps() {
  if (!hasCityFeature(CITY.key, 'gas')) return { notFound: true }
  try {
    const { loadGasStations } = await import('../../src/services/jejuIts')
    const { generateSlug } = await import('../../src/utils/slugUtils')
    const stations = (await loadGasStations()).map((station) => ({ ...station, slug: generateSlug(station.name, station.id) }))
    const brief = ({ id, slug, name, city, town, gasoline, premium, diesel, lpg }) => ({ id, slug, name, city, town, gasoline, premium, diesel, lpg })
    const cheapest = (key) => stations.filter((station) => station[key] > 0).sort((a, b) => a[key] - b[key]).slice(0, 10).map(brief)
    const rows = [...stations].sort((a, b) => (a.gasoline || 99999) - (b.gasoline || 99999) || a.name.localeCompare(b.name, 'ko')).map(brief)
    const updated = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false, month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    return {
      props: {
        updated,
        average: { gasoline: avg(stations, 'gasoline'), premium: avg(stations, 'premium'), diesel: avg(stations, 'diesel'), lpg: avg(stations, 'lpg') },
        top: { gasoline: cheapest('gasoline'), diesel: cheapest('diesel'), lpg: cheapest('lpg') },
        rows
      },
      revalidate: 3600
    }
  } catch (error) {
    console.error('Gas index error:', error.message)
    return { props: { updated: '', average: { gasoline: 0, premium: 0, diesel: 0, lpg: 0 }, top: { gasoline: [], diesel: [], lpg: [] }, rows: [] }, revalidate: 10 }
  }
}
