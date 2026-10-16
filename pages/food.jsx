import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import SeoHead from '../src/components/common/SeoHead'
import { FallbackContext, FallbackLoading } from '../src/components/common/PageFallback'
import { getPageSeo } from '../src/config/pageSeo'
import { fetchSpotList, toLinkItems } from '../src/services/seoData'
import { itemListLd } from '../src/utils/seo'

// 클라이언트 전용 화면. 로딩 중에는 서버가 만든 목록(FallbackContext)을 보여 준다.
const PageContent = dynamic(() => import('../src/pages/FoodPage'), { ssr: false, loading: FallbackLoading })

export default function FoodPageWrapper({ items, totalCount }) {
  const { locale } = useRouter()
  const loc = locale === 'en' ? 'en' : 'kr'
  const seo = getPageSeo('food', loc, { count: totalCount })
  const list = toLinkItems(items, loc)
  const home = loc === 'en' ? 'Home' : '홈'

  return (
    <>
      <SeoHead
        page="food"
        count={totalCount}
        path="/food"
        crumbs={[{ name: home, path: '/' }, { name: seo.h1, path: '/food' }]}
        ld={[itemListLd(loc, seo.h1, list)]}
      />
      <FallbackContext.Provider value={{ h1: seo.h1, intro: seo.description, items: list }}>
        <PageContent />
      </FallbackContext.Provider>
    </>
  )
}

export async function getStaticProps() {
  const { items, totalCount } = await fetchSpotList(39, 60)
  return { props: { items, totalCount }, revalidate: 3600 }
}
