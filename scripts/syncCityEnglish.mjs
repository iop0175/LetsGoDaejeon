import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'

// 관리자 페이지 syncTourSpotsEnglish와 같은 규칙(한글명 완전일치, 대표 이미지 완전일치)으로
// 도시 미리보기 데이터에 영문명을 채운다. 기본은 미리보기, --apply일 때만 저장한다.
nextEnv.loadEnvConfig(process.cwd())

const cityKey = process.argv[2]
const areaCode = { daejeon: '3', seoul: '1', jeju: '39' }[cityKey]
if (!areaCode) throw new Error('Usage: node scripts/syncCityEnglish.mjs daejeon|seoul|jeju [--apply]')

const database = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const apply = process.argv.includes('--apply')
const workerUrl = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://letsgodaejeon-api.eoynx.workers.dev'
const ENG_TYPES = ['76', '78', '75', '80', '79', '82']

const normalizeKorTitle = (title) => (title || '')
  .replace(/\([^)]*\)/g, '')
  .replace(/[^가-힣a-zA-Z0-9]/g, '')
  .toLowerCase()

const extractKorNameFromEng = (engTitle) => {
  const inner = engTitle?.match(/\(([^()]*[가-힣][^()]*)/)?.[1]
  if (inner) return normalizeKorTitle(inner)
  const korChars = engTitle?.match(/[가-힣]+/g)
  return korChars ? normalizeKorTitle(korChars.join('')) : null
}

const tourEn = async (path, params) => {
  const response = await fetch(`${workerUrl}/api/tour-en/${path}?${new URLSearchParams(params)}`, {
    headers: { Origin: 'https://www.letsgodaejeon.kr' },
    signal: AbortSignal.timeout(30000)
  })
  if (!response.ok) throw new Error(`EngService HTTP ${response.status}`)
  const result = (await response.json()).response
  if (result?.header?.resultCode !== '0000') throw new Error(`EngService failure: ${path}`)
  const items = result.body?.items?.item || []
  return { items: Array.isArray(items) ? items : [items], totalCount: Number(result.body?.totalCount) || 0 }
}

const engItems = []
for (const contentTypeId of ENG_TYPES) {
  for (let pageNo = 1; ; pageNo++) {
    const { items, totalCount } = await tourEn('areaBasedList2', { areaCode, contentTypeId, numOfRows: '500', pageNo: String(pageNo), arrange: 'C' })
    engItems.push(...items)
    if (pageNo * 500 >= totalCount) break
  }
}
const byName = new Map(engItems.map(item => [extractKorNameFromEng(item.title), item]).filter(([name]) => name))
const byImage = new Map(engItems.filter(item => item.firstimage).map(item => [item.firstimage, item]))

const { data: korItems, error } = await database
  .from('tour_spots')
  .select('id, title, firstimage')
  .eq('areacode', areaCode)
  .or('title_en.is.null,title_en.eq.')
if (error) throw error

const matches = korItems
  .map(kor => ({ kor, eng: byName.get(normalizeKorTitle(kor.title)) || (kor.firstimage && byImage.get(kor.firstimage)) }))
  .filter(match => match.eng)

for (const { kor, eng } of matches) {
  if (!apply) continue
  const detail = (await tourEn('detailCommon2', { contentId: eng.contentid })).items[0] || {}
  const { error: updateError } = await database.from('tour_spots').update({
    content_id_en: eng.contentid,
    title_en: eng.title,
    addr1_en: eng.addr1 || '',
    overview_en: detail.overview || '',
    homepage_en: detail.homepage || '',
    updated_at: new Date().toISOString()
  }).eq('id', kor.id)
  if (updateError) throw updateError
}

console.log(JSON.stringify({ cityKey, engItems: engItems.length, missingEnglish: korItems.length, matched: matches.length, saved: apply ? matches.length : 0 }))
console.log(matches.slice(0, 8).map(({ kor, eng }) => `${kor.title} -> ${eng.title}`).join('\n'))
