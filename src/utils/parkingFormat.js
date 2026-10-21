// 주차장 표시용 순수 함수. 서버(getStaticProps)와 화면 양쪽에서 쓴다.

const won = (value) => `${Number(value).toLocaleString('ko-KR')}원`

// "대전시 유성구", 제주는 "제주시", "제주 서귀포시"처럼 도시명과 구·시를 겹치지 않게 붙인다
export const placeLabel = (city, district) => {
  if (!district) return `${city}시`
  if (district.startsWith(city)) return district
  return district.endsWith('시') ? `${city} ${district}` : `${city}시 ${district}`
}

export const lotPath = (lot) => `/parking/lot/${lot.slug}`
export const districtPath = (district) => `/parking/${district}`

export const feeText = (lot, en = false) => {
  if (lot.free) return en ? 'Free' : '무료'
  const parts = []
  if (lot.basicCharge > 0) {
    parts.push(en
      ? `${lot.basicTime || 0} min ${won(lot.basicCharge)}${lot.addCharge > 0 ? `, +${lot.addTime || 0} min ${won(lot.addCharge)}` : ''}`
      : `기본 ${lot.basicTime || 0}분 ${won(lot.basicCharge)}${lot.addCharge > 0 ? `, 추가 ${lot.addTime || 0}분당 ${won(lot.addCharge)}` : ''}`)
  }
  if (lot.dayTicket > 0) parts.push(en ? `Daily max ${won(lot.dayTicket)}` : `일 최대 ${won(lot.dayTicket)}`)
  if (lot.monthTicket > 0) parts.push(en ? `Monthly pass ${won(lot.monthTicket)}` : `월 정기권 ${won(lot.monthTicket)}`)
  return parts.join(' · ') || (en ? 'Fee not provided' : '요금 정보 없음')
}

export const hoursText = (lot, en = false) => {
  if (lot.allDay) return en ? 'Open 24 hours' : '24시간 운영'
  if (lot.open && lot.close) return `${lot.open} ~ ${lot.close}`
  return ''
}

const toRad = (deg) => (deg * Math.PI) / 180
export const distanceKm = (a, b) => {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

const hasCoords = (point) => Number(point.lat) > 0 && Number(point.lon) > 0

// 기준 지점에서 가까운 주차장 n곳. 좌표가 없거나 3km 안에 없으면 같은 구의 큰 공영주차장으로 대신한다.
export const nearestLots = (lots, { lat, lon, district }, n = 3, excludeId = null) => {
  const pool = lots.filter((lot) => lot.id !== excludeId)
  if (hasCoords({ lat, lon })) {
    const near = pool
      .filter(hasCoords)
      .map((lot) => ({ lot, km: distanceKm({ lat, lon }, lot) }))
      .filter((item) => item.km <= 3)
      .sort((a, b) => a.km - b.km)
      .slice(0, n)
    if (near.length) return near.map((item) => ({ ...item.lot, km: Math.round(item.km * 10) / 10 }))
  }
  if (!district) return []
  return pool
    .filter((lot) => lot.district === district && lot.isPublic)
    .sort((a, b) => b.totalLot - a.totalLot)
    .slice(0, n)
}

// 구 페이지 소개문과 FAQ에 쓰는 요약 수치
export const summarize = (lots) => {
  const paid = lots.filter((lot) => !lot.free && lot.basicCharge > 0)
  const cheapest = paid.length
    ? paid.reduce((best, lot) => (lot.basicCharge / (lot.basicTime || 1) < best.basicCharge / (best.basicTime || 1) ? lot : best))
    : null
  return {
    total: lots.length,
    publicCount: lots.filter((lot) => lot.isPublic).length,
    free: lots.filter((lot) => lot.free),
    allDay: lots.filter((lot) => lot.allDay),
    spaces: lots.reduce((sum, lot) => sum + lot.totalLot, 0),
    cheapest
  }
}
