import Head from 'next/head'
import dynamic from 'next/dynamic'

// 클라이언트 전용 컴포넌트
const PrivacyPageContent = dynamic(
  () => import('../src/pages/PrivacyPage'),
  { ssr: false }
)

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>개인정보처리방침 | 대전으로</title>
        <meta name="description" content="대전으로 서비스 개인정보처리방침" />
        <link rel="canonical" href="https://letsgodaejeon.kr/privacy" />
      </Head>

      <PrivacyPageContent />
    </>
  )
}
