import dynamic from 'next/dynamic'
import SeoHead from '../src/components/common/SeoHead'

const PageContent = dynamic(() => import('../src/pages/TermsPage'), { ssr: false })

export default function TermsPageWrapper() {
  return (
    <>
      <SeoHead page="terms" path="/terms" />
      <PageContent />
    </>
  )
}
