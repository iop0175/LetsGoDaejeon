import Link from 'next/link'
import SeoHead from '../../../src/components/common/SeoHead'
import { RunningBuses } from '../../../src/components/Bus/LiveBox'
import { CITY } from '../../../src/config/cities'

const DAYS = [['weekday', '평일'], ['sat', '토요일'], ['sun', '일요일·공휴일']]

export default function BusRoutePage({ route, stops, names, nearbyRoutes }) {
  if (!route) return null
  const first = stops[0]
  const last = stops[stops.length - 1]
  const turn = names[route.turnStopId]
  const title = `대전 ${route.no}번 버스 노선·시간표·정류장 | ${CITY.name}`
  const wk = route.startFirst.weekday
  const description = `대전 ${route.no}번 시내버스는 ${first.name}에서 ${turn || last.name}까지 ${route.stopCount}개 정류장을 지납니다. 평일 첫차 ${wk}, 막차 ${route.startLast.weekday}, 배차간격 ${route.intervalMin.weekday}분. 실시간 버스 위치도 확인하세요.`
  const path = `/bus/route/${route.slug}`

  const faq = [
    { question: `대전 ${route.no}번 버스 막차는 몇 시인가요?`, answer: `평일 기점(${first.name}) 출발 막차는 ${route.startLast.weekday}, 토요일은 ${route.startLast.sat}, 일요일·공휴일은 ${route.startLast.sun}입니다. 회차 지점(${turn || last.name}) 출발 막차는 평일 ${route.turnLast.weekday}입니다.` },
    { question: `대전 ${route.no}번 버스 배차간격은 얼마나 되나요?`, answer: `평일 ${route.intervalMin.weekday}분, 토요일 ${route.intervalMin.sat}분, 일요일·공휴일 ${route.intervalMin.sun}분 간격으로 운행합니다. 교통 상황에 따라 달라질 수 있습니다.` },
    { question: `대전 ${route.no}번 버스는 어디를 지나가나요?`, answer: `${first.name}에서 출발해 ${stops.slice(1, 6).map((stop) => stop.name).join(', ')} 등 ${route.stopCount}개 정류장을 지나 ${turn || last.name}까지 운행합니다.` }
  ]
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } }))
  }

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        keywords={`대전 ${route.no}번 버스, 대전 ${route.no}번 버스 시간표, 대전 ${route.no}번 막차, 대전 ${route.no}번 노선, 대전 ${route.no}번 버스 정류장`}
        path={path}
        hasEnglish={false}
        crumbs={[{ name: '홈', path: '/' }, { name: '버스 노선', path: '/bus' }, { name: `${route.no}번`, path }]}
        ld={[faqLd]}
      />
      <section className="bt-page">
        <div className="bt-container">
          <h1>대전 {route.no}번 버스</h1>
          <p className="bt-intro">{description}</p>

          <h2>시간표와 배차간격</h2>
          <table className="bt-table">
            <thead><tr><th>구분</th><th>배차간격</th><th>{first.name} 첫차</th><th>{first.name} 막차</th><th>{turn || last.name} 막차</th></tr></thead>
            <tbody>
              {DAYS.map(([key, label]) => (
                <tr key={key}><th>{label}</th><td>{route.intervalMin[key]}분</td><td>{route.startFirst[key]}</td><td>{route.startLast[key]}</td><td>{route.turnLast[key]}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="bt-note">운행거리 편도 약 {route.distanceKm}km, 소요 {route.runMinutes}분 안팎입니다. 시각은 대전시 공공데이터 기준이며 교통 상황에 따라 달라질 수 있습니다.</p>

          <h2>운행 중인 버스 (실시간)</h2>
          <RunningBuses routeId={route.id} stopNames={names} />

          <h2>정차 정류장 {route.stopCount}곳</h2>
          <ol className="bt-stops">
            {stops.map((stop, index) => (
              <li key={`${stop.id}-${index}`}><Link href={`/bus/stop/${stop.slug}`}>{stop.name}</Link><small>{stop.id}</small></li>
            ))}
          </ol>

          {nearbyRoutes.length > 0 && (
            <nav className="bt-links">
              <h2>같은 정류장을 지나는 다른 노선</h2>
              <div>{nearbyRoutes.map((item) => <Link key={item.slug} href={`/bus/route/${item.slug}`}>{item.no}번</Link>)}</div>
            </nav>
          )}

          <section className="bt-faq">
            <h2>{route.no}번 버스 자주 묻는 질문</h2>
            {faq.map((item) => (
              <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>
            ))}
          </section>
          <p className="bt-note"><Link href="/bus">다른 노선 찾기</Link></p>
        </div>
      </section>
    </>
  )
}

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  if (CITY.key !== 'daejeon') return { notFound: true }
  const { findRoute, routeSlug, stopSlug, routes, stopName, getStop } = await import('../../../src/services/busData')
  const route = findRoute(decodeURIComponent(params.slug))
  if (!route || !route.stops.length) return { notFound: true }

  const stopsList = route.stops.map((id) => ({ id, name: stopName(id) || id, slug: getStop(id) ? stopSlug(getStop(id)) : id }))
  const names = Object.fromEntries(stopsList.map((stop) => [stop.id, stop.name]))
  if (route.turnStopId) names[route.turnStopId] = stopName(route.turnStopId)

  // 이 노선과 정류장을 가장 많이 공유하는 노선 8개
  const mine = new Set(route.stops)
  const nearbyRoutes = routes
    .filter((other) => other.id !== route.id)
    .map((other) => ({ other, shared: other.stops.filter((id) => mine.has(id)).length }))
    .filter((item) => item.shared >= 3)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 8)
    .map(({ other }) => ({ no: other.no, slug: routeSlug(other) }))
    .sort((a, b) => a.no.localeCompare(b.no, 'ko', { numeric: true }))

  const { stops: _drop, ...summary } = route
  return {
    props: { route: { ...summary, slug: routeSlug(route) }, stops: stopsList, names, nearbyRoutes },
    revalidate: 21600
  }
}
