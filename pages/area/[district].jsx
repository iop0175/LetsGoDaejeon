import Link from 'next/link'
import { useRouter } from 'next/router'
import SeoHead from '../../src/components/common/SeoHead'
import PlaceGrid from '../../src/components/ContentHub/PlaceGrid'
import { CITY } from '../../src/config/cities'
import { fetchDistrictSpots } from '../../src/services/guideData'
import { itemListLd } from '../../src/utils/seo'
import { generateLocalizedSlug } from '../../src/utils/slugUtils'

export default function DistrictPage({ district, spots }) {
  const { locale } = useRouter()
  const loc = locale === 'en' ? 'en' : 'kr'
  const en = loc === 'en'
  const title = en ? `${district}, ${CITY.cityNameEn}: Attractions and Food` : `${CITY.cityName} ${district} 가볼만한 곳·맛집`
  const description = en ? `Explore attractions, restaurants, culture and places to stay in ${district}, ${CITY.cityNameEn}.` : `${CITY.cityName} ${district}의 관광지, 맛집, 문화시설과 숙소를 한곳에서 확인하세요.`
  const links = spots.map((spot) => ({ name: en ? (spot.nameEn || spot.name) : spot.name, path: `/spot/${generateLocalizedSlug({ title: spot.name, titleEn: spot.nameEn, contentId: spot.contentId }, loc)}`, image: spot.image }))
  return (
    <>
      <SeoHead title={`${title} | ${en ? CITY.englishName : CITY.name}`} description={description} path={`/area/${district}`} crumbs={[{ name: en ? 'Home' : '홈', path: '/' }, { name: en ? 'Guides' : '여행 코스', path: '/guides' }, { name: district, path: `/area/${district}` }]} ld={[itemListLd(loc, title, links)]} />
      <section className="content-hub">
        <header className="content-hub__hero"><div><p>{en ? 'NEIGHBORHOOD GUIDE' : '지역별 여행'}</p><h1>{title}</h1><span>{description}</span></div></header>
        <div className="content-hub__container"><PlaceGrid items={spots} locale={loc} /><nav className="content-hub__related"><h2>{en ? 'Other areas' : '다른 지역 보기'}</h2><div>{CITY.districtNames.filter((item) => item !== district).map((item) => <Link href={`/area/${item}`} key={item}>{item}</Link>)}</div></nav></div>
      </section>
    </>
  )
}

export async function getStaticPaths() {
  return { paths: CITY.districtNames.flatMap((district) => ['kr', 'en'].map((locale) => ({ params: { district }, locale }))), fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  const district = decodeURIComponent(params.district)
  if (!CITY.districtNames.includes(district)) return { notFound: true }
  const spots = await fetchDistrictSpots(district)
  return { props: { district, spots }, revalidate: 21600 }
}
