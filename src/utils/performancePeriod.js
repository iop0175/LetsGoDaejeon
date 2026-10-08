// 공연 기간 문자열 파싱 유틸
//
// KCISA CNV_060 의 eventPeriod 는 구분자 없는 "20261001 ~ 20261017" 형식이다.
// 기존 파서가 구분자(. 또는 -)를 필수로 요구해 모든 행의 start_date/end_date 가
// null 로 저장됐고, end_date 기반 만료 삭제는 NULL 비교라 항상 0건이었다.
// 같은 로직이 dbService 와 AdminPage 에 따로 있었어서 여기로 합친다.

// 구분자는 있어도 없어도 된다. 월/일은 KCISA 가 항상 2자리로 채워 보낸다.
const DATE_PATTERN = /(\d{4})[.\-/]?(\d{2})[.\-/]?(\d{2})/g

/**
 * YYYY-MM-DD 로 만들되 실제 존재하는 날짜인지 확인한다.
 * 2026-02-30 같은 값이 date 컬럼에 들어가면 배치 upsert 전체가 실패한다.
 */
const toIsoDate = (year, month, day) => {
  const iso = `${year}-${month}-${day}`
  const parsed = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return null
  // Date 는 2026-02-30 을 03-02 로 넘겨버리므로 왕복 비교로 걸러낸다.
  return parsed.toISOString().slice(0, 10) === iso ? iso : null
}

/**
 * 공연 기간에서 시작일/종료일 추출
 * @param {string} periodStr - 예: "20261001 ~ 20261017", "2026.10.01"
 * @returns {{ start: string|null, end: string|null }} YYYY-MM-DD
 */
export const parsePerformancePeriod = (periodStr) => {
  if (!periodStr) return { start: null, end: null }

  const dates = [...String(periodStr).matchAll(DATE_PATTERN)]
    .map((m) => toIsoDate(m[1], m[2], m[3]))
    .filter(Boolean)

  if (dates.length === 0) return { start: null, end: null }

  // 하루 공연은 시작일과 종료일이 같은 값 하나로만 온다.
  return { start: dates[0], end: dates[dates.length - 1] }
}

/**
 * 오늘 날짜 (한국 시간 기준 YYYY-MM-DD)
 *
 * toISOString 은 UTC 라 KST 오전 9시 이전엔 어제 날짜가 나온다.
 * 한국 전용 서비스이므로 KST 로 고정한다.
 */
export const todayIsoDate = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })

/**
 * 종료일이 지났는지 판정
 *
 * 종료일을 못 읽으면 만료로 보지 않는다. 날짜를 모른다는 이유로
 * 진행 중인 공연을 지우거나 버리는 쪽이 더 위험하다.
 * @param {string} periodStr - eventPeriod 문자열
 * @param {string} [today] - 기준일 (YYYY-MM-DD)
 */
export const isPerformanceExpired = (periodStr, today = todayIsoDate()) => {
  const { end } = parsePerformancePeriod(periodStr)
  return end ? end < today : false
}
