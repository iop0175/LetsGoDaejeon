import InfoTable from '../common/InfoTable'
import { useLive } from '../Bus/LiveBox'

// 충전 가능 대수(실시간). 값이 없으면 제공되지 않는 충전소로 안내한다.
export default function EvLive({ id }) {
  const { data, error, loading } = useLive(`/api/jeju-ev?id=${id}`, 30000)
  if (loading) return <p className="bt-note">충전 가능 대수를 불러오는 중...</p>
  if (!data) return <p className="bt-note bt-note--error">충전 가능 대수를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>
  if (!data.available) return <p className="bt-note">이 충전소는 실시간 충전 가능 대수를 제공하지 않습니다.</p>
  return (
    <>
      <InfoTable>
        <thead><tr><th>급속</th><th>완속</th></tr></thead>
        <tbody><tr><td>{data.available.fast}대 가능</td><td>{data.available.slow}대 가능</td></tr></tbody>
      </InfoTable>
      {error && <p className="bt-note bt-note--error">갱신에 실패해 마지막 정보를 보여 드립니다.</p>}
    </>
  )
}
