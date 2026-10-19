// 사용법: node scripts/fixTourData.mjs coords|images [--apply]
// TourAPI 상세 응답으로 DB의 잘못된 좌표와 비어 있는 대표 사진을 고친다. 바꾸기 전 값은 backups/ 에 저장한다.
import fs from 'fs'
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'
nextEnv.loadEnvConfig(process.cwd())

const mode = process.argv[2]
const apply = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const WORKER = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://letsgodaejeon-api.eoynx.workers.dev'
const BOUNDS = { '3': [36.15, 36.55, 127.18, 127.58], '1': [37.41, 37.72, 126.76, 127.19], '6': [34.87, 35.40, 128.75, 129.32], '39': [33.10, 33.97, 126.10, 127.00] }
const inBounds = (area, lat, lng) => { const b = BOUNDS[area]; return Number.isFinite(lat) && Number.isFinite(lng) && lat >= b[0] && lat <= b[1] && lng >= b[2] && lng <= b[3] }

// Worker는 IP당 분당 100회. 70회/분으로 맞추고, 응답 오류가 연달아 나면 멈춘다(공공 API 일일 한도를 보호).
const GAP = 60000 / 70
let last = 0, failures = 0
const call = async (path) => {
  const wait = last + GAP - Date.now(); if (wait > 0) await new Promise((r) => setTimeout(r, wait)); last = Date.now()
  const response = await fetch(WORKER + '/api/tour/' + path, { headers: { Origin: 'https://www.letsgodaejeon.kr' }, signal: AbortSignal.timeout(20000) })
  if (!response.ok) { if (++failures >= 5) throw new Error('연속 실패 5회, 중단: ' + response.status); return null }
  const json = await response.json().catch(() => null)
  const code = json?.response?.header?.resultCode
  if (code && code !== '0000') { if (++failures >= 5) throw new Error('API 오류 ' + code + ' 연속 5회, 중단'); return null }
  failures = 0
  const raw = json?.response?.body?.items?.item
  return Array.isArray(raw) ? raw : raw ? [raw] : []
}
// 카카오 주소 검색(Worker 프록시). 도로명 주소 괄호는 떼고 검색한다.
const geocode = async (address) => {
  const query = String(address || '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim()
  if (!query) return null
  const response = await fetch(WORKER + '/api/kakao/v2/local/search/address.json?query=' + encodeURIComponent(query), { headers: { Origin: 'https://www.letsgodaejeon.kr' }, signal: AbortSignal.timeout(15000) }).catch(() => null)
  const doc = (await response?.json().catch(() => null))?.documents?.[0]
  return doc ? { lat: Number(doc.y), lng: Number(doc.x) } : null
}
const keywordSearch = async (query) => {
  const response = await fetch(WORKER + '/api/kakao/v2/local/search/keyword.json?query=' + encodeURIComponent(query), { headers: { Origin: 'https://www.letsgodaejeon.kr' }, signal: AbortSignal.timeout(15000) }).catch(() => null)
  const doc = (await response?.json().catch(() => null))?.documents?.[0]
  return doc ? { lat: Number(doc.y), lng: Number(doc.x) } : null
}
const fetchAll = async (filter) => {
  const rows = []
  for (const area of Object.keys(BOUNDS)) for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('tour_spots').select('content_id,title,addr1,areacode,mapx,mapy,firstimage,firstimage2').eq('areacode', area).range(from, from + 999)
    if (error) throw error
    rows.push(...data.filter(filter)); if (data.length < 1000) break
  }
  return rows
}
const backup = (name, rows) => { fs.mkdirSync('../backups', { recursive: true }); const f = '../backups/' + name + '-' + new Date().toISOString().slice(0, 10) + '.json'; fs.writeFileSync(f, JSON.stringify(rows)); return f }

if (mode === 'coords') {
  const bad = await fetchAll((r) => !inBounds(r.areacode, +r.mapy, +r.mapx))
  const plan = []
  for (const row of bad) {
    const [item] = (await call('detailCommon2?contentId=' + row.content_id)) || []
    let lat = Number(item?.mapy), lng = Number(item?.mapx), via = 'tourapi'
    // 공공 원본 좌표도 틀린 경우: 주소를 카카오 지오코딩으로 다시 찾는다
    if (!inBounds(row.areacode, lat, lng)) {
      const geo = await geocode(item?.addr1 || row.addr1)
      if (geo && inBounds(row.areacode, geo.lat, geo.lng)) { lat = geo.lat; lng = geo.lng; via = 'kakao' }
      else {
        // 주소로 못 찾으면 시군구 + 장소명 키워드로 찾는다
        const key = await keywordSearch(((item?.addr1 || row.addr1).split(' ').slice(0, 2).join(' ')) + ' ' + row.title)
        if (key && inBounds(row.areacode, key.lat, key.lng)) { lat = key.lat; lng = key.lng; via = 'kakao-keyword' }
      }
    }
    const ok = inBounds(row.areacode, lat, lng)
    plan.push({ row, ok, via, patch: ok ? { mapx: String(lng), mapy: String(lat) } : null, apiAddr: item?.addr1 })
    console.log((ok ? 'FIX ' + via : 'SKIP') + ' ' + row.areacode + ' ' + row.content_id + ' ' + row.title + ' | ' + row.mapy + ',' + row.mapx + ' -> ' + lat + ',' + lng + (item?.addr1 && item.addr1 !== row.addr1 ? ' | addr: ' + item.addr1 : ''))
  }
  if (apply) {
    console.log('backup', backup('coords', plan.map((p) => p.row)))
    for (const p of plan.filter((x) => x.ok)) {
      const patch = { ...p.patch }
      if (p.apiAddr && !p.row.addr1.includes(p.apiAddr.slice(0, 6))) patch.addr1 = p.apiAddr
      const { error } = await db.from('tour_spots').update(patch).eq('content_id', p.row.content_id)
      if (error) console.log('update fail', p.row.content_id, error.message)
    }
    console.log('applied', plan.filter((x) => x.ok).length)
  }
}

if (mode === 'images') {
  const todo = await fetchAll((r) => !r.firstimage && !r.firstimage2)
  console.log('missing images', todo.length)
  const done = []
  for (const row of todo) {
    const items = await call('detailImage2?contentId=' + row.content_id + '&imageYN=Y&numOfRows=3&pageNo=1')
    const hit = items?.find((x) => x.originimgurl)
    if (hit) done.push({ row, patch: { firstimage: hit.originimgurl, firstimage2: hit.smallimageurl || hit.originimgurl } })
    if (done.length && done.length % 20 === 0) console.log('found', done.length)
  }
  console.log('fillable', done.length, '/', todo.length)
  if (apply) {
    console.log('backup', backup('images', done.map((p) => p.row)))
    for (const p of done) { const { error } = await db.from('tour_spots').update(p.patch).eq('content_id', p.row.content_id); if (error) console.log('update fail', p.row.content_id, error.message) }
    console.log('applied', done.length)
  }
}
