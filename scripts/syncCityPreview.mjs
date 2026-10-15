import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'

nextEnv.loadEnvConfig(process.cwd())

const cityKey = process.argv[2]
const areaCode = { seoul: '1', busan: '6', jeju: '39' }[cityKey]
if (!areaCode) throw new Error('Usage: node scripts/syncCityPreview.mjs seoul|busan|jeju [--apply]')

const database = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const apply = process.argv.includes('--apply')
const workerUrl = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://letsgodaejeon-api.eoynx.workers.dev'

for (const contentTypeId of ['12', '14', '28', '32', '38', '39']) {
  let pageNo = 1
  let received = 0
  let totalCount = 0
  do {
    const params = new URLSearchParams({ areaCode, contentTypeId, numOfRows: '100', pageNo: String(pageNo), arrange: 'C' })
    const response = await fetch(`${workerUrl}/api/tour/areaBasedList2?${params}`, {
      headers: { Origin: 'https://www.letsgodaejeon.kr' },
      signal: AbortSignal.timeout(30000)
    })
    if (!response.ok) throw new Error(`TourAPI HTTP ${response.status}`)
    const payload = await response.json()
    const result = payload.response
    if (result?.header?.resultCode !== '0000') throw new Error(`TourAPI failure for ${cityKey}/${contentTypeId}`)
    totalCount = Number(result.body.totalCount) || 0
    const rawItems = result.body?.items?.item || []
    const items = Array.isArray(rawItems) ? rawItems : [rawItems]
    if (items.some(item => String(item.areacode) !== areaCode)) throw new Error('Unexpected city data; refusing to save')
    const records = items.map(item => ({
      content_id: item.contentid,
      content_type_id: item.contenttypeid,
      title: item.title,
      areacode: item.areacode,
      addr1: item.addr1 || '',
      addr2: item.addr2 || '',
      sigungucode: item.sigungucode || '',
      firstimage: item.firstimage || '',
      firstimage2: item.firstimage2 || '',
      mapx: item.mapx || '',
      mapy: item.mapy || '',
      tel: item.tel || '',
      cpyrht_div_cd: item.cpyrhtDivCd || ''
    }))
    if (apply && records.length) {
      const { data: existing, error: readError } = await database.from('tour_spots').select('content_id,areacode').in('content_id', records.map(record => record.content_id))
      if (readError) throw readError
      if (existing.some(record => String(record.areacode) !== areaCode)) throw new Error('Existing record belongs to another city; refusing to overwrite')
      const { error } = await database.from('tour_spots').upsert(records, { onConflict: 'content_id' })
      if (error) throw error
    }
    received += records.length
    pageNo += 1
    if (!records.length) break
  } while (received < totalCount)
  console.log(JSON.stringify({ cityKey, contentTypeId, received, totalCount, saved: apply ? received : 0 }))
}
