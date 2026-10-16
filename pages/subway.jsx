import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import SeoHead from '../src/components/common/SeoHead'
import { CITY } from '../src/config/cities'
import { hasCityFeature } from '../src/config/cityFeatures'
import { SUBWAY_STATIONS } from '../src/utils/subway'

const arrivalText = (train, en) => {
  if (train.seconds > 0) {
    const minutes = Math.floor(train.seconds / 60)
    if (minutes < 1) return en ? 'Arriving now' : '곧 도착'
    return en ? minutes + ' min' : minutes + '분 후'
  }
  return train.message || (en ? 'No info' : '정보 없음')
}

export default function SubwayPage() {
  const { locale } = useRouter()
  const en = locale === 'en'
  const [station, setStation] = useState('서울')
  const [state, setState] = useState({ loading: true, groups: [], error: '', updatedAt: '' })

  const load = useCallback(async (name) => {
    try {
      const response = await fetch('/api/subway?station=' + encodeURIComponent(name))
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'error')
      setState({ loading: false, groups: data.groups, error: '', updatedAt: data.updatedAt })
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: en ? 'Could not load arrivals. Please try again.' : '도착 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }))
    }
  }, [en])

  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true }))
    load(station)
    const timer = setInterval(() => { if (!document.hidden) load(station) }, 30000)
    return () => clearInterval(timer)
  }, [station, load])

  const title = en ? 'Seoul Subway Live Arrivals' : '서울 지하철 실시간 도착'
  const description = en
    ? 'Live subway arrival times at the stations travelers use most in Seoul, such as Seoul Station, Myeongdong, Hongik Univ. and Gangnam.'
    : '서울역, 명동, 홍대입구, 강남 등 여행자가 많이 쓰는 역의 지하철 실시간 도착 시간을 확인하세요.'
  const current = SUBWAY_STATIONS.find((item) => item.name === station)
  const updated = state.updatedAt ? new Date(Date.parse(state.updatedAt) + 9 * 3600 * 1000).toISOString().slice(11, 16) : ''

  return (
    <>
      <SeoHead title={title + ' | ' + (en ? CITY.englishName : CITY.name)} description={description} path="/subway" crumbs={[{ name: en ? 'Home' : '홈', path: '/' }, { name: title, path: '/subway' }]} />
      <section className="content-hub feature-hub">
        <header className="content-hub__hero content-hub__hero--utility"><div><div className="live-hub__status"><i />{en ? 'Live data' : '실시간 데이터'}{updated && <small>{en ? 'Updated ' + updated : updated + ' 기준'}</small>}</div><h1>{title}</h1><span>{description}</span></div></header>
        <div className="content-hub__container">
          <div className="feature-chips" role="tablist" aria-label={en ? 'Stations' : '역 선택'}>
            {SUBWAY_STATIONS.map((item) => (
              <button type="button" role="tab" aria-selected={item.name === station} className={item.name === station ? 'is-active' : ''} key={item.name} onClick={() => setStation(item.name)}>{en ? item.en : item.ko}</button>
            ))}
          </div>
          <h2 className="feature-heading">{en ? current.en : current.ko}</h2>
          {state.error && <p className="feature-note feature-note--error">{state.error}</p>}
          {state.loading && !state.groups.length && !state.error && <p className="feature-note">{en ? 'Loading...' : '불러오는 중...'}</p>}
          {!state.loading && !state.error && !state.groups.length && <p className="feature-note">{en ? 'No trains are scheduled right now. Service may have ended for the night.' : '지금 도착 예정인 열차가 없습니다. 막차 이후일 수 있어요.'}</p>}
          <div className="subway-grid">
            {state.groups.map((group) => (
              <article className="subway-card" key={group.lineId + group.direction}>
                <header><b style={{ background: group.color }}>{en ? group.lineEn : group.line}</b><span>{group.direction}</span></header>
                <ul>
                  {group.trains.map((train, index) => (
                    <li key={index}><div><strong>{train.destination}</strong><small>{train.position}</small></div><em>{arrivalText(train, en)}</em></li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="feature-note">{en ? 'Data: Seoul Open Data Plaza. Times are estimates and may change. Train destinations are shown in Korean.' : '자료: 서울 열린데이터광장. 도착 시간은 예상이며 실제와 다를 수 있어요. 30초마다 자동으로 갱신됩니다.'}</p>
        </div>
      </section>
    </>
  )
}

export async function getStaticProps() {
  if (!hasCityFeature(CITY.key, 'subway')) return { notFound: true }
  return { props: {} }
}
