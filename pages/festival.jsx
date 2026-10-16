import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import SeoHead from '../src/components/common/SeoHead'
import { FallbackContext, FallbackLoading } from '../src/components/common/PageFallback'
import { getPageSeo } from '../src/config/pageSeo'
import { CITY } from '../src/config/cities'
import { absoluteUrl } from '../src/utils/seo'

const PageContent = dynamic(() => import('../src/pages/FestivalPage'), { ssr: false, loading: FallbackLoading })

const fmt = (date) => (date || '').slice(0, 10)

export default function FestivalPageWrapper({ events }) {
  const { locale } = useRouter()
  const loc = locale === 'en' ? 'en' : 'kr'
  const seo = getPageSeo('festival', loc, { count: events.length })
  const home = loc === 'en' ? 'Home' : '홈'
  const cityName = loc === 'en' ? CITY.cityNameEn : CITY.cityName

  const list = events.map((event) => ({
    name: event.title,
    period: `${fmt(event.start_date)} ~ ${fmt(event.end_date)}`,
    sub: event.event_site
  }))

  const eventLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: seo.h1,
    numberOfItems: events.length,
    itemListElement: events.slice(0, 20).map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Event',
        name: event.title,
        startDate: fmt(event.start_date),
        endDate: fmt(event.end_date),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: event.event_site || cityName,
          address: { '@type': 'PostalAddress', addressLocality: cityName, addressCountry: 'KR' }
        },
        ...(event.image_url ? { image: event.image_url } : {}),
        url: absoluteUrl(loc, '/festival')
      }
    }))
  }

  return (
    <>
      <SeoHead
        page="festival"
        path="/festival"
        crumbs={[{ name: home, path: '/' }, { name: seo.h1, path: '/festival' }]}
        ld={[eventLd]}
      />
      <FallbackContext.Provider value={{ h1: seo.h1, intro: seo.description, items: list }}>
        <PageContent />
      </FallbackContext.Provider>
    </>
  )
}

// 진행 중인 행사를 서버에서 모아 미리 그려 둔다. 수집이 실패하면 빈 목록으로 두고 곧 다시 시도한다.
export async function getStaticProps() {
  try {
    const { collectEvents, mergeEvents, todayKst } = await import('./api/events')
    const today = todayKst()
    const { rows } = await collectEvents(today)
    const events = mergeEvents(rows, [], today)
      .slice(0, 60)
      .map((row) => ({
        title: row.title,
        start_date: row.start_date,
        end_date: row.end_date,
        event_site: row.event_site || null,
        image_url: row.image_url || null
      }))
    return { props: { events }, revalidate: events.length ? 3600 : 300 }
  } catch (err) {
    console.error('festival getStaticProps error:', err)
    return { props: { events: [] }, revalidate: 300 }
  }
}
