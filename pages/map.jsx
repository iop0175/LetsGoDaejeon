import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import SeoHead from '../src/components/common/SeoHead'
import { FallbackContext, FallbackLoading } from '../src/components/common/PageFallback'
import { getPageSeo } from '../src/config/pageSeo'

const PageContent = dynamic(() => import('../src/pages/MapPage'), { ssr: false, loading: FallbackLoading })

export default function MapPageWrapper() {
  const { locale } = useRouter()
  const loc = locale === 'en' ? 'en' : 'kr'
  const seo = getPageSeo('map', loc)
  const home = loc === 'en' ? 'Home' : '홈'

  return (
    <>
      <SeoHead
        page="map"
        path="/map"
        crumbs={[{ name: home, path: '/' }, { name: seo.h1 || seo.title, path: '/map' }]}
      />
      <h1 className="visually-hidden">{seo.h1}</h1>
      <FallbackContext.Provider value={{ intro: seo.description }}>
        <PageContent />
      </FallbackContext.Provider>
    </>
  )
}
