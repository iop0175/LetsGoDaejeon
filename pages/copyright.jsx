import dynamic from 'next/dynamic'
import SeoHead from '../src/components/common/SeoHead'

const PageContent = dynamic(() => import('../src/pages/CopyrightPage'), { ssr: false })

export default function CopyrightPageWrapper() {
  return (
    <>
      <SeoHead page="copyright" path="/copyright" />
      <PageContent />
    </>
  )
}
