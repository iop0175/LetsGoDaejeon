// 서울 지하철 실시간 도착 (서울 열린데이터 realtimeStationArrival)
export const SUBWAY_STATIONS = [
  { name: '서울', ko: '서울역', en: 'Seoul Station' },
  { name: '시청', ko: '시청', en: 'City Hall' },
  { name: '광화문', ko: '광화문', en: 'Gwanghwamun' },
  { name: '경복궁', ko: '경복궁', en: 'Gyeongbokgung' },
  { name: '안국', ko: '안국', en: 'Anguk' },
  { name: '명동', ko: '명동', en: 'Myeongdong' },
  { name: '동대문역사문화공원', ko: '동대문역사문화공원', en: 'Dongdaemun History & Culture Park' },
  { name: '홍대입구', ko: '홍대입구', en: 'Hongik Univ.' },
  { name: '성수', ko: '성수', en: 'Seongsu' },
  { name: '이태원', ko: '이태원', en: 'Itaewon' },
  { name: '여의도', ko: '여의도', en: 'Yeouido' },
  { name: '잠실', ko: '잠실', en: 'Jamsil' },
  { name: '강남', ko: '강남', en: 'Gangnam' }
]

export const SUBWAY_LINES = {
  1001: { ko: '1호선', en: 'Line 1', color: '#0052a4' },
  1002: { ko: '2호선', en: 'Line 2', color: '#00a84d' },
  1003: { ko: '3호선', en: 'Line 3', color: '#ef7c1c' },
  1004: { ko: '4호선', en: 'Line 4', color: '#00a5de' },
  1005: { ko: '5호선', en: 'Line 5', color: '#996cac' },
  1006: { ko: '6호선', en: 'Line 6', color: '#cd7c2f' },
  1007: { ko: '7호선', en: 'Line 7', color: '#747f00' },
  1008: { ko: '8호선', en: 'Line 8', color: '#e6186c' },
  1009: { ko: '9호선', en: 'Line 9', color: '#bdb092' },
  1063: { ko: '경의중앙선', en: 'Gyeongui-Jungang', color: '#77c4a3' },
  1065: { ko: '공항철도', en: 'AREX', color: '#0090d2' },
  1067: { ko: '경춘선', en: 'Gyeongchun', color: '#0c8e72' },
  1075: { ko: '수인분당선', en: 'Suin-Bundang', color: '#f5a200' },
  1077: { ko: '신분당선', en: 'Shinbundang', color: '#d4003b' },
  1092: { ko: '우이신설선', en: 'Ui-Sinseol', color: '#b0ce18' },
  1032: { ko: 'GTX-A', en: 'GTX-A', color: '#9a6292' }
}

export const isSubwayStation = (name) => SUBWAY_STATIONS.some((station) => station.name === name)

// 도착 정보 한 줄을 화면용으로 줄인다. barvlDt는 도착까지 남은 초이고, 알 수 없으면 0이다.
export const normalizeArrival = (row) => {
  const line = SUBWAY_LINES[row.subwayId] || { ko: '지하철', en: 'Subway', color: '#687083' }
  const seconds = Number(row.barvlDt) || 0
  return {
    lineId: String(row.subwayId),
    line: line.ko,
    lineEn: line.en,
    color: line.color,
    direction: row.updnLine || '',
    destination: row.trainLineNm || '',
    message: row.arvlMsg2 || '',
    position: row.arvlMsg3 || '',
    seconds,
    status: Number(row.arvlCd)
  }
}

// 같은 노선·방향에서 가까운 열차 2대까지만 남긴다.
export const groupArrivals = (items, perGroup = 2) => {
  const groups = new Map()
  for (const item of items) {
    const key = item.lineId + '|' + item.direction
    const group = groups.get(key) || { lineId: item.lineId, line: item.line, lineEn: item.lineEn, color: item.color, direction: item.direction, trains: [] }
    group.trains.push(item)
    groups.set(key, group)
  }
  return [...groups.values()].map((group) => ({
    ...group,
    trains: group.trains
      .sort((a, b) => (a.seconds || 99999) - (b.seconds || 99999))
      .slice(0, perGroup)
  })).sort((a, b) => a.lineId.localeCompare(b.lineId) || a.direction.localeCompare(b.direction, 'ko'))
}
