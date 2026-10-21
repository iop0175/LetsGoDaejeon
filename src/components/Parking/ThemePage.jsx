import Link from 'next/link'
import { useRouter } from 'next/router'
import SeoHead from '../common/SeoHead'
import LotList from './LotList'
import { CITY } from '../../config/cities'
import { districtPath } from '../../utils/parkingFormat'
import { itemListLd } from '../../utils/seo'

// 검색이 많은 "무료 주차장", "24시간 주차장"을 도시 전체로 모아 보여 주는 페이지
const THEMES = {
  free: {
    path: '/parking/free',
    title: (city, n, site) => `${city}시 무료 주차장 ${n}곳 | 무료 공영주차장 위치 - ${site}`,
    description: (city, n) => `${city}시에서 요금 없이 세울 수 있는 무료 주차장 ${n}곳의 위치와 운영시간을 구별로 모았습니다. 주차면 수와 길찾기까지 방문 전에 확인하세요.`,
    h1: (city) => `${city}시 무료 주차장`,
    keywords: (city) => `${city} 무료 주차장, ${city}시 무료주차장, ${city} 무료 공영주차장, ${city} 공짜 주차, ${city} 무료 주차`,
    label: '무료 주차장'
  },
  '24h': {
    path: '/parking/24h',
    title: (city, n, site) => `${city}시 24시간 주차장 ${n}곳 | 심야·야간 주차 - ${site}`,
    description: (city, n) => `${city}시에서 24시간 운영하는 주차장 ${n}곳을 구별로 모았습니다. 심야와 새벽에도 주차할 수 있는 곳의 위치, 요금, 주차면 수를 확인하세요.`,
    h1: (city) => `${city}시 24시간 운영 주차장`,
    keywords: (city) => `${city} 24시간 주차장, ${city}시 24시간 주차장, ${city} 야간 주차장, ${city} 심야 주차, ${city} 24시간 공영주차장`,
    label: '24시간 주차장'
  }
}

export default function ParkingThemePage({ kind, total, lots, byDistrict }) {
  const { locale } = useRouter()
  const en = locale === 'en'
  const theme = THEMES[kind]
  const city = CITY.cityName
  const districts = CITY.districtNames.filter((name) => byDistrict[name] > 0)

  return (
    <>
      <SeoHead
        title={theme.title(city, total, CITY.name)}
        description={theme.description(city, total)}
        keywords={theme.keywords(city)}
        path={theme.path}
        hasEnglish={false}
        crumbs={[
          { name: en ? 'Home' : '홈', path: '/' },
          { name: en ? 'Parking' : '주차장', path: '/parking' },
          { name: theme.label, path: theme.path }
        ]}
        ld={[itemListLd(en ? 'en' : 'kr', theme.h1(city), lots.map((lot) => ({ name: lot.name, path: `/parking/lot/${lot.slug}` })))]}
      />
      <section className="pk-page">
        <div className="pk-container">
          <h1>{theme.h1(city)}</h1>
          <p className="pk-intro">
            {theme.description(city, total)} 요금과 운영시간은 공공데이터 기준이므로 방문 전에 현장 안내를 확인해 주세요.
          </p>
          <nav className="pk-district-links" aria-label="구별 보기">
            <h2>구별로 보기</h2>
            <div>
              {districts.map((name) => (
                <Link key={name} href={districtPath(name)}>{name} {byDistrict[name]}곳</Link>
              ))}
            </div>
          </nav>
          <h2>{theme.label} 목록</h2>
          <LotList lots={lots} en={false} />
          {total > lots.length && <p className="pk-more">{total}곳 중 {lots.length}곳을 보여 드립니다. 나머지는 구별 페이지에서 확인하세요.</p>}
          <nav className="pk-district-links">
            <div>
              <Link href="/parking">{city}시 주차장 전체</Link>
              <Link href={kind === 'free' ? '/parking/24h' : '/parking/free'}>{kind === 'free' ? '24시간 주차장' : '무료 주차장'}</Link>
            </div>
          </nav>
        </div>
      </section>
    </>
  )
}
