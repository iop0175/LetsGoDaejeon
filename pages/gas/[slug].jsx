import Link from 'next/link'
import SeoHead from '../../src/components/common/SeoHead'
import { CITY } from '../../src/config/cities'
import { hasCityFeature } from '../../src/config/cityFeatures'
import { getDirectionsUrl } from '../../src/utils/mapLinks'

const won = (n) => `${n.toLocaleString('ko-KR')}원`
const FUELS = [['gasoline', '휘발유'], ['premium', '고급휘발유'], ['diesel', '경유'], ['lpg', 'LPG']]

export default function GasStationPage({ station, ranks, nearby, updated }) {
  if (!station) return null
  const path = `/gas/${station.slug}`
  const prices = FUELS.filter(([key]) => station[key] > 0)
  const priceText = prices.map(([key, label]) => `${label} ${won(station[key])}`).join(', ')
  const place = station.town ? `${station.city} ${station.town}` : station.city
  const title = `${station.name} 기름값·가격 (${place}) | ${CITY.name}`
  const description = `${place} ${station.name}의 ${priceText || '유가 정보'}${ranks.gasoline ? `. 제주 휘발유 가격 ${ranks.gasoline.rank}위(${ranks.gasoline.total}곳 중)` : ''}. 주소 ${station.addr}${station.tel ? `, 전화 ${station.tel}` : ''}.`

  const faq = prices.length ? [{
    question: `${station.name} 기름값은 얼마인가요?`,
    answer: `${updated} 기준 ${priceText}입니다.${ranks.gasoline ? ` 휘발유는 제주 ${ranks.gasoline.total}개 주유소 중 ${ranks.gasoline.rank}번째로 저렴합니다.` : ''} 가격은 수시로 바뀔 수 있습니다.`
  }] : []
  const ld = [{
    '@context': 'https://schema.org',
    '@type': 'GasStation',
    name: station.name,
    address: { '@type': 'PostalAddress', streetAddress: station.addr, addressLocality: station.city, addressRegion: '제주특별자치도', addressCountry: 'KR' },
    ...(station.tel && { telephone: station.tel }),
    ...(station.brand && { brand: { '@type': 'Brand', name: station.brand } })
  }, faq.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } }))
  } : null]

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        keywords={`${station.name}, ${station.name} 가격, ${station.city} 주유소, ${place} 주유소, 제주 주유소 가격`}
        path={path}
        hasEnglish={false}
        crumbs={[{ name: '홈', path: '/' }, { name: '주유소 가격', path: '/gas' }, { name: station.name, path }]}
        ld={ld}
      />
      <section className="bt-page">
        <div className="bt-container">
          <h1>{station.name}</h1>
          <p className="bt-intro">{description}</p>
          <table className="bt-table">
            <thead><tr>{FUELS.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead>
            <tbody><tr>{FUELS.map(([key]) => <td key={key}>{station[key] > 0 ? won(station[key]) : '-'}</td>)}</tr></tbody>
          </table>
          <p className="bt-note">{updated} 기준 · 제주 교통정보센터 제공 자료이며 '-'는 판매하지 않거나 정보가 없는 유종입니다.</p>

          <dl className="pk-details">
            {[['주소', station.addr], ['구분', `${station.brand ? station.brand + ' ' : ''}${station.type}`], ['전화', station.tel]].filter(([, value]) => value).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          <a className="bt-button" href={getDirectionsUrl('ko', { name: station.name, address: station.addr })} target="_blank" rel="noopener noreferrer">길찾기</a>

          {nearby.length > 0 && (
            <>
              <h2>{station.town || station.city} 근처 다른 주유소</h2>
              <ul className="bt-nearby">
                {nearby.map((item) => (
                  <li key={item.id}><Link href={`/gas/${item.slug}`}>{item.name}</Link><small>{item.gasoline ? `휘발유 ${won(item.gasoline)}` : item.lpg ? `LPG ${won(item.lpg)}` : ''}</small></li>
                ))}
              </ul>
            </>
          )}
          <p className="bt-note"><Link href="/gas">제주 주유소 가격 전체 보기</Link> · <Link href="/ev">전기차 충전소</Link></p>
        </div>
      </section>
    </>
  )
}

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  if (!hasCityFeature(CITY.key, 'gas')) return { notFound: true }
  const { loadGasStations } = await import('../../src/services/jejuIts')
  const { generateSlug } = await import('../../src/utils/slugUtils')
  const slug = decodeURIComponent(params.slug)
  const id = slug.slice(slug.lastIndexOf('-') + 1)
  const stations = await loadGasStations()
  const station = stations.find((item) => item.id === id)
  if (!station) return { notFound: true, revalidate: 3600 }

  const rank = (key) => {
    if (!(station[key] > 0)) return null
    const sorted = stations.filter((item) => item[key] > 0).sort((a, b) => a[key] - b[key])
    return { rank: sorted.findIndex((item) => item.id === station.id) + 1, total: sorted.length }
  }
  const nearby = stations
    .filter((item) => item.id !== station.id && (station.town ? item.town === station.town : item.city === station.city) && (item.gasoline > 0 || item.lpg > 0))
    .sort((a, b) => (a.gasoline || 99999) - (b.gasoline || 99999))
    .slice(0, 5)
    .map((item) => ({ id: item.id, slug: generateSlug(item.name, item.id), name: item.name, gasoline: item.gasoline, lpg: item.lpg }))
  const updated = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false, month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return {
    props: { station: { ...station, slug: generateSlug(station.name, station.id) }, ranks: { gasoline: rank('gasoline') }, nearby, updated },
    revalidate: 3600
  }
}
