import dynamic from 'next/dynamic'
import SeoHead from '../src/components/common/SeoHead'
import { CITY } from '../src/config/cities'

const PageContent = dynamic(
  () => import('../src/pages/MyTripPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

export default function MyTripPageWrapper() {
  return (
    <>
      <SeoHead title={`내 여행 | ${CITY.name}`} description={`내 여행`} path="/my-trip" noindex hasEnglish={false} />
      <PageContent />
    </>
  )
}
