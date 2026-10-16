import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import SeoHead from '../src/components/common/SeoHead'
import { FallbackContext, FallbackLoading } from '../src/components/common/PageFallback'
import { getPageSeo } from '../src/config/pageSeo'

const PageContent = dynamic(() => import('../src/pages/TripPlannerPage'), { ssr: false, loading: FallbackLoading })

export default function TripPlannerPageWrapper() {
  const { locale } = useRouter()
  const loc = locale === 'en' ? 'en' : 'kr'
  const seo = getPageSeo('tripPlanner', loc)
  const home = loc === 'en' ? 'Home' : '홈'

  return (
    <>
      <SeoHead
        page="tripPlanner"
        path="/trip-planner"
        crumbs={[{ name: home, path: '/' }, { name: seo.h1 || seo.title, path: '/trip-planner' }]}
      />
      <FallbackContext.Provider value={{ h1: seo.h1, intro: seo.description }}>
        <PageContent />
      </FallbackContext.Provider>
    </>
  )
}
