import Link from 'next/link'
import { useRouter } from 'next/router'
import { FiCloudRain, FiWind, FiSun, FiActivity, FiMapPin, FiClock } from 'react-icons/fi'
import SeoHead from '../src/components/common/SeoHead'
import SeoulCrowd from '../src/components/SeoulCrowd/SeoulCrowd'
import { CITY } from '../src/config/cities'
import { getCityFeatures } from '../src/config/cityFeatures'
import { fetchLiveData } from '../src/services/liveData'

const WEATHER = {
  0: ['맑음', 'Clear'], 1: ['대체로 맑음', 'Mostly clear'], 2: ['구름 조금', 'Partly cloudy'], 3: ['흐림', 'Overcast'],
  45: ['안개', 'Fog'], 51: ['이슬비', 'Drizzle'], 61: ['비', 'Rain'], 63: ['비', 'Rain'], 65: ['강한 비', 'Heavy rain'],
  71: ['눈', 'Snow'], 80: ['소나기', 'Showers'], 95: ['뇌우', 'Thunderstorm']
}
const airLabel = (pm25, en) => pm25 <= 15 ? (en ? 'Good' : '좋음') : pm25 <= 35 ? (en ? 'Moderate' : '보통') : (en ? 'Poor' : '나쁨')

export default function LivePage({ live }) {
  const { locale } = useRouter()
  const en = locale === 'en'
  const city = en ? CITY.cityNameEn : CITY.cityName
  const title = en ? `${city} Live Travel Conditions` : `지금 ${city} 여행 현황`
  const description = en ? `Current weather, rain, air quality and practical travel links for ${city}.` : `${city} 현재 날씨, 강수확률, 미세먼지와 여행 중 필요한 주차·병원 정보를 확인하세요.`
  const weather = live?.weather || {}
  const weatherText = (WEATHER[weather.weather_code] || (en ? ['현재 날씨', 'Current weather'] : ['현재 날씨', 'Current weather']))[en ? 1 : 0]
  // 서버와 브라우저의 Intl 표기가 달라 생기는 hydration mismatch를 피한다.
  const updated = live?.updatedAt ? new Date(Date.parse(live.updatedAt) + 9 * 3600 * 1000).toISOString().slice(11, 16) : ''
  return (
    <>
      <SeoHead title={`${title} | ${en ? CITY.englishName : CITY.name}`} description={description} path="/live" crumbs={[{ name: en ? 'Home' : '홈', path: '/' }, { name: title, path: '/live' }]} />
      <section className="content-hub live-hub">
        <header className="content-hub__hero content-hub__hero--utility"><div><div className="live-hub__status"><i />{en ? 'Live travel data' : '실시간 여행 데이터'}{updated && <small>{en ? `Updated ${updated}` : `${updated} 기준`}</small>}</div><h1>{title}</h1><span>{description}</span></div></header>
        <div className="content-hub__container">
          <div className="live-hub__grid">
            <article className="live-hub__metric live-hub__metric--weather"><div className="live-hub__metric-icon"><FiSun /></div><span>{en ? 'Current weather' : '현재 날씨'}</span><strong>{weatherText}</strong><b>{weather.temperature_2m ?? '-'}°</b><p>{en ? 'Feels like' : '체감'} {weather.apparent_temperature ?? '-'}° · {en ? 'Sunset' : '일몰'} {live?.daily?.sunset?.slice(11, 16) || '-'}</p></article>
            <article className="live-hub__metric"><div className="live-hub__metric-icon"><FiCloudRain /></div><span>{en ? 'Rain' : '비'}</span><strong>{live?.daily?.rainChance ?? '-'}%</strong><p>{en ? 'Maximum chance today' : '오늘 최대 강수확률'}</p></article>
            <article className={`live-hub__metric live-hub__metric--air-${live?.air?.pm2_5 <= 15 ? 'good' : live?.air?.pm2_5 <= 35 ? 'normal' : 'bad'}`}><div className="live-hub__metric-icon"><FiActivity /></div><span>{en ? 'Air quality' : '미세먼지'}</span><strong>{live?.air?.pm2_5 != null ? airLabel(live.air.pm2_5, en) : '-'}</strong><p>PM2.5 {live?.air?.pm2_5 ?? '-'}㎍/㎥</p></article>
            <article className="live-hub__metric"><div className="live-hub__metric-icon"><FiWind /></div><span>{en ? 'Wind' : '바람'}</span><strong>{weather.wind_speed_10m ?? '-'} <small>km/h</small></strong><p>{en ? 'Current wind speed' : '현재 풍속'}</p></article>
            <article className="live-hub__metric"><div className="live-hub__metric-icon"><FiClock /></div><span>{en ? 'Daylight' : '해 뜨고 지는 시간'}</span><strong>{live?.daily?.sunrise?.slice(11, 16) || '-'}</strong><p>{en ? 'Sunset' : '일몰'} {live?.daily?.sunset?.slice(11, 16) || '-'}</p></article>
            {live?.sea && <article className="live-hub__metric live-hub__metric--sea"><div className="live-hub__metric-icon"><FiMapPin /></div><span>{en ? 'Sea conditions' : '바다 상태'}</span><strong>{live.sea.wave_height ?? '-'} <small>m</small></strong><p>{en ? 'Wave height · Water' : '파고 · 수온'} {live.sea.sea_surface_temperature ?? '-'}°C</p></article>}
          </div>
          <nav className="content-hub__related live-hub__actions"><h2>{en ? 'Useful right now' : '지금 필요한 정보'}</h2><div><Link href="/festival"><span>{en ? 'Events today' : '오늘 행사'}</span><b>→</b></Link>{getCityFeatures(CITY.key).map((feature) => <Link href={feature.path} key={feature.id}><span>{en ? feature.en : feature.ko}</span><b>→</b></Link>)}{CITY.parkingReady && <Link href="/parking"><span>{en ? 'Find parking' : '주차장 찾기'}</span><b>→</b></Link>}{CITY.medicalReady && <Link href="/medical"><span>{en ? 'Hospitals & pharmacies' : '병원·약국 찾기'}</span><b>→</b></Link>}<Link href="/map"><span>{en ? 'Tourist map' : '여행 지도'}</span><b>→</b></Link></div></nav>
        </div>
        {CITY.key === 'seoul' && <SeoulCrowd />}
      </section>
    </>
  )
}

export async function getStaticProps() {
  const live = await fetchLiveData().catch(() => null)
  return { props: { live }, revalidate: 300 }
}
