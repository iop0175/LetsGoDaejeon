import Link from 'next/link'
import { useRouter } from 'next/router'
import SeoHead from '../../src/components/common/SeoHead'
import PlaceGrid from '../../src/components/ContentHub/PlaceGrid'
import ShareButtons from '../../src/components/ContentHub/ShareButtons'
import { CITY } from '../../src/config/cities'
import { getCityGuide, getCityGuides } from '../../src/config/cityGuides'
import { fetchGuideSpots } from '../../src/services/guideData'
import { itemListLd } from '../../src/utils/seo'
import { generateLocalizedSlug } from '../../src/utils/slugUtils'

export default function GuideDetailPage({ guide, spots }) {
  const { locale } = useRouter()
  const loc = locale === 'en' ? 'en' : 'kr'
  const en = loc === 'en'
  const copy = guide[loc]
  const links = spots.map((spot) => ({ name: en ? (spot.nameEn || spot.name) : spot.name, path: `/spot/${generateLocalizedSlug({ title: spot.name, titleEn: spot.nameEn, contentId: spot.contentId }, loc)}`, image: spot.image }))
  return (
    <>
      <SeoHead title={`${copy.title} | ${en ? CITY.englishName : CITY.name}`} description={copy.description} path={`/guides/${guide.slug}`} type="article" crumbs={[{ name: en ? 'Home' : '홈', path: '/' }, { name: en ? 'Guides' : '여행 코스', path: '/guides' }, { name: copy.title, path: `/guides/${guide.slug}` }]} ld={[itemListLd(loc, copy.title, links)]} />
      <article className="content-hub content-hub--detail">
        <header className="content-hub__hero content-hub__hero--editorial" style={{ '--hero-image': `url(${spots[0]?.image || CITY.hero?.image || '/images/hero/hero-1.webp'})` }}><div><p>{en ? `${CITY.cityNameEn.toUpperCase()} ITINERARY` : `${CITY.cityName} 추천 코스`}</p><h1>{copy.title}</h1><span>{copy.description}</span></div></header>
        <div className="content-hub__container">
          <div className="content-hub__summary">
            <div><strong>{spots.length}</strong><span>{en ? 'recommended places' : '추천 장소'}</span></div>
            <div><strong>{guide.types.length}</strong><span>{en ? 'travel themes' : '여행 테마'}</span></div>
            <div><strong>{guide.district || (en ? CITY.cityNameEn : CITY.cityName)}</strong><span>{en ? 'area' : '주요 지역'}</span></div>
            <ShareButtons title={copy.title} text={copy.description} />
          </div>
          <div className="content-hub__intro"><p>{copy.intro}</p></div>
          <section><h2>{en ? 'Recommended stops' : '추천 장소'}</h2><PlaceGrid items={spots} locale={loc} /></section>
          <nav className="content-hub__related"><h2>{en ? 'Plan more' : '함께 보기'}</h2><div><Link href="/guides">{en ? 'All guides' : '전체 여행 코스'}</Link><Link href="/trip-planner">{en ? 'Build my itinerary' : '내 일정 만들기'}</Link><Link href="/live">{en ? 'Live city conditions' : '실시간 여행 현황'}</Link></div></nav>
        </div>
      </article>
    </>
  )
}

export async function getStaticPaths() {
  return { paths: getCityGuides(CITY.key).flatMap((item) => ['kr', 'en'].map((locale) => ({ params: { slug: item.slug }, locale }))), fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  const guide = getCityGuide(CITY.key, params.slug)
  if (!guide) return { notFound: true }
  const spots = await fetchGuideSpots(guide)
  return { props: { guide, spots }, revalidate: 21600 }
}
