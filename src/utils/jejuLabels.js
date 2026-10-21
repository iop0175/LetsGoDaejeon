// 제주 ITS 화면용 라벨. 브라우저 번들에 들어가도 되는 순수 상수/함수만 둔다.
export const CHARGER_LABEL = { '01': 'DC차데모', '02': 'AC완속', '03': 'DC차데모+AC3상', '04': 'DC콤보', '05': 'DC차데모+DC콤보', '06': 'DC차데모+AC3상+DC콤보', '07': 'AC3상 급속' }
export const EVENT_LABEL = { 534: '정차 차량', 1281: '낙하물', 1793: '역주행', 2052: '저속 차량', 5893: '미끄러운 노면', 1286: '보행자', 13378: '합류 구간', 258: '정체 구간' }
export const RWIS_LABEL = { 0: '건조', 1: '습윤', 2: '젖음', 3: '결빙', 4: '적설·결빙', 5: '제설 후 젖음', 6: '물·얼음', 8: '적설' }

// VVMS Info 문자열 "$기점$순서#색#분#지점$..." 풀기. 색: 1 원활 2 서행 3 정체
export const parseVvms = (text) => {
  const parts = String(text || '').split('$').filter(Boolean)
  const name = parts.shift() || ''
  const destinations = parts.map((part) => {
    const [, color, minutes, place] = part.split('#')
    return { color: Number(color), minutes: Number(minutes), place: place || '' }
  }).filter((item) => item.place && Number.isFinite(item.minutes))
  return { name, destinations }
}
