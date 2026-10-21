import { useEffect, useState } from 'react'

// 실시간 값을 주기적으로 불러와 보여 준다. 화면이 숨겨져 있으면 쉬고, 다시 보이면 곧바로 갱신한다.
export function useLive(url, intervalMs = 20000) {
  const [state, setState] = useState({ data: null, error: false, loading: true })
  useEffect(() => {
    let stopped = false
    const load = async () => {
      if (document.hidden) return
      try {
        const response = await fetch(url)
        const data = await response.json()
        if (!data.success) throw new Error('fail')
        if (!stopped) setState({ data, error: false, loading: false })
      } catch {
        if (!stopped) setState((prev) => ({ ...prev, error: true, loading: false }))
      }
    }
    load()
    const timer = setInterval(load, intervalMs)
    document.addEventListener('visibilitychange', load)
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', load) }
  }, [url, intervalMs])
  return state
}

export function Arrivals({ stopId }) {
  const { data, error, loading } = useLive(`/api/bus-live?stop=${stopId}`)
  if (loading) return <p className="bt-note">실시간 도착 정보를 불러오는 중...</p>
  if (!data) return <p className="bt-note bt-note--error">실시간 도착 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>
  return (
    <>
      {data.arrivals.length === 0
        ? <p className="bt-note">지금 도착 예정인 버스가 없습니다.</p>
        : (
          <ul className="bt-arrivals">
            {data.arrivals.map((bus) => (
              <li key={`${bus.routeId}-${bus.plate}`}>
                <b>{bus.routeNo}번</b>
                <span>{bus.destination} 방면</span>
                <strong>{bus.minutes <= 1 ? '곧 도착' : `${bus.minutes}분`}</strong>
                <small>{bus.stopsAway > 0 ? `${bus.stopsAway}정거장 전` : '진입 중'}</small>
              </li>
            ))}
          </ul>
        )}
      {error && <p className="bt-note bt-note--error">갱신에 실패해 마지막 정보를 보여 드립니다.</p>}
    </>
  )
}

