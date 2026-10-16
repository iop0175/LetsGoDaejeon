// 대전 버스 노선 (ODsay 노선 검색·노선 상세)
export const POPULAR_BUS = ['1', '102', '104', '604', '705', '706', '급행1', '급행2']

export const normalizeLane = (lane) => ({
  id: lane.busID,
  number: String(lane.busNo),
  start: lane.busStartPoint || '',
  end: lane.busEndPoint || '',
  first: lane.busFirstTime || '',
  last: lane.busLastTime || '',
  interval: lane.busInterval || '',
  city: lane.busCityName || ''
})

// 상세 응답을 가는 방향과 오는 방향으로 나눈다. turningPointIdx 이전이 가는 방향이다.
export const normalizeRoute = (detail) => {
  const stations = (detail.station || []).map((station) => ({
    index: station.idx,
    name: station.stationName,
    stopNumber: station.arsID && station.arsID !== '0' ? String(station.arsID) : '',
    lat: station.y,
    lng: station.x
  }))
  const turn = Number.isInteger(detail.turningPointIdx) ? detail.turningPointIdx : -1
  return {
    id: detail.busID,
    number: String(detail.busNo),
    start: detail.busStartPoint || '',
    end: detail.busEndPoint || '',
    first: detail.busFirstTime || '',
    last: detail.busLastTime || '',
    interval: detail.busInterval || '',
    weekdayInterval: detail.bus_Interval_Week || '',
    saturdayInterval: detail.bus_Interval_Sat || '',
    sundayInterval: detail.bus_Interval_Sun || '',
    company: detail.busCompanyNameKor || '',
    outbound: turn >= 0 ? stations.filter((station) => station.index <= turn) : stations,
    inbound: turn >= 0 ? stations.filter((station) => station.index > turn) : []
  }
}
