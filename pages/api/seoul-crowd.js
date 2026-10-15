// 서울 주요 관광지 실시간 혼잡도 (서울 열린데이터 citydata_ppltn). 5분 단위로 갱신되는 데이터라 5분 캐시한다.
import { CITY } from '../../src/config/cities.js'

export const SEOUL_CROWD_AREAS = [
  { name: '경복궁', en: 'Gyeongbokgung' },
  { name: '북촌한옥마을', en: 'Bukchon Hanok Village' },
  { name: '인사동', en: 'Insadong' },
  { name: '명동 관광특구', en: 'Myeongdong' },
  { name: '동대문 관광특구', en: 'Dongdaemun' },
  { name: '홍대 관광특구', en: 'Hongdae' },
  { name: '성수카페거리', en: 'Seongsu' },
  { name: '이태원 관광특구', en: 'Itaewon' },
  { name: '여의도한강공원', en: 'Yeouido Hangang Park' },
  { name: '잠실 관광특구', en: 'Jamsil' },
  { name: '강남역', en: 'Gangnam Station' }
]

export const LEVELS = ['여유', '보통', '약간 붐빔', '붐빔']

export const normalizeCrowd = (area, row) => ({
  name: area.name.replace(' 관광특구', ''),
  nameEn: area.en,
  level: LEVELS.indexOf(row.AREA_CONGEST_LVL),
  label: row.AREA_CONGEST_LVL,
  message: row.AREA_CONGEST_MSG,
  min: Number(row.AREA_PPLTN_MIN) || 0,
  max: Number(row.AREA_PPLTN_MAX) || 0,
  time: row.PPLTN_TIME,
  // 다음 1~3시간 예보로 "곧 붐빔" 여부를 보여준다
  forecast: (row.FCST_PPLTN || []).slice(0, 3).map(item => ({ time: item.FCST_TIME?.slice(11, 16), level: LEVELS.indexOf(item.FCST_CONGEST_LVL) }))
})

export default async function handler(req, res) {
  if (CITY.key !== 'seoul') return res.status(404).json({ success: false, items: [] })
  const key = process.env.SEOUL_OPENAPI_KEY?.trim()
  if (!key) return res.status(503).json({ success: false, items: [] })

  const settled = await Promise.allSettled(SEOUL_CROWD_AREAS.map(async area => {
    const response = await fetch(`http://openapi.seoul.go.kr:8088/${key}/json/citydata_ppltn/1/5/${encodeURIComponent(area.name)}`)
    const row = (await response.json())['SeoulRtd.citydata_ppltn']?.[0]
    return row?.AREA_CONGEST_LVL ? normalizeCrowd(area, row) : null
  }))
  const items = settled.map(result => result.status === 'fulfilled' ? result.value : null).filter(Boolean)

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  return res.status(200).json({ success: items.length > 0, items })
}
