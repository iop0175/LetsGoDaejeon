import dynamic from 'next/dynamic'
import SeoHead from '../src/components/common/SeoHead'
import { CITY } from '../src/config/cities'

const PageContent = dynamic(
  () => import('../src/pages/AdminPage'),
  { ssr: false, loading: () => <div className="loading-spinner"><div className="spinner"></div></div> }
)

export default function AdminPageWrapper() {
  return (
    <>
      <SeoHead title={`관리자 | ${CITY.name}`} description={`관리자`} path="/admin" noindex hasEnglish={false} />
      <PageContent />
    </>
  )
}
