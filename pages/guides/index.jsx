import Link from 'next/link'
import { useRouter } from 'next/router'
import SeoHead from '../../src/components/common/SeoHead'
import { CITY } from '../../src/config/cities'
import { getCityGuides } from '../../src/config/cityGuides'
import { itemListLd } from '../../src/utils/seo'

export default function GuidesPage({ guides }) {
  const { locale } = useRouter()
  const loc = locale === 'en' ? 'en' : 'kr'
  const en = loc === 'en'
  const title = en ? `${CITY.cityNameEn} Itineraries and Local Guides` : `${CITY.cityName} 테마별 여행 코스`
  const description = en
    ? `Practical itineraries for ${CITY.cityNameEn}, including first-time visits, rainy days and family trips.`
    : `${CITY.cityName} 당일치기, 2박 3일, 비 오는 날, 아이와 함께하는 여행 코스를 상황별로 확인하세요.`
  const items = guides.map((item) => ({ name: item[loc].title, path: `/guides/${item.slug}` }))
  return (
    <>
      <SeoHead title={`${title} | ${en ? CITY.englishName : CITY.name}`} description={description} path="/guides" crumbs={[{ name: en ? 'Home' : '홈', path: '/' }, { name: title, path: '/guides' }]} ld={[itemListLd(loc, title, items)]} />
      <section className="content-hub">
        <header className="content-hub__hero"><div><p>{en ? 'PLAN BY INTEREST' : '상황별 여행 준비'}</p><h1>{title}</h1><span>{description}</span></div></header>
        <div className="content-hub__container">
          <div className="content-hub__guides">
            {guides.map((item, index) => (
              <Link href={`/guides/${item.slug}`} className="content-hub__guide" key={item.slug}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><h2>{item[loc].title}</h2><p>{item[loc].description}</p></div>
                <b aria-hidden="true">→</b>
              </Link>
            ))}
          </div>
          <section className="content-hub__areas">
            <h2>{en ? `Explore ${CITY.cityNameEn} by area` : `${CITY.cityName} 지역별 둘러보기`}</h2>
            <div>{CITY.districtNames.map((district) => <Link href={`/area/${district}`} key={district}>{district}</Link>)}</div>
          </section>
        </div>
      </section>
    </>
  )
}

export async function getStaticProps() {
  return { props: { guides: getCityGuides(CITY.key) }, revalidate: 86400 }
}
