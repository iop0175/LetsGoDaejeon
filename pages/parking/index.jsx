import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import SeoHead from '../../src/components/common/SeoHead'
import { FallbackContext, FallbackLoading } from '../../src/components/common/PageFallback'
import { getPageSeo } from '../../src/config/pageSeo'
import { CITY } from '../../src/config/cities'
import { districtPath } from '../../src/utils/parkingFormat'

const PageContent = dynamic(() => import('../../src/pages/ParkingPage'), { ssr: false, loading: FallbackLoading })

export default function ParkingPageWrapper({ counts }) {
  const { locale } = useRouter()
  const loc = locale === 'en' ? 'en' : 'kr'
  const seo = getPageSeo('parking', loc)
  const home = loc === 'en' ? 'Home' : '홈'
  // 구별 주차장 페이지로 가는 링크를 서버 HTML에 넣어 검색 로봇이 따라가게 한다
  const items = CITY.districtNames
    .filter((district) => counts[district] > 0)
    .map((district) => ({
      name: loc === 'en' ? district : `${CITY.cityName} ${district} 주차장`,
      path: districtPath(district),
      sub: loc === 'en' ? `${counts[district]} lots` : `${counts[district]}곳`
    }))

  return (
    <>
      <SeoHead
        page="parking"
        path="/parking"
        crumbs={[{ name: home, path: '/' }, { name: seo.h1 || seo.title, path: '/parking' }]}
      />
      <FallbackContext.Provider value={{ h1: seo.h1, intro: seo.description, items }}>
        <PageContent />
      </FallbackContext.Provider>
    </>
  )
}

export async function getStaticProps() {
  try {
    const { loadParkingLots } = await import('../../src/services/parkingServer')
    const counts = {}
    for (const lot of await loadParkingLots()) {
      if (lot.district) counts[lot.district] = (counts[lot.district] || 0) + 1
    }
    return { props: { counts }, revalidate: 21600 }
  } catch (error) {
    console.error('Parking index error:', error)
    return { props: { counts: {} }, revalidate: 600 }
  }
}
