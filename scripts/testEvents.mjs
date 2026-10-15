import assert from 'node:assert/strict'
import { mergeEvents, isCityKcisa, toRow } from '../pages/api/events.js'

const today = '2026-10-15'
const row = (title, start, end, extra = {}) => ({ ...toRow({ title, start, end }), ...extra })

const collected = [
  row('진행 중', '2026-10-01', '2026-10-20'),
  row('오늘 시작', today, today),
  row('예정', '2026-10-20', '2026-10-25'),
  row('종료', '2026-09-01', '2026-10-14'),
  row('숨긴 행사', '2026-10-01', '2026-10-30')
]
const managed = [
  row('숨긴 행사', '2026-10-01', '2026-10-30', { is_active: false }),
  row('관리자 등록', '2026-10-10', '2026-10-31', { is_active: true })
]

assert.deepEqual(mergeEvents(collected, managed, today).map(event => event.title), ['오늘 시작', '진행 중', '관리자 등록'])
assert.deepEqual(
  mergeEvents(collected, managed, today, true).map(event => [event.title, event.hidden]),
  [['오늘 시작', false], ['진행 중', false], ['예정', false], ['숨긴 행사', true], ['관리자 등록', false]]
)

assert.equal(toRow({ title: 'A &amp; B', start: '2026-10-15' }).event_period, '20261015 ~ 20261015')
assert.ok(isCityKcisa({ title: '[제주] 공연', eventSite: '문예회관' }, ['제주']))
assert.ok(isCityKcisa({ title: '전시', eventSite: '제주현대미술관' }, ['제주']))
assert.ok(!isCityKcisa({ title: '제주 초대전', eventSite: '서울 갤러리' }, ['제주']))

console.log('Events merge and filters: passed')
