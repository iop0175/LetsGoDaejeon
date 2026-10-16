import dynamic from 'next/dynamic'
import SeoHead from '../src/components/common/SeoHead'
import { CITY } from '../src/config/cities'

const PageContent = dynamic(
  () => import('../src/pages/ProfilePage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

export default function ProfilePageWrapper() {
  return (
    <>
      <SeoHead title={`내 프로필 | ${CITY.name}`} description={`내 프로필`} path="/profile" noindex hasEnglish={false} />
      <PageContent />
    </>
  )
}
