import { CITY } from '../config/cities'
import { toListItem } from './seoData'

const COLUMNS = 'content_id, content_type_id, title, title_en, addr1, addr1_en, firstimage, firstimage2, tel, mapx, mapy, modified_time'

// 시간대별 후보가 겹치지 않도록 종류별로 따로 가져온다
export async function fetchTodaySpots(types = [12, 14, 28, 38, 39], perType = 80) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const results = await Promise.all(types.map((type) => db
      .from('tour_spots')
      .select(COLUMNS)
      .eq('areacode', CITY.tourApiAreaCode)
      .eq('content_type_id', type)
      .not('firstimage', 'is', null)
      .neq('firstimage', '')
      .order('modified_time', { ascending: false, nullsFirst: false })
      .limit(perType)))
    return results.flatMap((result) => result.data || []).map((row) => ({ ...toListItem(row), contentTypeId: Number(row.content_type_id) }))
  } catch (error) {
    console.error('fetchTodaySpots error:', error)
    return []
  }
}
