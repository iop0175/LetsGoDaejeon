// 빌드/ISR 때 서버에서만 쓰는 목록 조회. 페이지 props에 행 전체를 싣지 않도록 필요한 열만 남긴다.
import { CITY } from '../config/cities'
import { generateLocalizedSlug } from '../utils/slugUtils'

const getClient = async () => {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

const SPOT_COLUMNS = 'content_id, title, title_en, addr1, addr1_en, firstimage, firstimage2, tel'

export const toListItem = (row) => ({
  contentId: row.content_id,
  name: row.title || null,
  nameEn: row.title_en || null,
  address: row.addr1 || null,
  addressEn: row.addr1_en || null,
  image: row.firstimage || row.firstimage2 || null,
  tel: row.tel || null
})

// 장소 목록: 사진이 있는 곳을 먼저, 최근 갱신순
export async function fetchSpotList(contentTypeId, limit = 60) {
  try {
    const db = await getClient()
    // 전체 개수는 사진 유무와 상관없이 센다 (제목·설명의 "N곳"에 쓰인다)
    const { count: total } = await db
      .from('tour_spots')
      .select('content_id', { count: 'exact', head: true })
      .eq('content_type_id', contentTypeId)
      .eq('areacode', CITY.tourApiAreaCode)
    const { data, error } = await db
      .from('tour_spots')
      .select(SPOT_COLUMNS)
      .eq('content_type_id', contentTypeId)
      .eq('areacode', CITY.tourApiAreaCode)
      .not('firstimage', 'is', null)
      .neq('firstimage', '')
      .order('modified_time', { ascending: false, nullsFirst: false })
      .limit(limit)
    if (error) throw error
    return { items: (data || []).map(toListItem), totalCount: total || (data || []).length }
  } catch (err) {
    console.error('fetchSpotList error:', err)
    return { items: [], totalCount: 0 }
  }
}

// 목록 항목 → 화면/JSON-LD용 { name, path, image, sub }
export const toLinkItems = (items = [], locale = 'kr') =>
  items
    .filter((item) => item.contentId && (item.name || item.nameEn))
    .map((item) => ({
      name: (locale === 'en' && item.nameEn) || item.name,
      path: `/spot/${generateLocalizedSlug({ title: item.name, titleEn: item.nameEn, contentId: item.contentId }, locale)}`,
      image: item.image,
      sub: (locale === 'en' && item.addressEn) || item.address
    }))
