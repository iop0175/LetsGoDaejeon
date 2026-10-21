import SeoHead from '../src/components/common/SeoHead'
import { CITY } from '../src/config/cities'
import { hasCityFeature } from '../src/config/cityFeatures'

const LEVEL = { 1: '원활', 2: '서행', 3: '정체' }

export default function TrafficPage({ updated, total, shares, congested, roads }) {
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
          <h1>대전 실시간 교통정보</h1>
          <p className="bt-intro">{description}</p>
          <p className="bt-note">기준 시각 {updated} · 대전시 교통정보센터 자료이며 5분마다 갱신됩니다.</p>

          <h2>지금 대전 도로 상황</h2>
          <table className="bt-table">
            <thead><tr><th>상태</th><th>구간 비율</th></tr></thead>
            <tbody>
              {[1, 2, 3].map((level) => (
                <tr key={level}><th><span className={`bt-level bt-level--${level}`}>{LEVEL[level]}</span></th><td>{shares[level]}%</td></tr>
              ))}
            </tbody>
          </table>

          <h2>지금 가장 혼잡한 도로</h2>
          {congested.length === 0
            ? <p className="bt-note">현재 눈에 띄는 정체 도로가 없습니다.</p>
            : (
              <table className="bt-table">
                <thead><tr><th>도로</th><th>서행·정체 비율</th><th>평균 속도</th></tr></thead>
                <tbody>
                  {congested.map((item) => (
                    <tr key={item.road}><th>{item.road}</th><td>{item.slowShare}%</td><td>{item.avgSpeed}km/h</td></tr>
                  ))}
                </tbody>
              </table>
            )}

          <h2>주요 도로 평균 속도</h2>
          <table className="bt-table">
            <thead><tr><th>도로</th><th>구간 수</th><th>평균 속도</th><th>상태</th></tr></thead>
            <tbody>
              {roads.map((item) => (
                <tr key={item.road}><th>{item.road}</th><td>{item.links}</td><td>{item.avgSpeed}km/h</td><td><span className={`bt-level bt-level--${item.level}`}>{LEVEL[item.level]}</span></td></tr>
              ))}
            </tbody>
          </table>
          <p className="bt-note">구간별 속도와 상태를 도로 이름으로 묶어 평균을 낸 값입니다. 실제 도로 상황과 다를 수 있으니 운전 중에는 현장 표지판과 안내를 따라 주세요.</p>
        </div>
      </section>
    </>
  )
}

export async function getStaticProps() {
  if (!hasCityFeature(CITY.key, 'traffic')) return { notFound: true }
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
    // 마지막 정상 페이지가 있으면 ISR이 그대로 유지한다
    throw error
  }
}
