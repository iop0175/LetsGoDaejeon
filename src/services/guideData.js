import { CITY } from '../config/cities'
import { toListItem } from './seoData'

const COLUMNS = 'content_id, content_type_id, title, title_en, addr1, addr1_en, firstimage, firstimage2, tel, mapx, mapy, modified_time'

export async function fetchGuideSpots(guide, limit = 18) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data, error } = await db
      .from('tour_spots')
      .select(COLUMNS)
      .eq('areacode', CITY.tourApiAreaCode)
      .in('content_type_id', guide.types || [12, 14, 39])
      .not('firstimage', 'is', null)
      .neq('firstimage', '')
      .order('modified_time', { ascending: false, nullsFirst: false })
      .limit(600)
    if (error) throw error

    const rows = data || []
    const terms = (guide.keywords || []).map((item) => item.toLowerCase())
    const scored = rows.map((row) => {
      const haystack = `${row.title || ''} ${row.title_en || ''} ${row.addr1 || ''}`.toLowerCase()
      const keywordScore = terms.reduce((score, term) => score + (haystack.includes(term) ? 3 : 0), 0)
      const districtScore = guide.district && haystack.includes(guide.district.toLowerCase()) ? 2 : 0
      return { row, score: keywordScore + districtScore }
    }).sort((a, b) => b.score - a.score || String(a.row.title).localeCompare(String(b.row.title), 'ko'))

    return scored.slice(0, limit).map(({ row }) => ({
      ...toListItem(row),
      contentTypeId: Number(row.content_type_id),
      lat: row.mapy || null,
      lng: row.mapx || null
    }))
  } catch (error) {
    console.error('fetchGuideSpots error:', error)
    return []
  }
}

export async function fetchDistrictSpots(district, limit = 36) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data, error } = await db
      .from('tour_spots')
      .select(COLUMNS)
      .eq('areacode', CITY.tourApiAreaCode)
      .ilike('addr1', `%${district}%`)
      .not('firstimage', 'is', null)
      .neq('firstimage', '')
      .order('modified_time', { ascending: false, nullsFirst: false })
      .limit(limit)
    if (error) throw error
    return (data || []).map((row) => ({ ...toListItem(row), contentTypeId: Number(row.content_type_id) }))
  } catch (error) {
    console.error('fetchDistrictSpots error:', error)
    return []
  }
}
