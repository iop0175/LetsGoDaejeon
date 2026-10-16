import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import SeoHead from '../src/components/common/SeoHead'
import ShareButtons from '../src/components/ContentHub/ShareButtons'
import { CITY } from '../src/config/cities'
import { fetchLiveData } from '../src/services/liveData'
import { fetchTodaySpots } from '../src/services/todayData'
import { dayMode, pickSlots, MODE_COPY } from '../src/utils/todayPlan'
import { generateLocalizedSlug } from '../src/utils/slugUtils'
import { getReliableImageUrl } from '../src/utils/imageUtils'
import { eventSlug } from '../src/utils/eventSlug'

export default function TodayPage({ date, mode, live, slots, events }) {
  const { locale } = useRouter()
  const loc = locale === 'en' ? 'en' : 'kr'
  const en = loc === 'en'
  const city = en ? CITY.cityNameEn : CITY.cityName
  const title = en ? "Today's " + city + ' Itinerary' : '오늘의 ' + city + ' 추천 코스'
  const description = en
    ? 'A one-day ' + city + ' plan built from today\'s weather, air quality and events.'
    : '오늘 ' + city + ' 날씨와 미세먼지, 행사에 맞춰 오전부터 저녁까지 짠 하루 코스입니다.'
  return (
    <>
      <SeoHead title={title + ' | ' + (en ? CITY.englishName : CITY.name)} description={description} path="/today" crumbs={[{ name: en ? 'Home' : '홈', path: '/' }, { name: title, path: '/today' }]} />
      <section className="content-hub feature-hub">
        <header className="content-hub__hero content-hub__hero--utility"><div><div className="live-hub__status"><i />{date}</div><h1>{title}</h1><span>{MODE_COPY[mode][en ? 'en' : 'ko']}</span></div></header>
        <div className="content-hub__container">
          <div className="content-hub__summary">
            <div><strong>{live?.weather?.temperature_2m ?? '-'}°</strong><span>{en ? 'Now' : '현재 기온'}</span></div>
            <div><strong>{live?.daily?.rainChance ?? '-'}%</strong><span>{en ? 'Rain chance' : '강수확률'}</span></div>
            <div><strong>{live?.air?.pm2_5 ?? '-'}</strong><span>PM2.5</span></div>
            <ShareButtons title={title} text={description} />
          </div>
          <ol className="today-plan">
            {slots.map((slot) => {
              const spot = slot.spot
              const name = spot ? (en ? (spot.nameEn || spot.name) : spot.name) : ''
              const slug = spot ? generateLocalizedSlug({ title: spot.name, titleEn: spot.nameEn, contentId: spot.contentId }, loc) : ''
              return (
                <li key={slot.id}>
                  <span className="today-plan__time">{en ? slot.en : slot.ko}</span>
                  {spot ? (
                    <Link href={'/spot/' + slug} className="today-plan__card">
                      <div className="today-plan__image"><Image src={getReliableImageUrl(spot.image, '/images/no-image.svg')} alt={name} fill sizes="(max-width: 720px) 36vw, 240px" /></div>
                      <div><h2>{name}</h2>{spot.address && <p>{en ? (spot.addressEn || spot.address) : spot.address}</p>}<b>{en ? 'View place' : '장소 보기'} →</b></div>
                    </Link>
                  ) : <p className="feature-note">{en ? 'No suggestion for this slot today.' : '이 시간대 추천 장소가 아직 없어요.'}</p>}
                </li>
              )
            })}
          </ol>
          {events.length > 0 && (
            <section>
              <h2 className="feature-heading">{en ? 'Happening today' : '오늘 열리는 행사'}</h2>
              <ul className="today-events">
                {events.map((event) => (
                  <li key={event.slug}><Link href={'/event/' + event.slug}><strong>{event.title}</strong><span>{event.start_date} ~ {event.end_date}{event.event_site ? ' · ' + event.event_site : ''}</span></Link></li>
                ))}
              </ul>
            </section>
          )}
          <nav className="content-hub__related"><h2>{en ? 'Plan more' : '함께 보기'}</h2><div><Link href="/live">{en ? 'Live city conditions' : '실시간 여행 현황'}</Link><Link href="/guides">{en ? 'Itineraries' : '여행 코스'}</Link><Link href="/festival">{en ? 'Events' : '행사'}</Link><Link href="/trip-planner">{en ? 'Build my itinerary' : '내 일정 만들기'}</Link></div></nav>
        </div>
      </section>
    </>
  )
}

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))])

export async function getStaticProps() {
  const date = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
  const [live, spots, eventResult] = await Promise.all([
    fetchLiveData().catch(() => null),
    fetchTodaySpots(),
    withTimeout((async () => {
      const { collectEvents, mergeEvents } = await import('./api/events')
      const { rows } = await collectEvents(date)
      return mergeEvents(rows, [], date, false)
    })().catch(() => null), 9000)
  ])
  const mode = dayMode({ code: live?.weather?.weather_code, rainChance: live?.daily?.rainChance, temperature: live?.weather?.temperature_2m, pm25: live?.air?.pm2_5 })
  const slots = pickSlots(mode, spots, CITY.key + date)
  const events = (eventResult || []).slice(0, 4).map((event) => ({ slug: eventSlug(event), title: event.title, start_date: event.start_date, end_date: event.end_date, event_site: event.event_site || null }))
  return { props: { date, mode, live, slots, events }, revalidate: 1800 }
}
