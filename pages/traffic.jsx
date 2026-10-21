import InfoPageNav from '../src/components/common/InfoPageNav'
import InfoTable from '../src/components/common/InfoTable'
import SeoHead from '../src/components/common/SeoHead'
import { CITY } from '../src/config/cities'
import { hasCityFeature } from '../src/config/cityFeatures'
import JejuTraffic from '../src/components/Jeju/JejuTraffic'
import TransitMap from '../src/components/common/TransitMap'

const LEVEL = { 1: '원활', 2: '서행', 3: '정체' }

export default function TrafficPage(props) {
  return props.city === 'jeju' ? <JejuTraffic updated={props.updated} data={props.data} /> : <DaejeonTraffic {...props} />
}

function DaejeonTraffic({ updated, total, shares, congested, roads }) {
  const title = `대전 실시간 교통정보 | 도로 소통·정체 구간 - ${CITY.name}`
  const worst = congested[0]
  const description = `대전 도로 ${total.toLocaleString('ko-KR')}개 구간의 실시간 소통 상황입니다. 지금 원활 ${shares[1]}%, 서행 ${shares[2]}%, 정체 ${shares[3]}%${worst ? `, 가장 혼잡한 도로는 ${worst.road}입니다` : ''}. 정체 구간과 주요 도로 평균 속도를 확인하세요.`

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        keywords="대전 교통정보, 대전 실시간 교통, 대전 도로 소통, 대전 정체 구간, 대전 교통 상황"
        path="/traffic"
        hasEnglish={false}
        crumbs={[{ name: '홈', path: '/' }, { name: '교통정보', path: '/traffic' }]}
      />
      <section className="bt-page">
        <div className="bt-container">
          <InfoPageNav />
          <h1>대전 실시간 교통정보</h1>
          <p className="bt-intro">{description}</p>
          <p className="bt-note">기준 시각 {updated} · 대전시 교통정보센터 자료이며 5분마다 갱신됩니다.</p>

          <h2>지금 대전 도로 상황</h2>
          <TransitMap traffic label="대전 실시간 도로 지도" />
          <InfoTable>
            <thead><tr><th>상태</th><th>구간 비율</th></tr></thead>
            <tbody>
              {[1, 2, 3].map((level) => (
                <tr key={level}><th><span className={`bt-level bt-level--${level}`}>{LEVEL[level]}</span></th><td>{shares[level]}%</td></tr>
              ))}
            </tbody>
          </InfoTable>

          <h2>지금 가장 혼잡한 도로</h2>
          {congested.length === 0
            ? <p className="bt-note">현재 눈에 띄는 정체 도로가 없습니다.</p>
            : (
              <InfoTable>
                <thead><tr><th>도로</th><th>서행·정체 비율</th><th>평균 속도</th></tr></thead>
                <tbody>
                  {congested.map((item) => (
                    <tr key={item.road}><th>{item.road}</th><td>{item.slowShare}%</td><td>{item.avgSpeed}km/h</td></tr>
                  ))}
                </tbody>
              </InfoTable>
            )}

          <h2>주요 도로 평균 속도</h2>
          <InfoTable>
            <thead><tr><th>도로</th><th>구간 수</th><th>평균 속도</th><th>상태</th></tr></thead>
            <tbody>
              {roads.map((item) => (
                <tr key={item.road}><th>{item.road}</th><td>{item.links}</td><td>{item.avgSpeed}km/h</td><td><span className={`bt-level bt-level--${item.level}`}>{LEVEL[item.level]}</span></td></tr>
              ))}
            </tbody>
          </InfoTable>
          <p className="bt-note">구간별 속도와 상태를 도로 이름으로 묶어 평균을 낸 값입니다. 실제 도로 상황과 다를 수 있으니 운전 중에는 현장 표지판과 안내를 따라 주세요.</p>
        </div>
      </section>
    </>
  )
}

export async function getStaticProps() {
  if (!hasCityFeature(CITY.key, 'traffic')) return { notFound: true }
  if (CITY.key === 'jeju') {
    const updated = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false, month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    try {
      const { loadJejuTraffic } = await import('../src/services/jejuTraffic')
      return { props: { city: 'jeju', updated, data: await loadJejuTraffic() }, revalidate: 300 }
    } catch (error) {
      // 제주 ITS는 해외 접속이 막혀 있을 수 있어 빌드 중에는 실패할 수 있다. 빈 페이지를 내고 곧바로 다시 만든다.
      console.error('Jeju traffic error:', error.message)
      const data = { points: [], events: [], eventCounts: {}, eventTotal: 0, closures: [], works: [], weather: [], averageSpeed: 0, linkCount: 0 }
      return { props: { city: 'jeju', updated, data }, revalidate: 10 }
    }
  }
  try {
    const { assertOk, callTransit, listItems } = await import('../src/utils/daejeonTransit')
    const xml = assertOk(await callTransit('rest/getTrafficInfoAll', { numOfRows: '20000', pageNo: '1' }))
    const links = listItems(xml, 'TRAFFIC')
      .map((item) => ({ road: item.roadName, level: Number(item.congestion), speed: Number(item.speed), length: Number(item.linkLength) || 0 }))
      .filter((item) => [1, 2, 3].includes(item.level))
    if (links.length < 1000) throw new Error('교통 자료가 비정상적으로 적습니다.')

    const counts = { 1: 0, 2: 0, 3: 0 }
    for (const link of links) counts[link.level] += 1
    const pct = (n, d) => Math.round((n / d) * 1000) / 10
    const shares = { 1: pct(counts[1], links.length), 2: pct(counts[2], links.length), 3: pct(counts[3], links.length) }

    const byRoad = new Map()
    for (const link of links) {
      if (!link.road || link.road === '-') continue
      const entry = byRoad.get(link.road) || { road: link.road, links: 0, slow: 0, speedSum: 0, lengthSum: 0, slowLength: 0 }
      entry.links += 1
      entry.speedSum += link.speed
      entry.lengthSum += link.length
      if (link.level >= 2) { entry.slow += 1; entry.slowLength += link.length }
      byRoad.set(link.road, entry)
    }
    const stats = [...byRoad.values()]
      .filter((entry) => entry.links >= 12)
      .map((entry) => {
        const avgSpeed = Math.round(entry.speedSum / entry.links)
        return { road: entry.road, links: entry.links, avgSpeed, slowShare: Math.round((entry.slow / entry.links) * 100), level: avgSpeed < 20 ? 3 : avgSpeed < 35 ? 2 : 1 }
      })

    const congested = [...stats].filter((entry) => entry.slowShare >= 20).sort((a, b) => b.slowShare - a.slowShare || a.avgSpeed - b.avgSpeed).slice(0, 10)
    const roads = [...stats].sort((a, b) => b.links - a.links).slice(0, 30)
    const updated = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false, month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

    return { props: { updated, total: links.length, shares, congested, roads }, revalidate: 300 }
  } catch (error) {
    console.error('Traffic error:', error.message)
    // 빌드 중 실패로 배포 전체가 멈추지 않게 빈 페이지를 내고 곧바로 다시 만든다.
    // 운영 중에는 던져서 ISR이 마지막 정상 페이지를 그대로 유지하게 한다.
    if (process.env.NEXT_PHASE !== 'phase-production-build') throw error
    const updated = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false, month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    return { props: { updated, total: 0, shares: { 1: 0, 2: 0, 3: 0 }, congested: [], roads: [] }, revalidate: 10 }
  }
}
