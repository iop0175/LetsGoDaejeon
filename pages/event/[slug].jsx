import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FiCalendar, FiMapPin, FiPhone, FiExternalLink } from 'react-icons/fi'
import SeoHead from '../../src/components/common/SeoHead'
import ShareButtons from '../../src/components/ContentHub/ShareButtons'
import SourceNote from '../../src/components/common/SourceNote'
import { CITY } from '../../src/config/cities'
import { eventSlug } from '../../src/utils/eventSlug'
import { getReliableImageUrl } from '../../src/utils/imageUtils'
import { absoluteUrl } from '../../src/utils/seo'

export default function EventDetailPage({ event }) {
  const { locale } = useRouter()
  const en = locale === 'en'
  const city = en ? CITY.cityNameEn : CITY.cityName
  const description = event.description || (en ? `${event.title}, an event in ${city}, runs from ${event.start_date} to ${event.end_date}.` : `${event.title}은(는) ${city}에서 ${event.start_date}부터 ${event.end_date}까지 열리는 행사입니다.`)
  const pagePath = `/event/${event.slug}`
  const eventLd = {
    '@context': 'https://schema.org', '@type': 'Event', name: event.title, description,
    startDate: event.start_date, endDate: event.end_date,
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: event.event_site || city, address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: 'KR' } },
    ...(event.image_url ? { image: event.image_url } : {}),
    ...(event.url ? { sameAs: event.url } : {}), url: absoluteUrl(en ? 'en' : 'kr', pagePath)
  }
  return (
    <>
      <SeoHead title={`${event.title} | ${city} 행사`} description={description.slice(0, 160)} path={pagePath} type="article" image={event.image_url} hasEnglish={false} crumbs={[{ name: en ? 'Home' : '홈', path: '/' }, { name: en ? 'Events' : '축제·행사', path: '/festival' }, { name: event.title, path: pagePath }]} ld={[eventLd]} />
      <article className="content-hub event-detail">
        <header className="content-hub__hero content-hub__hero--editorial" style={{ '--hero-image': `url(${event.image_url || CITY.hero?.image || '/images/hero/hero-1.webp'})` }}><div><p>{en ? `${city.toUpperCase()} EVENT` : `${city} 축제·행사`}</p><h1>{event.title}</h1><span>{event.type || (en ? 'Event' : '행사')}</span></div></header>
        <div className="content-hub__container">
          {event.image_url && <div className="event-detail__image"><Image src={getReliableImageUrl(event.image_url)} alt={event.title} fill priority sizes="(max-width: 900px) 100vw, 900px" /></div>}
          <div className="event-detail__facts">
            <p><FiCalendar /><span>{event.start_date} – {event.end_date}</span></p>
            {event.event_site && <p><FiMapPin /><span>{event.event_site}</span></p>}
            {event.contact_point && <p><FiPhone /><span>{event.contact_point}</span></p>}
          </div>
          <section className="content-hub__intro"><h2>{en ? 'About this event' : '행사 안내'}</h2><p>{description}</p><ShareButtons title={event.title} text={description.slice(0, 100)} /></section>
          <SourceNote sources={[{ name: event.source_name || (en ? 'Site editor · original provider not recorded' : '사이트 운영자 등록 · 원 제공처 미기록'), url: event.source_url }]}>
            {en ? 'Event details are summarized from the provider. Check the organizer’s announcement for changes.' : '제공처의 행사 정보를 정리한 안내입니다. 변경·취소 여부는 주최기관에 확인해 주세요.'}
          </SourceNote>
          <nav className="content-hub__related"><h2>{en ? 'Plan your visit' : '방문 준비'}</h2><div>{event.url && <a href={event.url} target="_blank" rel="noopener noreferrer">{en ? 'Official website' : '공식 안내'} <FiExternalLink /></a>}<Link href="/festival">{en ? 'All events' : '전체 행사'}</Link><Link href="/live">{en ? 'Live conditions' : '실시간 현황'}</Link>{CITY.parkingReady && <Link href="/parking">{en ? 'Nearby parking' : '주차장 찾기'}</Link>}</div></nav>
        </div>
      </article>
    </>
  )
}

export async function getStaticPaths() { return { paths: [], fallback: 'blocking' } }

export async function getStaticProps({ params }) {
  try {
    const { collectEvents, mergeEvents, todayKst } = await import('../api/events')
    const today = todayKst()
    const { rows } = await collectEvents(today)
    const match = mergeEvents(rows, [], today, true).find((item) => eventSlug(item) === params.slug)
    if (!match) return { notFound: true, revalidate: 300 }
    return { props: { event: { ...match, slug: eventSlug(match) } }, revalidate: 1800 }
  } catch (error) {
    console.error('event getStaticProps error:', error)
    return { notFound: true, revalidate: 300 }
  }
}
