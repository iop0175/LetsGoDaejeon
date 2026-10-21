import Link from 'next/link'
import { useRouter } from 'next/router'
import SeoHead from '../../src/components/common/SeoHead'
import LotList from '../../src/components/Parking/LotList'
import { CITY } from '../../src/config/cities'
import { districtPath, feeText, summarize } from '../../src/utils/parkingFormat'
import { itemListLd } from '../../src/utils/seo'

const MAX_LOTS = 150

export default function ParkingDistrictPage({ district, lots, stats, otherDistricts }) {
  const { locale } = useRouter()
  const loc = locale === 'en' ? 'en' : 'kr'
  const en = loc === 'en'
  const city = en ? CITY.cityNameEn : CITY.cityName
  const site = en ? CITY.englishName : CITY.name

  const title = en
    ? `${district}, ${city} Parking Lots: Fees & Hours (${stats.total}) | ${site}`
    : `${city} ${district} 주차장 ${stats.total}곳 요금·운영시간 | ${site}`
  const description = en
    ? `${stats.total} parking lots in ${district}, ${city}, with fees, opening hours and directions.${stats.freeCount ? ` ${stats.freeCount} are free.` : ''}`
    : `${city} ${district} 공영주차장 ${stats.total}곳의 위치, 요금, 운영시간을 모았습니다.${stats.freeCount ? ` 무료 주차장 ${stats.freeCount}곳,` : ''}${stats.allDayCount ? ` 24시간 운영 ${stats.allDayCount}곳.` : ''} 방문 전 가까운 주차장을 확인하세요.`

  const faq = [
    stats.freeCount > 0 && {
      question: `${city} ${district} 무료 주차장은 어디인가요?`,
      answer: `${district}에는 무료 주차장이 ${stats.freeCount}곳 있습니다. ${stats.freeNames.join(', ')}${stats.freeCount > 5 ? ' 등' : ''}이 있습니다.`
    },
    stats.allDayCount > 0 && {
      question: `${city} ${district}에 24시간 운영하는 주차장이 있나요?`,
      answer: `네, ${stats.allDayCount}곳이 24시간 운영합니다. ${stats.allDayNames.join(', ')}${stats.allDayCount > 5 ? ' 등' : ''}입니다.`
    },
    stats.cheapest && {
      question: `${city} ${district}에서 요금이 가장 저렴한 주차장은 어디인가요?`,
      answer: `유료 주차장 중 시간당 기본요금이 가장 낮은 곳은 ${stats.cheapest.name}(${feeText(stats.cheapest)})입니다. 요금은 운영 기관 사정에 따라 바뀔 수 있어 현장 안내를 함께 확인하세요.`
    }
  ].filter(Boolean)

  const faqLd = !en && faq.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } }))
  } : null
  const listLd = itemListLd(loc, `${city} ${district} 주차장`, lots.map((lot) => ({ name: lot.name, path: `/parking/lot/${lot.slug}` })))

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        keywords={`${city} ${district} 주차장, ${city} ${district} 공영주차장, ${district} 무료 주차장, ${district} 주차 요금`}
        path={districtPath(district)}
        hasEnglish={false}
        crumbs={[
          { name: en ? 'Home' : '홈', path: '/' },
          { name: en ? 'Parking' : '주차장', path: '/parking' },
          { name: district, path: districtPath(district) }
        ]}
        ld={[listLd, faqLd]}
      />
      <section className="pk-page">
        <div className="pk-container">
          <h1>{en ? `${district}, ${city} Parking Lots` : `${city} ${district} 주차장`}</h1>
          <p className="pk-intro">
            {en
              ? `${district} has ${stats.total} parking lots (${stats.publicCount} public) with about ${stats.spaces.toLocaleString()} spaces.`
              : `${city} ${district}에는 주차장 ${stats.total}곳(공영 ${stats.publicCount}곳)이 있고, 주차면은 모두 ${stats.spaces.toLocaleString('ko-KR')}면입니다.`}
            {' '}
            {en ? 'Fees and hours are reference data from the public database; confirm on site.' : '요금과 운영시간은 공공데이터 기준이므로 방문 전에 현장 안내를 확인해 주세요.'}
          </p>

          <LotList lots={lots} en={en} />
          {stats.total > lots.length && (
            <p className="pk-more">
              {en ? `Showing ${lots.length} of ${stats.total} lots. ` : `${stats.total}곳 중 ${lots.length}곳을 보여 드립니다. `}
              <Link href="/parking">{en ? 'Search all parking' : '전체 주차장 검색'}</Link>
            </p>
          )}

          {faq.length > 0 && !en && (
            <section className="pk-faq">
              <h2>{district} 주차장 자주 묻는 질문</h2>
              {faq.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </section>
          )}

          <nav className="pk-district-links" aria-label={en ? 'Other districts' : '다른 지역'}>
            <h2>{en ? 'Other districts' : '다른 지역 주차장'}</h2>
            <div>
              {otherDistricts.map((name) => (
                <Link key={name} href={districtPath(name)}>{en ? name : `${name} 주차장`}</Link>
              ))}
            </div>
          </nav>
        </div>
      </section>
    </>
  )
}

// 처음 요청될 때 만들어 두고 6시간마다 새로 만든다. 빌드 때 외부 API를 부르지 않는다.
export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  const district = decodeURIComponent(params.district)
  if (!CITY.parkingReady || !CITY.districtNames.includes(district)) return { notFound: true }

  const { loadParkingLots } = await import('../../src/services/parkingServer')
  const all = await loadParkingLots()
  const inDistrict = all.filter((lot) => lot.district === district)
  if (!inDistrict.length) return { notFound: true, revalidate: 3600 }

  const stats = summarize(inDistrict)
  // 공영, 면 수가 큰 곳부터. 화면에 보내는 값은 목록에 필요한 것만 남긴다.
  const lots = [...inDistrict]
    .sort((a, b) => Number(b.isPublic) - Number(a.isPublic) || b.totalLot - a.totalLot)
    .slice(0, MAX_LOTS)
  const brief = ({ id, slug, name, addr, category, isPublic, totalLot, open, close, allDay, free, basicTime, basicCharge, addTime, addCharge, dayTicket, monthTicket }) =>
    ({ id, slug, name, addr, category, isPublic, totalLot, open, close, allDay, free, basicTime, basicCharge, addTime, addCharge, dayTicket, monthTicket })
  const countOf = (name) => all.some((lot) => lot.district === name)

  return {
    props: {
      district,
      lots: lots.map(brief),
      stats: {
        total: stats.total,
        publicCount: stats.publicCount,
        spaces: stats.spaces,
        freeCount: stats.free.length,
        freeNames: stats.free.slice(0, 5).map((lot) => lot.name),
        allDayCount: stats.allDay.length,
        allDayNames: stats.allDay.slice(0, 5).map((lot) => lot.name),
        cheapest: stats.cheapest ? brief(stats.cheapest) : null
      },
      otherDistricts: CITY.districtNames.filter((name) => name !== district && countOf(name))
    },
    revalidate: 21600
  }
}
