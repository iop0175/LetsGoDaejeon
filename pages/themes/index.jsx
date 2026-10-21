import Link from 'next/link'
import SeoHead from '../../src/components/common/SeoHead'
import { CITY } from '../../src/config/cities'
import { hasCityFeature } from '../../src/config/cityFeatures'

export default function ThemesIndexPage({ themes, total }) {
  const title = `제주 테마별 여행지 | 커플·가족·오름·포토스팟 추천 - ${CITY.name}`
  const description = `제주 관광지 ${total.toLocaleString('ko-KR')}곳을 테마별로 모았습니다. 커플, 아이와, 혼자 여행, 오름, 포토스팟, 비 오는 날 가볼 만한 곳까지 취향에 맞는 제주 여행지를 찾아보세요.`
  return (
    <>
      <SeoHead title={title} description={description} keywords="제주 여행지 추천, 제주 가볼만한 곳, 제주 커플 여행, 제주 아이와 여행, 제주 포토스팟" path="/themes" hasEnglish={false}
        crumbs={[{ name: '홈', path: '/' }, { name: '테마별 여행지', path: '/themes' }]} />
      <section className="bt-page">
        <div className="bt-container">
          <h1>제주 테마별 여행지</h1>
          <p className="bt-intro">{description}</p>
          <ul className="bt-nearby">
            {themes.map((theme) => (
              <li key={theme.slug}><Link href={`/themes/${theme.slug}`}>{theme.title}</Link><small>{theme.lead} · {theme.count}곳</small></li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

export async function getStaticProps() {
  if (!hasCityFeature(CITY.key, 'themes')) return { notFound: true }
  try {
    const { loadTourSpots } = await import('../../src/services/jejuIts')
    const { THEMES, spotsOf } = await import('../../src/config/jejuThemes')
    const spots = await loadTourSpots()
    const themes = THEMES.map((theme) => ({ slug: theme.slug, title: theme.title, lead: theme.lead, count: spotsOf(theme, spots).length })).filter((theme) => theme.count >= 5)
    return { props: { themes, total: spots.length }, revalidate: 86400 }
  } catch (error) {
    console.error('Themes index error:', error.message)
    return { props: { themes: [], total: 0 }, revalidate: 300 }
  }
}
