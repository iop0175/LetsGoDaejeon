import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import SeoHead from '../src/components/common/SeoHead'
import { FallbackContext, FallbackLoading } from '../src/components/common/PageFallback'
import { getPageSeo } from '../src/config/pageSeo'

const PageContent = dynamic(() => import('../src/pages/SharedTripsPage'), { ssr: false, loading: FallbackLoading })

export default function SharedTripsPageWrapper() {
  const { locale } = useRouter()
  const loc = locale === 'en' ? 'en' : 'kr'
  const seo = getPageSeo('sharedTrips', loc)
  const home = loc === 'en' ? 'Home' : '홈'

  return (
    <>
      <SeoHead
        page="sharedTrips"
        path="/shared-trips"
        crumbs={[{ name: home, path: '/' }, { name: seo.h1 || seo.title, path: '/shared-trips' }]}
      />
      <FallbackContext.Provider value={{ h1: seo.h1, intro: seo.description }}>
        <PageContent />
      </FallbackContext.Provider>
    </>
  )
}
