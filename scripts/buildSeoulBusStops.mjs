// 서울시 열린데이터 버스정류소 위치(busStopLocationXyInfo)를 src/data/seoulBusStops.json으로 저장한다.
// 사용법: SEOUL_OPENAPI_KEY=... node scripts/buildSeoulBusStops.mjs
import { writeFileSync } from 'node:fs'

const key = process.env.SEOUL_OPENAPI_KEY
if (!key) throw new Error('SEOUL_OPENAPI_KEY가 필요합니다.')

const rows = []
for (let start = 1; ; start += 1000) {
  // 서울 openapi는 https가 TLS 오류로 실패해 http만 쓴다. 한 번에 1000건까지 준다.
  const data = await (await fetch(`http://openapi.seoul.go.kr:8088/${key}/json/busStopLocationXyInfo/${start}/${start + 999}/`)).json()
  const body = data.busStopLocationXyInfo
  if (!body?.row?.length) break
  rows.push(...body.row)
  if (start + 999 >= body.list_total_count) break
}

// [정류소 ID, 정류장 표지판 번호(ARS), 이름, 위도, 경도]. 이 자료는 9자리 정류소 ID가 STOPS_NO, 5자리 ARS 번호가 NODE_ID에 들어 있다.
// 한강버스 선착장은 버스정류장이 아니라서 뺀다.
const stops = rows
  .filter((row) => row.STOPS_TYPE !== '한강선착장' && Number(row.YCRD) > 37 && Number(row.XCRD) > 126)
  .map((row) => [row.STOPS_NO, row.NODE_ID, row.STOPS_NM, Number(Number(row.YCRD).toFixed(6)), Number(Number(row.XCRD).toFixed(6))])
if (stops.length < 5000) throw new Error(`정류소가 너무 적습니다: ${stops.length}`)

writeFileSync(new URL('../src/data/seoulBusStops.json', import.meta.url), JSON.stringify({ builtAt: new Date().toISOString().slice(0, 10), stops }))
console.log('saved', stops.length, 'stops')
