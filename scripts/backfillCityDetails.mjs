// 사용법: node scripts/backfillCityDetails.mjs [--apply] [--limit=750]
// TourAPI 상세 설명과 홈페이지를 채운다. 하루 최대 750회만 호출하며 이전 값은 별도 백업한다.
import fs from 'node:fs'
import path from 'node:path'
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'

nextEnv.loadEnvConfig(process.cwd())

const apply = process.argv.includes('--apply')
const dailyLimit = 750
const requestedLimit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || dailyLimit)
if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > dailyLimit) {
  throw new Error('--limit must be an integer from 1 to 750')
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const worker = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://letsgodaejeon-api.eoynx.workers.dev'
const directory = path.resolve('..', 'backups', 'city-details')
const statePath = path.join(directory, 'state.json')
const backupPath = path.join(directory, 'original-values.jsonl')
const today = new Date().toISOString().slice(0, 10)
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { day: today, calls: 0, completed: {} }
if (state.day !== today) { state.day = today; state.calls = 0 }

function saveState() {
  fs.mkdirSync(directory, { recursive: true })
  const temporaryPath = `${statePath}.${process.pid}.tmp`
  fs.writeFileSync(temporaryPath, JSON.stringify(state), { mode: 0o600 })
  fs.renameSync(temporaryPath, statePath)
}

const rowsByCity = []
for (const area of ['1', '6', '39']) {
  const rows = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('tour_spots')
      .select('content_id,areacode,overview,homepage,tel')
      .eq('areacode', area).order('content_id').range(offset, offset + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
  }
  rowsByCity.push(rows.filter((row) => !row.overview && !state.completed[`${area}:${row.content_id}`]))
}

const pending = rowsByCity.reduce((total, rows) => total + rows.length, 0)
console.log(JSON.stringify({ pending, byCity: rowsByCity.map((rows) => rows.length), remainingToday: Math.max(0, dailyLimit - state.calls) }))
if (!apply) process.exit(0)

const limit = Math.max(0, Math.min(requestedLimit, dailyLimit - state.calls))
let processed = 0
let updated = 0
let empty = 0
let lastRequest = 0
for (let index = 0; processed < limit && rowsByCity.some((rows) => index < rows.length); index++) {
  for (const rows of rowsByCity) {
    if (processed >= limit || index >= rows.length) continue
    const row = rows[index]
    const elapsed = Date.now() - lastRequest
    if (elapsed < 1000) await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed))
    state.calls += 1
    saveState()
    lastRequest = Date.now()

    const response = await fetch(`${worker}/api/tour/detailCommon2?contentId=${encodeURIComponent(row.content_id)}`, {
      headers: { Origin: 'https://www.letsgodaejeon.kr' },
      signal: AbortSignal.timeout(20000)
    })
    if (!response.ok) throw new Error(`TourAPI HTTP ${response.status}; stopped after ${processed} results`)
    const body = await response.json()
    if (body?.response?.header?.resultCode !== '0000') {
      throw new Error(`TourAPI ${body?.response?.header?.resultCode || 'invalid response'}; stopped after ${processed} results`)
    }
    const raw = body?.response?.body?.items?.item
    const detail = Array.isArray(raw) ? raw[0] : raw
    const overview = typeof detail?.overview === 'string' ? detail.overview.trim() : ''
    const homepage = typeof detail?.homepage === 'string' ? detail.homepage.trim() : ''
    if (overview) {
      const patch = { overview }
      if (!row.homepage && homepage) patch.homepage = homepage
      if (!row.tel && detail?.tel) patch.tel = String(detail.tel).trim()
      fs.appendFileSync(backupPath, JSON.stringify({ row, at: new Date().toISOString() }) + '\n', { mode: 0o600 })
      const { error } = await db.from('tour_spots').update(patch)
        .eq('content_id', row.content_id).eq('areacode', row.areacode)
      if (error) throw error
      updated += 1
    } else {
      empty += 1
    }
    state.completed[`${row.areacode}:${row.content_id}`] = true
    saveState()
    processed += 1
    if (processed % 25 === 0) console.log(JSON.stringify({ processed, updated, empty, remainingToday: dailyLimit - state.calls }))
  }
}
console.log(JSON.stringify({ processed, updated, empty, remainingToday: dailyLimit - state.calls, pendingAfter: pending - processed }))
