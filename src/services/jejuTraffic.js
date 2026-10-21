// 서버 전용: 제주 도로 상황 한 페이지분을 모은다. 일부 API가 실패해도 나머지로 페이지를 만든다.
import { cits, its, nearestPoint } from './jejuIts'
import { EVENT_LABEL, RWIS_LABEL, parseVvms } from '../utils/jejuLabels'

const settled = async (promise) => {
  try { return await promise } catch (error) { console.error('Jeju traffic part failed:', error.message); return null }
}
const valid = (item) => Math.abs(item.latitude) < 40 && Math.abs(item.longitude) < 130 && item.latitude > 30

export async function loadJejuTraffic() {
  const [vvmsRows, eventRows, closeRows, workRows, rwisRows, linkRows] = await Promise.all([
    settled(cits('infoVvmsList')), settled(cits('infoRoadEventList')), settled(cits('infoRoadCloseList')),
    settled(cits('infoRoadWorkList')), settled(cits('infoRwisList')), settled(its('getFrafficInfo', { type: 'L' }))
  ])
  if (!vvmsRows && !eventRows && !rwisRows) throw new Error('제주 도로 자료를 하나도 불러오지 못했습니다.')

  const speedByLink = new Map((linkRows || []).filter((row) => Number(row.sped) > 0).map((row) => [row.link_id, Number(row.sped)]))
  const points = (vvmsRows || []).filter(valid).map((row) => ({
    ...parseVvms(row.info),
    lat: row.latitude,
    lon: row.longitude,
    speed: speedByLink.get(row.link_id) || 0
  })).filter((point) => point.name && point.destinations.length)
  const named = points.map((point) => ({ name: point.name, lat: point.lat, lon: point.lon }))
  const whereIs = (lat, lon) => {
    const near = named.length ? nearestPoint({ lat, lon }, named) : null
    return near && near.meters < 8000 ? `${near.name} 부근` : '제주'
  }

  const events = (eventRows || []).filter(valid).map((row) => ({ label: EVENT_LABEL[row.code] || '도로 위험', place: whereIs(row.latitude, row.longitude), lat: row.latitude, lon: row.longitude }))
  const eventCounts = {}
  for (const event of events) eventCounts[event.label] = (eventCounts[event.label] || 0) + 1

  const plain = (row) => ({ text: String(row.text || '').trim(), lanes: Number(row.whole_lane) || 0 })
  const closures = (closeRows || []).map(plain).filter((row) => row.text)
  const works = (workRows || []).map(plain).filter((row) => row.text)

  const weather = (rwisRows || []).filter(valid).map((row) => ({
    place: whereIs(row.latitude, row.longitude),
    state: RWIS_LABEL[Number(row.code)] || '정보 없음',
    visibility: Number(row.visibility) > 0 ? Number(row.visibility) : 0,
    roadTemp: Number(row.road_temp) > -1 ? Number(row.road_temp) : null,
    snow: Number(row.snow) > 0 ? Number(row.snow) : 0
  }))

  const speeds = [...speedByLink.values()]
  return {
    points: points.slice(0, 40),
    events: events.slice(0, 15),
    eventCounts,
    eventTotal: events.length,
    closures,
    works,
    weather,
    averageSpeed: speeds.length ? Math.round(speeds.reduce((sum, value) => sum + value, 0) / speeds.length) : 0,
    linkCount: speeds.length
  }
}
