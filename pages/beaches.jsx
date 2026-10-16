import Link from 'next/link'
import { useRouter } from 'next/router'
import SeoHead from '../src/components/common/SeoHead'
import { CITY } from '../src/config/cities'
import { hasCityFeature } from '../src/config/cityFeatures'
import { fetchBeachConditions } from '../src/utils/beaches'

const LEVEL = [
  { ko: '잔잔함', en: 'Calm', tone: 'good' },
  { ko: '주의', en: 'Caution', tone: 'warn' },
  { ko: '파도 높음', en: 'Rough', tone: 'bad' }
]
const WATER = [{ ko: '따뜻함', en: 'Warm' }, { ko: '서늘함', en: 'Cool' }, { ko: '차가움', en: 'Cold' }]
const num = (value, digits = 1) => value == null ? '-' : Number(value).toFixed(digits)

export default function BeachesPage({ data }) {
  const { locale } = useRouter()
  const en = locale === 'en'
  const city = en ? CITY.cityNameEn : CITY.cityName
  const title = en ? city + ' Beach Sea Conditions' : city + ' 해수욕장 바다 컨디션'
  const description = en
    ? 'Wave height, water temperature, wind and UV index at ' + city + ' beaches, updated every 10 minutes.'
    : city + ' 해수욕장별 파고, 수온, 바람, 자외선 지수를 한눈에 확인하세요. 10분마다 갱신됩니다.'
  const updated = data.updatedAt ? new Date(Date.parse(data.updatedAt) + 9 * 3600 * 1000).toISOString().slice(11, 16) : ''
  return (
    <>
      <SeoHead title={title + ' | ' + (en ? CITY.englishName : CITY.name)} description={description} path="/beaches" crumbs={[{ name: en ? 'Home' : '홈', path: '/' }, { name: title, path: '/beaches' }]} />
      <section className="content-hub feature-hub">
        <header className="content-hub__hero content-hub__hero--utility"><div><div className="live-hub__status"><i />{en ? 'Sea data' : '바다 데이터'}{updated && <small>{en ? 'Updated ' + updated : updated + ' 기준'}</small>}</div><h1>{title}</h1><span>{description}</span></div></header>
        <div className="content-hub__container">
          <div className="beach-grid">
            {data.rows.map((beach) => {
              const level = LEVEL[beach.level] || null
              return (
                <article className={'beach-card' + (level ? ' beach-card--' + level.tone : '')} key={beach.id}>
                  <header><h2>{en ? beach.en : beach.ko}</h2>{level && <b>{en ? level.en : level.ko}</b>}</header>
                  <dl>
                    <div><dt>{en ? 'Waves' : '파고'}</dt><dd>{num(beach.wave)}<small> m</small></dd></div>
                    <div><dt>{en ? 'Water' : '수온'}</dt><dd>{num(beach.water)}<small>°C</small></dd></div>
                    <div><dt>{en ? 'Wind' : '바람'}</dt><dd>{num(beach.wind, 0)}<small> km/h</small></dd></div>
                    <div><dt>{en ? 'Air' : '기온'}</dt><dd>{num(beach.air, 0)}<small>°C</small></dd></div>
                    <div><dt>{en ? 'UV' : '자외선'}</dt><dd>{num(beach.uv, 0)}</dd></div>
                    <div><dt>{en ? 'Water feel' : '수온 체감'}</dt><dd>{WATER[beach.waterGrade] ? (en ? WATER[beach.waterGrade].en : WATER[beach.waterGrade].ko) : '-'}</dd></div>
                  </dl>
                </article>
              )
            })}
          </div>
          <p className="feature-note">{en
            ? 'Forecast model data from Open-Meteo, shown as a guide only. Wave height of 0.5 m or less with wind under 25 km/h is marked calm. Swimming is allowed only when a beach is officially open, so check the local government notice and lifeguard signs.'
            : 'Open-Meteo 예측 모델 자료로 참고용입니다. 파고 0.5m 이하, 풍속 25km/h 미만이면 잔잔함으로 표시해요. 입수는 해수욕장 개장 기간과 안전요원 안내를 따라야 하며, 정확한 운영 여부는 지자체 공지를 확인해 주세요.'}</p>
          <nav className="content-hub__related"><h2>{en ? 'Plan more' : '함께 보기'}</h2><div><Link href="/live">{en ? 'Live city conditions' : '실시간 여행 현황'}</Link><Link href="/leisure">{en ? 'Leisure' : '레포츠'}</Link><Link href="/guides">{en ? 'Itineraries' : '여행 코스'}</Link></div></nav>
        </div>
      </section>
    </>
  )
}

export async function getStaticProps() {
  if (!hasCityFeature(CITY.key, 'beaches')) return { notFound: true }
  const data = await fetchBeachConditions(CITY.key).catch(() => ({ updatedAt: null, rows: [] }))
  return { props: { data }, revalidate: 600 }
}
