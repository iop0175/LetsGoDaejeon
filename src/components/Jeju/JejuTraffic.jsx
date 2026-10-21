import Link from 'next/link'
import SeoHead from '../common/SeoHead'
import { CITY } from '../../config/cities'

const COLOR = { 1: '원활', 2: '서행', 3: '정체' }

export default function JejuTraffic({ updated, data }) {
  const eventSummary = Object.entries(data.eventCounts).map(([label, count]) => `${label} ${count}건`).join(', ')
  const title = `제주 실시간 도로 상황 | 교통·도로 위험·공사·노면 정보 - ${CITY.name}`
  const description = `제주 도로의 지금 상황입니다. 도로 위험 ${data.eventTotal}건${eventSummary ? `(${eventSummary})` : ''}, 도로 통제 ${data.closures.length}건, 작업 구간 ${data.works.length}건${data.averageSpeed ? `, 도로 평균 속도 ${data.averageSpeed}km/h` : ''}. 주요 교차로 구간별 소요시간과 노면 상태도 확인하세요.`

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        keywords="제주 교통정보, 제주 실시간 도로 상황, 제주 도로 통제, 제주 도로 공사, 제주 노면 상태, 제주 교통 정체"
        path="/traffic"
        hasEnglish={false}
        crumbs={[{ name: '홈', path: '/' }, { name: '도로 상황', path: '/traffic' }]}
      />
      <section className="bt-page">
        <div className="bt-container">
          <h1>제주 실시간 도로 상황</h1>
          <p className="bt-intro">{description}</p>
          <p className="bt-note">{updated} 기준 · 제주 교통정보센터 제공 자료이며 5분마다 갱신됩니다. 운전 중에는 현장 표지판과 안내를 따라 주세요.</p>

          <h2>주요 교차로 구간별 소요시간</h2>
          {data.points.length === 0
            ? <p className="bt-note">지금은 구간 소요시간 자료가 없습니다.</p>
            : (
              <table className="bt-table">
                <thead><tr><th>기점</th><th>목적지별 소요시간</th><th>속도</th></tr></thead>
                <tbody>
                  {data.points.map((point) => (
                    <tr key={point.name}>
                      <th>{point.name}</th>
                      <td>{point.destinations.map((dest) => (
                        <span key={dest.place} className={`bt-level bt-level--${dest.color}`} title={COLOR[dest.color]}>{dest.place} {dest.minutes}분</span>
                      ))}</td>
                      <td>{point.speed ? `${point.speed}km/h` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          <h2>도로 위험 정보 ({data.eventTotal}건)</h2>
          {data.events.length === 0
            ? <p className="bt-note">현재 접수된 도로 위험 정보가 없습니다.</p>
            : (
              <ul className="bt-nearby">
                {data.events.map((event, index) => <li key={index}><b>{event.label}</b><small>{event.place}</small></li>)}
              </ul>
            )}

          <h2>도로 통제 · 작업 구간</h2>
          {data.closures.length + data.works.length === 0
            ? <p className="bt-note">지금은 통제 중이거나 작업 중인 구간이 없습니다.</p>
            : (
              <ul className="bt-nearby">
                {data.closures.map((item, index) => <li key={`c${index}`}><b>통제</b><small>{item.text}</small></li>)}
                {data.works.map((item, index) => <li key={`w${index}`}><b>작업</b><small>{item.text}</small></li>)}
              </ul>
            )}

          <h2>노면 상태 · 시정</h2>
          {data.weather.length === 0
            ? <p className="bt-note">지금은 노면 기상 자료가 없습니다.</p>
            : (
              <table className="bt-table">
                <thead><tr><th>위치</th><th>노면</th><th>시정</th><th>노면 온도</th></tr></thead>
                <tbody>
                  {data.weather.map((item, index) => (
                    <tr key={index}><th>{item.place}</th><td>{item.state}{item.snow ? ` (적설 ${item.snow}cm)` : ''}</td><td>{item.visibility ? `${item.visibility.toLocaleString('ko-KR')}m` : '-'}</td><td>{item.roadTemp !== null ? `${item.roadTemp}℃` : '-'}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          <p className="bt-note">위치는 가장 가까운 주요 교차로 이름으로 표시한 대략적인 곳이에요. <Link href="/ev">전기차 충전소</Link> · <Link href="/gas">주유소 가격</Link></p>
        </div>
      </section>
    </>
  )
}
