import dynamic from 'next/dynamic'
import SeoHead from '../src/components/common/SeoHead'

const PageContent = dynamic(() => import('../src/pages/PrivacyPage'), { ssr: false })

export default function PrivacyPageWrapper() {
  return (
    <>
      <SeoHead page="privacy" path="/privacy" />
      <PageContent />
    </>
  )
}
