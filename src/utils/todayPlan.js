// 날씨로 오늘의 코스 성격을 정하고, 시간대별로 어떤 종류의 장소를 고를지 정한다.
// contentTypeId: 12 관광지, 14 문화시설, 28 레포츠, 38 쇼핑, 39 음식점
export const dayMode = ({ code, rainChance, temperature, pm25 } = {}) => {
  const rainy = (Number(rainChance) >= 60) || [51, 53, 55, 61, 63, 65, 71, 73, 75, 80, 81, 82, 95, 96, 99].includes(Number(code))
  if (rainy) return 'rainy'
  if (Number(pm25) > 35) return 'dusty'
  if (Number(temperature) >= 31) return 'hot'
  if (Number.isFinite(Number(temperature)) && Number(temperature) <= 2) return 'cold'
  return 'clear'
}

const INDOOR = [14, 38]
export const SLOTS = {
  clear: [
    { id: 'morning', ko: '오전', en: 'Morning', types: [12] },
    { id: 'lunch', ko: '점심', en: 'Lunch', types: [39] },
    { id: 'afternoon', ko: '오후', en: 'Afternoon', types: [28, 12] },
    { id: 'evening', ko: '저녁', en: 'Evening', types: [39, 38] }
  ],
  hot: [
    { id: 'morning', ko: '오전', en: 'Morning', types: [14, 12] },
    { id: 'lunch', ko: '점심', en: 'Lunch', types: [39] },
    { id: 'afternoon', ko: '오후', en: 'Afternoon', types: INDOOR },
    { id: 'evening', ko: '저녁', en: 'Evening', types: [12, 39] }
  ],
  cold: [
    { id: 'morning', ko: '오전', en: 'Morning', types: [14] },
    { id: 'lunch', ko: '점심', en: 'Lunch', types: [39] },
    { id: 'afternoon', ko: '오후', en: 'Afternoon', types: [38, 14] },
    { id: 'evening', ko: '저녁', en: 'Evening', types: [39] }
  ]
}
SLOTS.rainy = [
  { id: 'morning', ko: '오전', en: 'Morning', types: [14] },
  { id: 'lunch', ko: '점심', en: 'Lunch', types: [39] },
  { id: 'afternoon', ko: '오후', en: 'Afternoon', types: INDOOR },
  { id: 'evening', ko: '저녁', en: 'Evening', types: [39] }
]
SLOTS.dusty = SLOTS.rainy

export const MODE_COPY = {
  clear: { ko: '야외 나들이하기 좋은 날', en: 'A good day to be outdoors' },
  rainy: { ko: '비 소식이 있어 실내 위주로 짰어요', en: 'Rain is likely, so this plan stays mostly indoors' },
  dusty: { ko: '미세먼지가 높아 실내 위주로 짰어요', en: 'Air quality is poor, so this plan stays mostly indoors' },
  hot: { ko: '더운 날, 한낮은 실내로 짰어요', en: 'Hot day, with indoor stops around midday' },
  cold: { ko: '추운 날, 따뜻한 실내를 많이 넣었어요', en: 'Cold day, with plenty of warm indoor stops' }
}

// 오늘 날짜를 씨앗으로 쓰는 결정적 섞기. 같은 날에는 서버와 브라우저가 같은 결과를 낸다.
export const seededOrder = (items, seed) => {
  const list = [...items]
  let state = 0
  for (const ch of String(seed)) state = (state * 31 + ch.charCodeAt(0)) >>> 0
  for (let i = list.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0
    const j = state % (i + 1)
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

// 같은 장소가 두 번 나오지 않게 시간대마다 하나씩 고른다.
export const pickSlots = (mode, spots, seed) => {
  const used = new Set()
  return SLOTS[mode].map((slot) => {
    const pool = seededOrder(spots.filter((spot) => slot.types.includes(spot.contentTypeId) && !used.has(spot.contentId)), seed + slot.id)
    const spot = pool[0] || null
    if (spot) used.add(spot.contentId)
    return { ...slot, spot }
  })
}
