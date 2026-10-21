import InfoPageNav from '../../src/components/common/InfoPageNav'
import Link from 'next/link'
import SeoHead from '../../src/components/common/SeoHead'
import { CITY } from '../../src/config/cities'
import { hasCityFeature } from '../../src/config/cityFeatures'
import { itemListLd } from '../../src/utils/seo'
import { getDirectionsUrl } from '../../src/utils/mapLinks'

export default function ThemePage({ theme, total, spots, others }) {
  const path = `/themes/${theme.slug}`
  const names = spots.slice(0, 3).map((spot) => spot.title).join(', ')
  const title = `${theme.title} ${total}곳 | ${CITY.name}`
  const description = `${theme.lead}. ${names} 등 ${theme.title.replace(/^제주\s*/, '제주 ')} ${total}곳의 주소와 전화번호, 소개를 모았습니다.`

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        keywords={`${theme.title}, ${theme.title} 추천, 제주 가볼만한 곳, ${names}`}
        path={path}
        hasEnglish={false}
        crumbs={[{ name: '홈', path: '/' }, { name: '테마별 여행지', path: '/themes' }, { name: theme.title, path }]}
        ld={[itemListLd('kr', theme.title, spots.map((spot) => ({ name: spot.title, path, image: spot.image })))]}
      />
      <section className="bt-page">
        <div className="bt-container">
          <InfoPageNav />
          <h1>{theme.title}</h1>
          <p className="bt-intro">{description}</p>
          <ul className="jt-grid">
            {spots.map((spot) => (
              <li key={spot.id}>
                {spot.thumb && <img src={spot.thumb} alt={spot.title} loading="lazy" width="320" height="200" />}
                <h2>{spot.title}</h2>
                {spot.intro && <p>{spot.intro}</p>}
                <small>{spot.addr}{spot.phone ? ` · ${spot.phone}` : ''}</small>
                <a href={getDirectionsUrl('ko', { name: spot.title, lat: spot.lat || undefined, lng: spot.lon || undefined, address: spot.addr })} target="_blank" rel="noopener noreferrer">길찾기</a>
              </li>
            ))}
          </ul>
          {total > spots.length && <p className="bt-note">{total}곳 중 {spots.length}곳을 보여 드립니다.</p>}
          <nav className="bt-links">
            <h2>다른 테마 보기</h2>
            <div>{others.map((item) => <Link key={item.slug} href={`/themes/${item.slug}`}>{item.title}</Link>)}</div>
          </nav>
        </div>
      </section>
    </>
  )
}

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  if (!hasCityFeature(CITY.key, 'themes')) return { notFound: true }
  const { findTheme, spotsOf, THEMES } = await import('../../src/config/jejuThemes')
  const { loadTourSpots } = await import('../../src/services/jejuIts')
  const theme = findTheme(decodeURIComponent(params.slug))
  if (!theme) return { notFound: true }
  const matched = spotsOf(theme, await loadTourSpots())
  if (matched.length < 5) return { notFound: true, revalidate: 3600 }

  const spots = [...matched]
    .sort((a, b) => Number(Boolean(b.thumb)) - Number(Boolean(a.thumb)) || Number(Boolean(b.intro)) - Number(Boolean(a.intro)) || a.title.replace(/^[^가-힣A-Za-z0-9]+/, '').localeCompare(b.title.replace(/^[^가-힣A-Za-z0-9]+/, ''), 'ko'))
    .slice(0, 80)
    .map(({ id, title, addr, intro, thumb, image, phone, lat, lon }) => ({ id, title, addr, intro: intro.slice(0, 120), thumb, image, phone, lat, lon }))
  const others = THEMES.filter((item) => item.slug !== theme.slug).map(({ slug, title }) => ({ slug, title }))
  return { props: { theme: { slug: theme.slug, title: theme.title, lead: theme.lead }, total: matched.length, spots, others }, revalidate: 86400 }
}
