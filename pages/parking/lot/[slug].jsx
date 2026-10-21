import Link from 'next/link'
import { useRouter } from 'next/router'
import SeoHead from '../../../src/components/common/SeoHead'
import LotList from '../../../src/components/Parking/LotList'
import { CITY } from '../../../src/config/cities'
import { districtPath, feeText, hoursText, lotPath, nearestLots, placeLabel } from '../../../src/utils/parkingFormat'
import { absoluteUrl } from '../../../src/utils/seo'
import { getDirectionsUrl } from '../../../src/utils/mapLinks'

export default function ParkingLotPage({ lot, nearby }) {
  const { locale, isFallback } = useRouter()
  const loc = locale === 'en' ? 'en' : 'kr'
  const en = loc === 'en'
  if (isFallback || !lot) return null

  const city = en ? CITY.cityNameEn : CITY.cityName
  const site = en ? CITY.englishName : CITY.name
  const fee = feeText(lot, en)
  const hours = hoursText(lot, en)
  const type = [lot.isPublic ? (en ? 'public' : '공영') : (en ? 'private' : '민영'), lot.category && (en ? (lot.category === '노외' ? 'off-street' : 'on-street') : lot.category)].filter(Boolean).join(' ')

  const title = en
    ? `${lot.name} Parking, ${city} - Fees & Hours | ${site}`
    : `${lot.name}${lot.name.includes('주차') ? '' : ' 주차장'} 요금·운영시간 - ${placeLabel(city, lot.district)} | ${site}`
  const description = en
    ? `${lot.name} is a ${type} parking lot in ${city}. Fee: ${fee}.${hours ? ` Hours: ${hours}.` : ''}${lot.addr ? ` Address: ${lot.addr}.` : ''}`
    : `${lot.name}은(는) ${city}${lot.district ? ` ${lot.district}` : ''}의 ${type} 주차장입니다. 요금: ${fee}.${hours ? ` 운영시간: ${hours}.` : ''}${lot.totalLot ? ` 주차면 ${lot.totalLot}면.` : ''}${lot.addr ? ` 주소: ${lot.addr}.` : ''}`

  const rows = [
    lot.addr && [en ? 'Address' : '주소', lot.addr],
    [en ? 'Type' : '구분', type],
    lot.totalLot > 0 && [en ? 'Spaces' : '주차면', en ? `${lot.totalLot}` : `${lot.totalLot}면`],
    [en ? 'Fee' : '요금', fee],
    hours && [en ? 'Hours' : '운영시간', hours],
    lot.phone && [en ? 'Phone' : '전화', lot.phone],
    lot.updated && [en ? 'Data updated' : '자료 기준일', lot.updated]
  ].filter(Boolean)

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ParkingFacility',
    name: lot.name,
    description,
    url: absoluteUrl(loc, lotPath(lot)),
    address: {
      '@type': 'PostalAddress',
      streetAddress: lot.addr,
      addressLocality: lot.district || city,
      addressCountry: 'KR'
    },
    ...(lot.lat && lot.lon && { geo: { '@type': 'GeoCoordinates', latitude: lot.lat, longitude: lot.lon } }),
    ...(lot.phone && { telephone: lot.phone }),
    ...(lot.free && { isAccessibleForFree: true }),
    ...(lot.totalLot > 0 && { maximumAttendeeCapacity: lot.totalLot })
  }

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        keywords={`${lot.name}, ${lot.name} 요금, ${city} ${lot.district || ''} 주차장, ${city} 공영주차장`}
        path={lotPath(lot)}
        hasEnglish={false}
        crumbs={[
          { name: en ? 'Home' : '홈', path: '/' },
          { name: en ? 'Parking' : '주차장', path: '/parking' },
          ...(lot.district ? [{ name: lot.district, path: districtPath(lot.district) }] : []),
          { name: lot.name, path: lotPath(lot) }
        ]}
        ld={[ld]}
      />
      <section className="pk-page">
        <div className="pk-container">
          <h1>{lot.name}</h1>
          <p className="pk-intro">{description}</p>
          <dl className="pk-details">
            {rows.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          {lot.addr && (
            <a
              className="pk-directions"
              href={getDirectionsUrl(en ? 'en' : 'ko', { address: lot.addr, name: lot.name, lat: lot.lat || undefined, lng: lot.lon || undefined })}
              target="_blank"
              rel="noopener noreferrer"
            >
              {en ? 'Get directions' : '길찾기'}
            </a>
          )}
          <p className="pk-note">{en ? 'Reference data from the public database. Confirm fees and hours on site.' : '공공데이터 기준 정보입니다. 요금과 운영시간은 현장 안내를 확인해 주세요.'}</p>

          {nearby.length > 0 && (
            <section className="pk-nearby">
              <h2>{en ? 'Nearby parking' : '근처 주차장'}</h2>
              <LotList lots={nearby} en={en} />
            </section>
          )}

          <nav className="pk-district-links" aria-label={en ? 'More parking' : '더 보기'}>
            <div>
              {lot.district && <Link href={districtPath(lot.district)}>{en ? `${lot.district} parking` : `${lot.district} 주차장 전체`}</Link>}
              <Link href="/parking">{en ? 'All parking' : `${city} 주차장 검색`}</Link>
            </div>
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
  if (!CITY.parkingReady) return { notFound: true }
  const { loadParkingLots, findLot } = await import('../../../src/services/parkingServer')
  const lots = await loadParkingLots()
  const lot = findLot(lots, decodeURIComponent(params.slug))
  if (!lot) return { notFound: true, revalidate: 3600 }

  const nearby = nearestLots(lots, lot, 4, lot.id).map(({ id, slug, name, addr, category, isPublic, totalLot, open, close, allDay, free, basicTime, basicCharge, addTime, addCharge, dayTicket, monthTicket, km }) => ({
    id, slug, name, addr, category, isPublic, totalLot, open, close, allDay, free, basicTime, basicCharge, addTime, addCharge, dayTicket, monthTicket,
    ...(km !== undefined && { km })
  }))

  return { props: { lot, nearby }, revalidate: 21600 }
}
