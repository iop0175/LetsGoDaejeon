// 부산 구·군별 관광지 수와 대표 사진. tour_spots(areacode 6)를 집계하고 하루 캐시한다.
import { createClient } from '@supabase/supabase-js'
import { CITY } from '../../src/config/cities.js'

// TourAPI 부산(areaCode 6) 시군구 코드
export const BUSAN_SIGUNGU = {
  1: '강서구', 2: '금정구', 3: '기장군', 4: '남구', 5: '동구', 6: '동래구', 7: '부산진구', 8: '북구',
  9: '사상구', 10: '사하구', 11: '서구', 12: '수영구', 13: '연제구', 14: '영도구', 15: '중구', 16: '해운대구'
}

export const summarizeDistricts = (rows) => {
  const byCode = {}
  for (const row of rows) {
    const name = BUSAN_SIGUNGU[Number(row.sigungucode)]
    if (!name || row.content_type_id !== '12') continue
    const entry = byCode[name] || (byCode[name] = { name, count: 0, image: '' })
    entry.count += 1
    if (!entry.image && row.firstimage) entry.image = row.firstimage
  }
  return Object.values(byCode).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'))
}

export default async function handler(req, res) {
  if (CITY.key !== 'busan') return res.status(404).json({ success: false, items: [] })
  const database = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data, error } = await database
    .from('tour_spots')
    .select('sigungucode,content_type_id,firstimage')
    .eq('areacode', CITY.tourApiAreaCode)
    .limit(2000)
  if (error) return res.status(502).json({ success: false, items: [], error: error.message })
  const items = summarizeDistricts(data || [])
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=86400')
  return res.status(200).json({ success: items.length > 0, items })
}
