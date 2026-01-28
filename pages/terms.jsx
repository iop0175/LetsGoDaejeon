import Head from 'next/head'
import dynamic from 'next/dynamic'

// 클라이언트 전용 컴포넌트
const TermsPageContent = dynamic(
  () => import('../src/pages/TermsPage'),
  { ssr: false }
)

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>이용약관 | 대전으로</title>
        <meta name="description" content="대전으로 서비스 이용약관" />
        <link rel="canonical" href="https://lets-go-daejeon.vercel.app/terms" />
      </Head>

      <TermsPageContent />
    </>
  )
}
