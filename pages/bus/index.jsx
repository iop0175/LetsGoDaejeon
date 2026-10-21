import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import SeoHead from '../../src/components/common/SeoHead'
import { CITY } from '../../src/config/cities'
import { hasCityFeature } from '../../src/config/cityFeatures'
import { POPULAR_BUS } from '../../src/utils/busRoutes'

export default function BusPage({ routeLinks = [] }) {
  const { locale } = useRouter()
  const en = locale === 'en'
  const [query, setQuery] = useState('')
  const [lanes, setLanes] = useState(null)
  const [route, setRoute] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const request = async (url) => {
    const response = await fetch(url)
    const data = await response.json()
    if (!data.success) throw new Error(data.error || 'error')
    return data
  }
  const search = async (value) => {
    const text = (value ?? query).trim()
    if (!text) return
    setQuery(text); setLoading(true); setError(''); setRoute(null)
    try { setLanes((await request('/api/bus?q=' + encodeURIComponent(text))).lanes) }
    catch { setLanes(null); setError(en ? 'Could not search routes. Please try again.' : '노선을 검색하지 못했습니다. 잠시 후 다시 시도해 주세요.') }
    finally { setLoading(false) }
  }
  const open = async (id) => {
    setLoading(true); setError('')
    try { setRoute((await request('/api/bus?id=' + id)).route) }
    catch { setError(en ? 'Could not load the route.' : '노선 정보를 불러오지 못했습니다.') }
    finally { setLoading(false) }
  }

  const title = en ? 'Daejeon Bus Route Finder' : '대전 버스 노선 검색'
  const description = en
    ? 'Look up Daejeon city bus routes by number: first and last bus, interval and every stop in order.'
    : '대전 시내버스 번호로 첫차·막차, 배차 간격, 정류장 순서를 확인하세요. 604번, 급행1번 등 번호만 입력하면 됩니다.'

  return (
    <>
      <SeoHead title={title + ' | ' + (en ? CITY.englishName : CITY.name)} description={description} path="/bus" crumbs={[{ name: en ? 'Home' : '홈', path: '/' }, { name: title, path: '/bus' }]} />
      <section className="content-hub feature-hub">
        <header className="content-hub__hero content-hub__hero--utility"><div><div className="live-hub__status"><i />{en ? 'Transit' : '대중교통'}</div><h1>{title}</h1><span>{description}</span></div></header>
        <div className="content-hub__container">
          <form className="bus-search" onSubmit={(event) => { event.preventDefault(); search() }}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={en ? 'Bus number, e.g. 604' : '버스 번호 (예: 604)'} maxLength={12} aria-label={en ? 'Bus number' : '버스 번호'} />
            <button type="submit" disabled={loading}>{en ? 'Search' : '검색'}</button>
          </form>
          <div className="feature-chips">{POPULAR_BUS.map((number) => <button type="button" key={number} onClick={() => search(number)}>{number}</button>)}</div>
          {error && <p className="feature-note feature-note--error">{error}</p>}
          {loading && <p className="feature-note">{en ? 'Loading...' : '불러오는 중...'}</p>}
          {!route && lanes && !lanes.length && !loading && <p className="feature-note">{en ? 'No Daejeon route matches that number.' : '일치하는 대전 노선이 없습니다.'}</p>}
          {!route && lanes && lanes.length > 0 && (
            <ul className="bus-lanes">
              {lanes.map((lane) => (
                <li key={lane.id}><button type="button" onClick={() => open(lane.id)}><b>{lane.number}</b><span>{lane.start} → {lane.end}</span><small>{lane.first}~{lane.last}</small></button></li>
              ))}
            </ul>
          )}
          {route && (
            <article className="bus-route">
              <button type="button" className="bus-route__back" onClick={() => setRoute(null)}>← {en ? 'Back to results' : '검색 결과로'}</button>
              <h2><b>{route.number}</b> {route.start} → {route.end}</h2>
              <dl>
                <div><dt>{en ? 'First bus' : '첫차'}</dt><dd>{route.first || '-'}</dd></div>
                <div><dt>{en ? 'Last bus' : '막차'}</dt><dd>{route.last || '-'}</dd></div>
                <div><dt>{en ? 'Interval' : '배차 간격'}</dt><dd>{route.interval ? route.interval + (en ? ' min' : '분') : '-'}</dd></div>
                <div><dt>{en ? 'Operator' : '운수사'}</dt><dd>{route.company || '-'}</dd></div>
              </dl>
              {[[route.outbound, en ? 'Outbound' : '가는 방향'], [route.inbound, en ? 'Return' : '오는 방향']].filter(([stops]) => stops.length).map(([stops, label]) => (
                <section key={label}>
                  <h3>{label} · {stops.length}{en ? ' stops' : '개 정류장'}</h3>
                  <ol className="bus-stops">{stops.map((stop) => <li key={stop.index}><span>{stop.name}</span>{stop.stopNumber && <small>{stop.stopNumber}</small>}</li>)}</ol>
                </section>
              ))}
            </article>
          )}
          <p className="feature-note">{en ? 'Route data from ODsay. Real-time bus arrival is not included, so check the Daejeon Bus information service for live times.' : '노선 검색 결과는 ODsay 자료예요. 아래 전체 노선 목록은 대전시 공공데이터 기준이며, 노선마다 실시간 버스 위치를, 정류장마다 실시간 도착 정보를 볼 수 있어요.'}</p>

          {!en && routeLinks.length > 0 && (
            <nav className="bt-links bt-links--hub">
              <h2>대전 시내버스 전체 노선 {routeLinks.length}개</h2>
              <div>{routeLinks.map((item) => <Link key={item.slug} href={`/bus/route/${item.slug}`}>{item.no}번</Link>)}</div>
            </nav>
          )}
        </div>
      </section>
    </>
  )
}

export async function getStaticProps() {
  if (!hasCityFeature(CITY.key, 'bus')) return { notFound: true }
  try {
    const { sortedRoutes, routeSlug } = await import('../../src/services/busData')
    return { props: { routeLinks: sortedRoutes.map((route) => ({ no: route.no, slug: routeSlug(route) })) } }
  } catch (error) {
    console.error('Bus index error:', error.message)
    return { props: { routeLinks: [] } }
  }
}
