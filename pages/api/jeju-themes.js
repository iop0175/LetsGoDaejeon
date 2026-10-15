// 비짓제주 테마여행(category c6). 제주관광공사가 쓴 추천 여행 글을 철에 맞춰 6편 고른다. 하루 캐시.
import { CITY } from '../../src/config/cities.js'

const SEASON_TAGS = [
  ['겨울', '동백', '눈꽃', '한라산 설경'], ['겨울', '동백', '눈꽃'], ['봄', '유채', '벚꽃', '매화'],
  ['봄', '유채', '벚꽃'], ['봄', '수국', '청보리'], ['여름', '수국', '해수욕'],
  ['여름', '해수욕', '바다'], ['여름', '해수욕', '바다'], ['가을', '억새', '오름'],
  ['가을', '억새', '오름', '단풍'], ['가을', '억새', '단풍', '감귤'], ['겨울', '감귤', '동백']
]

export const pickSeasonal = (items, month, count = 6) => {
  const tags = SEASON_TAGS[month - 1]
  const score = item => tags.filter(tag => (item.alltag || '').includes(tag)).length
  // 같은 점수면 최근 글(콘텐츠 ID가 큰 것)을 먼저
  return [...items]
    .filter(item => item.repPhoto?.photoid?.imgpath)
    .sort((a, b) => score(b) - score(a) || b.contentsid.localeCompare(a.contentsid))
    .slice(0, count)
}

const fetchPage = async (key, locale, page) => {
  const response = await fetch(`https://api.visitjeju.net/vsjApi/contents/searchList?apiKey=${key}&locale=${locale}&category=c6&page=${page}`)
  return response.json()
}

export default async function handler(req, res) {
  if (CITY.key !== 'jeju') return res.status(404).json({ success: false, items: [] })
  const key = process.env.JEJU_API_KEY?.trim()
  if (!key) return res.status(503).json({ success: false, items: [] })

  const locale = req.query.locale === 'en' ? 'en' : 'kr'
  try {
    const first = await fetchPage(key, locale, 1)
    const rest = await Promise.all(Array.from({ length: Math.max(0, (first.pageCount || 1) - 1) }, (_, index) => fetchPage(key, locale, index + 2)))
    const month = new Date(Date.now() + 9 * 3600 * 1000).getUTCMonth() + 1
    const items = pickSeasonal([first, ...rest].flatMap(page => page.items || []), month).map(item => ({
      id: item.contentsid,
      title: item.title,
      intro: item.introduction,
      image: item.repPhoto.photoid.imgpath,
      url: `https://www.visitjeju.net/${locale}/detail/view?contentsid=${item.contentsid}`
    }))
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=86400')
    return res.status(200).json({ success: items.length > 0, items })
  } catch (error) {
    return res.status(502).json({ success: false, items: [], error: error.message })
  }
}
